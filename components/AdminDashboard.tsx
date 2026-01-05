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

const AdminDashboard: React.FC = () => {
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
        // Listener de Territórios
        const territoriesQuery = query(collection(db, 'territories'));
        const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
            const territoriesList = snapshot.docs.map(doc => {
                const data = doc.data();
                const rawHistory = data.history || [];
                const history = rawHistory.map((h: any) => ({
                    ...h,
                    completedDate: h.completedDate instanceof Timestamp 
                        ? h.completedDate.toDate() 
                        : new Date(h.completedDate)
                })).sort((a: any, b: any) => b.completedDate.getTime() - a.completedDate.getTime());

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
        }, (error) => {
            console.error("Erro ao carregar territórios:", error);
            if (loading) setLoading(false);
        });

        // Listener de Usuários
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
        
        // Listener de Solicitações
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
        if (!confirm("Deseja retomar este território? Ele voltará a ficar disponível sem precisar de relatório.")) return;
        await adminResetTerritory(id);
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
            <p className="text-gray-500 font-bold">Carregando painel...</p>
        </div>
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={() => {}} />}
            {editingTerritory && <EditMapModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={() => {}} />}
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}
            {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} onClose={() => setViewingMap(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-gray-100 overflow-hidden">
                        <MapIcon className="w-full h-full"/>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Painel Admin</h1>
                        <p className="text-gray-500 font-medium mt-1">Gestão de Congregação</p>
                    </div>
                </div>
                <div className="flex bg-white/40 backdrop-blur-sm p-1.5 rounded-2xl self-start md:self-auto border border-white/50">
                    <button 
                        onClick={() => setActiveTab('territories')} 
                        className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'territories' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Mapas
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Usuários
                    </button>
                </div>
            </div>

            {activeTab === 'territories' ? (
                <>
                    {/* Estatísticas */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-gray-900' },
                            { label: 'Disponíveis', value: stats.available, color: 'text-emerald-600' },
                            { label: 'Em Descanso', value: stats.resting, color: 'text-amber-500' },
                            { label: 'Em Uso', value: stats.inUse, color: 'text-blue-600' }
                        ].map(s => (
                            <div key={s.label} className="bg-white/50 backdrop-blur-xl p-6 rounded-3xl border border-white/60 shadow-2xl shadow-violet-200/60">
                                <p className="text-xs font-black text-gray-400 uppercase mb-1">{s.label}</p>
                                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Solicitações Pendentes */}
                    {requests.length > 0 && (
                        <div className="bg-white/30 backdrop-blur-xl border border-white/40 rounded-[2rem] p-8 shadow-2xl shadow-violet-200/40">
                            <h2 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
                                <span className="flex h-3 w-3 rounded-full bg-blue-600 animate-pulse"></span>
                                Solicitações Pendentes ({requests.length})
                            </h2>
                            <div className="space-y-4">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white/70 p-6 rounded-2xl shadow-lg shadow-indigo-100/50 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/50">
                                        <div>
                                            <p className="font-black text-gray-900 text-lg">{req.userName}</p>
                                            <p className="text-sm text-gray-500 font-medium">Solicitado em {formatDate(req.requestDate)}</p>
                                        </div>
                                        
                                        <div className="flex flex-1 max-w-md items-center gap-3">
                                            {fulfillingRequestId === req.id ? (
                                                <div className="flex items-center gap-2 w-full">
                                                    <select 
                                                        value={selectedMapForRequest} 
                                                        onChange={e => setSelectedMapForRequest(e.target.value)}
                                                        className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                                    >
                                                        <option value="">Selecione um mapa disponível...</option>
                                                        {availableMapsOptions.map(m => (
                                                            <option key={m.id} value={m.id}>{m.name} {isRecentWork(m.history) ? '(Em Descanso)' : ''}</option>
                                                        ))}
                                                    </select>
                                                    <button onClick={() => handleFulfillRequest(req.id)} disabled={!selectedMapForRequest} className="px-6 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 disabled:bg-gray-200">OK</button>
                                                    <button onClick={() => setFulfillingRequestId(null)} className="px-4 py-3 bg-gray-100 text-gray-400 font-black rounded-xl">&times;</button>
                                                </div>
                                            ) : (
                                                <div className="flex gap-3">
                                                    <button onClick={() => setFulfillingRequestId(req.id)} className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100">Atribuir Mapa</button>
                                                    <button onClick={() => handleReject(req.id)} className="px-8 py-3 bg-gray-100 text-gray-500 font-black rounded-xl hover:bg-gray-200">Recusar</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Lista de Mapas */}
                    <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl shadow-violet-200/60 overflow-hidden">
                        <div className="p-8 border-b border-white/30 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800">Mapas da Congregação</h2>
                            <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all transform active:scale-95 shadow-xl shadow-gray-200">
                                + NOVO MAPA
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs font-black text-indigo-900/70 uppercase tracking-widest bg-white/20">
                                        <th className="px-8 py-5">Identificação</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Responsável</th>
                                        <th className="px-8 py-5">Último Trabalho</th>
                                        <th className="px-8 py-5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/30">
                                    {sortedTerritories.map(m => {
                                        const recent = isRecentWork(m.history);
                                        return (
                                            <tr key={m.id} className="group hover:bg-white/20 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-gray-900 text-lg">{m.name}</p>
                                                    <button onClick={() => setViewingMap(m)} className="text-xs text-blue-500 font-bold hover:underline">Ver Arquivo &rarr;</button>
                                                </td>
                                                <td className="px-8 py-6">
                                                    {m.status === TerritoryStatus.IN_USE ? (
                                                        <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase">Em Uso</span>
                                                    ) : recent ? (
                                                        <span className="px-4 py-1.5 bg-amber-50 text-amber-600 rounded-full text-xs font-black uppercase">Descanso</span>
                                                    ) : (
                                                        <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase">Disponível</span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="font-bold text-gray-700">{m.assignedToName || '-'}</p>
                                                    {m.dueDate && <p className="text-xs text-red-500 font-bold">Vence em {formatDate(m.dueDate)}</p>}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <p className="text-sm font-bold text-gray-600">{m.history && m.history.length > 0 ? formatDate(m.history[0].completedDate) : 'Nunca'}</p>
                                                </td>
                                                <td className="px-8 py-6 text-right space-x-1">
                                                    <button onClick={() => setEditingTerritory(m)} className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all" title="Editar Mapa">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>
                                                    </button>
                                                    <button onClick={() => setViewHistory(m)} className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Ver Histórico">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    </button>
                                                    {m.status === TerritoryStatus.IN_USE && (
                                                        <button onClick={() => handleResetTerritory(m.id)} className="p-3 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Retomar Mapa">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l5 5m-5-5l5-5" /></svg>
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDeleteTerritory(m.id)} className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Excluir">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white/50 backdrop-blur-xl rounded-3xl border border-white/60 shadow-2xl shadow-violet-200/60 overflow-hidden">
                    <div className="p-8 border-b border-white/30">
                        <h2 className="text-2xl font-black text-gray-800">Usuários Cadastrados</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-black text-indigo-900/70 uppercase tracking-widest bg-white/20">
                                    <th className="px-8 py-5">Nome</th>
                                    <th className="px-8 py-5">Email</th>
                                    <th className="px-8 py-5">Cargo</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/30">
                                {users.map(u => (
                                    <tr key={u.id} className="group hover:bg-white/20 transition-colors">
                                        <td className="px-8 py-6 font-black text-gray-900">{u.name}</td>
                                        <td className="px-8 py-6 font-medium text-gray-500">{u.email}</td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase ${u.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button onClick={() => handlePromote(u)} className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-black rounded-lg hover:bg-gray-900 hover:text-white transition-all">
                                                ALTERAR CARGO
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
