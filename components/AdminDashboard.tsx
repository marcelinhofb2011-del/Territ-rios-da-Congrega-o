
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User } from '../types';
import { 
    fetchAllTerritories, fetchAllRequests, assignTerritoryToRequest, rejectRequest, uploadTerritory, 
    updateTerritory, deleteTerritory, fetchAllUsers, updateUserRole 
} from '../services/api';
import { formatDate, getDeadlineColorInfo } from '../utils/helpers';
import { useAuth } from '../hooks/useAuth';

const TerritoryHistoryModal: React.FC<{ territory: Territory; onClose: () => void; }> = ({ territory, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Histórico de "{territory.name}"</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-4">
                    {territory.history.length > 0 ? (
                        <ul className="space-y-4">
                            {territory.history.map((entry, index) => (
                                <li key={index} className="border-b pb-3">
                                    <p className="font-semibold">{entry.userName} fechou o território em {formatDate(entry.completedDate)}.</p>
                                    {entry.notes && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded-md"><strong>Notas:</strong> {entry.notes}</p>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Nenhum histórico registrado para este território.</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const UploadTerritoryModal: React.FC<{ 
    onClose: () => void; 
    onUpload: (name: string, file: File) => Promise<void>; 
    isLoading: boolean;
    error: string | null;
}> = ({ onClose, onUpload, isLoading, error }) => {
    const [name, setName] = useState('');
    const [file, setFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (name && file && !isLoading) {
            await onUpload(name, file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Carregar Novo Território</h2>
                 {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 mb-6 rounded-md" role="alert">
                        <p className="font-bold">Erro no Upload</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="territory-name">Nome do Território</label>
                        <input id="territory-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:shadow-outline" />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="territory-file">Arquivo PDF do Mapa</label>
                        <input id="territory-file" type="file" accept=".pdf" onChange={e => setFile(e.target.files ? e.target.files[0] : null)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:shadow-outline" />
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <button type="button" onClick={onClose} disabled={isLoading} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" disabled={isLoading || !name || !file} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300">
                            {isLoading ? 'Carregando...' : 'Carregar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditTerritoryModal: React.FC<{ territory: Territory; onClose: () => void; onSave: (territoryId: string, data: { name: string; permanentNotes: string }) => Promise<void>; }> = ({ territory, onClose, onSave }) => {
    const [name, setName] = useState(territory.name);
    const [permanentNotes, setPermanentNotes] = useState(territory.permanentNotes || '');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSave(territory.id, { name, permanentNotes });
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Editar Território</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-territory-name">Nome do Território</label>
                        <input id="edit-territory-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:shadow-outline" />
                    </div>
                     <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="permanent-notes">Notas Permanentes</label>
                        <textarea id="permanent-notes" value={permanentNotes} onChange={e => setPermanentNotes(e.target.value)} rows={3} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:shadow-outline" placeholder="Ex: Prédio com porteiro, cão bravo, etc."></textarea>
                        <p className="text-xs text-gray-500 mt-1">Estas notas serão sempre visíveis para qualquer publicador que trabalhar neste território.</p>
                    </div>
                    <div className="flex items-center justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-blue-300">
                            {loading ? 'Salvando...' : 'Salvar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AssignTerritoryModal: React.FC<{
    request: TerritoryRequest;
    availableTerritories: Territory[];
    onClose: () => void;
    onConfirm: (requestId: string, territoryId: string) => Promise<void>;
}> = ({ request, availableTerritories, onClose, onConfirm }) => {
    const [selectedTerritoryId, setSelectedTerritoryId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTerritoryId) return;
        setLoading(true);
        await onConfirm(request.id, selectedTerritoryId);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">Atribuir Território</h2>
                <p className="text-gray-600 mb-6">Selecione um território disponível para atribuir a <span className="font-semibold">{request.userName}</span>.</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="territory-select">Territórios Disponíveis</label>
                        <select
                            id="territory-select"
                            value={selectedTerritoryId}
                            onChange={e => setSelectedTerritoryId(e.target.value)}
                            required
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:shadow-outline"
                        >
                            <option value="" disabled>Selecione um território</option>
                            {availableTerritories.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-end gap-4 mt-8">
                        <button type="button" onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                        <button type="submit" disabled={loading || !selectedTerritoryId} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-green-300">
                            {loading ? 'Atribuindo...' : 'Confirmar Atribuição'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ConfirmationModal: React.FC<{ 
    onConfirm: () => void; 
    onClose: () => void; 
    title: string; 
    message: string; 
    confirmText?: string;
    confirmButtonClass?: string;
}> = ({ onConfirm, onClose, title, message, confirmText = "Confirmar", confirmButtonClass = "bg-red-600 hover:bg-red-700" }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-4">{title}</h2>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex items-center justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded">Cancelar</button>
                    <button onClick={onConfirm} className={`${confirmButtonClass} text-white font-bold py-2 px-4 rounded`}>{confirmText}</button>
                </div>
            </div>
        </div>
    );
};

const StatsCard: React.FC<{ title: string; value: string | number; }> = ({ title, value }) => (
    <div className="bg-white p-4 rounded-lg shadow">
        <h4 className="text-sm text-gray-500">{title}</h4>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
    </div>
);

const StatisticsPanel: React.FC<{ territories: Territory[] }> = ({ territories }) => {
    const stats = useMemo(() => {
        const statusCounts = territories.reduce((acc, t) => {
            acc[t.status] = (acc[t.status] || 0) + 1;
            return acc;
        }, {} as Record<TerritoryStatus, number>);

        const inactiveTerritories = territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE || t.status === TerritoryStatus.CLOSED)
            .map(t => {
                const lastActivityDate = t.history.length > 0
                    ? t.history[t.history.length - 1].completedDate
                    : t.createdAt;
                const daysInactive = (new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 3600 * 24);
                return { ...t, daysInactive };
            })
            .sort((a, b) => b.daysInactive - a.daysInactive)
            .slice(0, 3);
        
        return {
            total: territories.length,
            available: statusCounts[TerritoryStatus.AVAILABLE] || 0,
            inUse: statusCounts[TerritoryStatus.IN_USE] || 0,
            inactiveTerritories,
        };
    }, [territories]);

    return (
        <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Visão Geral e Estatísticas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard title="Total de Territórios" value={stats.total} />
                <StatsCard title="Disponíveis" value={stats.available} />
                <StatsCard title="Em Uso" value={stats.inUse} />
                <div className="md:col-span-2 lg:col-span-1 bg-white p-4 rounded-lg shadow">
                     <h4 className="text-sm text-gray-500">Inativos por Mais Tempo</h4>
                     {stats.inactiveTerritories.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                            {stats.inactiveTerritories.map(t => (
                                <li key={t.id} className="text-sm text-gray-800 flex justify-between">
                                    <span>{t.name}</span>
                                    <span className="font-semibold">{Math.floor(t.daysInactive)} dias</span>
                                </li>
                            ))}
                        </ul>
                     ) : <p className="text-sm text-gray-600 mt-2">Nenhum território inativo.</p>}
                </div>
            </div>
        </section>
    );
};


const AdminDashboard: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [requests, setRequests] = useState<TerritoryRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'territorios' | 'usuarios'>('territorios');
    
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [deletingTerritory, setDeletingTerritory] = useState<Territory | null>(null);
    const [assigningRequest, setAssigningRequest] = useState<TerritoryRequest | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewingHistory, setViewingHistory] = useState<Territory | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<TerritoryStatus | ''>('');


    const fetchData = useCallback(async () => {
        setError('');
        try {
            const [territoriesData, requestsData, usersData] = await Promise.all([
                fetchAllTerritories(),
                fetchAllRequests(),
                fetchAllUsers()
            ]);
            setTerritories(territoriesData);
            setRequests(requestsData);
            setUsers(usersData);
        } catch (err) {
            setError('Falha ao carregar os dados. Tente novamente mais tarde.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchData();
    }, [fetchData]);

    const handleConfirmAssignment = async (requestId: string, territoryId: string) => {
        setActionLoading(requestId);
        try {
            await assignTerritoryToRequest(requestId, territoryId);
            await fetchData();
        } catch (err) {
            setError('Falha ao atribuir o território.');
        } finally {
            setAssigningRequest(null);
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        setActionLoading(requestId);
        try {
            await rejectRequest(requestId);
            await fetchData();
        } catch (err) {
            setError('Falha ao rejeitar a solicitação.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleUpload = async (name: string, file: File) => {
        setActionLoading('uploading');
        setUploadError(null);

        try {
            await uploadTerritory(name, file);
            await fetchData();
            setIsUploadModalOpen(false);
        } catch(err: any) {
            setUploadError(err.message || "Ocorreu um erro desconhecido durante o upload.");
        } finally {
            setActionLoading(null);
        }
    };
    
    const openUploadModal = () => {
        setUploadError(null);
        setIsUploadModalOpen(true);
    };

    const handleUpdate = async (territoryId: string, data: { name: string, permanentNotes: string }) => {
        try {
            await updateTerritory(territoryId, data);
            await fetchData();
        } catch(err) {
            setError("Falha ao atualizar o território.");
        } finally {
            setEditingTerritory(null);
        }
    };

    const handleDelete = async () => {
        if (!deletingTerritory) return;
        setActionLoading(deletingTerritory.id);
        try {
            await deleteTerritory(deletingTerritory.id);
            await fetchData();
        } catch(err) {
            setError("Falha ao excluir o território.");
        } finally {
            setDeletingTerritory(null);
            setActionLoading(null);
        }
    };

    const handleToggleUserRole = async (user: User) => {
        if (user.id === currentUser?.id) {
            alert("Você não pode alterar sua própria função.");
            return;
        }
        setActionLoading(user.id);
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        try {
            await updateUserRole(user.id, newRole);
            await fetchData();
        } catch (err) {
            setError("Falha ao atualizar função do usuário.");
        } finally {
            setActionLoading(null);
        }
    };

    const filteredTerritories = useMemo(() => {
        return territories
            .filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .filter(t => statusFilter ? t.status === statusFilter : true);
    }, [territories, searchTerm, statusFilter]);

    const availableTerritoriesForAssignment = useMemo(() => {
        return territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE)
            .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    }, [territories]);

    if (loading) {
        return <div className="text-center p-10">Carregando dados do administrador...</div>;
    }
    
    return (
        <div className="container mx-auto">
             {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md mb-6" role="alert">{error}</div>}
            
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold text-gray-800">Painel do Administrador</h1>
                
                <div className="flex bg-gray-200 p-1 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('territorios')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'territorios' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Territórios
                    </button>
                    <button 
                        onClick={() => setActiveTab('usuarios')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'usuarios' ? 'bg-white text-blue-600 shadow' : 'text-gray-600 hover:text-gray-900'}`}
                    >
                        Usuários
                    </button>
                </div>
            </div>

            {activeTab === 'territorios' ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-700">Gestão de Mapas</h2>
                        <button onClick={openUploadModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition transform hover:scale-105">
                            + Novo Território
                        </button>
                    </div>
                    
                    {isUploadModalOpen && <UploadTerritoryModal onClose={() => setIsUploadModalOpen(false)} onUpload={handleUpload} isLoading={actionLoading === 'uploading'} error={uploadError} />}
                    {editingTerritory && <EditTerritoryModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={handleUpdate} />}
                    {viewingHistory && <TerritoryHistoryModal territory={viewingHistory} onClose={() => setViewingHistory(null)} />}
                    {assigningRequest && <AssignTerritoryModal 
                        request={assigningRequest}
                        availableTerritories={availableTerritoriesForAssignment}
                        onClose={() => setAssigningRequest(null)}
                        onConfirm={handleConfirmAssignment}
                    />}
                    {deletingTerritory && <ConfirmationModal 
                        title="Excluir Território"
                        message={`Tem certeza que deseja excluir o território "${deletingTerritory.name}"? Esta ação não pode ser desfeita.`}
                        onClose={() => setDeletingTerritory(null)} 
                        onConfirm={handleDelete}
                        confirmText="Confirmar Exclusão"
                        confirmButtonClass="bg-red-600 hover:bg-red-700"
                    />}

                    <StatisticsPanel territories={territories} />

                    {/* Requests Section */}
                    <section className="mb-8">
                        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Solicitações Pendentes ({requests.length})</h2>
                        {requests.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {requests.map(req => (
                                    <div key={req.id} className="bg-white p-5 rounded-lg shadow-md border-l-4 border-yellow-500">
                                        <h3 className="font-bold text-lg">Solicitação de Território</h3>
                                        <p className="text-sm text-gray-600">De: {req.userName}</p>
                                        <p className="text-sm text-gray-500">Data: {formatDate(req.requestDate)}</p>
                                        <div className="mt-4 flex gap-4">
                                            <button onClick={() => setAssigningRequest(req)} disabled={actionLoading === req.id || availableTerritoriesForAssignment.length === 0} className="bg-green-500 hover:bg-green-600 text-white font-semibold py-1 px-3 rounded text-sm w-full disabled:bg-green-300 disabled:cursor-not-allowed">
                                                {actionLoading === req.id ? '...' : 'Atender'}
                                            </button>
                                            <button onClick={() => handleRejectRequest(req.id)} disabled={actionLoading === req.id} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-sm w-full disabled:bg-red-300">
                                                {actionLoading === req.id ? '...' : 'Rejeitar'}
                                            </button>
                                        </div>
                                        {availableTerritoriesForAssignment.length === 0 && <p className="text-xs text-center mt-2 text-red-600">Nenhum território disponível para atribuir.</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Nenhuma solicitação pendente no momento.</p>
                        )}
                    </section>

                    {/* All Territories Section */}
                    <section>
                        <div className="mb-4">
                            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Todos os Territórios ({filteredTerritories.length})</h2>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="flex-grow shadow-sm appearance-none border rounded w-full py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500" />
                                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as TerritoryStatus | '')} className="shadow-sm appearance-none border rounded w-full sm:w-auto py-2 px-3 text-gray-700 bg-gray-50 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">Todos os Status</option>
                                    <option value={TerritoryStatus.AVAILABLE}>Disponível</option>
                                    <option value={TerritoryStatus.IN_USE}>Em Uso</option>
                                    <option value={TerritoryStatus.CLOSED}>Fechado</option>
                                </select>
                            </div>
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredTerritories.map(t => {
                                const colorInfo = getDeadlineColorInfo(t.dueDate);
                                return (
                                    <div key={t.id} className="bg-white rounded-lg shadow-lg overflow-hidden flex flex-col justify-between transform hover:-translate-y-1 transition-transform duration-300">
                                        <div>
                                            <div className={`p-5 ${t.status === TerritoryStatus.IN_USE ? colorInfo.bgColor : 'bg-gray-200'}`}>
                                                <h3 className={`font-bold text-xl ${t.status === TerritoryStatus.IN_USE ? colorInfo.textColor : 'text-gray-800'}`}>{t.name}</h3>
                                            </div>
                                            <div className="p-5 space-y-3 text-sm">
                                                <p><strong>Status:</strong> <span className="font-semibold capitalize">{t.status.replace('_', ' ')}</span></p>
                                                {t.status === TerritoryStatus.IN_USE && t.assignedToName && (
                                                    <>
                                                        <p><strong>Publicador:</strong> {t.assignedToName}</p>
                                                        <p><strong>Data de Vencimento:</strong> {formatDate(t.dueDate)}</p>
                                                        <p className={`text-xs font-bold ${colorInfo.textColor.replace('text-white', 'text-gray-800').replace('text-gray-800', 'text-current')}`}>{colorInfo.label}</p>
                                                    </>
                                                )}
                                                {t.status === TerritoryStatus.CLOSED && t.history.length > 0 && (
                                                    <p className="text-gray-600 font-semibold">Fechado em {formatDate(t.history[t.history.length-1]?.completedDate)}</p>
                                                )}
                                                 {t.permanentNotes && <p className="text-xs text-yellow-800 bg-yellow-100 p-2 rounded-md"><strong>Nota Permanente:</strong> {t.permanentNotes}</p>}
                                            </div>
                                        </div>
                                        <div className="px-5 pb-4 mt-2 border-t pt-3 flex justify-end gap-4">
                                            <button onClick={() => setViewingHistory(t)} className="text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors">Histórico</button>
                                            <button onClick={() => setEditingTerritory(t)} className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">Editar</button>
                                            <button onClick={() => setDeletingTerritory(t)} disabled={t.status !== TerritoryStatus.AVAILABLE && t.status !== TerritoryStatus.CLOSED} className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed">Excluir</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                         {filteredTerritories.length === 0 && <p className="text-center text-gray-500 mt-8">Nenhum território encontrado com os filtros aplicados.</p>}
                    </section>
                </>
            ) : (
                <section className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Usuário</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">E-mail</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Nível de Acesso</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-medium text-gray-900">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                                {u.role === 'admin' ? 'Administrador' : 'Publicador'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleToggleUserRole(u)}
                                                disabled={actionLoading === u.id || u.id === currentUser?.id}
                                                className="text-blue-600 hover:text-blue-900 disabled:text-gray-300"
                                            >
                                                {actionLoading === u.id ? '...' : u.role === 'admin' ? 'Tornar Publicador' : 'Tornar Administrador'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default AdminDashboard;
