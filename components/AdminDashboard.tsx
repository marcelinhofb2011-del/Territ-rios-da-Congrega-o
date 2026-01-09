import React, { useState, useEffect, useMemo } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus } from '../types';
import { 
    assignTerritoryToRequest, rejectRequest, 
    updateTerritory, deleteTerritory, updateUserRole, adminResetTerritory
} from '../services/api';
import { formatDate, isRecentWork } from '../utils/helpers';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import MapViewerModal from './modals/MapViewerModal';
import TerritoryHistoryModal from './modals/TerritoryHistoryModal';
import AddMapModal from './modals/AddMapModal';
import EditMapModal from './modals/EditMapModal';
import { MapIcon } from './Icon';
import { useAuth } from '../hooks/useAuth';

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

    // Listener para todos os dados em tempo real
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

        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersList = snapshot.docs.map(doc => {
                 const data = doc.data();
                 return { 
                    ...data, 
                    id: doc.id,
                    name: data.name || data.email?.split('@')[0] || 'Sem Nome',
                    createdAt: data.createdAt?.toDate() || new Date()
                 } as User;
            }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setUsers(usersList);
        });
        
        const requestsQuery = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                requestDate: doc.data().requestDate?.toDate() || new Date()
            } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
            setRequests(reqs);
        });

        return () => {
            unsubscribeTerritories();
            unsubscribeUsers();
            unsubscribeRequests();
        };
    }, [loading]);

    const handleFulfillRequest = async (requestId: string) => {
        if (!selectedMapForRequest) return;
        try {
            await assignTerritoryToRequest(requestId, selectedMapForRequest);
            setFulfillingRequestId(null);
            setSelectedMapForRequest('');
        } catch (e: any) { alert(e.message); }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Rejeitar esta solicitação?")) return;
        await rejectRequest(id);
    };

    const handleDeleteTerritory = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este território?")) return;
        await deleteTerritory(id);
    };

    const handleResetTerritory = async (id: string) => {
        if (!user) {
            alert("Erro: usuário administrador não encontrado.");
            return;
        }
        if (!confirm("Deseja retomar este território? Ele voltará a ficar disponível e a ação será registrada no histórico.")) return;
        await adminResetTerritory(id, user);
    };

    const handlePromote = async (user: User) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        await updateUserRole(user.id, newRole);
    };

    const sortedTerritories = useMemo(() => {
        return [...territories].sort((a, b) => {
            if (a.status === TerritoryStatus.IN_USE && b.status !== TerritoryStatus.IN_USE) return 1;
            if (b.status === TerritoryStatus.IN_USE && a.status !== TerritoryStatus.IN_USE) return -1;
            const aRecent = isRecentWork(a.history);
            const bRecent = isRecentWork(b.history);
            const aNeverWorked = (a.history || []).length === 0;
            const bNeverWorked = (b.history || []).length === 0;
            if (aNeverWorked && !bNeverWorked) return -1;
            if (bNeverWorked && !aNeverWorked) return 1;
            if (!aRecent && bRecent) return -1;
            if (aRecent && !bRecent) return 1;
            if (a.history && a.history.length > 0 && b.history && b.history.length > 0) {
                return b.history[0].completedDate.getTime() - a.history[0].completedDate.getTime();
            }
            return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
        });
    }, [territories]);

    const availableMapsOptions = useMemo(() => {
        return sortedTerritories.filter(t => t.status === TerritoryStatus.AVAILABLE);
    }, [sortedTerritories]);

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

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={() => {}} />}
            {editingTerritory && <EditMapModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={() => {}} />}
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}
            {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} onClose={() => setViewingMap(null)} />}

            {/* Cabeçalho Limpo - Sem Container */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex-shrink-0">
                        <MapIcon className="w-full h-full"/>
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none">Administração</h1>
                        <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-wider">Gestão Territorial</p>
                    </div>
                </div>
                <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200 self-start md:self-auto">
                    <button 
                        onClick={() => setActiveTab('territories')} 
                        className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'territories' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Mapas
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'users' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Usuários
                    </button>
                </div>
            </div>

            {activeTab === 'territories' ? (
                <>
                    {/* Estatísticas - Cards Diretos no Fundo */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-slate-900', border: 'border-slate-200' },
                            { label: 'Livres', value: stats.available, color: 'text-emerald-600', border: 'border-emerald-200' },
                            { label: 'Descanso', value: stats.resting, color: 'text-amber-500', border: 'border-amber-200' },
                            { label: 'Em Uso', value: stats.inUse, color: 'text-blue-600', border: 'border-blue-200' }
                        ].map(s => (
                            <div key={s.label} className={`bg-white p-5 rounded-2xl border-2 ${s.border}`}>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Solicitações - Sem Container Externo */}
                    {requests.length > 0 && (
                        <div className="space-y-3">
                            <h2 className="text-[11px] font-black text-blue-900 uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                                Solicitações Pendentes
                            </h2>
                            <div className="space-y-2">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-slate-200">
                                        <div>
                                            <p className="font-black text-slate-900">{req.userName}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{formatDate(req.requestDate)}</p>
                                        </div>
                                        <div className="flex flex-1 max-w-sm items-center gap-2">
                                            {fulfillingRequestId === req.id ? (
                                                <div className="flex items-center gap-2 w-full animate-in slide-in-from-right-1">
                                                    <select 
                                                        value={selectedMapForRequest} 
                                                        onChange={e => setSelectedMapForRequest(e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-xs outline-none"
                                                    >
                                                        <option value="">Escolher...</option>
                                                        {availableMapsOptions.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name}</option>
                                                        ))}
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

                    {/* Lista de Mapas - Cards Diretos no Fundo do Celular */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Territórios</h2>
                            <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-md">
                                + Novo Mapa
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {sortedTerritories.map(m => {
                                const recent = isRecentWork(m.history);
                                return (
                                    <div key={m.id} className="bg-white p-5 rounded-2xl border-[5px] border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="font-black text-slate-900 text-xl tracking-tight">{m.name}</h3>
                                                <button onClick={() => setViewingMap(m)} className="text-[9px] text-blue-600 font-black uppercase tracking-widest hover:underline mt-0.5">Ver Documento</button>
                                            </div>
                                            {m.status === TerritoryStatus.IN_USE ? (
                                                <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-blue-100">Em Uso</span>
                                            ) : recent ? (
                                                <span className="px-2.5 py-1 bg-amber-50 text-amber-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-amber-100">Descanso</span>
                                            ) : (
                                                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-wider border border-emerald-100">Livre</span>
                                            )}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-50">
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Responsável</p>
                                                <p className="font-bold text-slate-700 text-xs truncate">{m.assignedToName || '-'}</p>
                                                {m.dueDate && <p className="text-[8px] text-red-500 font-black mt-0.5 uppercase">Expira: {formatDate(m.dueDate)}</p>}
                                            </div>
                                            <div>
                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Último Trabalho</p>
                                                <p className="text-xs font-bold text-slate-600">{m.history && m.history.length > 0 ? formatDate(m.history[0].completedDate) : 'Nunca'}</p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex justify-end gap-1">
                                             <button onClick={() => setEditingTerritory(m)} className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                                            </button>
                                            <button onClick={() => setViewHistory(m)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg transition-all">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </button>
                                            {m.status === TerritoryStatus.IN_USE && (
                                                <button onClick={() => handleResetTerritory(m.id)} className="p-2 text-slate-400 hover:text-amber-600 rounded-lg transition-all">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg>
                                                </button>
                                            )}
                                            <button onClick={() => handleDeleteTerritory(m.id)} className="p-2 text-slate-400 hover:text-red-600 rounded-lg transition-all">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            ) : (
                <div className="space-y-4">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] px-2">Gestão de Usuários</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {users.map(u => (
                            <div key={u.id} className="bg-white p-5 rounded-2xl border-[5px] border-slate-200 flex items-center justify-between gap-4">
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-black text-slate-900 text-lg leading-tight truncate">{u.name}</p>
                                    <p className="font-bold text-slate-400 text-[10px] truncate mb-2">{u.email}</p>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-50 text-slate-500 border border-slate-100'}`}>
                                        {u.role}
                                    </span>
                                </div>
                                <button onClick={() => handlePromote(u)} className="px-3 py-2.5 bg-slate-50 text-slate-600 text-[9px] font-black rounded-lg border border-slate-200 uppercase tracking-tighter">
                                    Cargo
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;