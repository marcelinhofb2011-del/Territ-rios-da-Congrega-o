import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus } from '../types';
import { 
    assignTerritoryToRequest, rejectRequest, 
    updateTerritory, deleteTerritory, updateUserRole, adminResetTerritory
} from '../services/api';
import { formatDate, isRecentWork, getDaysRemaining } from '../utils/helpers';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import MapViewerModal from './modals/MapViewerModal';
import TerritoryHistoryModal from './modals/TerritoryHistoryModal';
import AddMapModal from './modals/AddMapModal';
import EditMapModal from './modals/EditMapModal';
import { MapIcon } from './Icon';
import { useAuth } from '../hooks/useAuth';

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
    const [activeTab, setActiveTab] = useState<'territories' | 'users'>('territories');
    
    // UI States
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [viewHistory, setViewHistory] = useState<Territory | null>(null);
    const [viewingMap, setViewingMap] = useState<Territory | null>(null);
    const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
    const [selectedMapForRequest, setSelectedMapForRequest] = useState<string>('');

    // Filter and Sort States
    const [filterStatus, setFilterStatus] = useState<'all' | 'available' | 'resting' | 'in_use'>('all');
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
        const territoriesQuery = query(collection(db, 'territories'));
        const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
            const territoriesList = snapshot.docs.map(doc => {
                const data = doc.data();
                const rawHistory = data.history || [];
                const history = rawHistory.map((h: any) => {
                    const completed = h.completedDate?.toDate() ?? new Date();
                    return {
                        ...h,
                        assignmentDate: h.assignmentDate?.toDate() ?? completed,
                        completedDate: completed
                    };
                }).sort((a,b) => b.completedDate.getTime() - a.completedDate.getTime());

                return {
                    ...data,
                    id: doc.id,
                    name: data.name || 'Sem Nome',
                    createdAt: data.createdAt?.toDate() || new Date(),
                    assignmentDate: data.assignmentDate?.toDate() || null,
                    dueDate: data.dueDate?.toDate() || null,
                    history: history
                } as Territory;
            });
            setTerritories(territoriesList);
            if (loading) setLoading(false);
        });

        // Other listeners...
        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, name: doc.data().name || doc.data().email?.split('@')[0] || 'Sem Nome', createdAt: doc.data().createdAt?.toDate() || new Date() } as User)).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        });
        const requestsQuery = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, requestDate: doc.data().requestDate?.toDate() || new Date() } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime()));
        });

        return () => {
            unsubscribeTerritories();
            unsubscribeUsers();
            unsubscribeRequests();
        };
    }, [loading]);
    
    // Handlers
    const handleFulfillRequest = async (requestId: string) => {
        if (!selectedMapForRequest) return;
        try {
            await assignTerritoryToRequest(requestId, selectedMapForRequest);
            setFulfillingRequestId(null); setSelectedMapForRequest('');
        } catch (e: any) { alert(e.message); }
    };
    const handleReject = async (id: string) => { if (confirm("Rejeitar esta solicitação?")) await rejectRequest(id); };
    const handleDeleteTerritory = async (id: string) => { if (confirm("Tem certeza que deseja excluir este território?")) await deleteTerritory(id); };
    const handleResetTerritory = async (id: string) => {
        if (!user) return alert("Erro: usuário administrador não encontrado.");
        if (confirm("Deseja retomar este território? Ele voltará a ficar disponível e a ação será registrada no histórico.")) await adminResetTerritory(id, user);
    };
    const handlePromote = async (user: User) => { await updateUserRole(user.id, user.role === 'admin' ? 'user' : 'admin'); };

    // Memoized data processing
    const availableMapsOptions = useMemo(() => {
        return territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE)
            .sort((a, b) => {
                const aRecent = isRecentWork(a.history);
                const bRecent = isRecentWork(b.history);
                if (!aRecent && bRecent) return -1;
                if (aRecent && !bRecent) return 1;
                return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
            });
    }, [territories]);

    const displayTerritories = useMemo(() => {
        let processed = [...territories];
        if (filterStatus !== 'all') {
            processed = processed.filter(t => {
                switch (filterStatus) {
                    case 'available': return t.status === TerritoryStatus.AVAILABLE && !isRecentWork(t.history);
                    case 'resting': return t.status === TerritoryStatus.AVAILABLE && isRecentWork(t.history);
                    case 'in_use': return t.status === TerritoryStatus.IN_USE;
                    default: return true;
                }
            });
        }
        processed.sort((a, b) => {
            switch (sortBy) {
                case 'name': return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
                case 'oldest': {
                    const aDate = a.history?.[0]?.completedDate?.getTime() || 0;
                    const bDate = b.history?.[0]?.completedDate?.getTime() || 0;
                    if (aDate === 0 && bDate > 0) return -1;
                    if (bDate === 0 && aDate > 0) return 1;
                    return aDate - bDate;
                }
                case 'newest': {
                    const aDate = a.history?.[0]?.completedDate?.getTime() || 0;
                    const bDate = b.history?.[0]?.completedDate?.getTime() || 0;
                    return bDate - aDate;
                }
                default:
                    if (a.status === TerritoryStatus.IN_USE && b.status !== TerritoryStatus.IN_USE) return 1;
                    if (b.status === TerritoryStatus.IN_USE && a.status !== TerritoryStatus.IN_USE) return -1;
                    if (!isRecentWork(a.history) && isRecentWork(b.history)) return -1;
                    if (isRecentWork(a.history) && !isRecentWork(b.history)) return 1;
                    const aDate = a.history?.[0]?.completedDate?.getTime() || 0;
                    const bDate = b.history?.[0]?.completedDate?.getTime() || 0;
                    return bDate - aDate;
            }
        });
        return processed;
    }, [territories, filterStatus, sortBy]);

    const stats = useMemo(() => ({
        total: territories.length,
        available: territories.filter(t => t.status === TerritoryStatus.AVAILABLE && !isRecentWork(t.history)).length,
        resting: territories.filter(t => t.status === TerritoryStatus.AVAILABLE && isRecentWork(t.history)).length,
        inUse: territories.filter(t => t.status === TerritoryStatus.IN_USE).length,
    }), [territories]);

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
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}
            {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} onClose={() => setViewingMap(null)} />}

            <div className="flex flex-col md:flex-row md:items-center justify-end gap-6 px-1">
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
                    <button onClick={() => setActiveTab('territories')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'territories' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Mapas</button>
                    <button onClick={() => setActiveTab('users')} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Usuários</button>
                </div>
            </div>

            {activeTab === 'territories' ? (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[{ label: 'Total', value: stats.total, color: 'text-slate-900', border: 'border-slate-200' }, { label: 'Livres', value: stats.available, color: 'text-emerald-600', border: 'border-emerald-200' }, { label: 'Descanso', value: stats.resting, color: 'text-amber-500', border: 'border-amber-200' }, { label: 'Em Uso', value: stats.inUse, color: 'text-blue-600', border: 'border-blue-200' }].map(s => (
                            <div key={s.label} className={`bg-white p-5 rounded-2xl border-2 ${s.border}`}><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p><p className={`text-2xl font-black ${s.color}`}>{s.value}</p></div>
                        ))}
                    </div>

                    {requests.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-[11px] font-black text-blue-900 uppercase tracking-[0.2em] px-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>Solicitações Pendentes</h2>
                            <div className="space-y-2">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-slate-200">
                                        <div><p className="font-black text-slate-900">{req.userName}</p><p className="text-[10px] text-slate-400 font-bold">{formatDate(req.requestDate)}</p></div>
                                        <div className="flex flex-1 max-w-sm items-center gap-2">
                                            {fulfillingRequestId === req.id ? (
                                                <div className="flex items-center gap-2 w-full animate-in slide-in-from-right-1">
                                                    <select value={selectedMapForRequest} onChange={e => setSelectedMapForRequest(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs outline-none">
                                                        <option value="">Escolher...</option>
                                                        {availableMapsOptions.map(m => (<option key={m.id} value={m.id}>{m.name} {isRecentWork(m.history) ? '(Descanso)' : ''}</option>))}
                                                    </select>
                                                    <button onClick={() => handleFulfillRequest(req.id)} disabled={!selectedMapForRequest} className="px-4 py-2 bg-emerald-600 text-white font-black text-[10px] rounded-lg">OK</button>
                                                    <button onClick={() => setFulfillingRequestId(null)} className="p-2 text-slate-400">&times;</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    <button onClick={() => setFulfillingRequestId(req.id)} className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider rounded-lg shadow-sm">Atribuir</button>
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
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Territórios</h2>
                            <div className="flex items-center gap-2">
                                <div className="relative" ref={filterMenuRef}>
                                    <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50">
                                        <FilterIcon />
                                        Filtrar e Ordenar
                                    </button>
                                    {showFilterMenu && (
                                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-slate-100 z-10 p-2 animate-in fade-in zoom-in-95">
                                            <div className="space-y-2">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 pb-1">Filtrar por Status</p>
                                                    <div className="flex flex-col">
                                                        <button onClick={() => { setFilterStatus('all'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'all' ? 'bg-blue-50 text-blue-700' : ''}`}>Todos</button>
                                                        <button onClick={() => { setFilterStatus('available'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'available' ? 'bg-blue-50 text-blue-700' : ''}`}>Livres</button>
                                                        <button onClick={() => { setFilterStatus('resting'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'resting' ? 'bg-blue-50 text-blue-700' : ''}`}>Em Descanso</button>
                                                        <button onClick={() => { setFilterStatus('in_use'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${filterStatus === 'in_use' ? 'bg-blue-50 text-blue-700' : ''}`}>Em Uso</button>
                                                    </div>
                                                </div>
                                                <div className="h-px bg-slate-100 mx-2"></div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 pb-1">Ordenar por</p>
                                                    <div className="flex flex-col">
                                                        <button onClick={() => { setSortBy('default'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'default' ? 'bg-blue-50 text-blue-700' : ''}`}>Padrão</button>
                                                        <button onClick={() => { setSortBy('name'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'name' ? 'bg-blue-50 text-blue-700' : ''}`}>Nome (A-Z)</button>
                                                        <button onClick={() => { setSortBy('oldest'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'oldest' ? 'bg-blue-50 text-blue-700' : ''}`}>Mais Antigos</button>
                                                        <button onClick={() => { setSortBy('newest'); setShowFilterMenu(false); }} className={`${dropdownButtonClass} ${sortBy === 'newest' ? 'bg-blue-50 text-blue-700' : ''}`}>Mais Recentes</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md">+ Novo Mapa</button>
                            </div>
                        </div>
                        
                        {displayTerritories.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {displayTerritories.map(m => {
                                    const recent = isRecentWork(m.history);
                                    const isOverdue = m.status === TerritoryStatus.IN_USE && (getDaysRemaining(m.dueDate) ?? 0) < 0;

                                    let borderColor = 'border-slate-200';
                                    if (isOverdue) {
                                        borderColor = 'border-red-300';
                                    } else if (m.status === TerritoryStatus.IN_USE) {
                                        borderColor = 'border-blue-200';
                                    } else if (recent) {
                                        borderColor = 'border-amber-200';
                                    } else {
                                        borderColor = 'border-emerald-200';
                                    }

                                    return (
                                        <div key={m.id} className={`bg-white p-5 rounded-2xl border-2 ${borderColor} ${isOverdue ? 'bg-red-50/50' : ''} shadow-sm transition-all duration-300`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <div><h3 className="font-black text-slate-900 text-xl tracking-tight">{m.name}</h3><button onClick={() => setViewingMap(m)} className="text-[9px] text-blue-600 font-black uppercase tracking-widest hover:underline mt-0.5">Ver Documento</button></div>
                                                {isOverdue ? (
                                                    <span className="px-2.5 py-1 bg-red-100 text-red-700 rounded-md text-[9px] font-black uppercase tracking-wider border border-red-200">Atrasado</span>
                                                ) : m.status === TerritoryStatus.IN_USE ? (
                                                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-100">Em Uso</span>
                                                ) : recent ? (
                                                    <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-amber-100">Descanso</span>
                                                ) : (
                                                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-100">Livre</span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                                                {m.status === TerritoryStatus.IN_USE ? (
                                                    <>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Responsável</p>
                                                            <p className="font-bold text-slate-700 text-xs truncate">{m.assignedToName || '-'}</p>
                                                            {m.dueDate && <p className={`text-[8px] font-black mt-0.5 uppercase ${isOverdue ? 'text-red-600' : 'text-slate-400'}`}>Expira: {formatDate(m.dueDate)}</p>}
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Designado em</p>
                                                            <p className="text-xs font-bold text-slate-600">{formatDate(m.assignmentDate)}</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Último Responsável</p>
                                                            <p className="font-bold text-slate-700 text-xs truncate">{m.history?.[0]?.userName || '-'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Devolvido em</p>
                                                            <p className="text-xs font-bold text-slate-600">{m.history?.[0] ? formatDate(m.history[0].completedDate) : 'Nunca'}</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="mt-4 flex justify-end gap-1">
                                                <button onClick={() => setEditingTerritory(m)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg></button>
                                                <button onClick={() => setViewHistory(m)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                                                {m.status === TerritoryStatus.IN_USE && (<button onClick={() => handleResetTerritory(m.id)} className="p-2 text-slate-400 hover:text-amber-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg></button>)}
                                                <button onClick={() => handleDeleteTerritory(m.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-white rounded-2xl border-2 border-slate-200 col-span-1 md:col-span-2">
                                <p className="font-bold text-slate-500">Nenhum território encontrado.</p>
                                <p className="text-sm text-slate-400 mt-1">Tente ajustar os filtros ou adicione um novo mapa.</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
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
            )}
        </div>
    );
};

export default AdminDashboard;