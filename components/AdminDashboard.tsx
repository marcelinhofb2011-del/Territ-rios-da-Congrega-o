import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus } from '../types';
import { 
    fetchAllTerritories, fetchAllRequests, assignTerritoryToRequest, rejectRequest, uploadTerritory, 
    updateTerritory, deleteTerritory, fetchAllUsers, updateUserRole, createTerritory 
} from '../services/api';
import { formatDate, isRecentWork } from '../utils/helpers';

// --- MODAIS ---

const TerritoryHistoryModal: React.FC<{ territory: Territory; onClose: () => void; }> = ({ territory, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Histórico: {territory.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl transition-colors">&times;</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                    {territory.history && territory.history.length > 0 ? (
                        <ul className="space-y-4">
                            {territory.history.slice().map((entry, index) => (
                                <li key={index} className="border-b border-gray-50 pb-4 last:border-0">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-gray-800">{entry.userName || 'Publicador'}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">{formatDate(entry.completedDate)}</p>
                                    </div>
                                    {entry.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl italic">"{entry.notes}"</p>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-12 text-gray-400 italic">Nenhum histórico registrado ainda.</div>
                    )}
                </div>
                <div className="mt-8">
                    <button onClick={onClose} className="w-full py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Fechar</button>
                </div>
            </div>
        </div>
    );
};

const AddMapModal: React.FC<{ onClose: () => void; onAdded: () => void; }> = ({ onClose, onAdded }) => {
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState('');
    const [mode, setMode] = useState<'file' | 'link'>('file');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (mode === 'file') {
                if (!file) throw new Error("Selecione um arquivo (PDF ou Imagem).");
                await uploadTerritory(name, file);
            } else {
                if (!link) throw new Error("Insira o link do mapa.");
                await createTerritory(name, link);
            }
            onAdded();
            onClose();
        } catch (err: any) {
            setError(err.message || "Erro ao salvar mapa.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-black mb-6 text-gray-800">Novo Território</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Nome/Número do Mapa</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-black text-black" placeholder="Ex: Território 05" />
                    </div>
                    
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button type="button" onClick={() => setMode('file')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'file' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Arquivo</button>
                        <button type="button" onClick={() => setMode('link')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Link Externo</button>
                    </div>

                    {mode === 'file' ? (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Arquivo (PDF/Img)</label>
                            <input type="file" accept="application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer" />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Link do PDF/Imagem</label>
                            <input type="url" value={link} onChange={e => setLink(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-black" placeholder="https://..." />
                        </div>
                    )}

                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:bg-blue-300">
                            {loading ? 'Salvando...' : 'Criar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL ---

const AdminDashboard: React.FC = () => {
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [requests, setRequests] = useState<TerritoryRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'territories' | 'users'>('territories');
    
    // UI States
    const [showAddModal, setShowAddModal] = useState(false);
    const [viewHistory, setViewHistory] = useState<Territory | null>(null);
    const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
    const [selectedMapForRequest, setSelectedMapForRequest] = useState<string>('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, r, u] = await Promise.all([
                fetchAllTerritories(),
                fetchAllRequests(),
                fetchAllUsers()
            ]);
            setTerritories(t);
            setRequests(r);
            setUsers(u);
        } catch (e) {
            console.error("Erro ao carregar dados admin:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleFulfillRequest = async (requestId: string) => {
        if (!selectedMapForRequest) return;
        try {
            await assignTerritoryToRequest(requestId, selectedMapForRequest);
            setFulfillingRequestId(null);
            setSelectedMapForRequest('');
            await loadData();
        } catch (e: any) { alert(e.message); }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Rejeitar esta solicitação?")) return;
        await rejectRequest(id);
        await loadData();
    };

    const handleDeleteTerritory = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este território?")) return;
        await deleteTerritory(id);
        await loadData();
    };

    const handlePromote = async (user: User) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        await updateUserRole(user.id, newRole);
        await loadData();
    };

    // Lógica de Ordenação Inteligente
    const sortedTerritories = useMemo(() => {
        return [...territories].sort((a, b) => {
            // 1. Mapas Atualmente em Uso por último
            if (a.status === TerritoryStatus.IN_USE && b.status !== TerritoryStatus.IN_USE) return 1;
            if (b.status === TerritoryStatus.IN_USE && a.status !== TerritoryStatus.IN_USE) return -1;
            
            // Se ambos não estão em uso, ver histórico
            const aRecent = isRecentWork(a.history);
            const bRecent = isRecentWork(b.history);
            const aNeverWorked = (a.history || []).length === 0;
            const bNeverWorked = (b.history || []).length === 0;

            // 2. Mapas NUNCA trabalhados primeiro
            if (aNeverWorked && !bNeverWorked) return -1;
            if (bNeverWorked && !aNeverWorked) return 1;

            // 3. Mapas que NÃO estão em descanso (mais de 60 dias) vêm antes dos "em descanso"
            if (!aRecent && bRecent) return -1;
            if (aRecent && !bRecent) return 1;

            // 4. Se ambos estão na mesma categoria, ordenar por data de último trabalho (mais antigo primeiro)
            if (a.history.length > 0 && b.history.length > 0) {
                return a.history[0].completedDate.getTime() - b.history[0].completedDate.getTime();
            }

            // 5. Fallback para ordem alfabética de nome
            return (a.name || '').localeCompare(b.name || '', undefined, { numeric: true });
        });
    }, [territories]);

    // Opções para o seletor de atribuição (apenas disponíveis e priorizando descansados)
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
            {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={loadData} />}
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Painel Admin</h1>
                    <p className="text-gray-500 font-medium mt-1">Gestão de Congregação</p>
                </div>
                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl">
                    <button onClick={() => setActiveTab('territories')} className={`px-6 py-2.5 rounded-xl font-black transition-all ${activeTab === 'territories' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>Mapas</button>
                    <button onClick={() => setActiveTab('users')} className={`px-6 py-2.5 rounded-xl font-black transition-all ${activeTab === 'users' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>Usuários</button>
                </div>
            </div>

            {activeTab === 'territories' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</p>
                            <p className="text-3xl font-black text-gray-900">{stats.total}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Disponíveis</p>
                            <p className="text-3xl font-black text-green-600">{stats.available}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Em Descanso</p>
                            <p className="text-3xl font-black text-amber-500">{stats.resting}</p>
                        </div>
                        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Em Campo</p>
                            <p className="text-3xl font-black text-blue-600">{stats.inUse}</p>
                        </div>
                    </div>

                    {requests.length > 0 && (
                        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <span className="flex h-8 w-8 bg-blue-400 rounded-full items-center justify-center text-sm">{requests.length}</span>
                                Pedidos Pendentes
                            </h2>
                            <div className="space-y-4">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-blue-700/50 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">
                                        <div className="text-center md:text-left">
                                            <p className="font-black text-xl">{req.userName}</p>
                                            <p className="text-blue-200 text-sm font-bold uppercase">{formatDate(req.requestDate)}</p>
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                                            {fulfillingRequestId === req.id ? (
                                                <div className="flex gap-2">
                                                    <select 
                                                        value={selectedMapForRequest} 
                                                        onChange={e => setSelectedMapForRequest(e.target.value)}
                                                        className="bg-white text-gray-900 px-4 py-2 rounded-xl font-bold outline-none max-w-[200px]"
                                                    >
                                                        <option value="">Escolha um mapa...</option>
                                                        {availableMapsOptions.map(m => {
                                                            const isResting = isRecentWork(m.history);
                                                            return (
                                                                <option key={m.id} value={m.id}>
                                                                    {m.name} {isResting ? '(EM DESCANSO)' : '(LIVRE)'}
                                                                </option>
                                                            );
                                                        })}
                                                    </select>
                                                    <button onClick={() => handleFulfillRequest(req.id)} disabled={!selectedMapForRequest} className="bg-green-500 p-2 rounded-xl">✓</button>
                                                    <button onClick={() => setFulfillingRequestId(null)} className="bg-red-400 p-2 rounded-xl">✕</button>
                                                </div>
                                            ) : (
                                                <>
                                                    <button onClick={() => setFulfillingRequestId(req.id)} className="bg-white text-blue-700 px-6 py-3 rounded-xl font-black hover:bg-blue-50 transition-all">Atribuir Mapa</button>
                                                    <button onClick={() => handleReject(req.id)} className="bg-blue-800 text-white px-6 py-3 rounded-xl font-black hover:bg-blue-900 transition-all">Recusar</button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800">Ordenação: Disponíveis -> Descanso -> Em Campo</h2>
                            <button onClick={() => setShowAddModal(true)} className="bg-blue-600 text-white font-black py-2.5 px-6 rounded-xl hover:bg-blue-700 transition-all">+ Novo</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">Nome</th>
                                        <th className="px-8 py-4">Status</th>
                                        <th className="px-8 py-4">Último Trabalho</th>
                                        <th className="px-8 py-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sortedTerritories.map(t => {
                                        const resting = isRecentWork(t.history);
                                        const neverWorked = t.history.length === 0;

                                        return (
                                            <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-8 py-6 font-black text-gray-800">{t.name}</td>
                                                <td className="px-8 py-6">
                                                    {t.status === TerritoryStatus.IN_USE ? (
                                                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-blue-100 text-blue-700">
                                                            Em Campo
                                                        </span>
                                                    ) : resting ? (
                                                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-100 text-amber-700">
                                                            Em Descanso
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-green-100 text-green-700">
                                                            {neverWorked ? 'Novo' : 'Livre'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6">
                                                    {t.status === TerritoryStatus.IN_USE ? (
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-700">{t.assignedToName}</p>
                                                            <p className="text-xs text-gray-400">Desde {formatDate(t.assignmentDate)}</p>
                                                        </div>
                                                    ) : t.history.length > 0 ? (
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-600">{t.history[0].userName}</p>
                                                            <p className="text-xs text-gray-400">Concluído em {formatDate(t.history[0].completedDate)}</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-sm text-gray-300 italic">Sem registros</p>
                                                    )}
                                                </td>
                                                <td className="px-8 py-6 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => setViewHistory(t)} className="p-2 text-gray-400 hover:text-blue-600 transition-all text-sm font-bold">Histórico</button>
                                                        <button onClick={() => handleDeleteTerritory(t.id)} className="p-2 text-gray-400 hover:text-red-600 transition-all text-sm font-bold">Excluir</button>
                                                    </div>
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
                <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-50">
                        <h2 className="text-2xl font-black text-gray-800">Publicadores</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-4">Nome</th>
                                    <th className="px-8 py-4">Cargo</th>
                                    <th className="px-8 py-4">Cadastro</th>
                                    <th className="px-8 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-6 font-black text-gray-800">{u.name}</td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-sm text-gray-400">{formatDate(u.createdAt)}</td>
                                        <td className="px-8 py-6 text-right">
                                            <button 
                                                onClick={() => handlePromote(u)}
                                                className="text-sm font-bold text-blue-600 hover:underline"
                                            >
                                                Alterar Cargo
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