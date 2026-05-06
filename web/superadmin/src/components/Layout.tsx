import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
    LayoutDashboard, 
    Users, 
    Settings, 
    LogOut,
    Building2,
    ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';

export default function Layout({ children }: { children: React.ReactNode }) {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
        { name: 'Clients', icon: Building2, path: '/clients' },
        { name: 'Settings', icon: Settings, path: '/settings' },
    ];

    return (
        <div className="flex h-screen bg-[#0f0f1a] text-white overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-[#1e1e2e] border-r border-white/10 flex flex-col">
                <div className="p-6 flex items-center space-x-3">
                    <ShieldCheck className="text-indigo-500" size={32} />
                    <span className="text-2xl font-bold tracking-tight">SuperAdmin</span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                                "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                location.pathname.startsWith(item.path)
                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon size={20} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={logout}
                        className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all duration-200"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Sign Out</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="h-16 bg-[#1e1e2e]/50 backdrop-blur-md border-bottom border-white/10 flex items-center justify-between px-8">
                    <h2 className="text-xl font-semibold capitalize">
                        {location.pathname.split('/')[1] || 'Dashboard'}
                    </h2>
                </header>
                <main className="flex-1 overflow-y-auto p-8 bg-[#0f0f1a]">
                    {children}
                </main>
            </div>
        </div>
    );
}
