
import React, { useState, useEffect, useCallback } from 'react';
import { Territory } from '../types';
import { useAuth } from '../hooks/useAuth';
import { fetchPublisherData, requestTerritory, submitReport } from '../services/api';
import { formatDate, getDeadlineColorInfo, getDaysRemaining } from '../utils/helpers';

const TerritoryHistoryModal: React.FC<{ territory: Territory; onClose: () => void; }> = ({ territory, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-8 w-full max-w-2xl shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Histórico: {territory.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-4 no-scrollbar">
                     <h3 className="text-lg font-semibold text-gray-700 mb-3">Notas Anteriores</h3>
                    {territory.history.length > 0 ? (
                        <ul className="space-y-4">
                            {territory.history.slice().reverse().map((entry, index) => (
                                <li key={index} className="bg-gray-50 p-4 rounded-xl">
                                    <p className="font-bold text-gray-800">{entry.userName}</p>
                                    <p className="text-xs text-gray-500 mb-2">{formatDate(entry.completedDate)}</p>
                                    {entry.notes && <p className="text-sm text-gray-700 italic border-l-2 border-blue-200 pl-3">"{entry.notes}"</p>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">Nenhum histórico registrado.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReportModal: React.FC<{ territory: Territory; onClose: () => void; onSubmit: (notes: string) => Promise<void>; }> = ({ territory, onClose, onSubmit }) => {
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        await onSubmit(notes);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-bold mb-2 text-gray-800">Concluir {territory.name}</h2>
                <p className="text-gray-500 mb-6">Relate como foi o trabalho antes de devolver.</p>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <textarea
                            id="report-notes"
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="Ex: Todas as casas visitadas, 2 ausentes no número 45..."
                        />
                    </div>
                    <div className="flex gap-4 mt-8">
                        <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl disabled:bg-blue-300">
                            {loading ? 'Enviando...' : 'Concluir'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const PublisherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [myTerritory, setMyTerritory] = useState<Territory | null>(null);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        try {
            const { myTerritory, hasPendingRequest } = await fetchPublisherData(user.id);
            setMyTerritory(myTerritory);
            setHasPendingRequest(hasPendingRequest);
        } catch (err) {
            setError('Falha ao carregar dados.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleRequest = async () => {
        if (!user || actionLoading) return;
        setActionLoading(true);
        try {
            await requestTerritory(user);
            await fetchData();
        } catch (err: any) {
            setError(err.message || 'Erro ao solicitar.');
        } finally {
            setActionLoading(false);
        }
    };
    
    const handleSubmitReport = async (notes: string) => {
        if (!user || !myTerritory) return;
        try {
            await submitReport(user, myTerritory, notes);
            setIsReportModalOpen(false);
            await fetchData();
        } catch (err) {
            setError('Falha ao enviar relatório.');
        }
    };

    const handleShareDirect = async () => {
        if (!myTerritory) return;
        
        const shareData = {
            title: `Mapa: ${myTerritory.name}`,
            text: `Acesse o mapa do território ${myTerritory.name} pelo PDF abaixo:`,
            url: myTerritory.pdfUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback simples para WhatsApp
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`;
                window.open(whatsappUrl, '_blank');
            }
        } catch (err) {
            console.log('User cancelled share');
        }
    };

    if (loading) return <div className="flex justify-center p-20"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full"></div></div>;
    
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Meu Trabalho</h1>
            
            {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100">{error}</div>}

            {isReportModalOpen && myTerritory && <ReportModal territory={myTerritory} onClose={() => setIsReportModalOpen(false)} onSubmit={handleSubmitReport} />}
            {isHistoryModalOpen && myTerritory && <TerritoryHistoryModal territory={myTerritory} onClose={() => setIsHistoryModalOpen(false)} />}

            <section>
                {myTerritory ? (
                    (() => {
                        const colorInfo = getDeadlineColorInfo(myTerritory.dueDate);
                        const daysRemaining = getDaysRemaining(myTerritory.dueDate) ?? 0;
                        const progress = Math.max(5, 100 - (daysRemaining / 30) * 100);
                        
                        return (
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="p-6 sm:p-10">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                                        <div>
                                            <span className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-1 block">Ativo agora</span>
                                            <h3 className="text-4xl font-black text-gray-900">{myTerritory.name}</h3>
                                        </div>
                                        <div className={`px-4 py-2 rounded-full font-bold text-sm ${colorInfo.bgColor} ${colorInfo.textColor}`}>
                                            {colorInfo.label}
                                        </div>
                                    </div>

                                    {myTerritory.permanentNotes && (
                                        <div className="mb-8 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                            <h4 className="text-xs font-bold text-amber-800 uppercase mb-1">Notas Importantes</h4>
                                            <p className="text-sm text-amber-900">{myTerritory.permanentNotes}</p>
                                        </div>
                                    )}

                                    <div className="space-y-2 mb-10">
                                        <div className="flex justify-between text-xs font-bold text-gray-400 uppercase">
                                            <span>Progresso do Prazo</span>
                                            <span>{Math.round(progress)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className={`${colorInfo.bgColor} h-3 rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <a href={myTerritory.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all transform active:scale-95">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                            Abrir PDF
                                        </a>
                                        <button onClick={handleShareDirect} className="flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all transform active:scale-95">
                                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                            Compartilhar
                                        </button>
                                        <button onClick={() => setIsHistoryModalOpen(true)} className="py-4 bg-gray-50 text-gray-700 font-bold rounded-2xl hover:bg-gray-100 transition-all">
                                            Ver Histórico
                                        </button>
                                        <button onClick={() => setIsReportModalOpen(true)} className="py-4 bg-emerald-50 text-emerald-700 font-bold rounded-2xl hover:bg-emerald-100 transition-all">
                                            Concluir Trabalho
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )
                    })()
                ) : hasPendingRequest ? (
                    <div className="bg-blue-50 p-10 rounded-3xl text-center border border-blue-100">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-600 rounded-full mb-4">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-bold text-blue-900">Solicitação em análise</h3>
                        <p className="text-blue-700 mt-2">O administrador recebeu seu pedido. Você será notificado assim que for aprovado.</p>
                    </div>
                ) : (
                    <div className="bg-gray-50 p-12 rounded-3xl text-center border-2 border-dashed border-gray-200">
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Nenhum território ativo</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Você está livre no momento. Peça um território para iniciar o trabalho de campo hoje!</p>
                        <button
                            onClick={handleRequest}
                            disabled={actionLoading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-10 rounded-2xl transition-all transform active:scale-95 disabled:bg-gray-300 shadow-xl"
                        >
                            {actionLoading ? 'Enviando...' : 'Pedir um Mapa'}
                        </button>
                    </div>
                )}
            </section>
        </div>
    );
};

export default PublisherDashboard;
