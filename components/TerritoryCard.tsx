import React from 'react';
import { Territory } from '../types';

interface TerritoryCardProps {
    territory: Territory;
    onEdit: (t: Territory) => void;
    onReset: (t: Territory) => void;
    onComplete: (t: Territory) => void;
    onDelete: (t: Territory) => void;
    onViewMap: (t: Territory) => void;
}

const TerritoryCard: React.FC<TerritoryCardProps> = ({ territory, onEdit, onReset, onComplete, onDelete, onViewMap }) => {
    const formatDate = (date: Date | undefined | null) => {
        if (!date) return 'Nunca';
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    };

    const getDaysRemaining = (availableAt: Date | null | undefined) => {
        if (!availableAt) return 0;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const target = new Date(availableAt);
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const getStatusColor = () => {
        if (territory.status === 'em_uso' || territory.status === 'in_use') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (territory.status === 'disponivel' || territory.status === 'available') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        if (territory.status === 'descanso') return 'bg-amber-50 text-amber-600 border-amber-100';
        return 'bg-slate-50 text-slate-500 border-slate-100';
    };

    const getStatusLabel = () => {
        if (territory.status === 'em_uso' || territory.status === 'in_use') return 'Atribuído';
        if (territory.status === 'disponivel' || territory.status === 'available') return 'Disponível';
        if (territory.status === 'descanso') return 'Em Descanso';
        return 'Outro';
    };

    const isAvailable = territory.status === 'disponivel' || territory.status === 'available';
    const isInUse = territory.status === 'em_uso' || territory.status === 'in_use';
    const isResting = territory.status === 'descanso';

    return (
        <div className="group p-5 bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-4 relative">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded bg-gray-800 text-white flex items-center justify-center font-bold text-xl shadow-sm transition-all group-hover:bg-blue-600">
                        {territory.number || 'S/N'}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-bold text-gray-800 text-base leading-tight truncate">{territory.name}</h3>
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-1 truncate">{territory.locality}</p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusColor()}`}>
                        {getStatusLabel()}
                    </span>
                    {isAvailable && (
                        <p className="text-[9px] text-gray-400 font-medium">Última saída: {formatDate(territory.lastCompletedDate)}</p>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                {isInUse && territory.assignedTo && (
                    <div className="flex items-center gap-3 p-2 bg-blue-50/50 border border-blue-100 rounded">
                        <div className="w-6 h-6 rounded bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
                            {territory.assignedToName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-gray-800 text-xs truncate">{territory.assignedToName}</p>
                            <p className="text-[9px] text-red-700 font-semibold uppercase tracking-wider mt-0.5">Devolver até {formatDate(territory.dueDate)}</p>
                        </div>
                    </div>
                )}

                {isResting && (
                    <div className="p-3 bg-amber-50/40 border border-amber-100 rounded space-y-1.5 text-xs text-amber-900">
                        <div className="flex justify-between items-center gap-2">
                            <span className="font-medium text-amber-700">Última saída:</span>
                            <span className="font-bold">{formatDate(territory.returnedAt || territory.lastCompletedDate)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2">
                            <span className="font-medium text-amber-700">Disponível em:</span>
                            <span className="font-bold">{formatDate(territory.availableAt)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-xs border-t border-amber-100/50 pt-1.5 font-bold">
                            <span className="text-amber-700">Dias restantes:</span>
                            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px]">{getDaysRemaining(territory.availableAt)} dias</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between gap-4 pt-1 border-t border-gray-150">
                <button 
                    onClick={() => onViewMap(territory)} 
                    className="py-1.5 text-blue-600 hover:text-blue-700 font-bold text-xs flex items-center gap-1 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Acessar Mapa
                </button>
                <div className="relative group/menu">
                    <button className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-700 transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" /></svg>
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded border border-gray-200 shadow-lg z-50 p-1.5 hidden group-hover/menu:block animate-in fade-in @slide-in-from-bottom-2 origin-bottom-right">
                        <div className="px-2.5 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 mb-1">
                            Ações
                        </div>
                        <button onClick={() => onEdit(territory)} className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-100 rounded flex items-center gap-2 transition-colors">
                            <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar Detalhes
                        </button>
                        {isInUse && (
                            <>
                                <button onClick={() => onComplete(territory)} className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 rounded flex items-center gap-2 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                                    Concluir Mapa
                                </button>
                                <button onClick={() => onReset(territory)} className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 rounded flex items-center gap-2 transition-colors">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                    Estornar Mapa
                                </button>
                            </>
                        )}
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button onClick={() => onDelete(territory)} className="w-full text-left px-2.5 py-1.5 text-[11px] font-semibold text-red-650 hover:bg-red-50 rounded flex items-center gap-2 transition-colors">
                            <svg className="w-3.5 h-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir Registro
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerritoryCard;
