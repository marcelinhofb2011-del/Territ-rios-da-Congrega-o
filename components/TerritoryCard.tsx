import React from 'react';
import { Territory } from '../types';

interface TerritoryCardProps {
    territory: Territory;
    onEdit: (t: Territory) => void;
    onHistory: (t: Territory) => void;
    onReset: (t: Territory) => void;
    onDelete: (t: Territory) => void;
    onViewMap: (t: Territory) => void;
}

const TerritoryCard: React.FC<TerritoryCardProps> = ({ territory, onEdit, onHistory, onReset, onDelete, onViewMap }) => {
    const formatDate = (date: Date | undefined) => {
        if (!date) return 'Nunca';
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(date);
    };

    const getStatusColor = () => {
        if (territory.status === 'in_use') return 'bg-blue-50 text-blue-600 border-blue-100';
        if (territory.status === 'available') return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        return 'bg-slate-50 text-slate-500 border-slate-100';
    };

    const getStatusLabel = () => {
        if (territory.status === 'in_use') return 'Em Uso';
        if (territory.status === 'available') return 'Livre';
        return 'Outro';
    };

    return (
        <div className="group bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700 -z-10 opacity-50"></div>
            
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg group-hover:bg-blue-600 transition-colors">
                        {territory.number}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-black text-slate-900 text-lg leading-tight truncate group-hover:text-blue-600 transition-colors">{territory.name}</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 truncate">{territory.locality}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap ${getStatusColor()}`}>
                    {getStatusLabel()}
                </span>
            </div>

            <div className="space-y-4">
                {territory.status === 'in_use' && territory.assignedTo && (
                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-2">Designado para</p>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs">
                                {territory.assignedToName?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-blue-900 text-xs truncate">{territory.assignedToName}</p>
                                <p className="text-[9px] text-blue-400 font-bold">Devolução: {formatDate(territory.dueDate)}</p>
                            </div>
                        </div>
                    </div>
                )}

                {territory.status === 'available' && (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Conclusão</p>
                        <p className="text-xs font-bold text-slate-600">{formatDate(territory.lastCompletedDate)}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <button 
                    onClick={() => onViewMap(territory)} 
                    className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-md"
                >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    Mapa
                </button>
                <div className="relative group/menu">
                    <button className="w-full h-full flex items-center justify-center gap-2 py-3 bg-white text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-200 hover:bg-slate-50 transition-all shadow-sm">
                        Ações
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 p-2 hidden group-hover/menu:block animate-in fade-in slide-in-from-bottom-2 origin-bottom-right">
                        <button onClick={() => onEdit(territory)} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            Editar
                        </button>
                        <button onClick={() => onHistory(territory)} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 rounded-xl flex items-center gap-3">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Histórico
                        </button>
                        <div className="h-px bg-slate-100 my-1 mx-2"></div>
                        {territory.status === 'in_use' && (
                            <button onClick={() => onReset(territory)} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center gap-3">
                                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Concluir
                            </button>
                        )}
                        <button onClick={() => onDelete(territory)} className="w-full text-left px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-3">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TerritoryCard;
