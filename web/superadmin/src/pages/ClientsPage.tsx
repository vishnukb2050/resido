import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function ClientsPage() {
    const [clients, setClients] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        adminEmail: '',
        caretakerEmail: '',
        subAdminEmail: '',
        plan: 'BASIC'
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/clients`);
            setClients(res.data);
        } catch (err) {
            console.error('Failed to fetch clients');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            await axios.post(`${import.meta.env.VITE_API_URL}/clients`, formData);
            setShowModal(false);
            setFormData({ name: '', adminEmail: '', caretakerEmail: '', subAdminEmail: '', plan: 'BASIC' });
            fetchClients();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create community');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div style={{ padding: '32px', color: '#fff', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Communities</h1>
                <button 
                    onClick={() => setShowModal(true)}
                    style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Add Community
                </button>
            </div>

            {loading ? (
                <p>Loading communities...</p>
            ) : (
                <div style={{ background: '#1e1e2e', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)', color: '#94a3b8', fontSize: '12px', textTransform: 'uppercase' }}>
                            <tr>
                                <th style={{ padding: '16px' }}>Name</th>
                                <th style={{ padding: '16px' }}>Plan</th>
                                <th style={{ padding: '16px' }}>Admin</th>
                                <th style={{ padding: '16px' }}>Status</th>
                                <th style={{ padding: '16px' }}>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {clients.map(client => (
                                <tr key={client.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{client.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{client.slug}</div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                            {client.plan}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', fontSize: '13px' }}>{client.adminEmail}</td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ color: client.provisionedAt ? '#22c55e' : '#f59e0b', fontSize: '13px' }}>
                                            {client.provisionedAt ? '● Provisioned' : '○ Pending'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#64748b', fontSize: '13px' }}>
                                        {new Date(client.createdAt).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#1e1e2e', padding: '32px', borderRadius: '16px', width: '100%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ marginBottom: '24px' }}>Onboard New Community</h2>
                        
                        {error && <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}

                        <form onSubmit={handleCreate}>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Community Name</label>
                                <input 
                                    type="text" 
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                    required
                                />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Admin Email</label>
                                <input 
                                    type="email" 
                                    value={formData.adminEmail}
                                    onChange={e => setFormData({...formData, adminEmail: e.target.value})}
                                    style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Caretaker Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.caretakerEmail}
                                        onChange={e => setFormData({...formData, caretakerEmail: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Sub-Admin Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.subAdminEmail}
                                        onChange={e => setFormData({...formData, subAdminEmail: e.target.value})}
                                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#27273a', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
                                    />
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                                    {submitting ? 'Creating...' : 'Create Community'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
