
import { User, Territory, TerritoryStatus, RequestStatus, TerritoryRequest, Notification, TerritoryHistory } from '../types';

// --- DATABASE SIMULATION ---
const STORAGE_KEYS = {
    TERRITORIES: 'territory_db_maps',
    REQUESTS: 'territory_db_requests',
    USERS: 'territory_db_users',
    CURRENT_USER: 'territory_current_session'
};

const getLocal = (key: string) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
};

const setLocal = (key: string, data: any) => {
    localStorage.setItem(key, JSON.stringify(data));
};

// Initial Data Seed
const seedDatabase = () => {
    if (!getLocal(STORAGE_KEYS.TERRITORIES)) {
        const initialTerritories: Territory[] = [
            {
                id: '1',
                name: 'Território 01 - Centro',
                status: TerritoryStatus.AVAILABLE,
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                createdAt: new Date(),
                history: [],
                permanentNotes: 'Área comercial movimentada.'
            },
            {
                id: '2',
                name: 'Território 02 - Vila Real',
                status: TerritoryStatus.AVAILABLE,
                pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
                createdAt: new Date(),
                history: [],
                permanentNotes: 'Muitos prédios com interfone.'
            }
        ];
        setLocal(STORAGE_KEYS.TERRITORIES, initialTerritories);
    }
    
    if (!getLocal(STORAGE_KEYS.USERS)) {
        setLocal(STORAGE_KEYS.USERS, [
            { id: 'admin-id', name: 'Administrador Local', email: 'admin@teste.com', role: 'admin' }
        ]);
    }

    if (!getLocal(STORAGE_KEYS.REQUESTS)) {
        setLocal(STORAGE_KEYS.REQUESTS, []);
    }
};

seedDatabase();

// --- AUTH FUNCTIONS ---

export const apiLogin = async (email: string, pass: string): Promise<User> => {
    const users: User[] = getLocal(STORAGE_KEYS.USERS);
    const user = users.find(u => u.email === email);
    
    if (!user) throw new Error("Usuário não encontrado.");
    // No ambiente local não checamos senha real para facilitar o teste
    setLocal(STORAGE_KEYS.CURRENT_USER, user);
    return user;
};

export const apiSignUp = async (name: string, email: string, pass: string): Promise<User> => {
    const users: User[] = getLocal(STORAGE_KEYS.USERS);
    if (users.some(u => u.email === email)) throw new Error("E-mail já cadastrado.");
    
    const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email,
        role: users.length === 0 ? 'admin' : 'publicador'
    };
    
    users.push(newUser);
    setLocal(STORAGE_KEYS.USERS, users);
    setLocal(STORAGE_KEYS.CURRENT_USER, newUser);
    return newUser;
};

export const apiLogout = async (): Promise<void> => {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// --- TERRITORY FUNCTIONS ---

export const fetchAllTerritories = async (): Promise<Territory[]> => {
    const data = getLocal(STORAGE_KEYS.TERRITORIES) || [];
    return data.map((t: any) => ({
        ...t,
        createdAt: new Date(t.createdAt),
        assignmentDate: t.assignmentDate ? new Date(t.assignmentDate) : null,
        dueDate: t.dueDate ? new Date(t.dueDate) : null,
        history: t.history.map((h: any) => ({ ...h, completedDate: new Date(h.completedDate) }))
    }));
};

export const uploadTerritory = async (name: string, file: File): Promise<void> => {
    // Simulação de upload: usamos um PDF genérico para o demo local
    const territories = await fetchAllTerritories();
    const newTerritory: Territory = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        status: TerritoryStatus.AVAILABLE,
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        createdAt: new Date(),
        history: [],
    };
    territories.push(newTerritory);
    setLocal(STORAGE_KEYS.TERRITORIES, territories);
};

export const fetchPublisherData = async (userId: string): Promise<{ myTerritory: Territory | null, hasPendingRequest: boolean }> => {
    const territories = await fetchAllTerritories();
    const requests = getLocal(STORAGE_KEYS.REQUESTS) || [];
    
    const myTerritory = territories.find(t => t.assignedTo === userId && t.status === TerritoryStatus.IN_USE) || null;
    const hasPendingRequest = requests.some((r: any) => r.userId === userId && r.status === RequestStatus.PENDING);
    
    return { myTerritory, hasPendingRequest };
};

