import React, { useState, useEffect, useCallback } from 'react';
import { Territory } from '../types';
import { useAuth } from '../hooks/useAuth';
import { fetchPublisherData, requestTerritory, submitReport } from '../services/api';
import { formatDate, getDeadlineColorInfo, getDaysRemaining } from '../utils/helpers';

const TerritoryHistoryModal: React.FC<{ territory: Territory; onClose: () => void; }> = ({ territory, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-black text-gray-800">Histórico: {territory.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl transition-colors">&times;</button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto pr-2 no-scrollbar">
                     <h3 className="text-lg font-bold text-gray-700 mb-4">Notas de Trabalhos Anteriores</h3>
                    {territory.history && territory.history.length > 0 ? (
                        <ul className="space-y-4">
                            {territory.history.slice().reverse().map((entry, index) => (
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
                        <div className="text-center py-10 text-gray-400 italic font-medium">Nenhum registro encontrado para este mapa.</div>
                    )}
                </div>
                <button onClick={onClose} className="w-full mt-6 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200 transition-colors">Fechar</button>
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
        try {
            await onSubmit(notes);
        } catch (err) {
            console.error("Erro no submit do modal:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                <h2 className="text-2xl font-black mb-2 text-gray-800">Concluir {territory.name}</h2>
                <p className="text-gray-500 mb-6 font-medium">Relate os pontos principais do trabalho realizado.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Observações do Campo</label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-5 py-4 border-2 border-gray-200 rounded-2xl bg-white text-gray-900 placeholder-gray-400 focus:border-blue-600 outline-none transition-all font-bold text-lg"
                            placeholder="Descreva como foi o trabalho..."
                        />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 py-4 bg-gray-100 text-gray-600 font-black rounded-2xl hover:bg-gray-200">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 disabled:bg-blue-300 shadow-lg shadow-blue-200">
                            {loading ? 'Salvando...' : 'Finalizar'}
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
            setError('Falha ao carregar seus dados.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleRequest = async () => {
        if (!user || actionLoading) return;
        setActionLoading(true);
        try {
            await requestTerritory(user);
            await fetchData();
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
            await fetchData();
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
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
                                    <div>
                                        <span className="text-xs font-black uppercase tracking-widest text-blue-600 mb-2 block">Mapa Atual</span>
                                        <h3 className="text-5xl font-black text-gray-900 leading-tight">{myTerritory.name}</h3>
                                    </div>
                                    <div className={`px-6 py-3 rounded-2xl font-black text-sm shadow-sm ${colorInfo.bgColor} ${colorInfo.textColor}`}>
                                        {colorInfo.label}
                                    </div>
                                </div>

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
                                    <a href={myTerritory.pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 py-5 bg-gray-900 text-white font-black rounded-3xl hover:bg-black transition-all transform active:scale-95 shadow-xl shadow-gray-200">
                                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                        VER MAPA
                                    </a>
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