import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import '../index.css';

const MENU_ITEMS = {
    APARTMENT_ADMIN: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Departments', path: '/departments', icon: '📋' },
        { label: 'Residents', path: '/residents', icon: '👥' },
        { label: 'Notice Board', path: '/notices', icon: '📣' },
        { label: 'Polls', path: '/polls', icon: '🗳️' },
        { label: 'Groups', path: '/groups', icon: '💬' },
        { label: 'Accounting', path: '/accounting', icon: '💰' },
        { label: 'Visitor Log', path: '/visitors', icon: '🛡️' },
        { label: 'Complaints', path: '/complaints', icon: '🔧' },
        { label: 'Chat', path: '/chat', icon: '💬' },
        { label: 'Settings', path: '/settings', icon: '⚙️' },
    ],
    CARETAKER: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Complaints', path: '/complaints', icon: '🔧' },
        { label: 'Notice Board', path: '/notices', icon: '📣' },
        { label: 'Chat', path: '/chat', icon: '💬' },
    ],
    ADMIN_STAFF: [
        { label: 'Dashboard', path: '/dashboard', icon: '📊' },
        { label: 'Residents', path: '/residents', icon: '👥' },
        { label: 'Notice Board', path: '/notices', icon: '📣' },
        { label: 'Polls', path: '/polls', icon: '🗳️' },
        { label: 'Complaints', path: '/complaints', icon: '🔧' },
        { label: 'Chat', path: '/chat', icon: '💬' },
    ]
};

export default function Layout() {
    const { role, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navItems = MENU_ITEMS[role as keyof typeof MENU_ITEMS] || MENU_ITEMS.APARTMENT_ADMIN;

    return (
        <div className="app-container">
            <aside className="sidebar">
                <div className="sidebar-logo">Resido {role?.replace('_', ' ')}</div>

                <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div style={{ padding: '24px', borderTop: '1px solid var(--border)' }}>
                    <button onClick={handleLogout} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                        🚪 Logout
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
