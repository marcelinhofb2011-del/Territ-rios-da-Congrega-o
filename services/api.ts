import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut,
    updateProfile,
    sendPasswordResetEmail
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
import { supabase } from '../supabase/config';

let rawBucket = import.meta.env.VITE_SUPABASE_BUCKET;
console.log("DEBUG: VITE_SUPABASE_BUCKET raw value:", rawBucket);

let SUPABASE_BUCKET = 'maps';
if (rawBucket && rawBucket !== 'undefined' && rawBucket !== 'null' && String(rawBucket).trim() !== '') {
    SUPABASE_BUCKET = String(rawBucket).trim().replace(/['"]/g, '').toLowerCase();
} else {
    console.warn("AVISO: VITE_SUPABASE_BUCKET não definido ou inválido. Usando padrão 'maps'.");
    SUPABASE_BUCKET = 'maps';
}

if (!SUPABASE_BUCKET || SUPABASE_BUCKET === '') {
    console.error("ERRO CRÍTICO: Nome do bucket está vazio! Forçando 'maps'.");
    SUPABASE_BUCKET = 'maps';
}

console.log("Supabase Bucket final:", SUPABASE_BUCKET);
import { User, Territory, TerritoryStatus, RequestStatus, TerritoryRequest, AppNotification, TerritoryHistory } from '../types';
import { getDocFromServer } from 'firebase/firestore';

// --- ERROR HANDLING ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  console.log("api.ts: Testing connection to Firestore...");
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("api.ts: Connection to Firestore successful");
  } catch (error) {
    console.error("api.ts: Connection to Firestore failed", error);
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

// --- AUTH FUNCTIONS ---

export const saveFCMToken = async (userId: string, token: string) => {
    const userRef = doc(db, 'users', userId);
    try {
        await updateDoc(userRef, {
            fcmTokens: arrayUnion(token)
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
};

export const getOrCreateUserProfile = async (firebaseUser: any): Promise<User> => {
    const userId = firebaseUser.uid;
    const userEmail = firebaseUser.email?.toLowerCase() || '';
    const userRef = doc(db, 'users', userId);
    
    let userDoc = await getDoc(userRef);
    
    // Se não existir documento com o UID, procuramos por um documento com o mesmo e-mail
    if (!userDoc.exists()) {
        const q = query(collection(db, 'users'), where('email', '==', userEmail), limit(1));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            // Encontrou um cadastro antigo com o mesmo e-mail mas ID diferente
            const oldDoc = querySnapshot.docs[0];
            const oldData = oldDoc.data();
            
            // Migramos os dados para o novo documento com o UID correto
            const userData: User = {
                ...oldData,
                id: userId,
                uid: userId,
                role: (userEmail === 'marcelinhofb2011@gmail.com') ? 'admin' : (oldData.role || 'user'),
                active: true
            } as User;

            await setDoc(userRef, {
                ...userData,
                createdAt: oldData.createdAt || Timestamp.now()
            });

            // Se o ID antigo for diferente do UID, deletamos o antigo para limpar a bagunça
            if (oldDoc.id !== userId) {
                try {
                    await deleteDoc(doc(db, 'users', oldDoc.id));
                } catch (e) {
                    console.warn("Não foi possível deletar o registro duplicado antigo:", e);
                }
            }
            
            return userData;
        } else {
            // Realmente é um usuário novo
            const isOwner = userEmail === 'marcelinhofb2011@gmail.com';
            const userData: User = {
                id: userId,
                uid: userId,
                name: firebaseUser.displayName || userEmail.split('@')[0] || 'Usuário',
                email: userEmail,
                role: isOwner ? 'admin' : 'user', 
                active: true,
                createdAt: new Date()
            };
            await setDoc(userRef, {
                ...userData,
                createdAt: Timestamp.fromDate(userData.createdAt)
            });
            return userData;
        }
    }
    
    const data = userDoc.data();
    let currentRole = data.role;
    
    // Força admin para o seu e-mail principal
    if (userEmail === 'marcelinhofb2011@gmail.com' && currentRole !== 'admin') {
        currentRole = 'admin';
        await updateDoc(userRef, { role: 'admin' });
    }

    return { 
        ...data, 
        id: userDoc.id,
        role: currentRole,
        name: data.name || firebaseUser.displayName || userEmail.split('@')[0] || 'Usuário',
        createdAt: parseDate(data.createdAt) || new Date()
    } as User;
};

export const apiLogin = async (email: string, pass: string): Promise<User> => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return await getOrCreateUserProfile(userCredential.user);
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
        
        let usersSnapshot;
        try {
            usersSnapshot = await getDocs(query(collection(db, 'users'), limit(1)));
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'users');
            return {} as User; // Should not reach here
        }
        const isFirstUser = usersSnapshot.empty;
        const isOwner = email.toLowerCase() === 'marcelinhofb2011@gmail.com';
        
        const newUser: User = {
            id: userId,
            uid: userId,
            name: name || 'Usuário',
            email: email,
            role: (isFirstUser || isOwner) ? 'admin' : 'user', 
            active: true,
            createdAt: new Date()
        };
        
        try {
            await setDoc(doc(db, 'users', userId), {
                ...newUser,
                createdAt: Timestamp.fromDate(newUser.createdAt)
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${userId}`);
        }
        
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

export const apiResetPassword = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        console.error("Erro no apiResetPassword:", error);
        if (error.code === 'auth/user-not-found') {
            throw new Error("Nenhuma conta encontrada com este e-mail.");
        }
        if (error.code === 'auth/invalid-email') {
            throw new Error("E-mail inválido.");
        }
        throw new Error("Erro ao enviar e-mail de recuperação. Tente novamente.");
    }
};

// --- HELPERS ---
export const parseDate = (dateField: any): Date | null => {
    if (!dateField) return null;
    if (dateField instanceof Timestamp) return dateField.toDate();
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    return new Date(dateField);
};

export const hydrateHistory = (rawHistory: any[]): TerritoryHistory[] => {
    if (!rawHistory || rawHistory.length === 0) return [];
    
    return rawHistory.map((h: any) => {
        const completedDate = parseDate(h.completedDate) || new Date();
        let assignmentDate = parseDate(h.assignmentDate) || completedDate;

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
        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'territories');
            return [];
        }
        
        const list = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                name: data.name || 'Sem Nome',
                createdAt: parseDate(data.createdAt) || new Date(),
                assignmentDate: parseDate(data.assignmentDate),
                dueDate: parseDate(data.dueDate),
                lastCompletedDate: parseDate(data.lastCompletedDate),
                assignmentOrder: data.assignmentOrder,
                history: hydrateHistory(data.history || [])
            } as Territory;
        });

        return list;
    } catch (error) {
        console.error("Erro ao buscar territórios:", error);
        throw error;
    }
};

export const createTerritory = async (
    name: string, 
    url: string, 
    number: string = '', 
    locality: string = '', 
    description: string = '', 
    observation: string = '',
    permanentNotes: string = ''
): Promise<void> => {
    try {
        const trimmedName = name.trim();
        const trimmedNumber = number.trim();

        // Check for existing territory with same name
        const qName = query(collection(db, 'territories'), where('name', '==', trimmedName));
        const snapshotName = await getDocs(qName);
        if (!snapshotName.empty) {
            throw new Error(`Já existe um território com o nome "${trimmedName}".`);
        }
        
        // Check for existing territory with same number (if provided)
        if (trimmedNumber) {
            const qNum = query(collection(db, 'territories'), where('number', '==', trimmedNumber));
            const snapshotNum = await getDocs(qNum);
            if (!snapshotNum.empty) {
                throw new Error(`Já existe um território com o número "${trimmedNumber}".`);
            }
        }

        const newTerritory = {
            name: trimmedName,
            number: trimmedNumber,
            locality: locality.trim(),
            description: description.trim(),
            observation: observation.trim(),
            status: TerritoryStatus.AVAILABLE,
            pdfUrl: url,
            createdAt: Timestamp.now(),
            history: [],
            permanentNotes: permanentNotes.trim(),
            assignedTo: null,
            assignedToName: null,
            assignmentDate: null,
            dueDate: null,
            lastCompletedDate: null
        };
        try {
            await addDoc(collection(db, 'territories'), newTerritory);
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'territories');
        }
    } catch (error) {
        console.error("Erro ao criar território:", error);
        throw error;
    }
};

export const uploadTerritory = async (
    name: string, 
    file: File,
    number: string = '', 
    locality: string = '', 
    description: string = '', 
    observation: string = '',
    permanentNotes: string = ''
): Promise<void> => {
    try {
        if (!supabase) {
            throw new Error("Supabase não está configurado. Verifique as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `territories/${fileName}`;
        
        console.log("Iniciando upload para o bucket:", SUPABASE_BUCKET, "Caminho:", filePath);
        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(filePath, file);

        if (error) {
            console.error("Erro no upload para o Supabase:", error);
            if (error.message === 'Bucket not found') {
                throw new Error(`O bucket "${SUPABASE_BUCKET}" não foi encontrado no seu projeto Supabase. Certifique-se de que ele foi criado e está configurado como público.`);
            }
            throw error;
        }

        const { data: { publicUrl } } = supabase.storage
            .from(SUPABASE_BUCKET)
            .getPublicUrl(filePath);

        await createTerritory(name, publicUrl, number, locality, description, observation, permanentNotes);
        
    } catch (error: any) {
        console.error("Erro no upload para Supabase:", error);
        throw new Error(error.message || "Erro ao salvar arquivo no Supabase. Verifique a configuração.");
    }
};

export const updateTerritory = async (territoryId: string, data: Partial<Territory>): Promise<void> => {
    const territoryRef = doc(db, 'territories', territoryId);
    try {
        await updateDoc(territoryRef, data);
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `territories/${territoryId}`);
    }
};

export const deleteTerritory = async (territoryId: string): Promise<void> => {
    const docRef = doc(db, 'territories', territoryId);
    let territoryDoc;
    try {
        territoryDoc = await getDoc(docRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.GET, `territories/${territoryId}`);
        return;
    }
    if (territoryDoc.exists()) {
        const data = territoryDoc.data();
        if (data.pdfUrl) {
            if (data.pdfUrl.includes('firebasestorage')) {
                try {
                    const fileRef = ref(storage, data.pdfUrl);
                    await deleteObject(fileRef);
                } catch (e) { console.error("Erro ao deletar arquivo do Firebase:", e); }
            } else if (data.pdfUrl.includes('supabase.co')) {
                try {
                    if (supabase) {
                        // Extract path from Supabase URL
                        // URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]
                        const urlParts = data.pdfUrl.split('/public/' + SUPABASE_BUCKET + '/');
                        if (urlParts.length === 2) {
                            const filePath = urlParts[1];
                            await supabase.storage.from(SUPABASE_BUCKET).remove([filePath]);
                        }
                    } else {
                        console.warn("Supabase não configurado, não foi possível deletar o arquivo.");
                    }
                } catch (e) { console.error("Erro ao deletar arquivo do Supabase:", e); }
            }
        }
    }
    try {
        await deleteDoc(docRef);
    } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `territories/${territoryId}`);
    }
};

export const adminResetTerritory = async (territoryId: string, adminUser: User): Promise<void> => {
    const territoryRef = doc(db, 'territories', territoryId);
    
    try {
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
                lastCompletedDate: Timestamp.now(),
                history: newHistory
            });
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `territories/${territoryId}`);
    }
};


// --- USER MANAGEMENT ---

export const fetchAllUsers = async (): Promise<User[]> => {
    try {
        let querySnapshot;
        try {
            querySnapshot = await getDocs(collection(db, 'users'));
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'users');
            return [];
        }
        
        const usersMap = new Map<string, User>();
        
        querySnapshot.docs.forEach(doc => {
            const data = doc.data();
            const email = (data.email || '').toLowerCase();
            const user = { 
                ...data, 
                id: doc.id,
                name: data.name || data.email?.split('@')[0] || 'Sem Nome',
                createdAt: parseDate(data.createdAt) || new Date()
            } as User;

            // Se o e-mail já existe, priorizamos o que tem role 'admin' ou o que tem o ID igual ao UID (se disponível)
            if (usersMap.has(email)) {
                const existing = usersMap.get(email)!;
                if (user.role === 'admin' && existing.role !== 'admin') {
                    usersMap.set(email, user);
                }
            } else {
                usersMap.set(email, user);
            }
        });

        return Array.from(usersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);
        throw error;
    }
};

export const updateUserRole = async (userId: string, role: 'admin' | 'user'): Promise<void> => {
    try {
        await updateDoc(doc(db, 'users', userId), { role });
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
};

// --- REQUESTS & ASSIGNMENTS ---

export const fetchAllRequests = async (): Promise<TerritoryRequest[]> => {
    try {
        const q = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        let querySnapshot;
        try {
            querySnapshot = await getDocs(q);
        } catch (error) {
            handleFirestoreError(error, OperationType.LIST, 'requests');
            return [];
        }
        return querySnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            requestDate: parseDate(doc.data().requestDate) || new Date()
        } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
    } catch (error) {
        console.error("Erro ao buscar solicitações:", error);
        throw error;
    }
};

export const requestTerritory = async (user: User): Promise<void> => {
    const q = query(collection(db, 'requests'), where('userId', '==', user.id), where('status', '==', RequestStatus.PENDING));
    let existing;
    try {
        existing = await getDocs(q);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'requests');
        return;
    }
    if (!existing.empty) throw new Error("Você já possui uma solicitação pendente.");

    try {
        await addDoc(collection(db, 'requests'), {
            userId: user.id,
            userName: user.name,
            requestDate: Timestamp.now(),
            status: RequestStatus.PENDING
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'requests');
    }

    // Notificar todos os administradores
    const qAdmins = query(collection(db, 'users'), where('role', '==', 'admin'));
    let adminsSnapshot;
    try {
        adminsSnapshot = await getDocs(qAdmins);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'users');
        return;
    }
    
    adminsSnapshot.forEach(async adminDoc => {
        const adminId = adminDoc.id;
        try {
            await addDoc(collection(db, 'notifications'), {
                userId: adminId,
                message: `${user.name} solicitou um novo território.`,
                type: 'info',
                read: false,
                createdAt: Timestamp.now()
            });
        } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, 'notifications');
        }
    });
};

export const assignTerritoryToRequest = async (requestId: string, territoryIds: string[]): Promise<void> => {
    try {
        // Deduplicate IDs to prevent redundant reads/writes
        const uniqueIds = Array.from(new Set(territoryIds));
        
        await runTransaction(db, async (transaction) => {
            // 1. ALL READS MUST BE FIRST
            const requestRef = doc(db, 'requests', requestId);
            const requestDoc = await transaction.get(requestRef);
            
            if (!requestDoc.exists()) throw new Error("Solicitação não encontrada.");
            const reqData = requestDoc.data();

            // Fetch all territories in the transaction before any writes
            const territoryDocs = [];
            for (const id of uniqueIds) {
                const tRef = doc(db, 'territories', id);
                const tDoc = await transaction.get(tRef);
                if (tDoc.exists()) {
                    territoryDocs.push({ ref: tRef, doc: tDoc });
                }
            }

            if (territoryDocs.length === 0) throw new Error("Nenhum território válido selecionado.");

            // 2. ALL WRITES MUST BE AFTER ALL READS
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30); 
            const territoryNames: string[] = [];
            const now = Timestamp.now();

            territoryDocs.forEach((item, index) => {
                const tData = item.doc.data();
                territoryNames.push(tData.name);

                transaction.update(item.ref, {
                    status: TerritoryStatus.IN_USE,
                    assignedTo: reqData.userId,
                    assignedToName: reqData.userName,
                    assignmentDate: now,
                    dueDate: Timestamp.fromDate(dueDate),
                    assignmentOrder: index // Preserve selection order
                });
            });

            // Update the request status
            transaction.update(requestRef, { status: RequestStatus.APPROVED });
            
            // Create a notification
            const notifRef = doc(collection(db, 'notifications'));
            transaction.set(notifRef, {
                userId: reqData.userId,
                message: territoryNames.length > 1 
                    ? `Os territórios ${territoryNames.join(', ')} foram atribuídos com sucesso.`
                    : `Território ${territoryNames[0]} atribuído com sucesso.`,
                type: 'success',
                read: false,
                createdAt: Timestamp.now()
            });

            // Trigger push notification after transaction completes
            setTimeout(() => {
                sendPushNotification(
                    reqData.userId, 
                    territoryNames.length > 1 ? "Territórios Atribuídos! 🗺️" : "Território Atribuído! 🗺️", 
                    territoryNames.length > 1
                        ? `Os mapas ${territoryNames.join(', ')} foram designados para você.`
                        : `O mapa ${territoryNames[0]} foi designado para você.`
                );
            }, 1000);
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `requests/${requestId}`);
    }
};

export const manualAssignTerritories = async (userId: string, userName: string, territoryIds: string[], assignmentDate: Date, dueDate: Date): Promise<void> => {
    try {
        const uniqueIds = Array.from(new Set(territoryIds));
        
        await runTransaction(db, async (transaction) => {
            const territoryDocs = [];
            for (const id of uniqueIds) {
                const tRef = doc(db, 'territories', id);
                const tDoc = await transaction.get(tRef);
                if (tDoc.exists()) {
                    territoryDocs.push({ ref: tRef, doc: tDoc });
                }
            }

            if (territoryDocs.length === 0) throw new Error("Nenhum território válido selecionado.");

            const territoryNames: string[] = [];
            const now = Timestamp.fromDate(assignmentDate);
            const due = Timestamp.fromDate(dueDate);

            territoryDocs.forEach((item, index) => {
                const tData = item.doc.data();
                territoryNames.push(tData.name);

                transaction.update(item.ref, {
                    status: TerritoryStatus.IN_USE,
                    assignedTo: userId,
                    assignedToName: userName,
                    assignmentDate: now,
                    dueDate: due,
                    assignmentOrder: index,
                    workedOn: false
                });
            });

            // Create a notification
            const notifRef = doc(collection(db, 'notifications'));
            transaction.set(notifRef, {
                userId: userId,
                message: territoryNames.length > 1 
                    ? `Os territórios ${territoryNames.join(', ')} foram atribuídos com sucesso.`
                    : `Território ${territoryNames[0]} atribuído com sucesso.`,
                type: 'success',
                read: false,
                createdAt: Timestamp.now()
            });

            // Trigger push notification after transaction completes
            setTimeout(() => {
                sendPushNotification(
                    userId, 
                    territoryNames.length > 1 ? "Territórios Atribuídos! 🗺️" : "Território Atribuído! 🗺️", 
                    territoryNames.length > 1
                        ? `Os mapas ${territoryNames.join(', ')} foram designados para você.`
                        : `O mapa ${territoryNames[0]} foi designado para você.`
                );
            }, 1000);
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `manual_assignment/${userId}`);
    }
};

export const updateAssignmentDates = async (territoryId: string, assignmentDate: Date, dueDate: Date): Promise<void> => {
    const territoryRef = doc(db, 'territories', territoryId);
    try {
        const tDoc = await getDoc(territoryRef);
        if (!tDoc.exists()) return;
        const tData = tDoc.data();

        await updateDoc(territoryRef, {
            assignmentDate: Timestamp.fromDate(assignmentDate),
            dueDate: Timestamp.fromDate(dueDate)
        });

        if (tData.assignedTo) {
            // Create a notification
            const notifRef = doc(collection(db, 'notifications'));
            await setDoc(notifRef, {
                userId: tData.assignedTo,
                message: `As datas do território ${tData.name} foram atualizadas.`,
                type: 'info',
                read: false,
                createdAt: Timestamp.now()
            });

            // Trigger push notification
            sendPushNotification(
                tData.assignedTo, 
                "Datas Atualizadas 📅", 
                `A data de entrega do território ${tData.name} foi alterada.`
            );
        }
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `territories/${territoryId}`);
    }
};

export const rejectRequest = async (requestId: string): Promise<void> => {
    try {
        const requestRef = doc(db, 'requests', requestId);
        const requestDoc = await getDoc(requestRef);
        
        if (!requestDoc.exists()) return;
        const reqData = requestDoc.data();

        await updateDoc(requestRef, { status: RequestStatus.REJECTED });

        // Create a notification
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
            userId: reqData.userId,
            message: `Sua solicitação de território foi recusada.`,
            type: 'warning',
            read: false,
            createdAt: Timestamp.now()
        });

        // Trigger push notification
        sendPushNotification(
            reqData.userId, 
            "Solicitação Recusada ❌", 
            "Infelizmente sua solicitação de território não pôde ser atendida no momento."
        );
    } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `requests/${requestId}`);
    }
};

export const toggleWorkedOn = async (territoryId: string, workedOn: boolean): Promise<void> => {
    try {
        const territoryRef = doc(db, 'territories', territoryId);
        await updateDoc(territoryRef, { workedOn });
    } catch (error: any) {
        handleFirestoreError(error, OperationType.UPDATE, `territories/${territoryId}`);
    }
};

export const submitReport = async (user: User, territoryId: string, notes: string): Promise<void> => {
    const territoryRef = doc(db, 'territories', territoryId);
    
    try {
        await runTransaction(db, async (transaction) => {
            const territoryDoc = await transaction.get(territoryRef);
            if (!territoryDoc.exists()) throw new Error("Território não encontrado.");
            
            const territoryData = territoryDoc.data();
            
            const historyEntry = {
                userId: user.id,
                userName: user.name,
                assignmentDate: territoryData.assignmentDate || Timestamp.now(),
                completedDate: Timestamp.now(),
                notes: notes.trim()
            };
            
            const currentHistory = territoryData.history || [];

            transaction.update(territoryRef, {
                status: TerritoryStatus.AVAILABLE,
                assignedTo: null,
                assignedToName: null,
                assignmentDate: null,
                dueDate: null,
                lastCompletedDate: Timestamp.now(),
                history: [...currentHistory, historyEntry]
            });
        });
    } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `territories/${territoryId}`);
    }
};

// --- NOTIFICATIONS ---

export const sendPushNotification = async (userId: string, title: string, body: string) => {
    try {
        let userDoc;
        try {
            userDoc = await getDoc(doc(db, 'users', userId));
        } catch (error) {
            handleFirestoreError(error, OperationType.GET, `users/${userId}`);
            return;
        }
        if (!userDoc.exists()) return;
        
        const tokens = userDoc.data().fcmTokens || [];
        if (tokens.length === 0) return;

        await fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokens,
                title,
                body
            })
        });
    } catch (error) {
        console.error("Erro ao enviar push notification:", error);
    }
};

export const fetchNotifications = async (user: User): Promise<AppNotification[]> => {
    const q = query(collection(db, 'notifications'), where('userId', '==', user.id));
    let querySnapshot;
    try {
        querySnapshot = await getDocs(q);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
        return [];
    }
    return querySnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: parseDate(doc.data().createdAt) || new Date()
    } as AppNotification)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
};

export const markNotificationsAsRead = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
        try {
            await updateDoc(doc(db, 'notifications', id), { read: true });
        } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `notifications/${id}`);
        }
    }
};

// --- PUBLISHER DATA ---

export const fetchPublisherData = async (userId: string): Promise<{ myTerritory: Territory | null, hasPendingRequest: boolean }> => {
    const territoriesQ = query(collection(db, 'territories'), where('assignedTo', '==', userId), where('status', '==', TerritoryStatus.IN_USE));
    let territorySnapshot;
    try {
        territorySnapshot = await getDocs(territoriesQ);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'territories');
        return { myTerritory: null, hasPendingRequest: false };
    }
    
    let myTerritory: Territory | null = null;
    if (!territorySnapshot.empty) {
        const doc = territorySnapshot.docs[0];
        const data = doc.data();
        myTerritory = {
            id: doc.id,
            name: data.name || 'Sem Nome',
            number: data.number || '',
            locality: data.locality || '',
            description: data.description || '',
            observation: data.observation || '',
            status: data.status,
            pdfUrl: data.pdfUrl,
            createdAt: parseDate(data.createdAt) || new Date(),
            assignedTo: data.assignedTo,
            assignedToName: data.assignedToName,
            assignmentDate: parseDate(data.assignmentDate),
            dueDate: parseDate(data.dueDate),
            lastCompletedDate: parseDate(data.lastCompletedDate),
            permanentNotes: data.permanentNotes || '',
            history: hydrateHistory(data.history || [])
        } as Territory;
    }
    
    const requestQ = query(collection(db, 'requests'), where('userId', '==', userId), where('status', '==', RequestStatus.PENDING));
    let requestSnapshot;
    try {
        requestSnapshot = await getDocs(requestQ);
    } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'requests');
        return { myTerritory, hasPendingRequest: false };
    }
    
    return { myTerritory, hasPendingRequest: !requestSnapshot.empty };
};