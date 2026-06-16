import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Territory, TerritoryRequest, TerritoryStatus, User, RequestStatus, Campaign } from '../types';
import { 
    assignTerritoryToRequest, rejectRequest, 
    updateTerritory, deleteTerritory, updateUserRole, adminResetTerritory, adminCompleteTerritory,
    parseDate, hydrateHistory,
    fetchCampaigns, createCampaign, updateCampaign, deleteCampaign, setCampaignActive
} from '../services/api';
import { formatDate, getDaysRemaining } from '../utils/helpers';
import { collection, query, where, onSnapshot, Timestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import MapViewerModal from './modals/MapViewerModal';
import TerritoryHistoryModal from './modals/TerritoryHistoryModal';
import AddMapModal from './modals/AddMapModal';
import EditMapModal from './modals/EditMapModal';
import ConfirmModal from './modals/ConfirmModal';
import ManualAssignmentModal from './modals/ManualAssignmentModal';
import EditAssignmentDatesModal from './modals/EditAssignmentDatesModal';
import { SuperintendentReportModal } from './modals/SuperintendentReportModal';
import { useAuth } from '../hooks/useAuth';
import { 
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';

import Sidebar from './Sidebar';
import TerritoryCard from './TerritoryCard';

const FilterIcon: React.FC = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 4h18M7 12h10m-7 8h4"></path>
    </svg>
);

interface AdminDashboardProps {
    activeTab?: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns';
    setActiveTab?: (tab: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns') => void;
}

const toLocalInputDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ activeTab: propActiveTab, setActiveTab: propSetActiveTab }) => {
    const { user } = useAuth();
    const [territories, setTerritories] = useState<Territory[]>([]);
    const [requests, setRequests] = useState<TerritoryRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [localActiveTab, setLocalActiveTab] = useState<'dashboard' | 'available' | 'in_use' | 'history' | 'users' | 'stats' | 'settings'>('dashboard');
    
    const activeTab = propActiveTab || localActiveTab;
    const setActiveTab = propSetActiveTab || setLocalActiveTab;
    
    const [searchTerm, setSearchTerm] = useState('');
    const [localityFilter, setLocalityFilter] = useState('all');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
    const [viewHistory, setViewHistory] = useState<Territory | null>(null);
    const [viewingMap, setViewingMap] = useState<Territory | null>(null);

    const globalHistory = useMemo(() => {
        const allHistory: any[] = [];
        territories.forEach(t => {
            if (t.history && Array.isArray(t.history)) {
                t.history.forEach(h => {
                    allHistory.push({
                        ...h,
                        territoryNumber: t.number,
                        territoryName: t.name
                    });
                });
            }
        });
        return allHistory.sort((a, b) => {
            const dateA = (a.completedDate as any)?.toDate?.() || (a.completedDate instanceof Date ? a.completedDate : new Date(0));
            const dateB = (b.completedDate as any)?.toDate?.() || (b.completedDate instanceof Date ? b.completedDate : new Date(0));
            if (!dateA || isNaN(dateA.getTime())) return 1;
            if (!dateB || isNaN(dateB.getTime())) return -1;
            return dateB.getTime() - dateA.getTime();
        });
    }, [territories]);

    const [historySearchTerm, setHistorySearchTerm] = useState('');
    const [historyStatusFilter, setHistoryStatusFilter] = useState('all');

    const filteredHistory = useMemo(() => {
        let processed = [...globalHistory];
        
        if (historySearchTerm) {
            const search = historySearchTerm.toLowerCase();
            processed = processed.filter(h => 
                (h.territoryNumber || '').toLowerCase().includes(search) || 
                (h.territoryName || '').toLowerCase().includes(search) || 
                (h.userName || '').toLowerCase().includes(search) ||
                (h.notes || '').toLowerCase().includes(search)
            );
        }

        return processed;
    }, [globalHistory, historySearchTerm, historyStatusFilter]);

    const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
    const [requestDueDate, setRequestDueDate] = useState<string>(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return toLocalInputDate(d);
    });
    const [selectedMapsForRequest, setSelectedMapsForRequest] = useState<string[]>([]);
    const [showManualAssignModal, setShowManualAssignModal] = useState(false);
    const [manualAssignUserId, setManualAssignUserId] = useState<string | undefined>(undefined);
    const [editingAssignment, setEditingAssignment] = useState<Territory | null>(null);
    const [showSuperintendentModal, setShowSuperintendentModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<{
        title: string;
        message: string;
        onConfirm: () => void;
        isDanger?: boolean;
        loading?: boolean;
    } | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const renderErrorDetail = (msg: string | null) => {
        if (!msg) return null;
        let isJson = false;
        let parsed: any = null;
        try {
            if (msg.trim().startsWith('{') && msg.trim().endsWith('}')) {
                parsed = JSON.parse(msg);
                isJson = true;
            }
        } catch (e) {
            isJson = false;
        }

        if (isJson && parsed) {
            const errorText = parsed.error || "Erro de permissão ou de validação.";
            const pathText = parsed.path ? `Caminho: ${parsed.path}` : null;
            const opText = parsed.operationType ? `Operação: ${parsed.operationType.toUpperCase()}` : null;
            const userEmailText = parsed.authInfo?.email ? `E-mail: ${parsed.authInfo.email}` : null;

            return (
                <div className="flex flex-col gap-2 max-w-full text-slate-100">
                    <span className="font-extrabold text-[10px] uppercase tracking-wider text-rose-300">Erro do Banco de Dados</span>
                    <p className="text-sm font-semibold leading-relaxed break-words">{errorText}</p>
                    <div className="mt-2 pt-2 border-t border-rose-800/40 flex flex-col gap-1 font-mono text-[10px] text-rose-200/90 bg-black/20 p-2 rounded-xl">
                        {pathText && <div className="truncate">{pathText}</div>}
                        {opText && <div className="truncate">{opText}</div>}
                        {userEmailText && <div className="truncate">{userEmailText}</div>}
                    </div>
                </div>
            );
        }

        return (
            <div className="max-w-full text-slate-100">
                <p className="text-sm font-semibold leading-relaxed break-words">{msg}</p>
            </div>
        );
    };



    // Campaigns States
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loadingCampaigns, setLoadingCampaigns] = useState(true);
    const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [campaignName, setCampaignName] = useState('');
    const [campaignNumber, setCampaignNumber] = useState('');
    const [campaignStartDate, setCampaignStartDate] = useState(() => toLocalInputDate(new Date()));
    const [campaignEndDate, setCampaignEndDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return toLocalInputDate(d);
    });
    const [campaignActive, setCampaignActiveState] = useState(false);
    const [selectedCampaignForReport, setSelectedCampaignForReport] = useState<Campaign | null>(null);
    const [comparingCampaignIds, setComparingCampaignIds] = useState<string[]>([]);

    // Statistics Data
    const stats = useMemo(() => {
        const total = territories.length;
        const available = territories.filter(t => t.status === TerritoryStatus.AVAILABLE).length;
        const inUse = territories.filter(t => t.status === TerritoryStatus.IN_USE).length;
        const requested = territories.filter(t => t.status === TerritoryStatus.REQUESTED).length;
        const closed = territories.filter(t => t.status === TerritoryStatus.CLOSED).length;
        const resting = territories.filter(t => t.status === TerritoryStatus.RESTING).length;

        const pieData = [
            { name: 'Disponíveis', value: available, color: '#10b981' }, // emerald-500
            { name: 'Em Uso', value: inUse, color: '#3b82f6' }, // blue-500
            { name: 'Solicitados', value: requested, color: '#f59e0b' }, // amber-500
            { name: 'Fechados', value: closed, color: '#ef4444' } // red-500
        ].filter(d => d.value > 0);

        // Group by locality for bar chart
        const localityMap = new Map<string, { name: string, total: number, inUse: number }>();
        territories.forEach(t => {
            const loc = t.locality || 'Outros';
            if (!localityMap.has(loc)) {
                localityMap.set(loc, { name: loc, total: 0, inUse: 0 });
            }
            const stats = localityMap.get(loc)!;
            stats.total++;
            if (t.status === TerritoryStatus.IN_USE) stats.inUse++;
        });

        const barData = Array.from(localityMap.values())
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);

        return { total, available, inUse, requested, closed, resting, pieData, barData };
    }, [territories]);

    // Filter and Sort States
    const [sortBy, setSortBy] = useState<'default' | 'name' | 'oldest' | 'newest'>('default');

    // Listeners for realtime data
    useEffect(() => {
        const handleOpenSidebar = () => setIsSidebarOpen(true);
        window.addEventListener('open-admin-sidebar', handleOpenSidebar);
        return () => window.removeEventListener('open-admin-sidebar', handleOpenSidebar);
    }, []);

    // Prevent body scroll when sidebar or modals are active
    useEffect(() => {
        const shouldLock = isSidebarOpen || showAddModal || !!editingTerritory || showManualAssignModal || !!editingAssignment || !!viewHistory || !!viewingMap || !!fulfillingRequestId || showAddCampaignModal || showSuperintendentModal;
        if (shouldLock) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isSidebarOpen, showAddModal, editingTerritory, showManualAssignModal, editingAssignment, viewHistory, viewingMap, fulfillingRequestId, showAddCampaignModal, showSuperintendentModal]);

    useEffect(() => {
        if (!user) return;
        
        console.log("AdminDashboard: Current user role:", user.role);
        const territoriesQuery = query(collection(db, 'territories'));
        const unsubscribeTerritories = onSnapshot(territoriesQuery, (snapshot) => {
            const territoriesList = snapshot.docs.map(docSnapshot => {
                const data = docSnapshot.data();
                const history = hydrateHistory(data.history || []);
                const returnedAt = parseDate(data.returnedAt);
                const availableAt = parseDate(data.availableAt);
                let status = data.status as TerritoryStatus;

                // Verificação automática de liberação:
                const now = new Date();
                if (status === TerritoryStatus.RESTING && availableAt && now >= availableAt) {
                    status = TerritoryStatus.AVAILABLE;
                    updateDoc(doc(db, 'territories', docSnapshot.id), { status: TerritoryStatus.AVAILABLE })
                        .catch(err => console.error("Error auto-releasing territory:", err));
                }

                return {
                    ...data,
                    id: docSnapshot.id,
                    name: data.name || 'Sem Nome',
                    createdAt: parseDate(data.createdAt) || new Date(),
                    assignmentDate: parseDate(data.assignmentDate),
                    dueDate: parseDate(data.dueDate),
                    lastCompletedDate: parseDate(data.lastCompletedDate),
                    returnedAt,
                    availableAt,
                    status,
                    history: history
                } as Territory;
            });
            setTerritories(territoriesList);
            if (loading) setLoading(false);
        }, (err) => {
            console.error("Erro no listener de territórios:", err);
            if (loading) setLoading(false);
        });

        // Other listeners...
        const usersQuery = query(collection(db, 'users'));
        const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
            const usersMap = new Map<string, User>();
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const email = (data.email || '').toLowerCase();
                const u = { 
                    ...data, 
                    id: doc.id, 
                    name: data.name || data.email?.split('@')[0] || 'Sem Nome', 
                    createdAt: parseDate(data.createdAt) || new Date() 
                } as User;

                if (usersMap.has(email)) {
                    const existing = usersMap.get(email)!;
                    if (u.role === 'admin' && existing.role !== 'admin') {
                        usersMap.set(email, u);
                    }
                } else {
                    usersMap.set(email, u);
                }
            });
            setUsers(Array.from(usersMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '')));
        }, (err) => {
            console.error("Erro no listener de usuários:", err);
        });
        const requestsQuery = query(collection(db, 'requests'), where('status', '==', RequestStatus.PENDING));
        const unsubscribeRequests = onSnapshot(requestsQuery, (snapshot) => {
            const reqs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, requestDate: parseDate(doc.data().requestDate) || new Date() } as TerritoryRequest)).sort((a, b) => b.requestDate.getTime() - a.requestDate.getTime());
            console.log("AdminDashboard: Pending requests:", reqs.length);
            setRequests(reqs);
        }, (err) => {
            console.error("Erro no listener de solicitações:", err);
        });

        const campaignsQuery = query(collection(db, 'campaigns'));
        const unsubscribeCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
            const list = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name || '',
                    number: data.number || '',
                    startDate: parseDate(data.startDate) || new Date(),
                    endDate: parseDate(data.endDate) || new Date(),
                    active: !!data.active,
                    createdAt: parseDate(data.createdAt) || new Date()
                } as Campaign;
            }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setCampaigns(list);
            setLoadingCampaigns(false);

            setSelectedCampaignForReport(prev => {
                if (prev) {
                    const found = list.find(c => c.id === prev.id);
                    return found || list.find(c => c.active) || list[0] || null;
                }
                return list.find(c => c.active) || list[0] || null;
            });
        }, (err) => {
            console.log("Aviso no listener de campanhas (pode ocorrer durante a sincronização inicial ou logout):", err.message);
            setLoadingCampaigns(false);
        });

        return () => {
            unsubscribeTerritories();
            unsubscribeUsers();
            unsubscribeRequests();
            unsubscribeCampaigns();
        };
    }, [loading, user]);

    // Handlers
    // Campaigns Handlers
    const handleSaveCampaign = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!campaignName || !campaignStartDate || !campaignEndDate) {
            setErrorMsg("Preencha todos os campos obrigatórios.");
            return;
        }

        try {
            const startD = new Date(campaignStartDate + 'T00:00:00');
            const endD = new Date(campaignEndDate + 'T23:59:59');

            if (startD > endD) {
                setErrorMsg("A data de término deve ser posterior à data de início.");
                return;
            }

            if (editingCampaign) {
                await updateCampaign(editingCampaign.id, {
                    name: campaignName,
                    number: campaignNumber,
                    startDate: startD,
                    endDate: endD,
                    active: campaignActive
                });
                
                if (campaignActive) {
                    await setCampaignActive(editingCampaign.id, true);
                }
            } else {
                const campId = await createCampaign({
                    name: campaignName,
                    number: campaignNumber,
                    startDate: startD,
                    endDate: endD,
                    active: campaignActive
                });
                if (campaignActive) {
                    await setCampaignActive(campId, true);
                }
            }
            
            setShowAddCampaignModal(false);
            setEditingCampaign(null);
            setCampaignName('');
            setCampaignNumber('');
            setCampaignStartDate(toLocalInputDate(new Date()));
            setCampaignEndDate(() => {
                const d = new Date();
                d.setDate(d.getDate() + 30);
                return toLocalInputDate(d);
            });
            setCampaignActiveState(false);
        } catch (err: any) {
            console.error("Erro ao salvar campanha:", err);
            setErrorMsg(err.message || "Ocorreu um erro ao salvar a campanha.");
        }
    };

    const handleEditCampaignClick = (camp: Campaign) => {
        setEditingCampaign(camp);
        setCampaignName(camp.name);
        setCampaignNumber(camp.number || '');
        setCampaignStartDate(toLocalInputDate(camp.startDate));
        setCampaignEndDate(toLocalInputDate(camp.endDate));
        setCampaignActiveState(camp.active);
        setShowAddCampaignModal(true);
    };

    const handleDeleteCampaignClick = async (campId: string) => {
        setConfirmAction({
            title: "Excluir Campanha",
            message: "Tem certeza que deseja excluir esta campanha? Todos os dados históricos continuarão salvos, mas as estatísticas agrupadas desta campanha serão removidas.",
            isDanger: true,
            onConfirm: async () => {
                try {
                    await deleteCampaign(campId);
                    setConfirmAction(null);
                } catch (err: any) {
                    console.error("Erro ao deletar campanha:", err);
                    setErrorMsg(err.message || "Erro ao excluir campanha.");
                }
            }
        });
    };

    const handleToggleCampaignActiveStatus = async (camp: Campaign) => {
        try {
            await setCampaignActive(camp.id, !camp.active);
        } catch (err: any) {
            console.error("Erro ao alterar status da campanha:", err);
            setErrorMsg(err.message || "Erro ao alterar status.");
        }
    };

    // Dynamical Aggregators for Reports
    const getCampaignStats = useMemo(() => {
        return (camp: Campaign) => {
            const start = camp.startDate.getTime();
            const end = camp.endDate.getTime();

            const historyInCampaign: any[] = [];
            const uniqueTerritoriesWorked = new Set<string>();
            const uniquePublishers = new Set<string>();

            territories.forEach(t => {
                if (t.history && Array.isArray(t.history)) {
                    t.history.forEach(h => {
                        const completedTime = h.completedDate ? new Date(h.completedDate).getTime() : 0;
                        if (completedTime >= start && completedTime <= end) {
                            // Ignora estornos e retomadas do administrador
                            const isReversal = h.isReversal === true || (h.notes && (
                                h.notes.toLowerCase().includes('extorno') || 
                                h.notes.toLowerCase().includes('estorno')
                            ));
                            const isReset = h.isReset === true || (h.notes && (
                                h.notes.toLowerCase().includes('retomado pelo administrador') || 
                                h.notes.toLowerCase().includes('retomado por')
                            ));

                            if (isReversal || isReset) return;

                            historyInCampaign.push({
                                ...h,
                                territoryId: t.id,
                                territoryNumber: t.number,
                                territoryName: t.name,
                                locality: t.locality
                            });
                            uniqueTerritoriesWorked.add(t.id);
                            if (h.userId) uniquePublishers.add(h.userId);
                        }
                    });
                }
            });

            const assignmentsInCampaign = territories.filter(t => {
                if (t.assignmentDate) {
                    const assignTime = new Date(t.assignmentDate).getTime();
                    return assignTime >= start && assignTime <= end;
                }
                return false;
            });

            const totalTerritoriesCount = territories.length || 1;
            const workedCount = uniqueTerritoriesWorked.size;
            const coveragePercentage = Math.round((workedCount / totalTerritoriesCount) * 100);

            return {
                history: historyInCampaign,
                workedCount,
                coveragePercentage,
                publishersCount: uniquePublishers.size,
                assignmentsCount: assignmentsInCampaign.length,
                assignments: assignmentsInCampaign,
            };
        };
    }, [territories]);

    const handleFulfillRequest = async (requestId: string) => {
        if (selectedMapsForRequest.length === 0) return;
        try {
            // Use the selected requestDueDate
            const dueDate = new Date(requestDueDate + 'T12:00:00');
            await assignTerritoryToRequest(
                requestId, 
                selectedMapsForRequest, 
                dueDate
            );
            setFulfillingRequestId(null); 
            setSelectedMapsForRequest([]);
        } catch (e: any) { 
            setErrorMsg(e.message); 
        }
    };
    const handleReject = async (id: string) => { 
        setConfirmAction({
            title: "Rejeitar Solicitação",
            message: "Tem certeza que deseja recusar este pedido de território?",
            isDanger: true,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Rejeitando solicitação:", id);
                    await rejectRequest(id);
                    setConfirmAction(null);
                    setFulfillingRequestId(null);
                } catch (e: any) {
                    console.error("Erro ao rejeitar:", e);
                    setErrorMsg("Erro ao rejeitar solicitação: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handleDeleteTerritory = async (id: string) => { 
        setConfirmAction({
            title: "Excluir Território",
            message: "Esta ação é irreversível. Tem certeza que deseja apagar este mapa?",
            isDanger: true,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Excluindo território:", id);
                    await deleteTerritory(id);
                    setConfirmAction(null);
                } catch (e: any) {
                    console.error("Erro ao excluir:", e);
                    setErrorMsg("Erro ao excluir território: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handleResetTerritory = async (id: string) => {
        if (!user) return setErrorMsg("Erro: usuário administrador não encontrado.");
        setConfirmAction({
            title: "Retomar Território (Estornar)",
            message: "Deseja estornar/recuperar este território? Ele voltará a ficar disponível imediatamente, sem período de descanso.",
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Retomando território:", id);
                    await adminResetTerritory(id, user);
                    setConfirmAction(null);
                } catch (e: any) {
                    console.error("Erro ao retomar:", e);
                    setErrorMsg("Erro ao retomar território: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handleCompleteTerritory = async (t: Territory) => {
        if (!user) return setErrorMsg("Erro: usuário administrador não encontrado.");
        setConfirmAction({
            title: "Concluir Mapa",
            message: `Deseja concluir o mapa ${t.number}? Ele será marcado como 'Em Descanso' por 35 dias antes de voltar a ficar disponível para nova designação.`,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    console.log("Concluindo território:", t.id);
                    await adminCompleteTerritory(t.id, user);
                    setConfirmAction(null);
                } catch (e: any) {
                    console.error("Erro ao concluir território:", e);
                    setErrorMsg("Erro ao finalizar território: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };
    const handlePromote = async (u: User) => {
        const newRole = u.role === 'admin' ? 'user' : 'admin';
        const actionText = newRole === 'admin' ? 'Promover para Administrador' : 'Remover privilégios de Administrador';
        
        setConfirmAction({
            title: actionText,
            message: `Tem certeza que deseja alterar o cargo de ${u.name} para ${newRole}?`,
            loading: false,
            onConfirm: async () => {
                setConfirmAction(prev => prev ? { ...prev, loading: true } : null);
                try {
                    await updateUserRole(u.id, newRole);
                    setConfirmAction(null);
                } catch (e: any) {
                    setErrorMsg("Erro ao alterar cargo: " + e.message);
                    setConfirmAction(null);
                }
            }
        });
    };

    // Memoized data processing
    const availableMapsOptions = useMemo(() => {
        return territories
            .filter(t => t.status === TerritoryStatus.AVAILABLE)
            .sort((a, b) => {
                const numA = parseInt(a.number) || 0;
                const numB = parseInt(b.number) || 0;
                if (numA !== numB) return numA - numB;
                return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
            });
    }, [territories]);

    const displayTerritories = useMemo(() => {
        let processed = [...territories];
        
        // Apply Search
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            processed = processed.filter(t => 
                t.number.toLowerCase().includes(search) || 
                t.name.toLowerCase().includes(search) || 
                t.locality.toLowerCase().includes(search) ||
                t.assignedToName?.toLowerCase().includes(search)
            );
        }

        // Apply Locality Filter
        if (localityFilter !== 'all') {
            processed = processed.filter(t => t.locality === localityFilter);
        }

        const sortByNumber = (a: Territory, b: Territory) => {
            const numA = parseInt(a.number) || 0;
            const numB = parseInt(b.number) || 0;
            if (numA !== numB) return numA - numB;
            return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true });
        };

        // Always sort by number primarily unless specific filters applied
        processed.sort(sortByNumber);

        return processed;
    }, [territories, searchTerm, localityFilter]);

    const availableMaps = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.AVAILABLE), [displayTerritories]);
    const inUseMaps = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.IN_USE), [displayTerritories]);
    const restingMaps = useMemo(() => displayTerritories.filter(t => t.status === TerritoryStatus.RESTING), [displayTerritories]);
    const requestedMaps = useMemo(() => territories.filter(t => t.status === TerritoryStatus.REQUESTED), [territories]);

    const overdueMaps = useMemo(() => {
        const now = new Date();
        return territories.filter(t => t.status === TerritoryStatus.IN_USE && t.dueDate && t.dueDate < now);
    }, [territories]);

    const localities = useMemo(() => {
        const set = new Set<string>();
        territories.forEach(t => { if (t.locality) set.add(t.locality); });
        return Array.from(set).sort();
    }, [territories]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="text-gray-500 font-bold text-center">Carregando painel...</p>
        </div>
    );

    const dropdownButtonClass = "w-full text-left px-3 py-2 text-sm font-bold text-slate-700 rounded-lg hover:bg-slate-100 transition-colors";

    return (
        <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-slate-50/50">
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsSidebarOpen(false);
                }} 
                pendingRequestsCount={requests.length} 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onAddTerritory={() => setShowAddModal(true)}
                onManualAssign={() => setShowManualAssignModal(true)}
            />

            <div className="flex-1 flex flex-col min-w-0 min-h-[calc(100vh-64px)] bg-gray-100 overflow-y-auto no-scrollbar">
                <div className="p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6 pb-24">
                    {/* Microsoft Fluent Page Header Area */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-8 bg-blue-600 rounded-sm shrink-0" />
                            <div>
                                <h1 className="text-xl font-bold text-gray-800 tracking-tight leading-none">
                                    {activeTab === 'dashboard' && 'Visão Geral'}
                                    {activeTab === 'available' && 'Territórios Livres'}
                                    {activeTab === 'in_use' && 'Territórios em Uso'}
                                    {activeTab === 'resting' && 'Territórios em Descanso'}
                                    {activeTab === 'history' && 'Histórico'}
                                    {activeTab === 'users' && 'Gestão de Usuários'}
                                    {activeTab === 'stats' && 'Relatórios Estatísticos'}
                                    {activeTab === 'campaigns' && 'Campanhas Especiais'}
                                </h1>
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-1.5">
                                    {activeTab === 'dashboard' && 'Ambiente Administrativo • Central do Painel'}
                                    {activeTab === 'available' && 'Ambiente Administrativo • Registros livres para vinculação'}
                                    {activeTab === 'in_use' && 'Ambiente Administrativo • Controle de posses e prazos'}
                                    {activeTab === 'resting' && 'Ambiente Administrativo • Período de repouso obrigatório de 35 dias'}
                                    {activeTab === 'history' && 'Ambiente Administrativo • Registro geral de eventos'}
                                    {activeTab === 'users' && 'Ambiente Administrativo • Cadastro de publicadores e roles'}
                                    {activeTab === 'stats' && 'Ambiente Administrativo • Métricas de cobertura de território'}
                                    {activeTab === 'campaigns' && 'Ambiente Administrativo • Controle de campanhas anuais, estatísticas e comparações'}
                                </p>
                            </div>
                        </div>

                        <div className="mt-3 sm:mt-0 flex flex-wrap items-center gap-3">
                            <button 
                                onClick={() => setShowSuperintendentModal(true)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded flex items-center gap-2 shadow-sm border border-blue-700 cursor-pointer transition-all active:scale-95"
                                title="Gerar Relatório S-13 do Superintendente"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Relatório S-13</span>
                            </button>

                            {(activeTab === 'available' || activeTab === 'in_use' || activeTab === 'resting') && (
                                <div className="relative">
                                    <input 
                                        type="text" 
                                        placeholder="Pesquisar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-9 pr-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-600 w-52"
                                    />
                                    <svg className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            )}
                        </div>
                    </div>
                        {showAddModal && <AddMapModal onClose={() => setShowAddModal(false)} onAdded={() => {}} />}
                        {editingTerritory && <EditMapModal territory={editingTerritory} onClose={() => setEditingTerritory(null)} onSave={() => {}} />}
                        {showManualAssignModal && (
                            <ManualAssignmentModal 
                                territories={territories} 
                                users={users} 
                                initialUserId={manualAssignUserId}
                                onClose={() => {
                                    setShowManualAssignModal(false);
                                    setManualAssignUserId(undefined);
                                }} 
                                onSuccess={() => {}} 
                            />
                        )}
                        {editingAssignment && <EditAssignmentDatesModal territory={editingAssignment} onClose={() => setEditingAssignment(null)} onSuccess={() => {}} />}
                        {viewHistory && <TerritoryHistoryModal territory={viewHistory} onClose={() => setViewHistory(null)} />}
                        {viewingMap && <MapViewerModal url={viewingMap.pdfUrl} name={viewingMap.name} number={viewingMap.number} onClose={() => setViewingMap(null)} />}
                        {showSuperintendentModal && (
                            <SuperintendentReportModal 
                                territories={territories} 
                                onClose={() => setShowSuperintendentModal(false)}
                                congregationName="Congregação Principal"
                            />
                        )}
                        
                        {fulfillingRequestId && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setFulfillingRequestId(null)} />
                                <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-300 flex flex-col">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Atribuir Território</h3>
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Designação oficial de trabalho</p>
                                        </div>
                                        <button onClick={() => setFulfillingRequestId(null)} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-white rounded-2xl transition-all shadow-sm">
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    
                                    <div className="p-8 overflow-y-auto flex-1 space-y-8 no-scrollbar">
                                        <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100 flex items-center gap-5">
                                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-2xl text-blue-600 shadow-xl shadow-blue-100/50">
                                                {requests.find(r => r.id === fulfillingRequestId)?.userName.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Solicitado por</p>
                                                <p className="text-xl font-black text-slate-900">{requests.find(r => r.id === fulfillingRequestId)?.userName}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Data de Devolução</label>
                                                <input 
                                                    type="date" 
                                                    value={requestDueDate}
                                                    onChange={(e) => setRequestDueDate(e.target.value)}
                                                    className="w-full h-16 bg-slate-50 border border-slate-200 rounded-2xl px-6 font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                                                />
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">Selecionar Mapas</label>
                                                <p className="text-[10px] text-slate-400 font-bold px-4">Escolha os mapas disponíveis</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                {availableMaps.map(m => (
                                                    <button 
                                                        key={m.id}
                                                        onClick={() => {
                                                            setSelectedMapsForRequest(prev => 
                                                                prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                                                            );
                                                        }}
                                                        className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-4 ${
                                                            selectedMapsForRequest.includes(m.id)
                                                                ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200'
                                                                : 'bg-white border-slate-100 text-slate-600 hover:border-slate-300'
                                                        }`}
                                                    >
                                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${selectedMapsForRequest.includes(m.id) ? 'bg-white/20' : 'bg-slate-100'}`}>
                                                            {m.number}
                                                        </span>
                                                        <div className="min-w-0">
                                                            <p className="font-black text-xs truncate leading-none mb-1">{m.name}</p>
                                                            <p className={`text-[9px] font-bold uppercase truncate ${selectedMapsForRequest.includes(m.id) ? 'text-white/60' : 'text-slate-400'}`}>{m.locality}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                                        <button 
                                            onClick={() => handleReject(fulfillingRequestId)}
                                            className="px-8 py-4 bg-white text-red-600 font-black text-[10px] uppercase tracking-widest border border-slate-200 rounded-2xl hover:bg-red-50 transition-all shadow-sm"
                                        >
                                            Rejeitar
                                        </button>
                                        <button 
                                            onClick={() => handleFulfillRequest(fulfillingRequestId)}
                                            disabled={selectedMapsForRequest.length === 0}
                                            className="flex-1 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                        >
                                            Confirmar Designação
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {confirmAction && (
                            <ConfirmModal 
                                title={confirmAction.title}
                                message={confirmAction.message}
                                isDanger={confirmAction.isDanger}
                                loading={confirmAction.loading}
                                onConfirm={confirmAction.onConfirm}
                                onCancel={() => setConfirmAction(null)}
                            />
                        )}

                        {errorMsg && (
                            <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-[110] max-w-sm md:max-w-md bg-rose-950 text-white border border-rose-800/50 p-5 rounded-2xl shadow-2xl flex items-start gap-4 animate-in slide-in-from-bottom-4 transition-all duration-300">
                                <div className="p-2 bg-rose-900/50 text-rose-200 rounded-xl shrink-0 mt-0.5">
                                    <svg className="w-5 h-5 animate-bounce-slow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <div className="flex-grow min-w-0">
                                    {renderErrorDetail(errorMsg)}
                                </div>
                                <button 
                                    onClick={() => setErrorMsg(null)} 
                                    className="p-1.5 hover:bg-rose-900/60 text-rose-300 hover:text-white rounded-lg transition-colors shrink-0"
                                    aria-label="Minimizar erro"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {activeTab === 'dashboard' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Status Operacional</h1>
                                        <p className="text-slate-500 font-medium">Controle em tempo real de toda a atividade do sistema.</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setShowSuperintendentModal(true)} 
                                            className="px-4 py-2.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2 cursor-pointer"
                                            title="Gerar Relatório S-13 do Superintendente"
                                        >
                                            <svg className="w-4 h-4 text-indigo-100" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Relatório S-13
                                        </button>
                                        <button onClick={() => setShowAddModal(true)} className="px-4 py-2.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                                            Novo Mapa
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 px-2">
                                    {[
                                        { label: 'Total de Mapas', value: stats.total, unit: 'território', color: 'text-slate-700', hover: 'hover:text-slate-800', icon: '' },
                                        { label: 'Disponíveis', value: stats.available, unit: 'território', color: 'text-emerald-600', hover: 'hover:text-emerald-700', icon: 'M5 13l4 4L19 7' },
                                        { label: 'Atribuídos', value: stats.inUse, unit: 'designado', color: 'text-blue-600', hover: 'hover:text-blue-700', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
                                        { label: 'Em Descanso', value: stats.resting, unit: 'Aguardando liberação', color: 'text-amber-600', hover: 'hover:text-amber-700', icon: '' },
                                        { label: 'Atrasados', value: overdueMaps.length, unit: 'território', color: 'text-red-500', hover: 'hover:text-red-600', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' }
                                    ].map(s => (
                                        <div key={s.label} className="group transition-all">
                                            <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest mb-3 group-hover:text-slate-900 transition-colors">{s.label}</p>
                                            <div className={`flex flex-col sm:flex-row sm:items-baseline gap-1 font-black tracking-tighter ${s.color} ${s.hover} transition-colors`}>
                                                <span className="text-5xl leading-none font-black">{s.value}</span>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-1 sm:mt-0">{s.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8">
                                    {requests.length > 0 && (
                                        <div className="col-span-1 space-y-6">
                                            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                                <h2 className="text-xl font-black text-slate-900 tracking-tight">Solicitações</h2>
                                                <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-[10px] font-black">{requests.length}</span>
                                            </div>
                                            <div className="divide-y divide-slate-100">
                                                {requests.slice(0, 4).map(req => (
                                                    <div key={req.id} className="py-4 flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center font-black text-sm border border-slate-100 uppercase">
                                                                {req.userName.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-sm leading-none mb-1">{req.userName}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{formatDate(req.requestDate)}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => {
                                                                setFulfillingRequestId(req.id);
                                                                setSelectedMapsForRequest([]);
                                                            }} 
                                                            className="p-2 text-slate-300 hover:text-blue-600 transition-all"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="col-span-1 space-y-6">
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Atrasos</h2>
                                            {overdueMaps.length > 0 && <span className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-black">{overdueMaps.length}</span>}
                                        </div>
                                        {overdueMaps.length > 0 ? (
                                            <div className="divide-y divide-slate-100">
                                                {overdueMaps.slice(0, 4).map(t => (
                                                    <div key={t.id} className="py-4 flex items-center justify-between group">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                                                                {t.number}
                                                            </div>
                                                            <div>
                                                                <p className="font-black text-slate-900 text-sm leading-none mb-1">{t.assignedToName}</p>
                                                                <p className="text-[9px] text-red-500 font-bold uppercase tracking-widest tabular-nums">Vencido em {formatDate(t.dueDate)}</p>
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleResetTerritory(t.id)} 
                                                            className="p-2 text-slate-300 hover:text-red-600 transition-all"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex items-center justify-center">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic opacity-50">Nenhum atraso</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'available' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {availableMaps.length > 0 ? availableMaps.map(m => (
                                        <TerritoryCard 
                                            key={m.id}
                                            territory={m}
                                            onEdit={setEditingTerritory}
                                            onReset={handleResetTerritory}
                                            onComplete={handleCompleteTerritory}
                                            onDelete={handleDeleteTerritory}
                                            onViewMap={(t) => window.open(t.pdfUrl, '_blank')}
                                        />
                                    )) : (
                                        <div className="col-span-full py-32 border-2 border-dashed border-slate-100 rounded-[3rem] flex items-center justify-center">
                                            <p className="text-slate-300 font-black text-sm uppercase tracking-[0.2em] italic opacity-50">Nenhum território livre aqui</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'resting' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {restingMaps.length > 0 ? restingMaps.map(m => (
                                        <TerritoryCard 
                                            key={m.id}
                                            territory={m}
                                            onEdit={setEditingTerritory}
                                            onReset={handleResetTerritory}
                                            onComplete={handleCompleteTerritory}
                                            onDelete={handleDeleteTerritory}
                                            onViewMap={(t) => window.open(t.pdfUrl, '_blank')}
                                        />
                                    )) : (
                                        <div className="col-span-full py-32 border-2 border-dashed border-slate-100 rounded-[3rem] flex items-center justify-center">
                                            <p className="text-slate-300 font-black text-sm uppercase tracking-[0.2em] italic opacity-50">Nenhum mapa em descanso</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'in_use' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {/* Professional Toolbar */}
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
                                        <div className="relative flex-1 max-w-md">
                                            <input 
                                                type="text" 
                                                placeholder="Buscar em uso (Nº, Território, Publicador)..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-100/50 border-transparent rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-slate-200 transition-all"
                                            />
                                            <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select 
                                                value={localityFilter}
                                                onChange={(e) => setLocalityFilter(e.target.value)}
                                                className="bg-slate-100/50 border-transparent rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-slate-200 transition-all"
                                            >
                                                <option value="all">Todas as Localidades</option>
                                                {localities.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{inUseMaps.length} Ativos</span>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100 font-mono">
                                                    <th className="w-[60px] px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Nº</th>
                                                    <th className="w-[200px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Território</th>
                                                    <th className="w-[200px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Publicador</th>
                                                    <th className="w-[140px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Retirado</th>
                                                    <th className="w-[140px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Prazo</th>
                                                    <th className="w-[120px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                                                    <th className="w-[100px] px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Controle</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {inUseMaps.map(t => {
                                                    const isOverdue = t.dueDate && t.dueDate < new Date();
                                                    return (
                                                        <tr key={t.id} className="group hover:bg-slate-50/30 transition-all">
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="text-[11px] font-mono font-black text-slate-900">{t.number}</span>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div>
                                                                    <p className="font-black text-slate-900 text-xs truncate leading-none mb-1">{t.name}</p>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.locality}</p>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">
                                                                        {t.assignedToName?.charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <span className="text-xs font-black text-slate-700 truncate">{t.assignedToName}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className="text-[10px] font-black text-slate-400 tabular-nums uppercase bg-slate-100/50 px-2 py-1 rounded-md">
                                                                    {formatDate(t.assignmentDate)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className={`text-[10px] font-black tabular-nums uppercase px-2 py-1 rounded-md ${isOverdue ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                    {formatDate(t.dueDate)}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider items-center gap-1.5 border ${isOverdue ? 'bg-red-50 text-red-600 border-red-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                                                    <div className={`w-1 h-1 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                                                    {isOverdue ? 'Vencido' : 'Ativo'}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <button onClick={() => setEditingAssignment(t)} className="p-2 text-slate-400 hover:text-blue-600 transition-all">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                                    </button>
                                                                    <button onClick={() => handleCompleteTerritory(t)} className="p-2 text-slate-400 hover:text-emerald-600 transition-all" title="Concluir Mapa (Envio p/ Descanso)">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                    </button>
                                                                    <button onClick={() => handleResetTerritory(t.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all" title="Estornar Mapa">
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                        {inUseMaps.length === 0 && (
                                            <div className="py-24 text-center">
                                                <p className="text-slate-300 font-black text-[10px] uppercase tracking-widest">Nenhum mapa em uso</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'history' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                {/* Professional Toolbar */}
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6 flex-1">
                                        <div className="relative flex-1 max-w-md">
                                            <input 
                                                type="text" 
                                                placeholder="Buscar no histórico (Nº, Território, Publicador)..."
                                                value={historySearchTerm}
                                                onChange={(e) => setHistorySearchTerm(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-100/50 border-transparent rounded-2xl text-xs font-bold focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-slate-200 transition-all"
                                            />
                                            <svg className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select 
                                                value={historyStatusFilter}
                                                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                                                className="bg-slate-100/50 border-transparent rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-slate-200 transition-all">
                                                <option value="all">Todos os Status</option>
                                                <option value="completed">Concluído</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => setShowSuperintendentModal(true)}
                                            className="px-4 py-2.5 text-white bg-blue-600 hover:bg-blue-700 font-bold text-xs rounded-xl shadow-sm hover:shadow transition-all flex items-center gap-2 border border-blue-700 cursor-pointer"
                                            title="Abrir o Relatório S-13 para o Superintendente de Serviço"
                                        >
                                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            <span className="uppercase tracking-wider">Superintendente S-13</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Professional History Table */}
                                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto no-scrollbar">
                                        <table className="w-full text-left border-collapse table-fixed min-w-[1100px]">
                                            <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100 font-mono">
                                                    <th className="w-[50px] px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Nº</th>
                                                    <th className="w-[200px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Território</th>
                                                    <th className="w-[200px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest">Publicador</th>
                                                    <th className="w-[140px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Retirado</th>
                                                    <th className="w-[140px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Devolvido</th>
                                                    <th className="w-[120px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Status</th>
                                                    <th className="w-[100px] px-4 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-center">Ciclo</th>
                                                    <th className="w-[100px] px-6 py-4 text-[10px] font-black text-slate-600 uppercase tracking-widest text-right">Ações</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredHistory.map((h, idx) => (
                                                    <tr key={`${h.id}-${idx}`} className="group hover:bg-slate-50/30 transition-all">
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="text-[11px] font-mono font-black text-slate-900">{h.territoryNumber}</span>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div>
                                                                <p className="font-black text-slate-900 text-xs truncate leading-none mb-1">{h.territoryName}</p>
                                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Território Oficial</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center text-[9px] font-black">
                                                                    {h.userName?.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-xs font-black text-slate-700 truncate">{h.userName}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className="text-[10px] font-black text-slate-500 tabular-nums uppercase bg-slate-100/50 px-2 py-1 rounded-md">
                                                                {h.assignmentDate ? formatDate(h.assignmentDate) : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className="text-[10px] font-black text-blue-600 tabular-nums uppercase bg-blue-50 px-2 py-1 rounded-md">
                                                                {h.completedDate ? formatDate(h.completedDate) : '-'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[9px] font-black uppercase tracking-wider items-center gap-1.5 border border-emerald-100">
                                                                <div className="w-1 h-1 rounded-full bg-emerald-500"></div>
                                                                Finalizado
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-4 text-center">
                                                            <span className="text-[10px] font-black text-slate-400">1º</span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button 
                                                                onClick={() => setViewHistory({ id: h.territoryId, name: h.territoryName, number: h.territoryNumber } as any)}
                                                                className="p-2 text-slate-300 hover:text-blue-600 transition-all opacity-0 group-hover:opacity-100"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                
                                {filteredHistory.length === 0 && (
                                    <div className="py-32 text-center">
                                        <h4 className="text-sm font-black text-slate-300 tracking-tight uppercase">Sem registros</h4>
                                    </div>
                                )}

                                {/* Pagination */}
                                <div className="p-6 flex items-center justify-between border-t border-slate-100">
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Exibindo {filteredHistory.length} registros</p>
                                    <div className="flex items-center gap-1">
                                        <button className="w-8 h-8 rounded-lg bg-slate-900 text-white font-black text-[10px]">1</button>
                                        <button className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 font-black text-[10px]">2</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                                <div className="p-6 flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Publicadores</h2>
                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">{users.length} usuários registrados</p>
                                    </div>
                                    <button onClick={() => setShowManualAssignModal(true)} className="px-4 py-2.5 bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-900 hover:text-white transition-all">
                                        Novo Vínculo
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 px-1">
                                    {users.map(u => (
                                        <div key={u.id} className="group py-8 border-b border-slate-100 last:border-0 transition-all">
                                            <div className="flex items-center gap-6 mb-8">
                                                <div className={`w-16 h-16 rounded-[2rem] flex items-center justify-center text-white font-black text-2xl transition-transform group-hover:scale-105 shadow-xl ${u.role === 'admin' ? 'bg-slate-900' : 'bg-slate-200 text-slate-500'}`}>
                                                    {u.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-black text-slate-900 text-lg leading-tight truncate">{u.name}</p>
                                                        {u.role === 'admin' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                                                    </div>
                                                    <p className="font-bold text-slate-400 text-[10px] truncate uppercase tracking-widest leading-none">{u.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button 
                                                    onClick={() => {
                                                        setManualAssignUserId(u.id);
                                                        setShowManualAssignModal(true);
                                                    }}
                                                    className="flex-1 py-3 text-slate-900 font-black text-[10px] uppercase tracking-widest border-b-2 border-slate-900 hover:border-blue-500 transition-all text-left"
                                                >
                                                    Designar
                                                </button>
                                                <button 
                                                    onClick={() => handlePromote(u)} 
                                                    className="p-3 text-slate-300 hover:text-slate-900 transition-all"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeTab === 'stats' && (
                            <div className="space-y-16 animate-in fade-in slide-in-from-bottom-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Distribuição</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Por status operacional</p>
                                        </div>
                                        <div className="h-80 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={stats.pieData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={80}
                                                        outerRadius={120}
                                                        paddingAngle={10}
                                                        stroke="none"
                                                        dataKey="value"
                                                    >
                                                        {stats.pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)', fontWeight: 'bold', fontSize: '10px' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Popularidade</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Saturação por setores</p>
                                        </div>
                                        <div className="h-80 w-full text-[9px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={stats.barData} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 'black', fontSize: 9 }} />
                                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontWeight: 'black', fontSize: 9 }} />
                                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.05)' }} />
                                                    <Bar dataKey="total" name="Total" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="inUse" name="Ativos" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'campaigns' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                {/* Campaigns Navigation & Actions */}
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-150 shadow-sm font-bold">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800">Campanhas da Congregação</h2>
                                        <p className="text-xs text-gray-400 mt-1">Gerencie campanhas de distribuição de mapas e gere relatórios inteligentes para análise dos anciãos.</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setEditingCampaign(null);
                                            setCampaignName('');
                                            setCampaignNumber('');
                                            setCampaignStartDate(toLocalInputDate(new Date()));
                                            setCampaignEndDate(() => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + 30);
                                                return toLocalInputDate(d);
                                            });
                                            setCampaignActiveState(false);
                                            setShowAddCampaignModal(true);
                                        }}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>
                                        Nova Campanha
                                    </button>
                                </div>

                                {/* Main Campaigns Workspace - Two Panels (Active and Stats/Comparisons) */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    {/* Left 1/3: Campaign List and Simple Configs */}
                                    <div className="space-y-6 lg:col-span-1 border-r border-gray-150 lg:pr-4">
                                        <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-4">
                                            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                                <h3 className="text-sm font-bold text-gray-800">Lista de Campanhas</h3>
                                                <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-bold">{campaigns.length}</span>
                                            </div>

                                            {loadingCampaigns ? (
                                                <div className="flex items-center justify-center py-8">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
                                                </div>
                                            ) : campaigns.length === 0 ? (
                                                <div className="text-center py-12 text-gray-400 font-bold">
                                                    <svg className="w-10 h-10 mx-auto opacity-30 text-gray-505 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                                                    <p className="text-xs text-gray-400">Nenhuma campanha cadastrada</p>
                                                    <p className="text-[10px] mt-1 text-slate-400">Crie sua primeira campanha para começar.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                                                    {campaigns.map((camp) => {
                                                        const campStats = getCampaignStats(camp);
                                                        return (
                                                            <div 
                                                                key={camp.id} 
                                                                className={`p-4 rounded-xl border transition relative group cursor-pointer ${
                                                                    selectedCampaignForReport?.id === camp.id 
                                                                        ? 'border-blue-500 bg-blue-50/50' 
                                                                        : 'border-gray-150 hover:border-gray-300 bg-slate-50/30'
                                                                }`}
                                                                onClick={() => setSelectedCampaignForReport(camp)}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="space-y-1">
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <h4 className="text-xs font-bold text-gray-800">{camp.name}</h4>
                                                                            {camp.number && (
                                                                                <span className="text-[9px] bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded font-black">Nº {camp.number}</span>
                                                                            )}
                                                                            {camp.active ? (
                                                                                <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-bold animate-pulse">Ativo</span>
                                                                            ) : (
                                                                                <span className="text-[9px] bg-gray-300 text-white px-1.5 py-0.5 rounded font-bold">Inativo</span>
                                                                            )}
                                                                        </div>
                                                                        <p className="text-[10px] text-gray-500 font-medium">
                                                                            {formatDate(camp.startDate)} - {formatDate(camp.endDate)}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Interactive Progress Meter */}
                                                                <div className="mt-3 space-y-1.5">
                                                                    <div className="flex justify-between items-center text-[9px] text-gray-500">
                                                                        <span>Cobertura de Mapas</span>
                                                                        <span className="font-bold">{campStats.workedCount} concluídos ({campStats.coveragePercentage}%)</span>
                                                                    </div>
                                                                    <div className="w-full h-1.5 bg-gray-200/50 rounded-full overflow-hidden">
                                                                        <div 
                                                                            className={`h-full rounded-full transition-all duration-500 ${
                                                                                camp.active ? 'bg-gradient-to-r from-blue-500 to-indigo-600' : 'bg-gray-400'
                                                                            }`}
                                                                            style={{ width: `${Math.min(campStats.coveragePercentage, 100)}%` }}
                                                                        />
                                                                    </div>
                                                                </div>

                                                                {/* Hover Action Buttons */}
                                                                <div className="mt-3 flex items-center gap-2 justify-end opacity-60 group-hover:opacity-100 transition font-bold">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleToggleCampaignActiveStatus(camp);
                                                                        }}
                                                                        title={camp.active ? "Marcar como Inativo" : "Marcar como Ativo"}
                                                                        className={`p-1 rounded text-[10px] font-bold ${
                                                                            camp.active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'
                                                                        }`}
                                                                    >
                                                                        {camp.active ? "Desativar" : "Ativar"}
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleEditCampaignClick(camp);
                                                                        }}
                                                                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                                        title="Editar"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleDeleteCampaignClick(camp.id);
                                                                        }}
                                                                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                                        title="Excluir"
                                                                    >
                                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                    </button>
                                                                    <div className="flex items-center gap-1 ml-auto font-bold">
                                                                        <input 
                                                                            type="checkbox"
                                                                            id={`compare-${camp.id}`}
                                                                            checked={comparingCampaignIds.includes(camp.id)}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                            }}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setComparingCampaignIds(prev => [...prev, camp.id]);
                                                                                } else {
                                                                                    setComparingCampaignIds(prev => prev.filter(id => id !== camp.id));
                                                                                }
                                                                            }}
                                                                            className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer h-3 w-3"
                                                                        />
                                                                        <label htmlFor={`compare-${camp.id}`} className="text-[9px] text-gray-500 select-none cursor-pointer">Comparar</label>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right 2/3: Reports, Graphics & Comparisons */}
                                    <div className="lg:col-span-2 space-y-6">
                                        {comparingCampaignIds.length > 1 ? (
                                            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm space-y-6 animate-in fade-in zoom-in-95 font-bold">
                                                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                                    <div>
                                                        <h3 className="text-sm font-bold text-gray-800">Comparação Ampla entre Campanhas</h3>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">Análise de métricas consolidadas das campanhas selecionadas lado a lado.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setComparingCampaignIds([])}
                                                        className="text-[10px] uppercase font-bold text-blue-600 hover:text-blue-800"
                                                    >
                                                        Limpar Comparação
                                                    </button>
                                                </div>

                                                {/* Dashboard grid comparing statistics */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs text-gray-650 border-collapse">
                                                        <thead>
                                                            <tr className="border-b border-gray-150 uppercase tracking-wider text-[10px] text-gray-400">
                                                                <th className="py-2.5 font-bold">Campanha / Período</th>
                                                                <th className="py-2.5 font-bold text-center">Mapas Concluídos</th>
                                                                <th className="py-2.5 font-bold text-center">Cobertura</th>
                                                                <th className="py-2.5 font-bold text-center">Designações Efetuadas</th>
                                                                <th className="py-2.5 font-bold text-center">Publicadores Ativos</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {campaigns.filter(c => comparingCampaignIds.includes(c.id)).map(camp => {
                                                                const campStats = getCampaignStats(camp);
                                                                return (
                                                                    <tr key={camp.id} className="border-b border-gray-100 hover:bg-slate-50/55 transition">
                                                                        <td className="py-3 font-semibold text-gray-800">
                                                                            <span className="block">{camp.name}</span>
                                                                            <span className="text-[10px] text-gray-450 font-normal">{formatDate(camp.startDate)} - {formatDate(camp.endDate)}</span>
                                                                        </td>
                                                                        <td className="py-3 text-center font-black text-gray-700">{campStats.workedCount}</td>
                                                                        <td className="py-3 text-center">
                                                                            <span className="inline-flex items-center gap-1.5 font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[10px]">
                                                                                {campStats.coveragePercentage}%
                                                                            </span>
                                                                            <div className="w-16 h-1 bg-gray-100 rounded-full mx-auto mt-1 overflow-hidden">
                                                                                <div className="h-full bg-blue-500" style={{ width: `${campStats.coveragePercentage}%` }} />
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-3 text-center font-bold text-gray-600">{campStats.assignmentsCount}</td>
                                                                        <td className="py-3 text-center font-bold text-gray-600">{campStats.publishersCount}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Graphical Bar Comparison Chart */}
                                                <div className="bg-slate-50/30 p-5 rounded-2xl border border-gray-150">
                                                    <h4 className="text-xs font-bold text-gray-800 mb-4">Gráfico Comparativo de Cobertura (%)</h4>
                                                    <div className="space-y-4">
                                                        {campaigns.filter(c => comparingCampaignIds.includes(c.id)).map((camp, index) => {
                                                            const campStats = getCampaignStats(camp);
                                                            const colorClass = index % 3 === 0 ? 'bg-blue-600' : index % 3 === 1 ? 'bg-emerald-500' : 'bg-amber-500';
                                                            return (
                                                                <div key={camp.id} className="space-y-1">
                                                                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-600">
                                                                        <span>{camp.name}</span>
                                                                        <span>{campStats.coveragePercentage}%</span>
                                                                    </div>
                                                                    <div className="w-full h-3 bg-gray-200/50 rounded-full overflow-hidden">
                                                                       <div 
                                                                           className={`h-full rounded-full transition-all duration-700 ${colorClass}`}
                                                                           style={{ width: `${campStats.coveragePercentage}%` }}
                                                                       />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : selectedCampaignForReport ? (
                                            /* Single Campaign In-depth intelligent Analysis */
                                            <div className="bg-white p-6 rounded-2xl border border-gray-155 shadow-sm space-y-6 animate-in fade-in">
                                                {/* Report Header */}
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-4 border-b border-gray-100">
                                                    <div>
                                                        <h3 className="text-sm font-black text-gray-800 uppercase tracking-wider">
                                                            Relatório Consolidado de Campanha
                                                        </h3>
                                                        <p className="text-xl font-extrabold text-blue-700 mt-1">
                                                            {selectedCampaignForReport.name} {selectedCampaignForReport.number ? `• Nº ${selectedCampaignForReport.number}` : ''}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 font-medium mt-1">
                                                            Período analítico: {formatDate(selectedCampaignForReport.startDate)} até {formatDate(selectedCampaignForReport.endDate)}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                            selectedCampaignForReport.active 
                                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                                : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                            {selectedCampaignForReport.active ? '● Ativa e Registrando' : 'Finalizada'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Stats Widgets */}
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-150">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Mapas Concluídos</p>
                                                        <p className="text-2xl font-black text-gray-800 mt-1">
                                                            {getCampaignStats(selectedCampaignForReport).workedCount}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-150">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Cobertura Geral</p>
                                                        <p className="text-2xl font-black text-blue-700 mt-1">
                                                            {getCampaignStats(selectedCampaignForReport).coveragePercentage}%
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-150">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Vinculados Período</p>
                                                        <p className="text-2xl font-black text-gray-800 mt-1">
                                                            {getCampaignStats(selectedCampaignForReport).assignmentsCount}
                                                        </p>
                                                    </div>
                                                    <div className="bg-slate-50/50 p-4 rounded-2xl border border-gray-150">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Publicadores Ativos</p>
                                                        <p className="text-2xl font-black text-gray-800 mt-1">
                                                            {getCampaignStats(selectedCampaignForReport).publishersCount}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Worked Map Logs */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Registros detalhados de mapas trabalhados</h4>
                                                        <span className="text-[10px] text-gray-500 font-bold">{getCampaignStats(selectedCampaignForReport).history.length} conclusões</span>
                                                    </div>

                                                    {getCampaignStats(selectedCampaignForReport).history.length === 0 ? (
                                                        <div className="text-center py-10 bg-slate-50/40 rounded-2xl border border-dashed border-gray-150 text-gray-400 text-xs">
                                                            Nenhum mapa foi concluído durante o intervalo definido para esta campanha.
                                                        </div>
                                                    ) : (
                                                        <div className="overflow-x-auto border border-gray-150 rounded-2xl font-bold">
                                                            <table className="w-full text-left text-xs text-gray-600 border-collapse animate-in fade-in">
                                                                <thead className="bg-slate-50/50">
                                                                    <tr className="border-b border-gray-100 text-[9px] font-black uppercase text-gray-400 tracking-wider">
                                                                        <th className="py-2.5 px-4 font-bold">Número / Nome</th>
                                                                        <th className="py-2.5 px-4 font-bold">Setor / Setor Urbano</th>
                                                                        <th className="py-2.5 px-4 font-bold">Trabalhado Por</th>
                                                                        <th className="py-2.5 px-4 font-bold">Conclusão</th>
                                                                        <th className="py-2.5 px-4 font-bold">Observações</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {getCampaignStats(selectedCampaignForReport).history.map((log, index) => (
                                                                        <tr key={index} className="border-b border-gray-100 hover:bg-slate-50/30 transition">
                                                                            <td className="py-3 px-4">
                                                                                <span className="inline-block bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[10px] mr-1.5 font-black">MAPA {log.territoryNumber}</span>
                                                                                <span className="font-bold text-gray-800">{log.territoryName}</span>
                                                                            </td>
                                                                            <td className="py-3 px-4 font-semibold text-gray-500">{log.locality}</td>
                                                                            <td className="py-3 px-4 font-bold text-slate-700">{log.userName}</td>
                                                                            <td className="py-3 px-4 text-gray-500">{formatDate(log.completedDate)}</td>
                                                                            <td className="py-3 px-4 text-gray-400 truncate max-w-[150px]" title={log.notes}>{log.notes || 'Sem observações'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Analytical Insights from Campaign */}
                                                <div className="bg-blue-50/55 p-5 rounded-2xl border border-blue-100/50 space-y-3 font-bold">
                                                    <h4 className="text-xs font-bold text-blue-950 flex items-center gap-1.5 font-bold">
                                                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        Análise Inteligente e Projeção Congregacional
                                                    </h4>
                                                    <p className="text-xs text-blue-950 leading-relaxed font-semibold">
                                                        {getCampaignStats(selectedCampaignForReport).workedCount === 0 ? (
                                                            "A campanha acaba de iniciar ou não registrou nenhuma conclusão ainda no período delimitado. Assim que os publicadores concluírem seus territórios vinculados ou entregarem seus relatórios, as estatísticas de cobertura geral atualizarão em tempo real neste painel informativo."
                                                        ) : (
                                                            `Com ${getCampaignStats(selectedCampaignForReport).workedCount} mapa(s) concluído(s) no período de ${selectedCampaignForReport.name}, obtivemos uma cobertura real de ${getCampaignStats(selectedCampaignForReport).coveragePercentage}% de nossas localidades congregacionais. Identificamos que as ações de pregação envolveram ativamente ${getCampaignStats(selectedCampaignForReport).publishersCount} irmão(s) liderando as saídas de campo.`
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-white p-12 rounded-2xl border border-gray-150 shadow-sm text-center text-gray-400 font-bold">
                                                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                                <h3 className="text-sm font-bold text-gray-700">Explore Campanhas & Analise Dados</h3>
                                                <p className="text-xs mt-1.5 max-w-md mx-auto">Selecione uma campanha à esquerda para visualizar seu relatório consolidado detalhado ou marque duas ou mais opções para compará-las mutuamente.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                </div>

            {showAddCampaignModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-155">
                        <div className="bg-slate-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between font-bold">
                            <h3 className="font-bold text-gray-850 text-sm uppercase tracking-wider">
                                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                            </h3>
                            <button 
                                onClick={() => setShowAddCampaignModal(false)}
                                className="text-gray-400 hover:text-gray-700 p-1.5 hover:bg-gray-100 rounded-lg transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <form onSubmit={handleSaveCampaign} className="p-6 space-y-4">
                            <div className="space-y-1 font-bold">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-bold">Nome da Campanha *</label>
                                <input
                                    type="text"
                                    required
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="Ex: Campanha Especial de Convites"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>

                            <div className="space-y-1 font-bold">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block font-bold">Número identificador (Opcional)</label>
                                <input
                                    type="text"
                                    value={campaignNumber}
                                    onChange={(e) => setCampaignNumber(e.target.value)}
                                    placeholder="Ex: 2026, Campanha 1"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4 font-bold">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Data de Início *</label>
                                    <input
                                        type="date"
                                        required
                                        value={campaignStartDate}
                                        onChange={(e) => setCampaignStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Data de Término *</label>
                                    <input
                                        type="date"
                                        required
                                        value={campaignEndDate}
                                        onChange={(e) => setCampaignEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 py-2 font-bold">
                                <input
                                    type="checkbox"
                                    id="campaign-active-chk"
                                    checked={campaignActive}
                                    onChange={(e) => setCampaignActiveState(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                />
                                <label htmlFor="campaign-active-chk" className="text-xs text-gray-700 select-none cursor-pointer font-bold">
                                    Marcar como Campanha Ativa Atual
                                </label>
                            </div>
                            <p className="text-[10px] text-gray-400 font-bold">
                                Obs: Ativar esta campanha desativará automaticamente qualquer outra campanha ativa anterior.
                            </p>

                            <div className="pt-4 border-t border-gray-150 flex items-center justify-end gap-3 font-bold">
                                <button
                                    type="button"
                                    onClick={() => setShowAddCampaignModal(false)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-xl transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl transition font-bold"
                                >
                                    {editingCampaign ? 'Salvar Edições' : 'Criar Campanha'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default AdminDashboard;