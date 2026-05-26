import React from 'react';
import { Home, ClipboardPlus, Map, Users, LayoutDashboard } from 'lucide-react';

interface BottomNavProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    isAdmin: boolean;
    pendingRequestsCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab, isAdmin, pendingRequestsCount = 0 }) => {
    const adminItems = [
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'available', label: 'Mapas', icon: Map },
        { id: 'users', label: 'Equipe', icon: Users },
    ];

    const publisherItems = [
        { id: 'home', label: 'Início', icon: Home },
        { id: 'request', label: 'Pedir', icon: ClipboardPlus },
    ];

    const items = isAdmin ? adminItems : publisherItems;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-250 px-6 py-2.5 pb-6 z-50 lg:hidden flex items-center justify-around shadow-[0_-4px_12px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom duration-300">
            {items.map(item => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id || (item.id === 'home' && activeTab === 'dashboard');
                
                return (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className="flex flex-col items-center gap-1.5 relative py-1 focus:outline-none rounded-lg px-3 min-w-[70px] select-none"
                    >
                        <div className={`p-2.5 rounded-2xl transition-all duration-200 ${
                            isActive 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/35 scale-105' 
                                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                        }`}>
                            <IconComponent className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest transition-colors duration-200 ${
                            isActive 
                                ? 'text-blue-600 font-extrabold' 
                                : 'text-slate-500 font-bold'
                        }`}>
                            {item.label}
                        </span>
                        {item.id === 'dashboard' && pendingRequestsCount > 0 && (
                            <span className="absolute top-1 right-3 flex h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-400"></span>
                        )}
                    </button>
                );
            })}
        </nav>
    );
};

export default BottomNav;
