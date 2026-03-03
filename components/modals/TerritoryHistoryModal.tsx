import React from 'react';
import { Territory, TerritoryStatus } from '../../types';
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
                    {territory.status === TerritoryStatus.IN_USE && (
                        <div className="mb-6">
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-3 px-1">Designação Atual</p>
                            <div className="bg-blue-50 p-5 rounded-2xl border-2 border-blue-100 shadow-sm">
                                <p className="font-black text-blue-900 text-lg mb-4">{territory.assignedToName}</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Início do Trabalho</p>
                                        <p className="font-bold text-blue-700 text-sm">{formatDate(territory.assignmentDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Prazo de Devolução</p>
                                        <p className="font-bold text-blue-700 text-sm">{formatDate(territory.dueDate)}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="my-6 border-b border-dashed border-slate-200"></div>
                        </div>
                    )}

                    {territory.history && territory.history.length > 0 ? (
                        <ul className="space-y-4">
                            {territory.history.map((entry, index) => (
                                <li key={index} className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                    <p className="font-black text-slate-800 text-lg mb-4">{entry.userName}</p>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Início do Trabalho</p>
                                            <p className="font-bold text-slate-700 text-sm">{formatDate(entry.assignmentDate)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fim do Trabalho</p>
                                            <p className="font-bold text-slate-700 text-sm">{formatDate(entry.completedDate)}</p>
                                        </div>
                                    </div>

                                    {entry.notes && (
                                        <div className="pt-4 border-t border-slate-200">
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Observações</p>
                                            <p className="text-sm text-slate-600 leading-relaxed italic">"{entry.notes}"</p>
                                        </div>
                                    )}
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