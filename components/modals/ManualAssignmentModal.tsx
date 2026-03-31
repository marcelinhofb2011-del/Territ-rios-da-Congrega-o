import React, { useState, useMemo } from 'react';
import { Territory, User, TerritoryStatus } from '../../types';
import { manualAssignTerritories } from '../../services/api';

interface ManualAssignmentModalProps {
    territories: Territory[];
    users: User[];
    onClose: () => void;
    onSuccess: () => void;
    initialUserId?: string;
}

const ManualAssignmentModal: React.FC<ManualAssignmentModalProps> = ({ territories, users, onClose, onSuccess, initialUserId }) => {
    const [selectedUserId, setSelectedUserId] = useState(initialUserId || '');
    const [selectedTerritoryIds, setSelectedTerritoryIds] = useState<string[]>([]);
    const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split('T')[0];
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const availableTerritories = useMemo(() => {
        return territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE)
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true }));
    }, [territories]);

    const handleSave = async () => {
        if (!selectedUserId || selectedTerritoryIds.length === 0) {
            setError('Selecione um publicador e pelo menos um mapa.');
            return;
        }

        setLoading(true);
        try {
            const selectedUser = users.find(u => u.id === selectedUserId);
            if (!selectedUser) throw new Error("Usuário não encontrado.");

            // Sort selected territory IDs by their territory number to ensure they are assigned in order
            const sortedTerritoryIds = [...selectedTerritoryIds].sort((a, b) => {
                const tA = territories.find(t => t.id === a);
                const tB = territories.find(t => t.id === b);
                if (!tA || !tB) return 0;
                const numA = parseInt(tA.number) || 0;
                const numB = parseInt(tB.number) || 0;
                if (numA !== numB) return numA - numB;
                return (tA.number || '').localeCompare(tB.number || '', undefined, { numeric: true });
            });

            await manualAssignTerritories(
                selectedUserId,
                selectedUser.name,
                sortedTerritoryIds,
                new Date(assignmentDate + 'T12:00:00'),
                new Date(dueDate + 'T12:00:00')
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao realizar atribuição.');
        } finally {
            setLoading(false);
        }
    };

    const toggleTerritory = (id: string) => {
        setSelectedTerritoryIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Nova Atribuição</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">&times;</button>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Registre a designação de mapas manualmente</p>
                </div>

                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Publicador</label>
                        <select 
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                        >
                            <option value="">Selecione um publicador...</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Mapas Disponíveis ({selectedTerritoryIds.length} selecionados)</label>
                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border-2 border-slate-100 rounded-2xl bg-slate-50">
                            {availableTerritories.length === 0 ? (
                                <p className="text-center py-4 text-slate-400 text-xs font-bold">Nenhum mapa disponível no momento.</p>
                            ) : (
                                availableTerritories.map(t => (
                                    <label key={t.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${selectedTerritoryIds.includes(t.id) ? 'bg-blue-600 text-white' : 'bg-white hover:bg-slate-100 text-slate-700'}`}>
                                        <input 
                                            type="checkbox" 
                                            checked={selectedTerritoryIds.includes(t.id)}
                                            onChange={() => toggleTerritory(t.id)}
                                            className="hidden"
                                        />
                                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${selectedTerritoryIds.includes(t.id) ? 'bg-white text-blue-600' : 'bg-slate-900 text-white'}`}>
                                            {t.number || '?'}
                                        </span>
                                        <span className="text-xs font-black truncate">{t.name}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data de Designação</label>
                            <input 
                                type="date" 
                                value={assignmentDate}
                                onChange={(e) => setAssignmentDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Data de Devolução</label>
                            <input 
                                type="date" 
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50 flex gap-3">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-4 bg-white text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading || !selectedUserId || selectedTerritoryIds.length === 0}
                        className="flex-[2] py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Confirmar Atribuição'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualAssignmentModal;
