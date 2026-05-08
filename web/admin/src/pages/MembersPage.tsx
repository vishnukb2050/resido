import React, { useState, useEffect } from 'react';
import { membersApi } from '../services/api';
import { Plus, Search, User, Phone, Home, Mail, Shield, CheckCircle, XCircle } from 'lucide-react';

export default function MembersPage() {
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        role: 'RESIDENT',
        occupancyType: 'RESIDENT',
        address: '',
        tenantName: '',
        tenantPhone: '',
    });

    useEffect(() => {
        fetchMembers();
    }, []);

    const fetchMembers = async () => {
        try {
            const res = await membersApi.list();
            setMembers(res.data);
        } catch (e) {
            console.error('Failed to fetch members', e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await membersApi.create(formData);
            setShowAddModal(false);
            setFormData({
                name: '',
                phone: '',
                email: '',
                role: 'RESIDENT',
                occupancyType: 'RESIDENT',
                address: '',
                tenantName: '',
                tenantPhone: '',
            });
            fetchMembers();
        } catch (e) {
            alert('Failed to add member');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white">Members Management</h1>
                    <p className="text-slate-400 text-sm">Manage residents, tenants and community staff</p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={20} />
                    Add Member
                </button>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Members</p>
                    <p className="text-2xl font-black text-white">{members.length}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Residents (Owners)</p>
                    <p className="text-2xl font-black text-emerald-500">{members.filter(m => m.occupancyType === 'RESIDENT').length}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Rentals</p>
                    <p className="text-2xl font-black text-orange-500">{members.filter(m => m.occupancyType === 'RENTAL').length}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Active Now</p>
                    <p className="text-2xl font-black text-indigo-500">{members.filter(m => m.isActive).length}</p>
                </div>
            </div>

            {/* Members Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/30">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Member</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {members.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                                {member.profilePhoto ? (
                                                    <img src={member.profilePhoto} className="w-full h-full rounded-full object-cover" />
                                                ) : (
                                                    <User size={18} className="text-slate-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{member.name}</p>
                                                <p className="text-xs text-slate-500">{member.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2"><Phone size={14} className="text-slate-500" /> {member.phone}</div>
                                            {member.email && <div className="flex items-center gap-2"><Mail size={14} className="text-slate-500" /> {member.email}</div>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            member.occupancyType === 'RESIDENT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'
                                        }`}>
                                            {member.occupancyType === 'RESIDENT' ? 'Resident (Owner)' : 'Rental'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        <div className="flex items-center gap-2">
                                            <Home size={14} className="text-slate-500" />
                                            {member.address || 'N/A'}
                                        </div>
                                        {member.occupancyType === 'RENTAL' && member.tenantName && (
                                            <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold">Tenant: {member.tenantName}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {member.isActive ? (
                                            <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold">
                                                <CheckCircle size={14} /> Active
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold">
                                                <XCircle size={14} /> Inactive
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-indigo-500 hover:text-indigo-400 font-bold text-sm">View Profile</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Member Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-2xl overflow-hidden shadow-2xl">
                        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center">
                            <h2 className="text-xl font-black text-white">Add New Resident</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAdd} className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Full Name</label>
                                    <input 
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Mobile Number</label>
                                    <input 
                                        required
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="+91 0000000000"
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Email (Optional)</label>
                                    <input 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                        placeholder="john@example.com"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Classification</label>
                                    <div className="flex gap-2 p-1 bg-slate-950 border border-slate-800 rounded-xl">
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, occupancyType: 'RESIDENT'})}
                                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                formData.occupancyType === 'RESIDENT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                        >Resident</button>
                                        <button 
                                            type="button"
                                            onClick={() => setFormData({...formData, occupancyType: 'RENTAL'})}
                                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                                                formData.occupancyType === 'RENTAL' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
                                            }`}
                                        >Rental</button>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Address / Unit Info</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all h-24"
                                    placeholder="Unit 402, Block B, Floor 4"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                            </div>

                            {formData.occupancyType === 'RENTAL' && (
                                <div className="mt-6 p-6 bg-slate-950/50 border border-dashed border-slate-800 rounded-2xl space-y-4">
                                    <p className="text-indigo-400 text-xs font-black uppercase tracking-widest">Tenant Information</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Tenant Name</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none"
                                                value={formData.tenantName}
                                                onChange={e => setFormData({...formData, tenantName: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Tenant Phone</label>
                                            <input 
                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 outline-none"
                                                value={formData.tenantPhone}
                                                onChange={e => setFormData({...formData, tenantPhone: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-6 py-4 rounded-xl border border-slate-800 text-slate-400 font-bold hover:bg-slate-800/50 transition-all"
                                >Cancel</button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-4 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                                >Add Member</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
