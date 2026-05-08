import React, { useState, useEffect } from 'react';
import { membersApi } from '../services/api';
import { Plus, Search, User, Phone, Shield, Briefcase, Clock, CheckCircle, XCircle, MoreVertical } from 'lucide-react';

const STAFF_ROLES = [
    'CLEANING_STAFF',
    'CARETAKER',
    'SECURITY_STAFF',
    'ACCOUNTS_STAFF',
    'MAINTENANCE_STAFF',
    'ADMIN_STAFF',
    'SERVICE_STAFF'
];

export default function StaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        role: 'CLEANING_STAFF',
        address: '',
    });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await membersApi.list();
            // Filter only staff roles
            setStaff(res.data.filter((m: any) => STAFF_ROLES.includes(m.role)));
        } catch (e) {
            console.error('Failed to fetch staff', e);
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
                role: 'CLEANING_STAFF',
                address: '',
            });
            fetchStaff();
        } catch (e) {
            alert('Failed to add staff member');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white">Staff Management</h1>
                    <p className="text-slate-400 text-sm">Manage community staff, roles and assignments</p>
                </div>
                <button 
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                >
                    <Plus size={20} />
                    Add Staff Member
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Staff</p>
                    <p className="text-2xl font-black text-white">{staff.length}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Cleaning Team</p>
                    <p className="text-2xl font-black text-indigo-500">{staff.filter(s => s.role === 'CLEANING_STAFF').length}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Security</p>
                    <p className="text-2xl font-black text-emerald-500">{staff.filter(s => s.role === 'SECURITY_STAFF').length}</p>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-2xl">
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Maintenance</p>
                    <p className="text-2xl font-black text-orange-500">{staff.filter(s => s.role === 'MAINTENANCE_STAFF').length}</p>
                </div>
            </div>

            {/* Staff Table */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-800 bg-slate-800/30">
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Member</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Role / Dept</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {staff.map((member) => (
                                <tr key={member.id} className="hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center border border-slate-700">
                                                {member.profilePhoto ? (
                                                    <img src={member.profilePhoto} className="w-full h-full rounded-xl object-cover" />
                                                ) : (
                                                    <User size={18} className="text-slate-500" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{member.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">ID: {member.id.slice(-6)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-300">
                                        <div className="flex items-center gap-2"><Phone size={14} className="text-slate-500" /> {member.phone}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${
                                                member.role.includes('STAFF') ? 'bg-indigo-500' : 'bg-emerald-500'
                                            }`} />
                                            <span className="text-xs font-black text-white uppercase tracking-wider">
                                                {member.role.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {member.isActive ? (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                                On Duty
                                            </div>
                                        ) : (
                                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                                Off Duty
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-xl overflow-hidden shadow-2xl">
                        <div className="px-8 py-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/20">
                            <h2 className="text-xl font-black text-white">Onboard New Staff</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-slate-500 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleAdd} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Staff Full Name</label>
                                <input 
                                    required
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                    placeholder="e.g. Anil Kumar"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
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
                                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Role</label>
                                    <select 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all"
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value})}
                                    >
                                        {STAFF_ROLES.map(role => (
                                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Residential Address (Permanent)</label>
                                <textarea 
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all h-24"
                                    placeholder="Enter full address"
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-6 py-4 rounded-xl border border-slate-800 text-slate-400 font-bold hover:bg-slate-800/50 transition-all"
                                >Cancel</button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-4 rounded-xl bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all"
                                >Complete Onboarding</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
