import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
            setError(err.response?.data?.message || 'Invalid email or password.');
        } finally {
            setLoading(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [communityData, setCommunityData] = useState({
        name: '',
        adminEmail: '',
        adminPhone: '',
        adminPassword: ''
    });

    const handleCreateCommunity = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/clients`, communityData);
            Alert('Success', 'Community created! Please check your email for verification.');
            setActiveTab('login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create community.');
        } finally {
            setLoading(false);
        }
    };

    const Alert = (title: string, msg: string) => window.alert(`${title}: ${msg}`);

    const Feature = ({ icon, title, description }: { icon: string, title: string, description: string }) => (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            <div style={{ fontSize: '24px' }}>{icon}</div>
            <div>
                <h4 style={{ margin: '0 0 4px 0', color: '#fff', fontSize: '16px', fontWeight: '700' }}>{title}</h4>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', lineHeight: '1.5' }}>{description}</p>
            </div>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0f0f1a', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            {/* Navigation Bar */}
            <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 5%', background: 'rgba(15,15,26,0.8)', backdropFilter: 'blur(10px)', position: 'sticky', top: 0, zIndex: 100 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src="/logo.png" alt="Resido Logo" style={{ height: '40px' }} />
                    <span style={{ fontSize: '24px', fontWeight: '800', background: 'linear-gradient(45deg, #2563eb, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Resido</span>
                </div>
                <div style={{ display: 'flex', gap: '30px' }}>
                    <a href="#features" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Features</a>
                    <a href="#communities" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Communities</a>
                    <a href="#support" style={{ color: '#94a3b8', textDecoration: 'none', fontWeight: '500' }}>Support</a>
                </div>
            </nav>

            <div style={{ display: 'flex', flexWrap: 'wrap', padding: '60px 5%', gap: '60px', alignItems: 'center' }}>
                {/* Left Side: Content */}
                <div style={{ flex: '1 1 500px' }}>
                    <h1 style={{ fontSize: '48px', fontWeight: '800', lineHeight: 1.1, marginBottom: '24px' }}>
                        The All-in-One <br />
                        <span style={{ color: '#2563eb' }}>Smart Residential</span> <br />
                        Management Ecosystem
                    </h1>
                    <p style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '40px', lineHeight: '1.6', maxWidth: '600px' }}>
                        Empowering communities with digital governance, real-time communication, and automated facilities management. Experience the future of living.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <Feature 
                            icon="📱" 
                            title="Resident App" 
                            description="Complaints, Visitor Logs, Payments, and Community Blogs at your fingertips."
                        />
                        <Feature 
                            icon="🏢" 
                            title="Admin Dashboard" 
                            description="Comprehensive control over members, billing, facility bookings, and staff."
                        />
                        <Feature 
                            icon="🤝" 
                            title="Service Access" 
                            description="Dedicated portal for service providers, maintenance staff, and security."
                        />
                        <Feature 
                            icon="📊" 
                            title="Smart Insights" 
                            description="Real-time analytics on community expenses and resource utilization."
                        />
                    </div>

                    <div style={{ marginTop: '40px', display: 'flex', gap: '20px' }}>
                        <button onClick={() => setActiveTab('register')} style={{ padding: '14px 28px', borderRadius: '12px', background: '#2563eb', color: '#fff', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                            Start a Community
                        </button>
                        <button style={{ padding: '14px 28px', borderRadius: '12px', background: 'transparent', color: '#fff', border: '1px solid #2d2d3d', fontWeight: '700', cursor: 'pointer' }}>
                            Become a Provider
                        </button>
                    </div>
                </div>

                {/* Right Side: Login/Register Card */}
                <div style={{ flex: '0 0 420px', margin: '0 auto' }}>
                    <div style={{ background: '#1e1e2e', padding: '32px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                        <div style={{ display: 'flex', background: '#0f0f1a', padding: '4px', borderRadius: '12px', marginBottom: '32px' }}>
                            <button 
                                onClick={() => setActiveTab('login')}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeTab === 'login' ? '#1e1e2e' : 'transparent', color: activeTab === 'login' ? '#fff' : '#64748b', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Sign In
                            </button>
                            <button 
                                onClick={() => setActiveTab('register')}
                                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', background: activeTab === 'register' ? '#1e1e2e' : 'transparent', color: activeTab === 'register' ? '#fff' : '#64748b', fontWeight: '700', cursor: 'pointer' }}
                            >
                                Register
                            </button>
                        </div>

                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '14px', borderRadius: '12px', marginBottom: '20px', fontSize: '14px' }}>{error}</div>}

                        {activeTab === 'login' ? (
                            <form onSubmit={handleLogin}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="admin@resido.com"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f0f1a', border: '1px solid #2d2d3d', color: '#fff', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f0f1a', border: '1px solid #2d2d3d', color: '#fff', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <button disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, #1d4ed8, #2563eb)', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                                    {loading ? 'Processing...' : 'Sign In to Panel'}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleCreateCommunity}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Community Name</label>
                                    <input
                                        value={communityData.name}
                                        onChange={(e) => setCommunityData({...communityData, name: e.target.value})}
                                        placeholder="e.g. Green Valley Apartments"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f0f1a', border: '1px solid #2d2d3d', color: '#fff', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Admin Email</label>
                                    <input
                                        type="email"
                                        value={communityData.adminEmail}
                                        onChange={(e) => setCommunityData({...communityData, adminEmail: e.target.value})}
                                        placeholder="contact@community.com"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f0f1a', border: '1px solid #2d2d3d', color: '#fff', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Admin Phone</label>
                                    <input
                                        value={communityData.adminPhone}
                                        onChange={(e) => setCommunityData({...communityData, adminPhone: e.target.value})}
                                        placeholder="+1 234 567 890"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f0f1a', border: '1px solid #2d2d3d', color: '#fff', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase' }}>Create Password</label>
                                    <input
                                        type="password"
                                        value={communityData.adminPassword}
                                        onChange={(e) => setCommunityData({...communityData, adminPassword: e.target.value})}
                                        placeholder="••••••••"
                                        style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f0f1a', border: '1px solid #2d2d3d', color: '#fff', outline: 'none' }}
                                        required
                                    />
                                </div>
                                <button disabled={loading} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#10b981', color: '#fff', border: 'none', fontWeight: '800', cursor: 'pointer' }}>
                                    {loading ? 'Creating...' : 'Register Community'}
                                </button>
                            </form>
                        )}
                        
                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
                            Need help? <a href="/support" style={{ color: '#2563eb', textDecoration: 'none', fontWeight: '600' }}>Contact Support</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer style={{ padding: '60px 5%', borderTop: '1px solid #1e1e2e', marginTop: '60px', textAlign: 'center' }}>
                <p style={{ color: '#64748b', fontSize: '14px' }}>&copy; 2026 Resido Smart Management System. All rights reserved.</p>
            </footer>
        </div>
    );
}
