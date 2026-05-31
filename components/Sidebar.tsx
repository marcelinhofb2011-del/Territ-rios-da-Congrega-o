import React from 'react';

interface SidebarProps {
    activeTab: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns';
    setActiveTab: (tab: 'dashboard' | 'available' | 'in_use' | 'resting' | 'history' | 'users' | 'stats' | 'settings' | 'campaigns') => void;
    pendingRequestsCount: number;
    isOpen: boolean;
    onClose: () => void;
    onAddTerritory: () => void;
    onManualAssign: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, pendingRequestsCount, isOpen, onClose, onAddTerritory, onManualAssign }) => {
    const menuItems = [
        { id: 'dashboard', label: 'Painel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'available', label: 'Livres', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
        { id: 'in_use', label: 'Ativos', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
        { id: 'resting', label: 'Descanso', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707.707' },
        { id: 'campaigns', label: 'Campanhas', icon: 'M3 21v-18M3 5c2 0 3-1 6-1s4.5 2 7 2h5v9c0 0-3 0-5-2s-4-2-7-2H3' },
        { id: 'users', label: 'Equipe', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
        { id: 'stats', label: 'Dados', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
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
                fixed inset-y-0 left-0 z-50 w-64 bg-slate-50 border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-[calc(100vh-64px)]
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="p-4 flex items-center justify-between lg:hidden border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">A</div>
                        <h1 className="font-bold text-gray-800 text-xs uppercase tracking-wider">Gestão</h1>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-950 hover:bg-gray-100 rounded">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="p-4 space-y-2 border-b border-gray-200 bg-white">
                    <button 
                        onClick={() => {
                            onAddTerritory();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 active:bg-blue-800 transition-all font-semibold text-xs shadow-sm"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" /></svg>
                        <span>Novo Registro</span>
                    </button>

                    <button 
                        onClick={() => {
                            onManualAssign();
                            onClose();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded hover:bg-gray-50 active:bg-gray-100 transition-all font-semibold text-xs"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                        <span>Vincular</span>
                    </button>
                </div>

                <div className="flex-1 py-4 space-y-0.5">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">Principal</p>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center justify-between px-4 py-2 transition-all group relative ${
                                activeTab === item.id 
                                    ? 'bg-blue-50 text-blue-700 font-semibold' 
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <svg className={`w-4 h-4 ${activeTab === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                                </svg>
                                <span className="text-xs">{item.label}</span>
                            </div>
                            {activeTab === item.id && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                            )}
                            {item.id === 'dashboard' && pendingRequestsCount > 0 && (
                                <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {pendingRequestsCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
