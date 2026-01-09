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
    limit,
    arrayUnion
} from 'firebase/firestore';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject,
    updateMetadata
} from 'firebase/storage';
import { auth, db, storage } from '../firebase/config';
import { User, Territory, TerritoryStatus, RequestStatus, TerritoryRequest, AppNotification, TerritoryHistory } from '../types';

// --- AUTH FUNCTIONS ---

export const saveFCMToken = async (userId: string, token: string) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        fcmTokens: arrayUnion(token)
    });
};

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
            name: data.name || data.nome || userCredential.user.displayName || email.split('@')[0] || 'Usuário',
            createdAt: data.createdAt?.toDate() || new Date()
        } as User;
    } catch (error: any) {
        console.error("Erro no apiLogin:", error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            throw new Error("E-mail ou senha incorretos. Verifique seus dados.");
        }
        if (error.code === 'auth/too-many-requests') {
            throw new Error("Muitas tentativas sem sucesso. Tente novamente mais tarde.");
        }
        throw new Error("Erro ao acessar o sistema. Tente novamente.");
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
    } catch (error: any) {
        console.error("Erro no apiSignUp:", error);
        if (error.code === 'auth/email-already-in-use') {
            throw new Error("Este e-mail já está sendo utilizado.");
        }
        if (error.code === 'auth/weak-password') {
            throw new Error("A senha deve ter pelo menos 6 caracteres.");
        }
        throw new Error("Erro ao criar conta. Tente novamente.");
    }
};

export const apiLogout = async (): Promise<void> => {
    await signOut(auth);
};

// --- HELPERS ---
const hydrateHistory = (rawHistory: any[]): TerritoryHistory[] => {
    if (!rawHistory || rawHistory.length === 0) return [];
    
    return rawHistory.map((h: any) => {
        const completedDate = h.completedDate instanceof Timestamp 
            ? h.completedDate.toDate() 
            : new Date(h.completedDate || Date.now());

        let assignmentDate;
        if (h.assignmentDate) {
            assignmentDate = h.assignmentDate instanceof Timestamp 
                ? h.assignmentDate.toDate() 
                : new Date(h.assignmentDate);
        } else {
            assignmentDate = completedDate; // Fallback para registros antigos
        }

        return {
            ...h,
            assignmentDate,
            completedDate,
        };
    }).sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());
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
                name: data.name || 'Sem Nome',
                createdAt: data.createdAt?.toDate() || new Date(),
                assignmentDate: data.assignmentDate?.toDate() || null,
                dueDate: data.dueDate?.toDate() || null,
                history: hydrateHistory(data.history || [])
            } as Territory;
        });

        return list;
    } catch (error) {
        console.error("Erro ao buscar territórios:", error);
        throw error;
    }
};

export const createTerritory = async (name: string, url: string): Promise<void> => {
    try {
        const newTerritory = {
            name: name.trim(),
            status: TerritoryStatus.AVAILABLE,
            pdfUrl: url,
            createdAt: Timestamp.now(),
            history: [],
            permanentNotes: '',
            assignedTo: null,
            assignedToName: null,
            assignmentDate: null,
            dueDate: null
        };
        await addDoc(collection(db, 'territories'), newTerritory);
    } catch (error) {
        console.error("Erro ao criar território:", error);
        throw error;
    }
};

export const uploadTerritory = async (name: string, file: File): Promise<void> => {
    try {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `maps/${fileName}`);

        const metadata = { 
            contentType: file.type || 'application/pdf',
            contentDisposition: 'inline'
        };

        const snapshot = await uploadBytes(storageRef, file, metadata);
        
        const fileUrl = await getDownloadURL(snapshot.ref);
        await createTerritory(name, fileUrl);
        
    } catch (error: any) {
        console.error("Erro no upload:", error);
        throw new Error("Erro ao salvar arquivo no Storage.");
    }
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
        if (data.pdfUrl && data.pdfUrl.includes('firebasestorage')) {
            try {
                const fileRef = ref(storage, data.pdfUrl);
                await deleteObject(fileRef);
            } catch (e) { console.error("Erro ao deletar arquivo:", e); }
        }
    }
    await deleteDoc(docRef);
};

export const adminResetTerritory = async (territoryId: string, adminUser: User): Promise<void> => {
    const territoryRef = doc(db, 'territories', territoryId);
    
    await runTransaction(db, async (transaction) => {
        const territoryDoc = await transaction.get(territoryRef);
        if (!territoryDoc.exists()) throw new Error("Território não encontrado.");

        const territoryData = territoryDoc.data();
        let newHistory = territoryData.history || [];

        // Adiciona um registro histórico apenas se o território estava de fato com alguém
        if (territoryData.assignedTo) {
            const historyEntry = {
                userId: territoryData.assignedTo,
                userName: territoryData.assignedToName,
                assignmentDate: territoryData.assignmentDate, // Já está como Timestamp do Firestore
                completedDate: Timestamp.now(),
                notes: `Território retomado pelo administrador (${adminUser.name}).`
            };
            newHistory.push(historyEntry);
        }
        
        transaction.update(territoryRef, {
            status: TerritoryStatus.AVAILABLE,
            assignedTo: null,
            assignedToName: null,
            assignmentDate: null,
            dueDate: null,
            history: newHistory
        });
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
                name: data.name || data.email?.split('@')[0] || 'Sem Nome',
                createdAt: data.createdAt?.toDate() || new Date()
            } as User;
        });
        return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        throw error;
    }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { role });
};

