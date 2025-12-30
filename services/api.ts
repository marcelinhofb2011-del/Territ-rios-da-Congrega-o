
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updateProfile
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
import { User, Territory, TerritoryStatus, RequestStatus, TerritoryRequest, Notification } from '../types';

// --- AUTH FUNCTIONS ---

export const apiLogin = async (email: string, pass: string): Promise<User> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const userId = userCredential.user.uid;
        
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
            const userData: User = {
                id: userId,
                uid: userId,
                name: userCredential.user.displayName || email.split('@')[0] || 'Usuário',
                email: userCredential.user.email || email,
                role: 'user', 
                active: true,
                createdAt: new Date()
            };
            await setDoc(userRef, {
                ...userData,
                createdAt: Timestamp.fromDate(userData.createdAt)
            });
            return userData;
        }
        
        const data = userDoc.data();
        return { 
            ...data, 
            id: userDoc.id,
            name: data.name || userCredential.user.displayName || email.split('@')[0] || 'Usuário',
            createdAt: data.createdAt?.toDate() || new Date()
        } as User;
    } catch (error) {
        console.error("Erro no apiLogin:", error);
        throw error;
    }
};

export const apiSignUp = async (name: string, email: string, pass: string): Promise<User> => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const userId = userCredential.user.uid;

        await updateProfile(userCredential.user, { displayName: name });
        
        const usersSnapshot = await getDocs(query(collection(db, 'users'), limit(1)));
        const isFirstUser = usersSnapshot.empty;
        
        const newUser: User = {
            id: userId,
            uid: userId,
            name: name || 'Usuário',
            email: email,
            role: isFirstUser ? 'admin' : 'user', 
            active: true,
            createdAt: new Date()
        };
        
        await setDoc(doc(db, 'users', userId), {
            ...newUser,
            createdAt: Timestamp.fromDate(newUser.createdAt)
        });
        
        return newUser;
    } catch (error) {
        console.error("Erro no apiSignUp:", error);
        throw error;
    }
};

export const apiLogout = async (): Promise<void> => {
    await signOut(auth);
};

// --- TERRITORY FUNCTIONS ---

export const fetchAllTerritories = async (): Promise<Territory[]> => {
    try {
        const q = query(collection(db, 'territories'));
        const querySnapshot = await getDocs(q);
        
        const list = querySnapshot.docs.map(doc => {
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

        return list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    } catch (error) {
        console.error("Erro ao buscar territórios:", error);
        throw error;
    }
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
    const docRef = doc(db, 'territories', territoryId);
    const territoryDoc = await getDoc(docRef);
    if (territoryDoc.exists()) {
        const data = territoryDoc.data();
        if (data.pdfUrl) {
            try {
                const fileRef = ref(storage, data.pdfUrl);
                await deleteObject(fileRef);
            } catch (e) { console.error("Erro ao deletar arquivo:", e); }
        }
    }
    await deleteDoc(docRef);
};

// --- REQUESTS & ASSIGNMENT ---

export const fetchAllRequests = async (): Promise<TerritoryRequest[]> => {
    try {
        // Query simples para evitar erros de índice composto
        const q = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            requestDate: doc.data().requestDate?.toDate() || new Date()
        } as TerritoryRequest));

        return list.sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
    } catch (error) {
        console.error("Erro ao buscar solicitações:", error);
        throw error;
    }
};

export const requestTerritory = async (user: User): Promise<void> => {
    try {
        const q = query(collection(db, 'requests'), 
            where('userId', '==', user.id), 
            where('status', '==', RequestStatus.PENDING)
        );
        const existing = await getDocs(q);
        if (!existing.empty) throw new Error("Você já possui uma solicitação pendente.");

        const safeName = user.name || user.email.split('@')[0] || 'Publicador';

        await addDoc(collection(db, 'requests'), {
            userId: user.id,
            userName: safeName,
            requestDate: Timestamp.now(),
            status: RequestStatus.PENDING
        });
    } catch (error) {
        console.error("Erro ao solicitar território:", error);
        throw error;
    }
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
        dueDate.setDate(dueDate.getDate() + 30); 

        transaction.update(territoryRef, {
            status: TerritoryStatus.IN_USE,
            assignedTo: reqData.userId,
            assignedToName: reqData.userName || 'Publicador',
            assignmentDate: Timestamp.now(),
            dueDate: Timestamp.fromDate(dueDate)
        });
        
        transaction.update(requestRef, { status: RequestStatus.APPROVED });
        
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
        userName: user.name || 'Publicador',
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
    try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const list = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return { 
                ...data, 
                id: doc.id,
                createdAt: data.createdAt?.toDate() || new Date()
            } as User;
        });

        return list.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        throw error;
    }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { role });
};

// --- NOTIFICATIONS ---

export const fetchNotifications = async (user: User): Promise<Notification[]> => {
    try {
        const q = query(
            collection(db, 'notifications'), 
            where('userId', '==', user.id)
        );
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Notification));

        return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
    } catch (error) {
        console.error("Erro ao buscar notificações:", error);
        throw error;
    }
};

export const markNotificationsAsRead = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
        await updateDoc(doc(db, 'notifications', id), { read: true });
    }
};

export const fetchPublisherData = async (userId: string): Promise<{ myTerritory: Territory | null, hasPendingRequest: boolean }> => {
    try {
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
    } catch (error) {
        console.error("Erro ao buscar dados do publicador:", error);
        throw error;
    }
};
