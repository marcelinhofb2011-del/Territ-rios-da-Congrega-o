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

interface PublisherDashboardProps {
    activeTab?: string;
    setActiveTab?: (tab: string) => void;
}

const PublisherDashboard: React.FC<PublisherDashboardProps> = ({ activeTab, setActiveTab }) => {
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
    const [isCompactView, setIsCompactView] = useState(true);
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
    
    if (activeTab === 'request') {
        return (
            <div className="max-w-5xl mx-auto space-y-8 pb-20 px-6">
                <header className="py-6 border-b border-gray-205 text-left mb-6 bg-white p-6 rounded shadow-sm">
                    <div>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-1">Central do Publicador</p>
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight leading-none mb-1 font-sans">Solicitar Mapas</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Peça novos mapas de território para trabalhar</p>
                    </div>
                </header>

                {error && <div className="bg-red-50 text-red-600 p-5 rounded-3xl border-2 border-red-100 font-bold animate-in fade-in shadow-sm">{error}</div>}

                {hasPendingRequest ? (
                    <div className="bg-white p-8 rounded-[2rem] border border-gray-200 text-center shadow-lg max-w-lg mx-auto py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl mb-6 border border-blue-100">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-800">Pedido em Análise</h3>
                        <p className="text-gray-500 mt-2 text-xs font-semibold max-w-sm mx-auto leading-normal">
                            Sua solicitação está na fila de espera. O administrador irá atribuir novos mapas para você em breve.
                        </p>
                    </div>
                ) : (
                    <div className="bg-white p-8 rounded-[2rem] text-center border border-gray-200 shadow-lg max-w-lg mx-auto py-12">
                        <div className="w-16 h-16 bg-blue-50 border border-blue-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-blue-600">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-800 mb-2">Solicitar Novo Território</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto text-xs font-semibold leading-relaxed">
                            Ao solicitar, o administrador receberá uma notificação e preparará um mapa adequado para você em breve.
                        </p>
                        <button
                            onClick={handleRequest}
                            disabled={actionLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-8 rounded-2xl transition-all shadow-lg shadow-blue-500/20 uppercase"
                        >
                            {actionLoading ? 'ENVIANDO...' : 'CONFIRMAR SOLICITAÇÃO'}
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-12 pb-20 px-6">
            <header className="py-6 border-b border-gray-200 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-white p-6 rounded shadow-sm">
                <div>
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mb-2">Central do Publicador</p>
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight leading-none mb-2 font-sans">Meus Mapas Designados</h1>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-800 text-white rounded text-[10px] font-semibold uppercase tracking-wider">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                            {myTerritories.length} Associados
                        </span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {myTerritories.length > 0 && (
                        <div className="flex items-center gap-1 bg-gray-50 p-1 border border-gray-200 rounded">
                            <button 
                                onClick={() => setIsCompactView(false)}
                                className={`p-1.5 rounded transition-all ${!isCompactView ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-750'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            </button>
                            <button 
                                onClick={() => setIsCompactView(true)}
                                className={`p-1.5 rounded transition-all ${isCompactView ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-755'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" /></svg>
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {myTerritories.length > 0 && (
                <section className="bg-white rounded border border-gray-200 p-6 shadow-sm mb-6">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-5 bg-blue-600 rounded-sm" />
                        <h2 className="text-lg font-bold text-gray-800 tracking-tight">Quadro de Prazos</h2>
                    </div>
                    <div className="space-y-4">
                        {myTerritories.map(t => {
                            const daysRemaining = getDaysRemaining(t.dueDate);
                            const isOverdue = daysRemaining !== null && daysRemaining < 0;
                            const colorInfo = getDeadlineColorInfo(t.dueDate);
                            const progress = Math.min(100, Math.max(0, ((30 - (daysRemaining || 0)) / 30) * 100));

                            return (
                                <div key={`deadline-${t.id}`} className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500 border border-gray-250">{t.number || '?'}</div>
                                            <div>
                                                <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-none mb-1">{t.locality}</p>
                                                <p className="text-xs font-bold text-gray-700 leading-none">{t.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block ${colorInfo.bgColor} ${colorInfo.textColor}`}>
                                                {isOverdue ? `Atrasado ${Math.abs(daysRemaining)}d` : `${daysRemaining} dias restantes`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded h-1.5 overflow-hidden">
                                        <div className={`${isOverdue ? 'bg-red-600' : 'bg-blue-600'} h-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

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
                                <div key={territory.id} className={`group bg-white p-5 rounded-[2rem] border-2 transition-all hover:shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${territory.workedOn ? 'border-emerald-100 bg-emerald-50/20' : 'border-gray-200'}`}>
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
                            <div key={territory.id} className={`group bg-white rounded-[2rem] border transition-all hover:shadow-xl ${territory.workedOn ? 'border-emerald-100 bg-emerald-50/5' : 'border-slate-300'}`}>
                                <div className="p-8">
                                    <div className="flex items-start justify-between gap-4 mb-6">
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
                                        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded relative overflow-hidden">
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
                                        <div className="mb-4 p-4 bg-blue-50/20 border border-blue-100 rounded">
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
                                                        <div key={i} className="bg-white p-3 rounded border border-gray-150">
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

                                     <div className="grid grid-cols-2 gap-2 mt-4">
                                         <button onClick={() => window.open(territory.pdfUrl, '_blank')} className="flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-800 text-white rounded hover:bg-black transition-all text-xs font-semibold shadow-sm">
                                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                             <span className="text-[10px] font-black uppercase tracking-widest">Ver Mapa</span>
                                         </button>
                                         <button onClick={() => handleShareDirect(territory)} className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all text-xs font-semibold shadow-sm animate-none">
                                             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                             <span className="text-[10px] font-black uppercase tracking-widest">Enviar</span>
                                         </button>
                                         <button 
                                             onClick={() => handleReversal(territory)}
                                             className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-50 text-amber-800 rounded border border-amber-250 hover:bg-amber-100 transition-all text-xs font-semibold"
                                         >
                                             <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                             <span className="text-[10px] font-black uppercase tracking-widest">Estornar</span>
                                         </button>
                                         <button onClick={() => setReportingTerritory(territory)} className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-all text-xs font-semibold shadow-sm">
                                             <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                             <span className="text-[10px] font-black uppercase tracking-widest">Concluir</span>
                                         </button>
                                     </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white p-10 rounded-[2rem] text-center border border-gray-250 shadow-md max-w-lg mx-auto py-12">
                    <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 text-slate-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 mb-2 font-sans">Nenhum território no momento</h3>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto text-xs font-semibold leading-relaxed">
                        Você não possui nenhum território associado à sua conta no momento. Vá para a aba "Pedir" para solicitar.
                    </p>
                    {setActiveTab && (
                        <button
                            onClick={() => setActiveTab('request')}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-3.5 px-8 rounded-xl transition-all text-xs tracking-wider uppercase shadow-md shadow-blue-500/10"
                        >
                            Ir para Solicitações
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default PublisherDashboard;
