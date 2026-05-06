import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid email or password. If you haven\'t accepted your invite, check your email.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ background: '#1e1e2e', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h1 style={{ color: '#6366f1', marginBottom: '8px', fontSize: '28px', textAlign: 'center' }}>Resido Panel</h1>
                <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>Staff & Admin Login</p>

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleLogin}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Email Address</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
                            required
                        />
                    </div>
                    <button disabled={loading} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>
                
                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
                    Received an invite? <a href="/accept-invite" style={{ color: '#6366f1', textDecoration: 'none' }}>Set your password here</a>
                </div>
            </div>
        </div>
    );
}