// --- REQUESTS & ASSIGNMENTS ---

export const fetchAllRequests = async (): Promise<TerritoryRequest[]> => {
    try {
        const q = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            requestDate: doc.data().requestDate?.toDate() || new Date()
        } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
    } catch (error) {
        console.error("Erro ao buscar solicitações:", error);
        throw error;
    }
};

export const requestTerritory = async (user: User): Promise<void> => {
    const q = query(collection(db, 'requests'), where('userId', '==', user.id), where('status', '==', RequestStatus.PENDING));
    const existing = await getDocs(q);
    if (!existing.empty) throw new Error("Você já possui uma solicitação pendente.");

    await addDoc(collection(db, 'requests'), {
        userId: user.id,
        userName: user.name,
        requestDate: Timestamp.now(),
        status: RequestStatus.PENDING
    });

    // Notificar todos os administradores
    const qAdmins = query(collection(db, 'users'), where('role', '==', 'admin'));
    const adminsSnapshot = await getDocs(qAdmins);
    
    adminsSnapshot.forEach(adminDoc => {
        const adminId = adminDoc.id;
        addDoc(collection(db, 'notifications'), {
            userId: adminId,
            message: `${user.name} solicitou um novo território.`,
            type: 'info',
            read: false,
            createdAt: Timestamp.now()
        });
    });
};

export const assignTerritoryToRequest = async (requestId: string, territoryId: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'requests', requestId);
        const territoryRef = doc(db, 'territories', territoryId);
        const requestDoc = await transaction.get(requestRef);
        const territoryDoc = await transaction.get(territoryRef);
        
        if (!requestDoc.exists() || !territoryDoc.exists()) throw new Error("Erro de dados.");
        
        const reqData = requestDoc.data();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30); 

        transaction.update(territoryRef, {
            status: TerritoryStatus.IN_USE,
            assignedTo: reqData.userId,
            assignedToName: reqData.userName,
            assignmentDate: Timestamp.now(),
            dueDate: Timestamp.fromDate(dueDate)
        });
        transaction.update(requestRef, { status: RequestStatus.APPROVED });
        
        const notifRef = doc(collection(db, 'notifications'));
        transaction.set(notifRef, {
            userId: reqData.userId,
            message: `Território ${territoryDoc.data().name} atribuído com sucesso.`,
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
        assignmentDate: territory.assignmentDate ? Timestamp.fromDate(territory.assignmentDate) : Timestamp.now(),
        completedDate: Timestamp.now(),
        notes: notes.trim()
    };
    
    const currentHistory = territory.history.map(h => ({
        ...h,
        assignmentDate: Timestamp.fromDate(h.assignmentDate),
        completedDate: Timestamp.fromDate(h.completedDate)
    }));

    await updateDoc(territoryRef, {
        status: TerritoryStatus.AVAILABLE,
        assignedTo: null,
        assignedToName: null,
        assignmentDate: null,
        dueDate: null,
        history: [...currentHistory, historyEntry]
    });
};

// --- NOTIFICATIONS ---

export const fetchNotifications = async (user: User): Promise<AppNotification[]> => {
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || new Date()
    } as AppNotification)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
};

export const markNotificationsAsRead = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
        await updateDoc(doc(db, 'notifications', id), { read: true });
    }
};

// --- PUBLISHER DATA ---

export const fetchPublisherData = async (userId: string): Promise<{ myTerritory: Territory | null, hasPendingRequest: boolean }> => {
    const territoriesQ = query(collection(db, 'territories'), where('assignedTo', '==', userId), where('status', '==', TerritoryStatus.IN_USE));
    const territorySnapshot = await getDocs(territoriesQ);
    
    let myTerritory: Territory | null = null;
    if (!territorySnapshot.empty) {
        const doc = territorySnapshot.docs[0];
        const data = doc.data();
        myTerritory = {
            id: doc.id,
            name: data.name || 'Sem Nome',
            status: data.status,
            pdfUrl: data.pdfUrl,
            createdAt: data.createdAt?.toDate() || new Date(),
            assignedTo: data.assignedTo,
            assignedToName: data.assignedToName,
            assignmentDate: data.assignmentDate?.toDate() || null,
            dueDate: data.dueDate?.toDate() || null,
            permanentNotes: data.permanentNotes || '',
            history: hydrateHistory(data.history || [])
        };
    }
    
    const requestQ = query(collection(db, 'requests'), where('userId', '==', userId), where('status', '==', RequestStatus.PENDING));
    const requestSnapshot = await getDocs(requestQ);
    
    return { myTerritory, hasPendingRequest: !requestSnapshot.empty };
};