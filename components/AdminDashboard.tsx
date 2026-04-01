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

import Sidebar from './Sidebar';
import TerritoryCard from './TerritoryCard';

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
    const [activeTab, setActiveTab] = useState<'dashboard' | 'territories' | 'worked' | 'users' | 'stats'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [viewHistory, setViewHistory] = useState<Territory | null>(null);
    const [viewingMap, setViewingMap] = useState<Territory | null>(null);

    const globalHistory = useMemo(() => {
        const allHistory: any[] = [];
        territories.forEach(t => {
            if (t.history && Array.isArray(t.history)) {
                t.history.forEach(h => {
                    allHistory.push({
                        ...h,
                        territoryNumber: t.number,
                        territoryName: t.name
                    });
                });
            }
        });
        return allHistory.sort((a, b) => {
            const dateA = (a.completedDate as any)?.toDate?.() || (a.completedDate instanceof Date ? a.completedDate : new Date(0));
            const dateB = (b.completedDate as any)?.toDate?.() || (b.completedDate instanceof Date ? b.completedDate : new Date(0));
            return dateB.getTime() - dateA.getTime();
        });
    }, [territories]);
    const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
    const [requestDueDate, setRequestDueDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [selectedMapsForRequest, setSelectedMapsForRequest] = useState<string[]>([]);
    const [showManualAssignModal, setShowManualAssignModal] = useState(false);
    const [manualAssignUserId, setManualAssignUserId] = useState<string | undefined>(undefined);
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

    // Filter and Sort States
    const [sortBy, setSortBy] = useState<'default' | 'name' | 'oldest' | 'newest'>('default');

    // Listeners for realtime data
    useEffect(() => {
        const handleOpenSidebar = () => setIsSidebarOpen(true);
        window.addEventListener('open-admin-sidebar', handleOpenSidebar);
        return () => window.removeEventListener('open-admin-sidebar', handleOpenSidebar);
    }, []);

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

    // Memoized data processing
    const availableMapsOptions = useMemo(() => {
        return territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE)
            .sort((a, b) => {
                const numA = parseInt(a.number) || 0;
                const numB = parseInt(b.number) || 0;
                if (numA !== numB) return numA - numB;
                return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
            });
    }, [territories]);

    const displayTerritories = useMemo(() => {
        let processed = [...territories];
        const now = new Date();
        const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

        // Filter based on active tab
        if (activeTab === 'dashboard') {
            processed = processed.filter(t => t.status === TerritoryStatus.IN_USE);
        } else if (activeTab === 'territories') {
            processed = processed.filter(t => t.status === TerritoryStatus.AVAILABLE && !t.lastCompletedDate);
        } else if (activeTab === 'worked') {
            processed = processed.filter(t => t.status === TerritoryStatus.AVAILABLE && t.lastCompletedDate);
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
                    return sortByNumber(a, b);
            }
        });
        return processed;
    }, [territories, sortBy, activeTab]);

    const inUseTerritories = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.IN_USE), [displayTerritories]);
    const availableTerritories = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.AVAILABLE), [displayTerritories]);
    const otherTerritories = useMemo(() => displayTerritories.filter(t => t.status !== TerritoryStatus.IN_USE && t.status !== TerritoryStatus.AVAILABLE), [displayTerritories]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-gray-500 font-bold text-center">Carregando painel...</p>
        </div>
    );

    const dropdownButtonClass = "w-full text-left px-3 py-2 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors";

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50/50">
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsSidebarOpen(false);
                }} 
                pendingRequestsCount={requests.length} 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onAddTerritory={() => setShowAddModal(true)}
                onManualAssign={() => setShowManualAssignModal(true)}
            />

            <div className="flex-1 flex flex-col min-w-0">
                <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8 pb-20">
                {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={() => {}} />}
                {editingTerritory && <EditMapModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={() => {}} />}
                {showManualAssignModal && (
                    <ManualAssignmentModal 
                        territories={territories} 
                        users={users} 
                        initialUserId={manualAssignUserId}
                        onClose={() => {
                            setShowManualAssignModal(false);
                            setManualAssignUserId(undefined);
                        }} 
                        onSuccess={() => {}} 
                    />
                )}
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

                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Olá, {user?.name.split(' ')[0]}!</h1>
                                <p className="text-slate-500 font-medium">Aqui está o resumo da gestão de territórios hoje.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: 'Total', value: stats.total, color: 'text-slate-900', bg: 'bg-white', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
                                { label: 'Livres', value: stats.available, color: 'text-emerald-600', bg: 'bg-white', icon: 'M5 13l4 4L19 7' },
                                { label: 'Em Uso', value: stats.inUse, color: 'text-blue-600', bg: 'bg-white', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                                { label: 'Pendentes', value: requests.length, color: 'text-amber-600', bg: 'bg-white', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' }
                            ].map(s => (
                                <div key={s.label} className={`${s.bg} p-5 rounded-3xl border border-slate-200 shadow-sm`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`p-2 rounded-xl ${s.color.replace('text', 'bg')}/10`}>
                                            <svg className={`w-5 h-5 ${s.color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={s.icon} /></svg>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                    <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {requests.length > 0 && (
                            <div className="bg-blue-50/50 rounded-[2.5rem] p-8 border border-blue-100">
                                <div className="flex items-center justify-between mb-6">
                                    <h2 className="text-xl font-black text-blue-900 tracking-tight flex items-center gap-3">
                                        <span className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></span>
                                        Solicitações Pendentes
                                    </h2>
                                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest">{requests.length} novos</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-white p-6 rounded-3xl shadow-sm border border-blue-100 flex flex-col justify-between gap-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 font-black text-xl">
                                                    {req.userName.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 text-lg leading-none mb-1">{req.userName}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Solicitado em {formatDate(req.requestDate)}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex flex-col gap-4">
                                                {fulfillingRequestId === req.id ? (
                                                    <div className="space-y-4 animate-in slide-in-from-top-2">
                                                        <div className="max-h-64 overflow-y-auto border border-slate-100 rounded-2xl p-3 bg-slate-50 no-scrollbar">
                                                            {availableMapsOptions.length === 0 ? (
                                                                <p className="text-[10px] text-slate-400 text-center py-4 italic">Nenhum mapa disponível no momento.</p>
                                                            ) : (
                                                                <div className="grid grid-cols-1 gap-2">
                                                                    {availableMapsOptions.map(m => (
                                                                        <label key={m.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedMapsForRequest.includes(m.id) ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700'}`}>
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
                                                                                className="hidden"
                                                                            />
                                                                            <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${selectedMapsForRequest.includes(m.id) ? 'bg-white text-blue-600' : 'bg-slate-900 text-white'}`}>
                                                                                {m.number || '?'}
                                                                            </span>
                                                                            <span className="text-xs font-bold truncate">{m.name}</span>
                                                                            {selectedMapsForRequest.includes(m.id) && (
                                                                                <svg className="w-4 h-4 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                            )}
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Data de Devolução</label>
                                                            <input 
                                                                type="date" 
                                                                value={requestDueDate}
                                                                onChange={(e) => setRequestDueDate(e.target.value)}
                                                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => handleFulfillRequest(req.id)} 
                                                                disabled={selectedMapsForRequest.length === 0} 
                                                                className="flex-1 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-200 disabled:opacity-50"
                                                            >
                                                                Confirmar ({selectedMapsForRequest.length})
                                                            </button>
                                                            <button onClick={() => { setFulfillingRequestId(null); setSelectedMapsForRequest([]); }} className="px-4 py-3 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl">Cancelar</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setFulfillingRequestId(req.id); setSelectedMapsForRequest([]); }} className="flex-1 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md hover:bg-blue-700 transition-all">Atribuir Mapa</button>
                                                        <button onClick={() => handleReject(req.id)} className="px-4 py-3 bg-slate-100 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all">Recusar</button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Mapas Designados</h2>
                                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase tracking-widest">{inUseTerritories.length} ativos</span>
                            </div>
                            <div className="overflow-x-auto no-scrollbar">
                                {/* Desktop Table */}
                                <table className="hidden md:table w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Território</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Publicador</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atribuído em</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {inUseTerritories.length > 0 ? inUseTerritories.map(t => (
                                            <tr key={t.id} className="group hover:bg-slate-50/50 transition-all">
                                                <td className="py-4">
                                                    <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">{t.number}</span>
                                                </td>
                                                <td className="py-4">
                                                    <p className="font-bold text-slate-900 text-sm">{t.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t.locality}</p>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[10px]">
                                                            {t.assignedToName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{t.assignedToName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className="text-xs font-bold text-slate-500">{formatDate(t.assignmentDate)}</span>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-100">Em Uso</span>
                                                        <button 
                                                            onClick={() => handleResetTerritory(t.id)}
                                                            title="Retomar território"
                                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center">
                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum mapa designado no momento.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>

                                {/* Mobile List */}
                                <div className="md:hidden space-y-4">
                                    {inUseTerritories.length > 0 ? inUseTerritories.map(t => (
                                        <div key={t.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">{t.number}</span>
                                                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-blue-100">Em Uso</span>
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-sm">{t.name}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{t.locality}</p>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-black text-[10px]">
                                                        {t.assignedToName?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{t.assignedToName}</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{formatDate(t.assignmentDate)}</span>
                                                    <button 
                                                        onClick={() => handleResetTerritory(t.id)}
                                                        className="p-2 text-red-600 bg-red-50 rounded-lg font-black text-[9px] uppercase tracking-widest"
                                                    >
                                                        Retomar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="py-12 text-center">
                                            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum mapa designado no momento.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'worked' && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4">
                        <div className="space-y-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Mapas Trabalhados</h2>
                                <p className="text-slate-500 font-medium text-sm">Mapas que foram devolvidos e estão disponíveis para nova designação.</p>
                            </div>
                            
                            {displayTerritories.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {displayTerritories.map(m => (
                                        <TerritoryCard 
                                            key={m.id}
                                            territory={m}
                                            onEdit={setEditingTerritory}
                                            onHistory={setViewHistory}
                                            onReset={handleResetTerritory}
                                            onDelete={handleDeleteTerritory}
                                            onViewMap={setViewingMap}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
                                    <p className="font-black text-slate-900 text-lg">Nenhum mapa trabalhado recentemente</p>
                                </div>
                            )}
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Histórico Global</h2>
                                <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-widest">{globalHistory.length} registros</span>
                            </div>
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nº</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Território</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Publicador</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                                            <th className="pb-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Concluído em</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {globalHistory.length > 0 ? globalHistory.map((h, idx) => (
                                            <tr key={`${h.id}-${idx}`} className="group hover:bg-slate-50/50 transition-all">
                                                <td className="py-4">
                                                    <span className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-black text-[10px]">{h.territoryNumber}</span>
                                                </td>
                                                <td className="py-4">
                                                    <p className="font-bold text-slate-900 text-sm">{h.territoryName}</p>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-black text-[10px]">
                                                            {h.userName?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-xs font-bold text-slate-700">{h.userName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                        {formatDate(h.assignedDate)} — {formatDate(h.completedDate)}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100">Concluído</span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan={5} className="py-12 text-center">
                                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhum histórico disponível.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'territories' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Territórios</h2>
                                <p className="text-slate-500 font-medium text-sm">Visualize e organize todos os mapas da congregação.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setShowManualAssignModal(true)} className="px-4 py-2.5 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all">
                                    Atribuição Manual
                                </button>
                            </div>
                        </div>
                        
                        {displayTerritories.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {displayTerritories.map(m => (
                                    <TerritoryCard 
                                        key={m.id}
                                        territory={m}
                                        onEdit={setEditingTerritory}
                                        onHistory={setViewHistory}
                                        onReset={handleResetTerritory}
                                        onDelete={handleDeleteTerritory}
                                        onViewMap={setViewingMap}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-300">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                                </div>
                                <p className="font-black text-slate-900 text-lg">Nenhum território disponível</p>
                                <p className="text-slate-400 font-medium mt-1">Todos os mapas podem estar em uso ou ainda não foram cadastrados.</p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Gestão de Usuários</h2>
                                <p className="text-slate-500 font-medium text-sm">Gerencie permissões e cargos dos publicadores.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {users.map(u => (
                                <div key={u.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg ${u.role === 'admin' ? 'bg-gradient-to-br from-indigo-600 to-blue-700' : 'bg-gradient-to-br from-slate-400 to-slate-600'}`}>
                                            {u.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-900 text-lg leading-tight truncate">{u.name}</p>
                                            <p className="font-bold text-slate-400 text-[10px] truncate uppercase tracking-widest mb-2">{u.email}</p>
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                                                {u.role}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => {
                                                setManualAssignUserId(u.id);
                                                setShowManualAssignModal(true);
                                            }}
                                            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                                        >
                                            Designar Mapa
                                        </button>
                                        <button 
                                            onClick={() => handlePromote(u)} 
                                            className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                u.role === 'admin' 
                                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                                                    : 'bg-slate-900 text-white hover:bg-slate-800'
                                            }`}
                                        >
                                            {u.role === 'admin' ? 'Remover Admin' : 'Tornar Admin'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Estatísticas e Relatórios</h2>
                                <p className="text-slate-500 font-medium text-sm">Visão detalhada da cobertura do território.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">Distribuição por Status</h3>
                                <div className="h-72 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={stats.pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={8}
                                                dataKey="value"
                                            >
                                                {stats.pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }}
                                                itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}/>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
                                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-8">Top Localidades</h3>
                                <div className="h-72 w-full">
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
                                                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 20px' }}
                                            />
                                            <Bar dataKey="total" name="Total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                                            <Bar dataKey="inUse" name="Em Uso" fill="#10b981" radius={[6, 6, 0, 0]} barSize={32} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Total Geral', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
                                { label: 'Disponíveis', value: stats.available, color: 'text-emerald-600', bg: 'bg-white' },
                                { label: 'Designados', value: stats.inUse, color: 'text-blue-600', bg: 'bg-white' },
                                { label: 'Fechados', value: stats.closed, color: 'text-red-600', bg: 'bg-white' }
                            ].map(s => (
                                <div key={s.label} className={`${s.bg} p-8 rounded-[2rem] border border-slate-200 shadow-sm`}>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                                    <p className={`text-4xl font-black ${s.color}`}>{s.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
);
};

export default AdminDashboard;