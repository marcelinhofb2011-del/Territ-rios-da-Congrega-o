import React, { useState } from 'react';
import { Territory } from '../../types';
import { updateAssignmentDates } from '../../services/api';

interface EditAssignmentDatesModalProps {
    territory: Territory;
    onClose: () => void;
    onSuccess: () => void;
}

const toLocalInputDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const EditAssignmentDatesModal: React.FC<EditAssignmentDatesModalProps> = ({ territory, onClose, onSuccess }) => {
    const [assignmentDate, setAssignmentDate] = useState(() => {
        const d = territory.assignmentDate || new Date();
        return toLocalInputDate(d);
    });
    const [dueDate, setDueDate] = useState(() => {
        const d = territory.dueDate || new Date();
        return toLocalInputDate(d);
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateAssignmentDates(
                territory.id,
                new Date(assignmentDate + 'T12:00:00'),
                new Date(dueDate + 'T12:00:00')
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Erro ao atualizar datas.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Editar Datas</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">&times;</button>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Ajuste as datas de designação e devolução</p>
                </div>

                <div className="p-8 space-y-6">
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 mb-4">
                        <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-sm font-black">{territory.number || '?'}</span>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Território</p>
                            <p className="text-sm font-black text-slate-900 leading-none">{territory.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{territory.assignedToName}</p>
                        </div>
                    </div>

                    <div className="space-y-4">
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
                        disabled={loading}
                        className="flex-[2] py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditAssignmentDatesModal;
