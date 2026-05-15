import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

export default function AdminComplaintsScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [complaints, setComplaints] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [showAssign, setShowAssign] = useState(false);
    const [showStatus, setShowStatus] = useState(false);

    const isStaff = ['CLEANING_STAFF', 'SECURITY_STAFF', 'SERVICE_STAFF', 'MAINTENANCE_STAFF'].includes(activeWorkspace?.role || '');
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    useEffect(() => {
        fetchComplaints();
        if (isAdmin) fetchStaff();
    }, []);

    const fetchComplaints = async () => {
        try {
            const url = isStaff 
                ? `http://localhost:3002/community/complaints?staffId=${user?.id}`
                : `http://localhost:3002/community/complaints`;
            
            const res = await axios.get(url, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });
            setComplaints(res.data);
        } catch (e) {
            console.error('Fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchStaff = async () => {
        try {
            const res = await axios.get(`http://localhost:3002/community/members`, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });
            // Filter only staff roles
            const staffList = res.data.filter((m: any) => 
                ['CLEANING_STAFF', 'SECURITY_STAFF', 'SERVICE_STAFF', 'MAINTENANCE_STAFF', 'CARETAKER'].includes(m.role)
            );
            setStaff(staffList);
        } catch (e) {
            console.error('Fetch staff failed', e);
        }
    };

    const handleAssign = async (staffId: string) => {
        try {
            await axios.post(`http://localhost:3002/community/complaints/${selectedComplaint.id}/assign`, {
                staffId
            }, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });
            Alert.alert('Success', 'Complaint assigned successfully');
            setShowAssign(false);
            fetchComplaints();
        } catch (e) {
            Alert.alert('Error', 'Failed to assign complaint');
        }
    };

    const handleUpdateStatus = async (status: string) => {
        try {
            await axios.post(`http://localhost:3002/community/complaints/${selectedComplaint.id}/status`, {
                status
            }, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });
            Alert.alert('Success', `Status updated to ${status}`);
            setShowStatus(false);
            fetchComplaints();
        } catch (e) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isStaff ? 'My Assignments' : 'Requests & Complaints'}</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={complaints}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                </View>
                            </View>
                            
                            <Text style={styles.description}>{item.description}</Text>
                            
                            <View style={styles.residentInfo}>
                                <Ionicons name="person-outline" size={14} color="#94a3b8" />
                                <Text style={styles.residentText}>{item.member?.name} | {item.member?.phone}</Text>
                            </View>

                            <View style={styles.actionRow}>
                                {isAdmin && (
                                    <TouchableOpacity 
                                        style={styles.actionBtn}
                                        onPress={() => { setSelectedComplaint(item); setShowAssign(true); }}
                                    >
                                        <Ionicons name="person-add" size={18} color="#fff" />
                                        <Text style={styles.actionBtnText}>Assign Staff</Text>
                                    </TouchableOpacity>
                                )}
                                {(isAdmin || isStaff) && (
                                    <TouchableOpacity 
                                        style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                                        onPress={() => { setSelectedComplaint(item); setShowStatus(true); }}
                                    >
                                        <Ionicons name="create-outline" size={18} color="#fff" />
                                        <Text style={styles.actionBtnText}>Update Status</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    )}
                />
            )}

            {/* Assign Staff Modal */}
            <Modal visible={showAssign} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign to Staff</Text>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {staff.map((s: any) => (
                                <TouchableOpacity key={s.id} style={styles.staffItem} onPress={() => handleAssign(s.id)}>
                                    <View>
                                        <Text style={styles.staffName}>{s.name}</Text>
                                        <Text style={styles.staffRole}>{s.role}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#6366f1" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAssign(false)}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Update Status Modal */}
            <Modal visible={showStatus} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Status</Text>
                        {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                            <TouchableOpacity key={status} style={styles.statusItem} onPress={() => handleUpdateStatus(status)}>
                                <Text style={styles.statusItemText}>{status}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowStatus(false)}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'RESOLVED': return '#10b981';
        case 'IN_PROGRESS': return '#3b82f6';
        case 'OPEN': return '#f59e0b';
        default: return '#64748b';
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    categoryText: { fontSize: 11, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    description: { fontSize: 15, color: '#e2e8f0', fontWeight: '500', lineHeight: 22, marginBottom: 15 },
    residentInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
    residentText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 12, borderRadius: 12 },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 20, textAlign: 'center' },
    staffItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 10 },
    staffName: { fontSize: 15, fontWeight: '800', color: '#fff' },
    staffRole: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    statusItem: { padding: 18, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 10, alignItems: 'center' },
    statusItemText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
    closeBtnText: { color: '#94a3b8', fontWeight: '700' }
});
