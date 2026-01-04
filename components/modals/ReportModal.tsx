import React, { useState } from 'react';
import { Territory } from '../../types';

const ReportModal: React.FC<{ territory: Territory; onClose: () => void; onSubmit: (notes: string) => Promise<void>; }> = ({ territory, onClose, onSubmit }) => {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSubmit(notes);
        } catch (err) {
            console.error("Erro no submit do modal:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-black mb-2 text-gray-800">Concluir {territory.name}</h2>
                <p className="text-gray-500 mb-6 font-medium">Relate os pontos principais do trabalho realizado.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Observações do Campo</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:border-blue-600 outline-none transition-all font-bold text-lg"
                            placeholder="Descreva como foi o trabalho..."
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 disabled:bg-blue-300 shadow-lg shadow-blue-200">
                            {loading ? 'Salvando...' : 'Finalizar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ReportModal;
