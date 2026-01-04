import React, { useState, useEffect } from 'react';
import { Territory, RequestStatus, TerritoryStatus } from '../types';
import { useAuth } from '../hooks/useAuth';
import { requestTerritory, submitReport } from '../services/api';
import { formatDate, getDeadlineColorInfo, getDaysRemaining } from '../utils/helpers';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import MapViewerModal from './modals/MapViewerModal';
import TerritoryHistoryModal from './modals/TerritoryHistoryModal';
import ReportModal from './modals/ReportModal';

const PublisherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myTerritory, setMyTerritory] = useState<Territory | null>(null);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [viewingMap, setViewingMap] = useState<Territory | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!user) {
            setLoading(false);
            return;
        }

        const territoryQuery = query(collection(db, 'territories'), where('assignedTo', '==', user.id), where('status', '==', TerritoryStatus.IN_USE));
        const unsubscribeTerritory = onSnapshot(territoryQuery, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                const territoryData: Territory = {
                    id: doc.id,
                    name: data.name || 'Sem Nome',
                    status: data.status,
                    pdfUrl: data.pdfUrl,
                    createdAt: data.createdAt?.toDate() || new Date(),
                    assignedTo: data.assignedTo,
                    assignedToName: data.assignedToName,
                    assignmentDate: data.assignmentDate?.toDate() || null,
                    dueDate: data.dueDate?.toDate() || null,
                    permanentNotes: data.permanentNotes || '',
                    history: (data.history || []).map((h:any) => ({
                        ...h, 
                        completedDate: h.completedDate?.toDate() || new Date()
                    })).sort((a: any, b: any) => b.completedDate.getTime() - a.completedDate.getTime())
                };
                setMyTerritory(territoryData);
            } else {
                setMyTerritory(null);
            }
            setLoading(false);
        }, (err) => {
            console.error("Erro no listener de território:", err);
            setError('Falha ao carregar seu território.');
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
        if (!user || !myTerritory) return;
        try {
            await submitReport(user, myTerritory, notes);
            setIsReportModalOpen(false);
        } catch (err: any) {
            console.error("Erro ao devolver:", err);
            setError(`Erro ao devolver território. Verifique as permissões.`);
            setTimeout(() => setError(''), 6000);
        }
    };

    const handleShareDirect = async () => {
        if (!myTerritory) return;
        const shareData = {
            title: `Mapa: ${myTerritory.name}`,
            text: `Link do mapa ${myTerritory.name}:`,
            url: myTerritory.pdfUrl
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

    if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;
    
    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Meu Trabalho</h1>
            </div>
            
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 font-bold animate-in fade-in slide-in-from-top-2">{error}</div>}

            {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} onClose={() => setViewingMap(null)} />}
            {isReportModalOpen && myTerritory && <ReportModal territory={myTerritory} onClose={() => setIsReportModalOpen(false)} onSubmit={handleSubmitReport} />}
            {isHistoryModalOpen && myTerritory && <TerritoryHistoryModal territory={myTerritory} onClose={() => setIsHistoryModalOpen(false)} />}

            {myTerritory ? (
                (() => {
                    const colorInfo = getDeadlineColorInfo(myTerritory.dueDate);
                    const daysRemaining = getDaysRemaining(myTerritory.dueDate) ?? 0;
                    const progress = Math.max(5, 100 - (daysRemaining / 30) * 100);
                    
                    return (
                        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                            <div className="p-8 sm:p-12">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2 block">Mapa Atual</span>
                                        <h3 className="text-5xl font-black text-gray-900 leading-tight">{myTerritory.name}</h3>
                                    </div>
                                    <div className={`px-6 py-3 rounded-2xl font-black text-sm shadow-sm ${colorInfo.bgColor} ${colorInfo.textColor}`}>
                                        {colorInfo.label}
                                    </div>
                                </div>

                                {myTerritory.permanentNotes && (
                                    <div className="mb-10 p-6 bg-amber-50 border-2 border-amber-100 rounded-2xl">
                                        <h4 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-amber-700 mb-3">
                                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1.75-5.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z" clipRule="evenodd" /></svg>
                                            Observações Importantes
                                        </h4>
                                        <p className="text-amber-900 font-medium whitespace-pre-wrap">{myTerritory.permanentNotes}</p>
                                    </div>
                                )}

                                <div className="space-y-3 mb-12">
                                    <div className="flex justify-between text-xs font-black text-gray-400 uppercase tracking-tighter">
                                        <span>Tempo de posse</span>
                                        <span>Vence em {daysRemaining} dias</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-4">
                                        <div className={`${colorInfo.bgColor} h-4 rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <button onClick={() => setViewingMap(myTerritory)} className="flex items-center justify-center gap-3 py-5 bg-gray-900 text-white font-black rounded-3xl hover:bg-black transition-all transform active:scale-95 shadow-xl shadow-gray-200">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        VER MAPA
                                    </button>
                                    <button onClick={handleShareDirect} className="flex items-center justify-center gap-3 py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition-all transform active:scale-95 shadow-xl shadow-blue-100">
                                        COMPARTILHAR
                                    </button>
                                    <button onClick={() => setIsHistoryModalOpen(true)} className="py-5 bg-gray-100 text-gray-600 font-black rounded-3xl hover:bg-gray-200 transition-all">
                                        HISTÓRICO
                                    </button>
                                    <button onClick={() => setIsReportModalOpen(true)} className="py-5 bg-emerald-50 text-emerald-700 font-black rounded-3xl hover:bg-emerald-100 transition-all border border-emerald-100">
                                        CONCLUIR TRABALHO
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })()
            ) : hasPendingRequest ? (
                <div className="bg-white p-12 rounded-[2rem] text-center border-2 border-blue-50 shadow-sm">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 text-blue-600 rounded-full mb-6">
                        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900">Pedido em Análise</h3>
                    <p className="text-gray-500 mt-3 font-medium max-w-sm mx-auto">Sua solicitação está na fila. O administrador irá atribuir um mapa para você em breve.</p>
                </div>
            ) : (
                <div className="bg-gray-50 p-16 rounded-[2.5rem] text-center border-4 border-dashed border-gray-200">
                    <h3 className="text-3xl font-black text-gray-800 mb-3">Tudo pronto para começar?</h3>
                    <p className="text-gray-500 mb-10 max-w-md mx-auto font-medium">Você não tem nenhum mapa no momento. Clique no botão abaixo para pedir um território para trabalhar.</p>
                    <button
                        onClick={handleRequest}
                        disabled={actionLoading}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-5 px-12 rounded-3xl transition-all transform active:scale-95 disabled:bg-gray-300 shadow-2xl shadow-blue-200 text-lg"
                    >
                        {actionLoading ? 'ENVIANDO...' : 'SOLICITAR NOVO MAPA'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default PublisherDashboard;
