import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    addDoc, 
    orderBy,
    Timestamp,
    runTransaction,
    limit
} from 'firebase/firestore';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';
import { User, Territory, TerritoryStatus, RequestStatus, TerritoryRequest, Notification, TerritoryHistory } from '../types';

// --- AUTH FUNCTIONS ---

export const apiLogin = async (email: string, pass: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    
    if (!userDoc.exists()) throw new Error("Perfil de usuário não encontrado.");
    return userDoc.data() as User;
};

export const apiSignUp = async (name: string, email: string, pass: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const userId = userCredential.user.uid;
    
    // O primeiro usuário a se cadastrar vira admin automaticamente
    const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(1)));
    const role = usersSnapshot.empty ? 'admin' : 'publicador';
    
    const newUser: User = {
        id: userId,
        name,
        email,
        role
    };
    
    await setDoc(doc(db, 'users', userId), newUser);
    return newUser;
};

export const apiLogout = async (): Promise<void> => {
    await signOut(auth);
};

// --- TERRITORY FUNCTIONS ---

export const fetchAllTerritories = async (): Promise<Territory[]> => {
    const q = query(collection(db, 'territories'), orderBy('name', 'asc'));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate() || new Date(),
            assignmentDate: data.assignmentDate?.toDate() || null,
            dueDate: data.dueDate?.toDate() || null,
            history: (data.history || []).map((h: any) => ({
                ...h,
                completedDate: h.completedDate?.toDate() || new Date()
            }))
        } as Territory;
    });
};

export const uploadTerritory = async (name: string, file: File): Promise<void> => {
    const fileName = `${Date.now()}_${file.name}`;
    const storageRef = ref(storage, `maps/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    const pdfUrl = await getDownloadURL(snapshot.ref);
    
    const newTerritory = {
        name,
        status: TerritoryStatus.AVAILABLE,
        pdfUrl,
        createdAt: Timestamp.now(),
        history: [],
        permanentNotes: '',
        assignedTo: null,
        assignedToName: null,
        assignmentDate: null,
        dueDate: null
    };
    
    await addDoc(collection(db, 'territories'), newTerritory);
};

export const updateTerritory = async (territoryId: string, data: Partial<Territory>): Promise<void> => {
    const territoryRef = doc(db, 'territories', territoryId);
    await updateDoc(territoryRef, data);
};

export const deleteTerritory = async (territoryId: string): Promise<void> => {
    const territoryDoc = await getDoc(doc(db, 'territories', territoryId));
    if (territoryDoc.exists()) {
        const data = territoryDoc.data();
        if (data.pdfUrl) {
            try {
                // Extrair path do URL para deletar se necessário, 
                // ou apenas ignorar se for URL externa
                const fileRef = ref(storage, data.pdfUrl);
                await deleteObject(fileRef);
            } catch (e) { console.error("Erro ao deletar arquivo:", e); }
        }
    }
    await deleteDoc(doc(db, 'territories', territoryId));
};

// --- REQUESTS & ASSIGNMENT ---

export const fetchAllRequests = async (): Promise<TerritoryRequest[]> => {
    const q = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING), orderBy('requestDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        requestDate: doc.data().requestDate?.toDate() || new Date()
    } as TerritoryRequest));
};

export const requestTerritory = async (user: User): Promise<void> => {
    const q = query(collection(db, 'requests'), 
        where('userId', '==', user.id), 
        where('status', '==', RequestStatus.PENDING)
    );
    const existing = await getDocs(q);
    if (!existing.empty) throw new Error("Você já possui uma solicitação pendente.");

    await addDoc(collection(db, 'requests'), {
        userId: user.id,
        userName: user.name,
        requestDate: Timestamp.now(),
        status: RequestStatus.PENDING
    });
};

export const assignTerritoryToRequest = async (requestId: string, territoryId: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'requests', requestId);
        const territoryRef = doc(db, 'territories', territoryId);
        
        const requestDoc = await transaction.get(requestRef);
        const territoryDoc = await transaction.get(territoryRef);
        
        if (!requestDoc.exists() || !territoryDoc.exists()) throw new Error("Documento não encontrado.");
        
        const reqData = requestDoc.data();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); // 30 dias de prazo

        transaction.update(territoryRef, {
            status: TerritoryStatus.IN_USE,
            assignedTo: reqData.userId,
            assignedToName: reqData.userName,
            assignmentDate: Timestamp.now(),
            dueDate: Timestamp.fromDate(dueDate)
        });
        
        transaction.update(requestRef, { status: RequestStatus.APPROVED });
        
        // Criar notificação para o usuário
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
            userId: reqData.userId,
            message: `O território "${territoryDoc.data().name}" foi atribuído a você.`,
            type: 'success',
            read: false,
            createdAt: Timestamp.now()
        });
    });
};

export const rejectRequest = async (requestId: string): Promise<void> => {
    await updateDoc(doc(db, 'requests', requestId), { status: RequestStatus.REJECTED });
};

export const submitReport = async (user: User, territory: Territory, notes: string): Promise<void> => {
    const territoryRef = doc(db, 'territories', territory.id);
    
    const historyEntry = {
        userId: user.id,
        userName: user.name,
        completedDate: Timestamp.now(),
        notes
    };

    await updateDoc(territoryRef, {
        status: TerritoryStatus.AVAILABLE,
        assignedTo: null,
        assignedToName: null,
        assignmentDate: null,
        dueDate: null,
        history: [...(territory.history || []), historyEntry]
    });
};

// --- USER MANAGEMENT ---

export const fetchAllUsers = async (): Promise<User[]> => {
    const querySnapshot = await getDocs(query(collection(db, 'users'), orderBy('name', 'asc')));
    return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as User));
};

export const updateUserRole = async (userId: string, role: 'admin' | 'publicador'): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { role });
};

// --- NOTIFICATIONS ---

export const fetchNotifications = async (user: User): Promise<Notification[]> => {
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id), orderBy('createdAt', 'desc'), limit(20));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
    } as Notification));
};

export const markNotificationsAsRead = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
        await updateDoc(doc(db, 'notifications', id), { read: true });
    }
};

export const fetchPublisherData = async (userId: string): Promise<{ myTerritory: Territory | null, hasPendingRequest: boolean }> => {
    const territoriesQ = query(collection(db, 'territories'), where('assignedTo', '==', userId), where('status', '==', TerritoryStatus.IN_USE));
    const territorySnapshot = await getDocs(territoriesQ);
    const myTerritory = !territorySnapshot.empty ? { 
        ...territorySnapshot.docs[0].data(), 
        id: territorySnapshot.docs[0].id,
        dueDate: territorySnapshot.docs[0].data().dueDate?.toDate() || null,
        assignmentDate: territorySnapshot.docs[0].data().assignmentDate?.toDate() || null,
        history: (territorySnapshot.docs[0].data().history || []).map((h:any) => ({
            ...h, 
            completedDate: h.completedDate?.toDate() || new Date()
        }))
    } as Territory : null;
    
    const requestQ = query(collection(db, 'requests'), where('userId', '==', userId), where('status', '==', RequestStatus.PENDING));
    const requestSnapshot = await getDocs(requestQ);
    
    return { myTerritory, hasPendingRequest: !requestSnapshot.empty };
};