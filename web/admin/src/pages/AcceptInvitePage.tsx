import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

export default function AcceptInvitePage() {
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('token') || '';
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteData, setInviteData] = useState<{ email: string; communityName: string; role: string } | null>(null);

    const { acceptInvite } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (inviteToken) {
            axios.get(`${import.meta.env.VITE_API_URL}/staff/invite/${inviteToken}`)
                .then(res => setInviteData(res.data))
                .catch(() => setError('Invalid or expired invite token.'));
        }
    }, [inviteToken]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            await acceptInvite(inviteToken, password);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to set password.');
        } finally {
            setLoading(false);
        }
    };

    if (!inviteToken) {
        return (
            <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ color: '#ef4444' }}>Missing Invite Token</h1>
                    <p>Please check your email and click the link provided.</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ background: '#1e1e2e', padding: '40px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <h1 style={{ color: '#6366f1', marginBottom: '8px', fontSize: '28px', textAlign: 'center' }}>Welcome to Resido</h1>
                <p style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '32px' }}>Set your password to get started</p>

                {inviteData && (
                    <div style={{ background: 'rgba(99,102,241,0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px' }}>
                        <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Community</div>
                        <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '12px' }}>{inviteData.communityName}</div>
                        <div style={{ color: '#94a3b8', marginBottom: '4px' }}>Role</div>
                        <div style={{ color: '#fff', fontWeight: 'bold' }}>{inviteData.role.replace('_', ' ')}</div>
                    </div>
                )}

                {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Create Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Confirm Password</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat password"
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }}
                            required
                        />
                    </div>
                    <button disabled={loading || !inviteData} style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                        {loading ? 'Setting up...' : 'Activate Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}
