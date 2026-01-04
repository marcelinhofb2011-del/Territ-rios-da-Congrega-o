import React from 'react';
import { Territory } from '../../types';
import { formatDate } from '../../utils/helpers';

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
                                <li key={index} className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <p className="font-black text-gray-800">{entry.userName}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase">{formatDate(entry.completedDate)}</p>
                                    </div>
                                    {entry.notes && <p className="text-sm text-gray-600 italic leading-relaxed">"{entry.notes}"</p>}
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

export default TerritoryHistoryModal;
