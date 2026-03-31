import React, { useState, useEffect } from 'react';
import { Territory, RequestStatus, TerritoryStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { requestTerritory, submitReport, toggleWorkedOn, parseDate, hydrateHistory, reversalTerritory } from '../services/api';
import { formatDate, getDeadlineColorInfo, getDaysRemaining } from '../utils/helpers';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import MapViewerModal from './modals/MapViewerModal';
import TerritoryHistoryModal from './modals/TerritoryHistoryModal';
import ReportModal from './modals/ReportModal';

const PublisherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myTerritories, setMyTerritories] = useState<Territory[]>([]);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reportingTerritory, setReportingTerritory] = useState<Territory | null>(null);
    const [historyTerritory, setHistoryTerritory] = useState<Territory | null>(null);
    const [viewingMap, setViewingMap] = useState<Territory | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    
    // UI states
    const [isCompactView, setIsCompactView] = useState(false);
    const [isSubmittingAll, setIsSubmittingAll] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const territoryQuery = query(collection(db, 'territories'), where('assignedTo', '==', user.id), where('status', '==', TerritoryStatus.IN_USE));
        const unsubscribeTerritory = onSnapshot(territoryQuery, (snapshot) => {
            const territoriesList: Territory[] = snapshot.docs.map(doc => {
                const data = doc.data();
                const history = hydrateHistory(data.history || []);

                return {
                    id: doc.id,
                    name: data.name || 'Sem Nome',
                    number: data.number || '',
                    locality: data.locality || '',
                    description: data.description || '',
                    observation: data.observation || '',
                    status: data.status,
                    pdfUrl: data.pdfUrl,
                    createdAt: parseDate(data.createdAt) || new Date(),
                    assignedTo: data.assignedTo,
                    assignedToName: data.assignedToName,
                    assignmentDate: parseDate(data.assignmentDate),
                    dueDate: parseDate(data.dueDate),
                    permanentNotes: data.permanentNotes || '',
                    history: history,
                    workedOn: data.workedOn || false,
                    lastCompletedDate: parseDate(data.lastCompletedDate),
                    assignmentOrder: data.assignmentOrder
                } as Territory;
            }).sort((a, b) => {
                // Sort by assignmentOrder if both have it, otherwise fallback to assignmentDate
                if (a.assignmentOrder !== undefined && b.assignmentOrder !== undefined) {
                    return a.assignmentOrder - b.assignmentOrder;
                }
                const dateA = a.assignmentDate?.getTime() || 0;
                const dateB = b.assignmentDate?.getTime() || 0;
                return dateA - dateB;
            });
            setMyTerritories(territoriesList);
            setLoading(false);
        }, (err) => {
            console.error("Erro no listener de território:", err);
            setError('Falha ao carregar seus territórios.');
            setLoading(false);
        });

        const requestQuery = query(collection(db, 'requests'), where('userId', '==', user.id), where('status', '==', RequestStatus.PENDING));
        const unsubscribeRequest = onSnapshot(requestQuery, (snapshot) => {
            setHasPendingRequest(!snapshot.empty);
        }, (err) => {
            console.error("Erro no listener de solicitações:", err);
            setError('Falha ao verificar suas solicitações.');
        });

        return () => {
            unsubscribeTerritory();
            unsubscribeRequest();
        };
    }, [user]);

    const handleRequest = async () => {
        if (!user || actionLoading) return;
        setActionLoading(true);
        try {
            await requestTerritory(user);
        } catch (err: any) {
            setError(err.message || 'Erro ao solicitar mapa.');
            setTimeout(() => setError(''), 5000);
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleSubmitReport = async (notes: string) => {
        if (!user || !reportingTerritory) return;
        try {
            await submitReport(user, reportingTerritory.id, notes);
            setReportingTerritory(null);
        } catch (err: any) {
            console.error("Erro ao devolver:", err);
            setError(`Erro ao devolver território. Verifique as permissões.`);
            setTimeout(() => setError(''), 6000);
        }
    };

    const handleReversal = async (territory: Territory) => {
        if (!user || actionLoading) return;
        
        const confirm = window.confirm(`Deseja realizar o ESTORNO do mapa ${territory.number || territory.name}? O mapa voltará para os disponíveis como se não tivesse sido trabalhado.`);
        if (!confirm) return;

        setActionLoading(true);
        try {
            await reversalTerritory(user, territory.id);
        } catch (err: any) {
            setError('Erro ao realizar estorno do mapa.');
            setTimeout(() => setError(''), 5000);
        } finally {
            setActionLoading(false);
        }
    };

    const handleToggleWorked = async (territory: Territory) => {
        try {
            await toggleWorkedOn(territory.id, !territory.workedOn);
        } catch (err: any) {
            setError('Erro ao atualizar status do mapa.');
            setTimeout(() => setError(''), 4000);
        }
    };

    const handleShareDirect = async (territory: Territory) => {
        const shareData = {
            title: `Mapa: ${territory.name}`,
            text: `Link do mapa ${territory.name}:`,
            url: territory.pdfUrl
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`;
                window.open(whatsappUrl, '_blank');
            }
        } catch (err) { console.log('Share error'); }
    };

    const handleCompleteAll = async () => {
        if (!user || myTerritories.length === 0 || isSubmittingAll) return;
        
        const confirm = window.confirm(`Deseja concluir e devolver todos os ${myTerritories.length} mapas de uma vez?`);
        if (!confirm) return;

        setIsSubmittingAll(true);
        try {
            for (const territory of myTerritories) {
                await submitReport(user, territory.id, "Devolução em lote.");
            }
        } catch (err: any) {
            setError("Erro ao concluir alguns mapas. Tente novamente.");
            setTimeout(() => setError(''), 5000);
        } finally {
            setIsSubmittingAll(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
    
    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20 px-4">
            {myTerritories.some(t => (getDaysRemaining(t.dueDate) ?? 0) < 0) && (
                <div className="bg-red-50 border-2 border-red-100 p-6 rounded-[2rem] flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
                    <div className="bg-red-100 p-3 rounded-2xl text-red-600">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                        <h4 className="text-red-900 font-black uppercase tracking-widest text-sm">Atenção: Território Atrasado</h4>
                        <p className="text-red-700 text-xs font-bold">Você tem um ou mais mapas com o prazo de devolução vencido. Por favor, conclua o trabalho assim que possível.</p>
                    </div>
                </div>
            )}
            
            {myTerritories.length > 0 && (
                <div className="bg-white rounded-[3rem] border-2 border-gray-50 shadow-2xl shadow-gray-200/50 overflow-hidden">
                    <div className="p-8 sm:p-10 border-b border-gray-50 bg-gray-50/30">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-600 p-2 rounded-xl text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Quadro de Prazos</h2>
                        </div>
                        <div className="space-y-6">
                            {myTerritories.map(t => {
                                const daysRemaining = getDaysRemaining(t.dueDate);
                                const isOverdue = daysRemaining !== null && daysRemaining < 0;
                                const colorInfo = getDeadlineColorInfo(t.dueDate);
                                const progress = Math.min(100, Math.max(0, ((30 - (daysRemaining || 0)) / 30) * 100));

                                return (
                                    <div key={`deadline-${t.id}`} className="space-y-2">
                                        <div className="flex justify-between items-end">
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-black text-gray-600">{t.number || '?'}</span>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Território</p>
                                                    <p className="text-sm font-black text-gray-900 leading-none">{t.name}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Prazo: {formatDate(t.dueDate)}</p>
                                                <div className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${colorInfo.bgColor} ${colorInfo.textColor}`}>
                                                    {isOverdue ? `Atrasado ${Math.abs(daysRemaining)}d` : `${daysRemaining} dias restantes`}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden p-0.5">
                                            <div className={`${colorInfo.bgColor} h-full rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-black text-gray-900 tracking-tight mb-2">Meus Mapas</h1>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-wider border border-blue-100">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                            {myTerritories.length} {myTerritories.length === 1 ? 'Território Ativo' : 'Territórios Ativos'}
                        </span>
                        <p className="text-gray-400 font-bold text-xs">Acompanhe seu progresso e prazos</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    {myTerritories.length > 1 && (
                        <button 
                            onClick={handleCompleteAll}
                            disabled={isSubmittingAll}
                            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:bg-gray-300"
                        >
                            {isSubmittingAll ? 'Concluindo...' : 'Concluir Todos'}
                        </button>
                    )}
                    {myTerritories.length > 0 && (
                        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm">
                            <button 
                                onClick={() => setIsCompactView(false)}
                                className={`p-2 rounded-xl transition-all ${!isCompactView ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Visualização em Cards"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                            <button 
                                onClick={() => setIsCompactView(true)}
                                className={`p-2 rounded-xl transition-all ${isCompactView ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Visualização em Lista"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 p-5 rounded-3xl border-2 border-red-100 font-bold animate-in fade-in slide-in-from-top-2 shadow-sm">{error}</div>}

            {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} number={viewingMap.number} onClose={() => setViewingMap(null)} />}
            {reportingTerritory && <ReportModal territory={reportingTerritory} onClose={() => setReportingTerritory(null)} onSubmit={handleSubmitReport} />}
            {historyTerritory && <TerritoryHistoryModal territory={historyTerritory} onClose={() => setHistoryTerritory(null)} />}

            {myTerritories.length > 0 ? (
                <div className={isCompactView ? "space-y-4" : "grid grid-cols-1 md:grid-cols-2 gap-8"}>
                    {myTerritories.map((territory, index) => {
                        const colorInfo = getDeadlineColorInfo(territory.dueDate);
                        const daysRemaining = getDaysRemaining(territory.dueDate) ?? 0;
                        const progress = Math.max(5, 100 - (daysRemaining / 30) * 100);
                        const isOverdue = daysRemaining < 0;
                        const mapNumber = territory.number || territory.name.match(/\d+/)?.[0] || (index + 1).toString().padStart(2, '0');

                        if (isCompactView) {
                            return (
                                <div key={territory.id} className={`group bg-white p-5 rounded-[2rem] border-2 transition-all hover:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${territory.workedOn ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                            {mapNumber}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-gray-900 truncate text-lg">{territory.name}</h3>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                {territory.number && (
                                                    <span className="px-2 py-0.5 bg-slate-900 text-white rounded-md text-[9px] font-black tracking-wider">
                                                        Nº {territory.number}
                                                    </span>
                                                )}
                                                {territory.locality && (
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest truncate max-w-[150px]">
                                                        {territory.locality}
                                                    </span>
                                                )}
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {isOverdue ? 'Atrasado' : `Expira em ${formatDate(territory.dueDate)}`}
                                                </span>
                                                {territory.workedOn && (
                                                    <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                                                        <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                        Trabalhado
                                                    </span>
                                                )}
                                            </div>
                                            {territory.observation && (
                                                <p className="text-[10px] font-bold text-amber-600 italic truncate max-w-[250px] mt-1">Obs: {territory.observation}</p>
                                            )}
                                        </div>
                                    </div>
                                    
                                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3 mt-4 sm:mt-0">
                                            <button 
                                                onClick={() => handleToggleWorked(territory)}
                                                className={`p-4 rounded-2xl transition-all border-2 flex items-center justify-center ${territory.workedOn ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-gray-300 bg-gray-50 border-gray-100 hover:border-emerald-100 hover:text-emerald-600'}`}
                                                title={territory.workedOn ? "Desmarcar como trabalhado" : "Marcar como trabalhado"}
                                            >
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            </button>
                                            <button onClick={() => window.open(territory.pdfUrl, '_blank')} className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Ver Mapa
                                            </button>
                                            <button onClick={() => handleShareDirect(territory)} className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                                Enviar
                                            </button>
                                            <button 
                                                onClick={() => handleReversal(territory)}
                                                className="flex items-center justify-center gap-2 px-6 py-4 bg-amber-100 text-amber-700 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-amber-200 transition-all"
                                                title="Estornar mapa (não trabalhado)"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                Estornar
                                            </button>
                                            <button onClick={() => setReportingTerritory(territory)} className="flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                Concluir
                                            </button>
                                        </div>
                                </div>
                            );
                        }

                        return (
                            <div key={territory.id} className={`group bg-white rounded-[3rem] shadow-2xl shadow-gray-200/50 border-2 overflow-hidden transition-all hover:shadow-blue-100/40 hover:-translate-y-1 ${territory.workedOn ? 'border-emerald-200' : 'border-gray-50'}`}>
                                <div className="p-8 sm:p-10">
                                    <div className="flex items-start justify-between gap-4 mb-8">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl font-black shrink-0 shadow-inner ${isOverdue ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {mapNumber}
                                            </div>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    {territory.number && (
                                                        <span className="px-3 py-1 bg-blue-600 text-white rounded-xl text-[11px] font-black tracking-wider shadow-sm">
                                                            Nº {territory.number}
                                                        </span>
                                                    )}
                                                    {territory.workedOn && (
                                                        <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest flex items-center gap-1">
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                            Trabalhado
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-3xl font-black text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">{territory.name}</h3>
                                                {territory.locality && (
                                                    <div className="flex items-center gap-1.5 text-blue-500 mt-2">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                        <p className="text-sm font-black uppercase tracking-widest">{territory.locality}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleToggleWorked(territory)}
                                            className={`p-4 rounded-2xl transition-all border-2 ${territory.workedOn ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-300 border-gray-50 hover:border-emerald-100 hover:text-emerald-500'}`}
                                            title={territory.workedOn ? "Desmarcar como trabalhado" : "Marcar como trabalhado"}
                                        >
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                    </div>

                                    {(territory.description || territory.observation) && (
                                        <div className="mb-8 p-6 bg-slate-50 border border-slate-100 rounded-[2rem] space-y-3">
                                            {territory.description && (
                                                <div>
                                                    <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Descrição do Território</h4>
                                                    <p className="text-slate-700 text-sm font-bold leading-relaxed">{territory.description}</p>
                                                </div>
                                            )}
                                            {territory.observation && (
                                                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50">
                                                    <h4 className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-600 mb-1">
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                        Observação Importante
                                                    </h4>
                                                    <p className="text-amber-900 text-sm font-bold italic leading-relaxed">{territory.observation}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {territory.permanentNotes && (
                                        <div className="mb-8 p-6 bg-amber-50/40 border border-amber-100 rounded-[2rem] relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <svg className="w-12 h-12 text-amber-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                            </div>
                                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 mb-3">
                                                Notas Permanentes
                                            </h4>
                                            <p className="text-amber-900 text-sm font-bold leading-relaxed">{territory.permanentNotes}</p>
                                        </div>
                                    )}

                                    {territory.history && territory.history.length > 0 && territory.history.some(h => h.notes) && (
                                        <div className="mb-8 p-6 bg-blue-50/30 border border-blue-100/50 rounded-[2rem]">
                                            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 mb-4">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                Últimas Observações
                                            </h4>
                                            <div className="space-y-3">
                                                {territory.history
                                                    .filter(h => h.notes)
                                                    .slice(-2)
                                                    .reverse()
                                                    .map((h, i) => (
                                                        <div key={i} className="bg-white/60 p-4 rounded-2xl border border-blue-50">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{h.publisherName}</p>
                                                                <p className="text-[9px] font-bold text-slate-400">{formatDate(h.date)}</p>
                                                            </div>
                                                            <p className="text-slate-700 text-xs font-bold italic leading-relaxed">"{h.notes}"</p>
                                                        </div>
                                                    ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <button onClick={() => window.open(territory.pdfUrl, '_blank')} className="flex flex-col items-center justify-center gap-4 py-10 bg-gray-900 text-white rounded-[3rem] hover:bg-black transition-all transform active:scale-95 shadow-2xl">
                                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            <span className="text-sm font-black uppercase tracking-widest">Ver Mapa</span>
                                        </button>
                                        <button onClick={() => handleShareDirect(territory)} className="flex flex-col items-center justify-center gap-4 py-10 bg-blue-600 text-white rounded-[3rem] hover:bg-blue-700 transition-all transform active:scale-95 shadow-2xl shadow-blue-100">
                                            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                            <span className="text-sm font-black uppercase tracking-widest">Enviar</span>
                                        </button>
                                        <button 
                                            onClick={() => handleReversal(territory)}
                                            className="flex flex-col items-center justify-center gap-4 py-10 bg-amber-100 text-amber-700 rounded-[3rem] hover:bg-amber-200 transition-all transform active:scale-95 shadow-lg"
                                        >
                                            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                            <span className="text-sm font-black uppercase tracking-widest">Estornar</span>
                                        </button>
                                        <button onClick={() => setReportingTerritory(territory)} className="flex flex-col items-center justify-center gap-4 py-10 bg-emerald-600 text-white rounded-[3rem] hover:bg-emerald-700 transition-all transform active:scale-95 shadow-2xl shadow-emerald-100">
                                            <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                            <span className="text-sm font-black uppercase tracking-widest">Concluir</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : hasPendingRequest ? (
                <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-blue-50 shadow-xl shadow-gray-100/50">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-blue-50 text-blue-600 rounded-full mb-8">
                        <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-gray-900">Pedido em Análise</h3>
                    <p className="text-gray-500 mt-4 font-medium max-w-sm mx-auto leading-relaxed">Sua solicitação está na fila. O administrador irá atribuir novos mapas para você em breve.</p>
                </div>
            ) : (
                <div className="bg-gray-50 p-16 rounded-[3rem] text-center border-4 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-400">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </div>
                    <h3 className="text-3xl font-black text-gray-800 mb-4">Tudo pronto para começar?</h3>
                    <p className="text-gray-500 mb-12 max-w-md mx-auto font-medium leading-relaxed">Você não tem nenhum mapa no momento. Clique no botão abaixo para pedir territórios para trabalhar.</p>
                    <button
                        onClick={handleRequest}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-6 px-16 rounded-[2rem] transition-all transform active:scale-95 disabled:bg-gray-300 shadow-2xl shadow-blue-200 text-xl uppercase tracking-widest"
                    >
                        {actionLoading ? 'ENVIANDO...' : 'SOLICITAR MAPAS'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PublisherDashboard;
