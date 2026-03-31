import React from 'react';

interface SidebarProps {
    activeTab: 'dashboard' | 'territories' | 'worked' | 'users' | 'stats';
    setActiveTab: (tab: 'dashboard' | 'territories' | 'worked' | 'users' | 'stats') => void;
    pendingRequestsCount: number;
    isOpen: boolean;
    onClose: () => void;
    onAddTerritory: () => void;
    onManualAssign: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, pendingRequestsCount, isOpen, onClose, onAddTerritory, onManualAssign }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Início', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'territories', label: 'Mapas', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
        { id: 'worked', label: 'Trabalhados', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
        { id: 'users', label: 'Usuários', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { id: 'stats', label: 'Estatísticas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    ];

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 lg:hidden animate-in fade-in duration-300"
                    onClick={onClose}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 p-6 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-80px)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex items-center justify-between lg:hidden mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-100">A</div>
                        <h1 className="font-black text-slate-900 text-sm uppercase tracking-widest">Painel Admin</h1>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <button 
                    onClick={() => {
                        onAddTerritory();
                        onClose();
                    }}
                    className="w-full mb-3 flex items-center justify-center gap-3 px-4 py-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all group"
                >
                    <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Novo Território</span>
                </button>

                <button 
                    onClick={() => {
                        onManualAssign();
                        onClose();
                    }}
                    className="w-full mb-6 flex items-center justify-center gap-3 px-4 py-4 bg-white text-slate-600 border border-slate-200 rounded-2xl shadow-sm hover:bg-slate-50 transition-all group"
                >
                    <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Atribuição Manual</span>
                </button>

                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4 mb-4">Menu Principal</p>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group ${
                                activeTab === item.id 
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' 
                                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-900'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                                </svg>
                                <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
                            </div>
                            {item.id === 'dashboard' && pendingRequestsCount > 0 && (
                                <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === 'dashboard' ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}>
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="mt-auto pt-8">
                    <div className="bg-slate-900 rounded-[2rem] p-6 text-white relative overflow-hidden group cursor-pointer shadow-2xl shadow-slate-200">
                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-2">Suporte</p>
                        <p className="text-xs font-bold leading-relaxed">Precisa de ajuda com a gestão dos mapas?</p>
                        <button className="mt-4 w-full py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors shadow-lg">
                            Ver Guia
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
