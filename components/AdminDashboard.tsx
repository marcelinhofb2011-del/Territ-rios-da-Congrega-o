import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus } from '../types';
import { 
    assignTerritoryToRequest, rejectRequest, 
    updateTerritory, deleteTerritory, updateUserRole, adminResetTerritory,
    parseDate, hydrateHistory
} from '../services/api';
import { formatDate, getDaysRemaining } from '../utils/helpers';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import MapViewerModal from './modals/MapViewerModal';
import TerritoryHistoryModal from './modals/TerritoryHistoryModal';
import AddMapModal from './modals/AddMapModal';
import EditMapModal from './modals/EditMapModal';
import ConfirmModal from './modals/ConfirmModal';
import ManualAssignmentModal from './modals/ManualAssignmentModal';
import EditAssignmentDatesModal from './modals/EditAssignmentDatesModal';
import { useAuth } from '../hooks/useAuth';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const FilterIcon: React.FC = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4h18M7 12h10m-7 8h4"></path>
    </svg>
);

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [requests, setRequests] = useState<TerritoryRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'territories' | 'worked' | 'users' | 'stats'>('territories');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [viewHistory, setViewHistory] = useState<Territory | null>(null);
    const [viewingMap, setViewingMap] = useState<Territory | null>(null);
    const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
    const [requestDueDate, setRequestDueDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [selectedMapsForRequest, setSelectedMapsForRequest] = useState<string[]>([]);
    const [showManualAssignModal, setShowManualAssignModal] = useState(false);
    const [editingAssignment, setEditingAssignment] = useState<Territory | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger?: boolean;
        loading?: boolean;
    } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Statistics Data
    const statsData = useMemo(() => {
        const total = territories.length;
        const available = territories.filter(t => t.status === TerritoryStatus.AVAILABLE).length;
        const inUse = territories.filter(t => t.status === TerritoryStatus.IN_USE).length;
        const requested = territories.filter(t => t.status === TerritoryStatus.REQUESTED).length;
        const closed = territories.filter(t => t.status === TerritoryStatus.CLOSED).length;

        const pieData = [
            { name: 'Disponíveis', value: available, color: '#10b981' }, // emerald-500
            { name: 'Em Uso', value: inUse, color: '#3b82f6' }, // blue-500
            { name: 'Solicitados', value: requested, color: '#f59e0b' }, // amber-500
            { name: 'Fechados', value: closed, color: '#ef4444' } // red-500
        ].filter(d => d.value > 0);

        // Group by locality for bar chart
        const localityMap = new Map<string, { name: string, total: number, inUse: number }>();
        territories.forEach(t => {
            const loc = t.locality || 'Outros';
            if (!localityMap.has(loc)) {
                localityMap.set(loc, { name: loc, total: 0, inUse: 0 });
            }
            const stats = localityMap.get(loc)!;
            stats.total++;
            if (t.status === TerritoryStatus.IN_USE) stats.inUse++;
        });

        const barData = Array.from(localityMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        return { total, available, inUse, requested, closed, pieData, barData };
    }, [territories]);

    // Filter and Sort States
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'in_use'>('all');
    const [sortBy, setSortBy] = useState<'default' | 'name' | 'oldest' | 'newest'>('default');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const filterMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterMenuRef.current && !filterMenuRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Listeners for realtime data
    useEffect(() => {
        if (user) {
            console.log("AdminDashboard: Current user role:", user.role);
        }
        const territoriesQuery = query(collection(db, 'territories'));
        const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
            const territoriesList = snapshot.docs.map(doc => {
                const data = doc.data();
                const history = hydrateHistory(data.history || []);

                return {
                    ...data,
                    id: doc.id,
                    name: data.name || 'Sem Nome',
                    createdAt: parseDate(data.createdAt) || new Date(),
                    assignmentDate: parseDate(data.assignmentDate),
                    dueDate: parseDate(data.dueDate),
                    lastCompletedDate: parseDate(data.lastCompletedDate),
                    history: history
                } as Territory;
            });
            setTerritories(territoriesList);
            if (loading) setLoading(false);
        }, (err) => {
            console.error("Erro no listener de territórios:", err);
            if (loading) setLoading(false);
        });

        // Other listeners...
        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersMap = new Map<string, User>();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const email = (data.email || '').toLowerCase();
                const u = { 
                    ...data, 
                    id: doc.id, 
                    name: data.name || data.email?.split('@')[0] || 'Sem Nome', 
                    createdAt: parseDate(data.createdAt) || new Date() 
                } as User;

                if (usersMap.has(email)) {
                    const existing = usersMap.get(email)!;
                    if (u.role === 'admin' && existing.role !== 'admin') {
                        usersMap.set(email, u);
                    }
                } else {
                    usersMap.set(email, u);
                }
            });
            setUsers(Array.from(usersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }, (err) => {
            console.error("Erro no listener de usuários:", err);
        });
        const requestsQuery = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, requestDate: parseDate(doc.data().requestDate) || new Date() } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
            console.log("AdminDashboard: Pending requests:", reqs.length);
            setRequests(reqs);
        }, (err) => {
            console.error("Erro no listener de solicitações:", err);
        });

        return () => {
            unsubscribeTerritories();
            unsubscribeUsers();
            unsubscribeRequests();
        };
    }, [loading, user]);
    
    // Handlers
    const handleFulfillRequest = async (requestId: string) => {
        if (selectedMapsForRequest.length === 0) return;
        try {
            // Use the selected requestDueDate
            const dueDate = new Date(requestDueDate + 'T12:00:00');
            await assignTerritoryToRequest(
                requestId, 
                selectedMapsForRequest, 
                dueDate
            );
            setFulfillingRequestId(null); 
            setSelectedMapsForRequest([]);
        } catch (e: any) { 
            setErrorMsg(e.message); 
        }
    };
    const handleReject = async (id: string) => { 
        setConfirmAction({
            title: "Rejeitar Solicitação",
            message: "Tem certeza que deseja recusar este pedido de território?",
            isDanger: true,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Rejeitando solicitação:", id);
                    await rejectRequest(id);
                    setConfirmAction(null);
                } catch (e: any) {
                    console.error("Erro ao rejeitar:", e);
                    setErrorMsg("Erro ao rejeitar solicitação: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handleDeleteTerritory = async (id: string) => { 
        setConfirmAction({
            title: "Excluir Território",
            message: "Esta ação é irreversível. Tem certeza que deseja apagar este mapa?",
            isDanger: true,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Excluindo território:", id);
                    await deleteTerritory(id);
                    setConfirmAction(null);
                } catch (e: any) {
                    console.error("Erro ao excluir:", e);
                    setErrorMsg("Erro ao excluir território: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handleResetTerritory = async (id: string) => {
        if (!user) return setErrorMsg("Erro: usuário administrador não encontrado.");
        setConfirmAction({
            title: "Retomar Território",
            message: "Deseja retomar este território? Ele voltará a ficar disponível e a ação será registrada no histórico.",
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Retomando território:", id);
                    await adminResetTerritory(id, user);
                    setConfirmAction(null);
                } catch (e: any) {
                    console.error("Erro ao retomar:", e);
                    setErrorMsg("Erro ao retomar território: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handlePromote = async (u: User) => {
        const newRole = u.role === 'admin' ? 'user' : 'admin';
        const actionText = newRole === 'admin' ? 'Promover para Administrador' : 'Remover privilégios de Administrador';
        
        setConfirmAction({
            title: actionText,
            message: `Tem certeza que deseja alterar o cargo de ${u.name} para ${newRole}?`,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    await updateUserRole(u.id, newRole);
                    setConfirmAction(null);
                } catch (e: any) {
                    setErrorMsg("Erro ao alterar cargo: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const renderTerritoryCard = (m: Territory) => {
        const isOverdue = m.dueDate && m.dueDate < new Date();
        let borderColor = 'border-slate-200';
        if (isOverdue) {
            borderColor = 'border-red-200';
        } else if (m.status === TerritoryStatus.IN_USE) {
            borderColor = 'border-blue-200';
        } else {
            borderColor = 'border-emerald-200';
        }

        return (
            <div key={m.id} className={`bg-white p-6 rounded-3xl border-2 ${borderColor} ${isOverdue ? 'bg-red-50/50' : ''} shadow-sm transition-all duration-300 hover:shadow-md`}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            {m.number && (
                                <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[11px] font-black tracking-wider shadow-sm">
                                    Nº {m.number}
                                </span>
                            )}
                            {isOverdue ? (
                                <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase tracking-wider border border-red-200">Atrasado</span>
                            ) : m.status === TerritoryStatus.IN_USE ? (
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-100">Em Uso</span>
                            ) : (
                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100">Livre</span>
                            )}
                        </div>
                        <h3 className="font-black text-slate-900 text-2xl tracking-tight leading-tight mb-1">{m.name}</h3>
                        {m.status === TerritoryStatus.AVAILABLE && m.lastCompletedDate && (
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">
                                Devolvido em {formatDate(m.lastCompletedDate)}
                            </p>
                        )}
                        {m.locality && (
                            <div className="flex items-center gap-1.5 text-blue-600">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <p className="text-xs font-black uppercase tracking-widest truncate">{m.locality}</p>
                            </div>
                        )}
                        <button onClick={() => window.open(m.pdfUrl, '_blank')} className="text-[10px] text-slate-400 font-black uppercase tracking-widest hover:text-blue-600 transition-colors mt-3 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                            Ver Documento
                        </button>
                    </div>
                </div>

                {(m.description || m.observation || m.permanentNotes) && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-xl space-y-2">
                        {m.description && (
                            <div>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Descrição</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-tight">{m.description}</p>
                            </div>
                        )}
                        {m.observation && (
                            <div>
                                <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest leading-none mb-1">Observação</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-tight italic">{m.observation}</p>
                            </div>
                        )}
                        {m.permanentNotes && (
                            <div>
                                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Notas Permanentes</p>
                                <p className="text-[10px] font-bold text-slate-600 leading-tight">{m.permanentNotes}</p>
                            </div>
                        )}
                    </div>
                )}

                {m.history && m.history.length > 0 && (
                    <div className="mb-4 p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                        <p className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Última Atividade</p>
                        <div className="space-y-2">
                            {m.history
                                .slice(0, 1)
                                .map((h, i) => (
                                    <div key={i} className="bg-white/60 p-2 rounded-lg border border-blue-50">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[9px] font-black text-slate-900">{h.userName}</span>
                                            <span className="text-[8px] font-bold text-slate-400">{formatDate(h.completedDate)}</span>
                                        </div>
                                        {h.notes ? (
                                            <p className="text-[10px] text-slate-600 font-medium leading-tight italic">"{h.notes}"</p>
                                        ) : (
                                            <p className="text-[10px] text-slate-400 font-medium leading-tight italic">Devolvido sem observações.</p>
                                        )}
                                    </div>
                                ))}
                        </div>
                    </div>
                )}

                <div className="mt-4 flex justify-end gap-1 pt-4 border-t border-slate-50">
                    <button onClick={() => setEditingTerritory(m)} title="Editar" className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></button>
                    <button onClick={() => setViewHistory(m)} title="Histórico" className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                    {m.status === TerritoryStatus.IN_USE && (<button onClick={() => handleResetTerritory(m.id)} title="Retomar" className="p-2 text-slate-400 hover:text-amber-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg></button>)}
                    <button onClick={() => handleDeleteTerritory(m.id)} title="Excluir" className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
            </div>
        );
    };

    // Memoized data processing
    const availableMapsOptions = useMemo(() => {
        return territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE)
            .sort((a, b) => {
                const aDate = a.lastCompletedDate?.getTime() || 0;
                const bDate = b.lastCompletedDate?.getTime() || 0;
                
                if (aDate !== bDate) {
                    return aDate - bDate;
                }
                
                return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
            });
    }, [territories]);

    const displayTerritories = useMemo(() => {
        let processed = [...territories];
        const now = new Date();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        // Filter based on active tab
        if (activeTab === 'territories') {
            processed = processed.filter(t => {
                if (t.status === TerritoryStatus.IN_USE) return true;
                if (t.status === TerritoryStatus.AVAILABLE) {
                    if (!t.lastCompletedDate) return true;
                    const diff = now.getTime() - t.lastCompletedDate.getTime();
                    return diff > THIRTY_DAYS_MS;
                }
                return true; // Other statuses like REQUESTED, CLOSED
            });
        } else if (activeTab === 'worked') {
            processed = processed.filter(t => {
                if (t.status !== TerritoryStatus.AVAILABLE || !t.lastCompletedDate) return false;
                const diff = now.getTime() - t.lastCompletedDate.getTime();
                return diff <= THIRTY_DAYS_MS;
            });
        }
        
        if (searchTerm) {
            processed = processed.filter(t => 
                t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (t.number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.assignedToName?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (filterStatus !== 'all' && activeTab === 'territories') {
            processed = processed.filter(t => {
                switch (filterStatus) {
                    case 'available': return t.status === TerritoryStatus.AVAILABLE;
                    case 'in_use': return t.status === TerritoryStatus.IN_USE;
                    default: return true;
                }
            });
        }

        const sortByNumber = (a: Territory, b: Territory) => {
            const numA = parseInt(a.number) || 0;
            const numB = parseInt(b.number) || 0;
            if (numA !== numB) return numA - numB;
            return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
        };

        processed.sort((a, b) => {
            switch (sortBy) {
                case 'name': return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
                case 'oldest': {
                    const aDate = a.lastCompletedDate?.getTime() || 0;
                    const bDate = b.lastCompletedDate?.getTime() || 0;
                    if (aDate === 0 && bDate > 0) return -1;
                    if (bDate === 0 && aDate > 0) return 1;
                    return aDate - bDate;
                }
                case 'newest': {
                    const aDate = a.lastCompletedDate?.getTime() || 0;
                    const bDate = b.lastCompletedDate?.getTime() || 0;
                    return bDate - aDate;
                }
                default:
                    // Default sort for Worked Maps: Newest return first (most recently worked)
                    if (activeTab === 'worked') {
                        const aDate = a.lastCompletedDate?.getTime() || 0;
                        const bDate = b.lastCompletedDate?.getTime() || 0;
                        return bDate - aDate;
                    }

                    // Default sort for Territories: Available first, then In Use
                    if (a.status === TerritoryStatus.AVAILABLE && b.status !== TerritoryStatus.AVAILABLE) return -1;
                    if (b.status === TerritoryStatus.AVAILABLE && a.status !== TerritoryStatus.AVAILABLE) return 1;
                    
                    // Within Available group in Territories tab, sort by return date (oldest first)
                    if (a.status === TerritoryStatus.AVAILABLE && b.status === TerritoryStatus.AVAILABLE) {
                        const aDate = a.lastCompletedDate?.getTime() || 0;
                        const bDate = b.lastCompletedDate?.getTime() || 0;
                        if (aDate !== bDate) return aDate - bDate;
                    }

                    // Within groups, sort numerically by number
                    return sortByNumber(a, b);
            }
        });
        return processed;
    }, [territories, filterStatus, sortBy, searchTerm, activeTab]);

    const inUseTerritories = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.IN_USE), [displayTerritories]);
    const availableTerritories = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.AVAILABLE), [displayTerritories]);
    const otherTerritories = useMemo(() => displayTerritories.filter(t => t.status !== TerritoryStatus.IN_USE && t.status !== TerritoryStatus.AVAILABLE), [displayTerritories]);

    const stats = useMemo(() => {
        const total = territories.length;
        const available = territories.filter(t => t.status === TerritoryStatus.AVAILABLE).length;
        const inUse = territories.filter(t => t.status === TerritoryStatus.IN_USE).length;
        const requested = territories.filter(t => t.status === TerritoryStatus.REQUESTED).length;
        const closed = territories.filter(t => t.status === TerritoryStatus.CLOSED).length;

        const pieData = [
            { name: 'Disponíveis', value: available, color: '#10b981' }, // emerald-500
            { name: 'Em Uso', value: inUse, color: '#3b82f6' }, // blue-500
            { name: 'Solicitados', value: requested, color: '#f59e0b' }, // amber-500
            { name: 'Fechados', value: closed, color: '#ef4444' } // red-500
        ].filter(d => d.value > 0);

        // Group by locality for bar chart
        const localityMap = new Map<string, { name: string, total: number, inUse: number }>();
        territories.forEach(t => {
            const loc = t.locality || 'Outros';
            if (!localityMap.has(loc)) {
                localityMap.set(loc, { name: loc, total: 0, inUse: 0 });
            }
            const stats = localityMap.get(loc)!;
            stats.total++;
            if (t.status === TerritoryStatus.IN_USE) stats.inUse++;
        });

        const barData = Array.from(localityMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        return { total, available, inUse, requested, closed, pieData, barData };
    }, [territories]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-gray-500 font-bold text-center">Carregando painel...</p>
        </div>
    );

    const dropdownButtonClass = "w-full text-left px-3 py-2 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors";

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={() => {}} />}
            {editingTerritory && <EditMapModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={() => {}} />}
            {showManualAssignModal && <ManualAssignmentModal territories={territories} users={users} onClose={() => setShowManualAssignModal(false)} onSuccess={() => {}} />}
            {editingAssignment && <EditAssignmentDatesModal territory={editingAssignment} onClose={() => setEditingAssignment(null)} onSuccess={() => {}} />}
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}
            {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} number={viewingMap.number} onClose={() => setViewingMap(null)} />}
            
            {confirmAction && (
                <ConfirmModal 
                    title={confirmAction.title}
                    message={confirmAction.message}
                    isDanger={confirmAction.isDanger}
                    loading={confirmAction.loading}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                />
            )}

            {errorMsg && (
                <div className="fixed bottom-4 right-4 z-[110] bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <p className="text-xs font-black uppercase tracking-widest">{errorMsg}</p>
                    <button onClick={() => setErrorMsg(null)} className="ml-4 p-1 hover:bg-white/20 rounded-lg">&times;</button>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-end gap-6 px-1">
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
                    <button onClick={() => setActiveTab('territories')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'territories' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Mapas</button>
                    <button onClick={() => setActiveTab('worked')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'worked' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Trabalhados</button>
                    <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Usuários</button>
                    <button onClick={() => setActiveTab('stats')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'stats' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Estatísticas</button>
                </div>
            </div>

            {activeTab === 'stats' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart: Status Distribution */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Distribuição por Status</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats.pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {stats.pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                                        />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Bar Chart: Localities */}
                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">Top Localidades</h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.barData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="name" 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        />
                                        <YAxis 
                                            axisLine={false} 
                                            tickLine={false} 
                                            tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }}
                                        />
                                        <Tooltip 
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="inUse" name="Em Uso" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-slate-900', bg: 'bg-slate-50' },
                            { label: 'Livres', value: stats.available, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { label: 'Em Uso', value: stats.inUse, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { label: 'Solicitados', value: stats.requested, color: 'text-amber-600', bg: 'bg-amber-50' }
                        ].map(s => (
                            <div key={s.label} className={`${s.bg} p-6 rounded-3xl border border-white/50`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(activeTab === 'territories' || activeTab === 'worked') ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {[{ label: 'Total', value: stats.total, color: 'text-slate-900', border: 'border-slate-200' }, { label: 'Livres', value: stats.available, color: 'text-emerald-600', border: 'border-emerald-200' }, { label: 'Em Uso', value: stats.inUse, color: 'text-blue-600', border: 'border-blue-200' }].map(s => (
                            <div key={s.label} className={`bg-white p-5 rounded-2xl border-2 ${s.border}`}><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
                        ))}
                    </div>

                    {activeTab === 'territories' && requests.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-[11px] font-black text-blue-900 uppercase tracking-[0.2em] px-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>Solicitações Pendentes</h2>
                            <div className="space-y-2">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-slate-200">
                                        <div><p className="font-black text-slate-900">{req.userName}</p><p className="text-[10px] text-slate-400 font-bold">{formatDate(req.requestDate)}</p></div>
                                        <div className="flex flex-1 max-w-sm items-center gap-2">
                                            {fulfillingRequestId === req.id ? (
                                                <div className="flex flex-col gap-2 w-full animate-in slide-in-from-right-1">
                                                    <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                                                        {availableMapsOptions.length === 0 ? (
                                                            <p className="text-[10px] text-slate-400 text-center py-2">Nenhum mapa disponível</p>
                                                        ) : (
                                                            <div className="grid grid-cols-1 gap-1">
                                                                {availableMapsOptions.map(m => (
                                                                    <label key={m.id} className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer transition-colors">
                                                                        <input 
                                                                            type="checkbox" 
                                                                            checked={selectedMapsForRequest.includes(m.id)}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedMapsForRequest(prev => [...prev, m.id]);
                                                                                } else {
                                                                                    setSelectedMapsForRequest(prev => prev.filter(id => id !== m.id));
                                                                                }
                                                                            }}
                                                                            className="w-3 h-3 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                                                        />
                                                                        <span className="text-[10px] font-bold text-slate-700 flex items-center gap-2">
                                                                            <span className="bg-slate-900 text-white w-5 h-5 rounded flex items-center justify-center text-[8px] font-black shrink-0">
                                                                                {m.number || '?'}
                                                                            </span>
                                                                            <span className="truncate">{m.name}</span>
                                                                        </span>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Data de Devolução</label>
                                                        <input 
                                                            type="date" 
                                                            value={requestDueDate}
                                                            onChange={(e) => setRequestDueDate(e.target.value)}
                                                            className="w-full p-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold focus:outline-none focus:border-blue-500"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button 
                                                            onClick={() => handleFulfillRequest(req.id)} 
                                                            disabled={selectedMapsForRequest.length === 0} 
                                                            className="flex-1 py-2 bg-emerald-600 text-white font-black text-[10px] rounded-lg disabled:opacity-50"
                                                        >
                                                            Confirmar ({selectedMapsForRequest.length})
                                                        </button>
                                                        <button onClick={() => { setFulfillingRequestId(null); setSelectedMapsForRequest([]); }} className="px-3 py-2 bg-slate-100 text-slate-500 font-black text-[10px] rounded-lg">Cancelar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button onClick={() => { setFulfillingRequestId(req.id); setSelectedMapsForRequest([]); }} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm">Atribuir</button>
                                                    <button onClick={() => handleReject(req.id)} className="px-4 py-2.5 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-wider rounded-lg">Recusar</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">
                                {activeTab === 'territories' ? 'Territórios' : 'Mapas Trabalhados (Últimos 30 dias)'}
                            </h2>
                            <div className="flex flex-1 max-w-md relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Buscar por número, nome ou publicador..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <div className="relative" ref={filterMenuRef}>
                                    <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50">
                                        <FilterIcon />
                                        Filtrar e Ordenar
                                    </button>
                                    {showFilterMenu && (
                                        <>
                                            {/* Backdrop for mobile to handle clicks and focus */}
                                            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 sm:hidden" onClick={() => setShowFilterMenu(false)}></div>
                                            
                                            <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:translate-y-0 mt-2 w-auto sm:w-64 bg-white rounded-3xl sm:rounded-2xl shadow-2xl border border-slate-100 z-50 p-4 sm:p-2 animate-in fade-in zoom-in-95 slide-in-from-bottom-8 sm:slide-in-from-top-2 origin-center sm:origin-top-right">
                                                <div className="flex items-center justify-between mb-4 sm:hidden">
                                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Filtros e Ordenação</h3>
                                                    <button onClick={() => setShowFilterMenu(false)} className="p-2 text-slate-400 hover:text-slate-600">&times;</button>
                                                </div>
                                                <div className="space-y-4 sm:space-y-2">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 pb-1">Filtrar por Status</p>
                                                        <div className="flex flex-col gap-1 sm:gap-0">
                                                            <button onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'all' ? 'bg-blue-50 text-blue-700' : ''}`}>Todos</button>
                                                            <button onClick={() => { setFilterStatus('available'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'available' ? 'bg-blue-50 text-blue-700' : ''}`}>Livres</button>
                                                            <button onClick={() => { setFilterStatus('in_use'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'in_use' ? 'bg-blue-50 text-blue-700' : ''}`}>Em Uso</button>
                                                        </div>
                                                    </div>
                                                    <div className="h-px bg-slate-100 mx-2"></div>
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 pb-1">Ordenar por</p>
                                                        <div className="flex flex-col gap-1 sm:gap-0">
                                                            <button onClick={() => { setSortBy('default'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'default' ? 'bg-blue-50 text-blue-700' : ''}`}>Padrão (Nº)</button>
                                                            <button onClick={() => { setSortBy('name'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'name' ? 'bg-blue-50 text-blue-700' : ''}`}>Nome (A-Z)</button>
                                                            <button onClick={() => { setSortBy('oldest'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'oldest' ? 'bg-blue-50 text-blue-700' : ''}`}>Mais Antigos</button>
                                                            <button onClick={() => { setSortBy('newest'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'newest' ? 'bg-blue-50 text-blue-700' : ''}`}>Mais Recentes</button>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => setShowFilterMenu(false)} className="w-full mt-2 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl sm:hidden">Fechar</button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md">+ Novo Mapa</button>
                            </div>
                        </div>
                        
                        {displayTerritories.length > 0 ? (
                            <div className="space-y-8">
                                {inUseTerritories.length > 0 && (filterStatus === 'all' || filterStatus === 'in_use') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-px flex-1 bg-blue-100"></div>
                                            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] whitespace-nowrap">Mapas Designados ({inUseTerritories.length})</h3>
                                            <div className="h-px flex-1 bg-blue-100"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {inUseTerritories.map(m => renderTerritoryCard(m))}
                                        </div>
                                    </div>
                                )}

                                {availableTerritories.length > 0 && (filterStatus === 'all' || filterStatus === 'available') && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-px flex-1 bg-emerald-100"></div>
                                            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] whitespace-nowrap">
                                                {activeTab === 'territories' ? 'Mapas Disponíveis' : 'Mapas em Quarentena'} ({availableTerritories.length})
                                            </h3>
                                            <div className="h-px flex-1 bg-emerald-100"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {availableTerritories.map(m => renderTerritoryCard(m))}
                                        </div>
                                    </div>
                                )}

                                {otherTerritories.length > 0 && filterStatus === 'all' && (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-px flex-1 bg-slate-100"></div>
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] whitespace-nowrap">Outros Status ({otherTerritories.length})</h3>
                                            <div className="h-px flex-1 bg-slate-100"></div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {otherTerritories.map(m => renderTerritoryCard(m))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-slate-200 col-span-1 md:col-span-2">
                                <p className="font-bold text-slate-500">Nenhum território encontrado.</p>
                                <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros ou adicione um novo mapa.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : activeTab === 'users' ? (
                <div className="space-y-4">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] px-2">Gestão de Usuários</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-5 rounded-2xl border-2 border-slate-200 flex items-center justify-between gap-4">
                                <div className="flex-1 overflow-hidden"><p className="font-black text-slate-900 text-lg leading-tight truncate">{u.name}</p><p className="font-bold text-slate-400 text-[10px] truncate mb-2">{u.email}</p><span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>{u.role}</span></div>
                                <button onClick={() => handlePromote(u)} className="px-3 py-2.5 bg-slate-50 text-slate-600 text-[9px] font-black rounded-lg border border-slate-200 uppercase tracking-tighter">Cargo</button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Stats content already rendered above if activeTab is stats, but we need to handle the case where it's not territories/worked/users */}
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;