export const submitReport = async (user: User, territory: Territory, notes: string): Promise<void> => {
    const territories = await fetchAllTerritories();
    const idx = territories.findIndex(t => t.id === territory.id);
    
    if (idx !== -1) {
        const newHistory: TerritoryHistory = {
            userId: user.id,
            userName: user.name,
            completedDate: new Date(),
            notes
        };
        
        territories[idx].status = TerritoryStatus.CLOSED;
        territories[idx].assignedTo = null;
        territories[idx].assignedToName = null;
        territories[idx].assignmentDate = null;
        territories[idx].dueDate = null;
        territories[idx].history = [newHistory, ...territories[idx].history];
        
        setLocal(STORAGE_KEYS.TERRITORIES, territories);
    }
};

export const updateTerritory = async (territoryId: string, data: { name?: string; permanentNotes?: string; }): Promise<void> => {
    const territories = await fetchAllTerritories();
    const idx = territories.findIndex(t => t.id === territoryId);
    if (idx !== -1) {
        if (data.name) territories[idx].name = data.name;
        if (data.permanentNotes !== undefined) territories[idx].permanentNotes = data.permanentNotes;
        setLocal(STORAGE_KEYS.TERRITORIES, territories);
    }
};

export const deleteTerritory = async (territoryId: string): Promise<void> => {
    const territories = await fetchAllTerritories();
    const filtered = territories.filter(t => t.id !== territoryId);
    setLocal(STORAGE_KEYS.TERRITORIES, filtered);
};

// --- REQUEST FUNCTIONS ---

export const requestTerritory = async (user: User): Promise<void> => {
    const requests = getLocal(STORAGE_KEYS.REQUESTS) || [];
    if (requests.some((r: any) => r.userId === user.id && r.status === RequestStatus.PENDING)) {
        throw new Error("Você já tem uma solicitação pendente.");
    }
    
    const newRequest: TerritoryRequest = {
        id: Math.random().toString(36).substr(2, 9),
        userId: user.id,
        userName: user.name,
        requestDate: new Date(),
        status: RequestStatus.PENDING
    };
    
    requests.push(newRequest);
    setLocal(STORAGE_KEYS.REQUESTS, requests);
};

export const fetchAllRequests = async (): Promise<TerritoryRequest[]> => {
    const data = getLocal(STORAGE_KEYS.REQUESTS) || [];
    return data.map((r: any) => ({ ...r, requestDate: new Date(r.requestDate) }));
};

export const assignTerritoryToRequest = async (requestId: string, territoryId: string): Promise<void> => {
    const requests = await fetchAllRequests();
    const territories = await fetchAllTerritories();
    
    const reqIdx = requests.findIndex(r => r.id === requestId);
    const terrIdx = territories.findIndex(t => t.id === territoryId);
    
    if (reqIdx !== -1 && terrIdx !== -1) {
        const assignmentDate = new Date();
        const dueDate = new Date();
        dueDate.setDate(assignmentDate.getDate() + 30);
        
        territories[terrIdx].status = TerritoryStatus.IN_USE;
        territories[terrIdx].assignedTo = requests[reqIdx].userId;
        territories[terrIdx].assignedToName = requests[reqIdx].userName;
        territories[terrIdx].assignmentDate = assignmentDate;
        territories[terrIdx].dueDate = dueDate;
        
        requests.splice(reqIdx, 1); // Remove a solicitação atendida
        
        setLocal(STORAGE_KEYS.TERRITORIES, territories);
        setLocal(STORAGE_KEYS.REQUESTS, requests);
    }
};

export const rejectRequest = async (requestId: string): Promise<void> => {
    const requests = await fetchAllRequests();
    const filtered = requests.filter(r => r.id !== requestId);
    setLocal(STORAGE_KEYS.REQUESTS, filtered);
};

// --- NOTIFICATION FUNCTIONS ---

export const fetchNotifications = async (user: User): Promise<Notification[]> => {
    const notifs: Notification[] = [];
    const requests = await fetchAllRequests();
    
    if (user.role === 'admin') {
        requests.forEach(r => {
            notifs.push({
                id: `req-${r.id}`,
                message: `${r.userName} solicitou um território.`,
                type: 'info',
                read: false,
                createdAt: r.requestDate
            });
        });
    }
    
    return notifs;
};

export const markNotificationsAsRead = async (ids: string[]): Promise<void> => {};

export const fetchAllUsers = async (): Promise<User[]> => {
    return getLocal(STORAGE_KEYS.USERS) || [];
};

export const updateUserRole = async (userId: string, newRole: 'admin' | 'publicador'): Promise<void> => {
    const users = await fetchAllUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
        users[idx].role = newRole;
        setLocal(STORAGE_KEYS.USERS, users);
    }
};
