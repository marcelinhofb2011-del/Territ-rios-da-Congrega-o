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
                        <button type="button" onClick={() => setLink('link')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'link' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Link Externo</button>
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

            if (a.history.length > 0 && b.history.length > 0) {
                return a.history[0].completedDate.getTime() - b.history[0].completedDate.getTime();
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
            {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">Painel Admin</h1>
                    <p className="text-gray-500 font-medium mt-1">Gestão de Congregação</p>
                </div>
                <div className="flex bg-gray-200/50 p-1.5 rounded-2xl">
                    <button onClick={() => setActiveTab('territories')} className={`px-6 py-