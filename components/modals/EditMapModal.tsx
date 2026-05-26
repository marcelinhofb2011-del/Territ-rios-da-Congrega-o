import React, { useState } from 'react';
import { Territory } from '../../types';
import { updateTerritory } from '../../services/api';

const EditMapModal: React.FC<{ territory: Territory; onClose: () => void; onSave: () => void; }> = ({ territory, onClose, onSave }) => {
    const [name, setName] = useState(territory.name || '');
    const [number, setNumber] = useState(territory.number || '');
    const [locality, setLocality] = useState(territory.locality || '');
    const [description, setDescription] = useState(territory.description || '');
    const [observation, setObservation] = useState(territory.observation || '');
    const [notes, setNotes] = useState(territory.permanentNotes || '');
    const [pdfUrl, setPdfUrl] = useState(territory.pdfUrl || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (!name.trim()) throw new Error("O nome do mapa é obrigatório.");
            await updateTerritory(territory.id, { 
                name, 
                number, 
                locality, 
                description, 
                observation, 
                permanentNotes: notes,
                pdfUrl
            });
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
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Editar Território</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && <p className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-xl">{error}</p>}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Nome do Mapa</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-black text-gray-900" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Número</label>
                            <input type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-black text-gray-900" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Localidade</label>
                        <input type="text" value={locality} onChange={e => setLocality(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Descrição</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Observação Importante</label>
                        <textarea value={observation} onChange={e => setObservation(e.target.value)} rows={2} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900" />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Link do Mapa (URL)</label>
                        <input type="text" value={pdfUrl} onChange={e => setPdfUrl(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900" placeholder="https://..." />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Notas Permanentes (Visível p/ todos)</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-bold text-gray-900"
                            placeholder="Ex: Não bater na casa 123 a pedido do morador."
                        />
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
