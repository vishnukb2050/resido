import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { complaintApi } from '../services/api';

export default function ComplaintsListScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchComplaints();
    }, []);

    const fetchComplaints = async () => {
        try {
            const { data } = await complaintApi.getComplaints();
            setComplaints(data);
        } catch (e) {
            console.error('Fetch complaints failed', e);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'RESOLVED': return '#10b981';
            case 'IN_PROGRESS': return '#3b82f6';
            case 'OPEN': return '#f59e0b';
            default: return '#64748b';
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'URGENT': return '#ef4444';
            case 'HIGH': return '#f97316';
            default: return '#3b82f6';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Requests & Complaints</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-complaint')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
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
                                <View style={[styles.categoryBadge, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                    <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                </View>
                            </View>
                            
                            <Text style={styles.description}>{item.description}</Text>

                            <View style={styles.cardFooter}>
                                <View style={styles.footerItem}>
                                    <Ionicons name="flag" size={14} color={getPriorityColor(item.priority)} />
                                    <Text style={[styles.footerText, { color: getPriorityColor(item.priority) }]}>{item.priority}</Text>
                                </View>
                                <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="construct-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Requests Yet</Text>
                            <Text style={styles.emptySub}>Raise a request or complaint for any issues in your apartment.</Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-complaint')}>
                                <Text style={styles.createBtnText}>Raise New Request</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    categoryBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    categoryText: { fontSize: 11, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    description: { fontSize: 15, color: '#e2e8f0', fontWeight: '500', lineHeight: 22, marginBottom: 15 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerText: { fontSize: 12, fontWeight: '800' },
    dateText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 22 },
    createBtn: { backgroundColor: '#6366f1', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 30 },
    createBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 }
});
