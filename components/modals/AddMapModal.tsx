import React, { useState } from 'react';
import { uploadTerritory, createTerritory } from '../../services/api';

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
            if (!name.trim()) throw new Error("O nome do mapa é obrigatório.");
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

export default AddMapModal;
