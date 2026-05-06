import React from 'react';
import { useAuth } from '../hooks/useAuth';

export default function DashboardPage() {
    const { role } = useAuth();

    // Conditionally render based on role
    return (
        <div style={{ padding: '24px', color: '#fff' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Dashboard</h1>

            {role === 'CARETAKER' ? (
                <div style={{ background: '#1e1e2e', padding: '20px', borderRadius: '12px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#6366f1' }}>Caretaker Panel</h2>
                    <p style={{ color: '#94a3b8' }}>Manage complaints, view notices, and interact with the chat service.</p>
                </div>
            ) : (
                <div style={{ background: '#1e1e2e', padding: '20px', borderRadius: '12px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '8px', color: '#6366f1' }}>Admin Panel</h2>
                    <p style={{ color: '#94a3b8' }}>Manage residents, departments, accounting, and system configurations.</p>
                </div>
            )}

            <div style={{ marginTop: '24px', background: '#1e1e2e', padding: '20px', borderRadius: '12px' }}>
                <p>Welcome to the Resido web portal.</p>
            </div>
        </div>
    );
}
