import React, { useState } from 'react';
import { Territory } from '../../types';
import { updateTerritory } from '../../services/api';

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
            if (!name.trim()) throw new Error("O nome do mapa é obrigatório.");
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

export default EditMapModal;
