import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus } from '../types';
import { 
    fetchAllTerritories, assignTerritoryToRequest, rejectRequest, uploadTerritory, 
    updateTerritory, deleteTerritory, fetchAllUsers, updateUserRole, createTerritory, adminResetTerritory
} from '../services/api';
import { formatDate, isRecentWork } from '../utils/helpers';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';


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
                            {territory.history.map((entry, index) => (
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
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-black text-gray-900" placeholder="Ex: Território 05" />
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
                            <input type="url" value={link} onChange={e => setLink(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900" placeholder="https://..." />
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

const EditMapModal: React.FC<{ territory: Territory; onClose: () => void; onSave: () => void; }> = ({ territory, onClose, onSave }) => {
    const [name, setName] = useState(territory.name);
    const [notes, setNotes] = useState(territory.permanentNotes || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await updateTerritory(territory.id, { name, permanentNotes: notes });
            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message || "Erro ao atualizar mapa.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-2xl font-black mb-6 text-gray-800">Editar: {territory.name}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Nome/Número do Mapa</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-black text-gray-900" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Observações Permanentes</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={5}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900"
                            placeholder="Ex: Não bater na casa 123 a pedido do morador."
                        />
                         <p className="text-xs text-gray-400 mt-1 ml-1">Esta nota será visível para todos os publicadores que trabalharem neste mapa.</p>
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl hover:bg-gray-200 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 disabled:bg-blue-300">
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
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
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [viewHistory, setViewHistory] = useState<Territory | null>(null);
    const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
    const [selectedMapForRequest, setSelectedMapForRequest] = useState<string>('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [t, u] = await Promise.all([
                fetchAllTerritories(),
                fetchAllUsers()
            ]);
            setTerritories(t);
            setUsers(u);
        } catch (e) {
            console.error("Erro ao carregar dados admin:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    // Listener em tempo real para solicitações
    useEffect(() => {
        const q = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id,
                requestDate: doc.data().requestDate?.toDate() || new Date()
            } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
            setRequests(reqs);
        });

        return () => unsubscribe();
    }, []);

    const handleFulfillRequest = async (requestId: string) => {
        if (!selectedMapForRequest) return;
        try {
            await assignTerritoryToRequest(requestId, selectedMapForRequest);
            setFulfillingRequestId(null);
            setSelectedMapForRequest('');
            // A lista de solicitações se atualizará sozinha. Recarregamos os territórios.
            const t = await fetchAllTerritories();
            setTerritories(t);
        } catch (e: any) { alert(e.message); }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Rejeitar esta solicitação?")) return;
        await rejectRequest(id);
        // A lista se atualiza sozinha.
    };

    const handleDeleteTerritory = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir este território?")) return;
        await deleteTerritory(id);
        await loadData(); // Recarrega territórios
    };

    const handleResetTerritory = async (id: string) => {
        if (!confirm("Deseja retomar este território? Ele voltará a ficar disponível sem precisar de relatório.")) return;
        await adminResetTerritory(id);
        await loadData(); // Recarrega territórios
    };

    const handlePromote = async (user: User) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        await updateUserRole(user.id, newRole);
        await loadData(); // Recarrega usuários
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
            {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={loadData} />}
            {editingTerritory && <EditMapModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={loadData} />}
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="text-4xl p-3 bg-white rounded-2xl shadow-sm border border-gray-100">🗺️</div>
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">Painel Admin</h1>
                        <p className="text-gray-500 font-medium mt-1">Gestão de Congregação</p>
                    </div>
                </div>
                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl self-start md:self-auto">
                    <button 
                        onClick={() => setActiveTab('territories')} 
                        className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'territories' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        Mapas
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')} 
                        className={`px-6 py-2 text-sm font-bold rounded-xl transition-all ${activeTab === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
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
                            <div key={s.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <p className="text-xs font-black text-gray-400 uppercase mb-1">{s.label}</p>
                                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Solicitações Pendentes */}
                    {requests.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-[2rem] p-8">
                            <h2 className="text-xl font-black text-blue-900 mb-6 flex items-center gap-2">
                                <span className="flex h-3 w-3 rounded-full bg-blue-600 animate-pulse"></span>
                                Solicitações Pendentes ({requests.length})
                            </h2>
                            <div className="space-y-4">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-50">
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
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h2 className="text-2xl font-black text-gray-800">Mapas da Congregação</h2>
                            <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-gray-900 text-white font-black rounded-xl hover:bg-black transition-all transform active:scale-95 shadow-xl shadow-gray-200">
                                + NOVO MAPA
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                        <th className="px-8 py-5">Identificação</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5">Responsável</th>
                                        <th className="px-8 py-5">Último Trabalho</th>
                                        <th className="px-8 py-5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {sortedTerritories.map(m => {
                                        const recent = isRecentWork(m.history);
                                        return (
                                            <tr key={m.id} className="group hover:bg-gray-50 transition-colors">
                                                <td className="px-8 py-6">
                                                    <p className="font-black text-gray-900 text-lg">{m.name}</p>
                                                    <a href={`${m.pdfUrl}&t=${new Date().getTime()}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 font-bold hover:underline">Ver Arquivo &rarr;</a>
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
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-gray-50">
                        <h2 className="text-2xl font-black text-gray-800">Usuários Cadastrados</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest bg-gray-50/50">
                                    <th className="px-8 py-5">Nome</th>
                                    <th className="px-8 py-5">Email</th>
                                    <th className="px-8 py-5">Cargo</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u.id} className="group hover:bg-gray-50 transition-colors">
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
