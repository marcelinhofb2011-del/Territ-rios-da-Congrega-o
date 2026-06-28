import React, { useState } from 'react';
import { Territory } from '../types';
import { 
    MapPin, 
    User, 
    Clock, 
    ExternalLink, 
    MoreHorizontal, 
    Edit, 
    CheckCircle, 
    RotateCcw, 
    Trash2, 
    Calendar,
    Coffee,
    ChevronRight,
    Map
} from 'lucide-react';

interface TerritoryCardProps {
    territory: Territory;
    onEdit: (t: Territory) => void;
    onReset: (t: Territory) => void;
    onComplete: (t: Territory) => void;
    onDelete: (t: Territory) => void;
    onViewMap: (t: Territory) => void;
}

const TerritoryCard: React.FC<TerritoryCardProps> = ({ territory, onEdit, onReset, onComplete, onDelete, onViewMap }) => {
    const [showMenu, setShowMenu] = useState(false);

    const parseDateLocal = (d: any): Date | null => {
        if (!d) return null;
        if (d instanceof Date) return d;
        if (typeof d.toDate === 'function') return d.toDate();
        if (typeof d === 'object' && typeof d.seconds === 'number') {
            return new Date(d.seconds * 1000);
        }
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
    };

    const formatDate = (date: any) => {
        const d = parseDateLocal(date);
        if (!d) return 'Nunca';
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    };

    const getDaysRemaining = (availableAt: any) => {
        const target = parseDateLocal(availableAt);
        if (!target) return 0;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        target.setHours(0, 0, 0, 0);
        const diffTime = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const getStatusColor = () => {
        if (territory.status === 'em_uso' || territory.status === 'in_use') {
            return 'bg-purple-50 text-purple-700 border-purple-150';
        }
        if (territory.status === 'disponivel' || territory.status === 'available') {
            return 'bg-emerald-50 text-emerald-700 border-emerald-150';
        }
        if (territory.status === 'descanso' || territory.status === 'resting') {
            return 'bg-amber-50 text-amber-700 border-amber-150';
        }
        return 'bg-slate-50 text-slate-500 border-slate-150';
    };

    const getStatusLabel = () => {
        if (territory.status === 'em_uso' || territory.status === 'in_use') return 'Atribuído';
        if (territory.status === 'disponivel' || territory.status === 'available') return 'Disponível';
        if (territory.status === 'descanso' || territory.status === 'resting') return 'Em Descanso';
        return 'Outro';
    };

    const isAvailable = territory.status === 'disponivel' || territory.status === 'available';
    const isInUse = territory.status === 'em_uso' || territory.status === 'in_use';
    const isResting = territory.status === 'descanso' || territory.status === 'resting';

    return (
        <div className="group p-6 bg-white border border-slate-100 rounded-[20px] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between gap-5 relative overflow-hidden">
            {/* Soft decorative background effect */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full blur-2xl -mr-8 -mt-8 opacity-40 transition-all group-hover:scale-125" />

            <div className="flex items-start justify-between gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    {/* Territory Number Identifier */}
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-extrabold text-lg shadow-sm transition-all duration-300 group-hover:bg-blue-600 group-hover:scale-105">
                        {territory.number || 'S/N'}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-extrabold text-slate-800 text-base leading-tight truncate group-hover:text-blue-600 transition-colors">
                            {territory.name}
                        </h3>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1.5 truncate flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            {territory.locality}
                        </p>
                    </div>
                </div>
                
                {/* Status indicator badge */}
                <div className="flex flex-col items-end gap-1.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusColor()}`}>
                        {getStatusLabel()}
                    </span>
                    {isAvailable && (
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            Saída: {formatDate(territory.lastCompletedDate)}
                        </p>
                    )}
                </div>
            </div>

            {/* Dynamic Status-Specific Info Area */}
            <div className="relative z-10 flex-1">
                {isInUse && territory.assignedTo && (
                    <div className="flex items-center gap-3.5 p-3.5 bg-purple-50/30 border border-purple-100/50 rounded-2xl animate-in fade-in duration-200">
                        <div className="w-8.5 h-8.5 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                            {territory.assignedToName?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-800 text-xs truncate">{territory.assignedToName}</p>
                            <p className="text-[9px] text-red-600 font-extrabold uppercase tracking-widest mt-1 flex items-center gap-1 leading-none">
                                <Clock className="w-3 h-3 shrink-0 text-red-500" />
                                Devolver: {formatDate(territory.dueDate)}
                            </p>
                        </div>
                    </div>
                )}

                {isResting && (
                    <div className="p-3.5 bg-amber-50/20 border border-amber-100/60 rounded-2xl space-y-2 text-xs text-amber-900 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center gap-2 text-[10px] font-bold">
                            <span className="text-amber-600 uppercase tracking-wider flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Conclusão
                            </span>
                            <span className="font-extrabold text-slate-700">{formatDate(territory.returnedAt || territory.lastCompletedDate)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-[10px] font-bold">
                            <span className="text-amber-600 uppercase tracking-wider flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Liberação
                            </span>
                            <span className="font-extrabold text-slate-700">{formatDate(territory.availableAt)}</span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-[10px] border-t border-amber-100/40 pt-2 font-bold mt-1">
                            <span className="text-amber-700 uppercase tracking-wider flex items-center gap-1">
                                <Coffee className="w-3 h-3 text-amber-500" /> Repouso
                            </span>
                            <span className="bg-amber-100/60 text-amber-850 px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider">
                                {getDaysRemaining(territory.availableAt)} dias
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions with Ripple effect & Lucide Icons */}
            <div className="flex items-center justify-between gap-4 pt-3.5 border-t border-slate-55 relative z-10">
                <button 
                    onClick={() => onViewMap(territory)} 
                    className="py-2 px-3 text-blue-600 hover:text-blue-700 font-extrabold text-xs flex items-center gap-1.5 transition-all bg-blue-50/40 hover:bg-blue-50 active:scale-95 rounded-xl cursor-pointer"
                >
                    <Map className="w-3.5 h-3.5" />
                    <span>Acessar Mapa</span>
                </button>
                
                {/* Micro Action Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-slate-50 border border-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                        aria-label="Mais opções"
                    >
                        <MoreHorizontal className="w-4 h-4" />
                    </button>
                    
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                            <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-2xl border border-slate-100 shadow-xl z-50 p-2 animate-in fade-in slide-in-from-bottom-2 origin-bottom-right">
                                <div className="px-2.5 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1.5">
                                    Ações Administrativas
                                </div>
                                <button 
                                    onClick={() => { onEdit(territory); setShowMenu(false); }} 
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <Edit className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Editar Mapa</span>
                                </button>
                                {isInUse && (
                                    <>
                                        <button 
                                            onClick={() => { onComplete(territory); setShowMenu(false); }} 
                                            className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                        >
                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                            <span>Concluir Mapa</span>
                                        </button>
                                        <button 
                                            onClick={() => { onReset(territory); setShowMenu(false); }} 
                                            className="w-full text-left px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                                            <span>Estornar Mapa</span>
                                        </button>
                                    </>
                                )}
                                <div className="h-px bg-slate-50 my-1.5"></div>
                                <button 
                                    onClick={() => { onDelete(territory); setShowMenu(false); }} 
                                    className="w-full text-left px-3 py-2 text-xs font-bold text-red-650 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-red-550" />
                                    <span>Excluir Mapa</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TerritoryCard;
