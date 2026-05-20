import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Image, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function GatepassListScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [gatepasses, setGatepasses] = useState([]);
    const [loading, setLoading] = useState(true);

    const adminRoles = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF', 'SECURITY_STAFF'];
    const isStaffRole = adminRoles.includes(activeWorkspace?.role || '');

    useEffect(() => {
        fetchGatepasses();
    }, []);

    const fetchGatepasses = async () => {
        try {
            // Admin and Security Staff can see all gatepasses; residents see their own
            const adminRoles = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF', 'SECURITY_STAFF'];
            const isAdminRole = adminRoles.includes(activeWorkspace?.role || '');
            const memberId = isAdminRole ? '' : (activeWorkspace?.memberId || user?.id);
            const { data } = await communityApi.getVisitors(memberId || '');
            setGatepasses(data);
        } catch (e) {
            console.error('Fetch gatepasses failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async (item: any) => {
        try {
            await Share.share({
                message: `Resido Gatepass for ${item.visitorName}\nDate: ${item.visitDate}\nTime: ${item.visitTime}\nPass ID: ${item.id}\n\nQR Code: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${item.id}\n\nPlease show this at the gate.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'APPROVED': return '#10b981';
            case 'PENDING': return '#f59e0b';
            default: return '#64748b';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isStaffRole ? 'All Gatepasses' : 'My Gatepasses'}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push(isStaffRole ? '/add-visitor' : '/create-gatepass')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#4c1d95" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={gatepasses}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity 
                            style={styles.card}
                            onPress={() => router.push({ pathname: '/gatepass-details', params: { id: item.id } })}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.visitorName}>{item.visitorName}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.cardDetails}>
                                <DetailItem icon="people" text={`${item.personsCount} Persons`} />
                                <DetailItem icon="time" text={`${item.visitTime} | ${item.visitDate}`} />
                                {item.vehicleNumber && <DetailItem icon="car" text={item.vehicleNumber} />}
                            </View>

                            <View style={styles.cardFooter}>
                                <Text style={styles.purposeText}>{item.purpose}</Text>
                                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                                    <TouchableOpacity 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            handleShare(item);
                                        }}
                                        style={{ padding: 6, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 8 }}
                                    >
                                        <Ionicons name="share-social-outline" size={18} color="#10b981" />
                                    </TouchableOpacity>
                                    <Ionicons name="qr-code" size={20} color="#4c1d95" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="shield-checkmark" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Gatepasses Yet</Text>
                            <Text style={styles.emptySub}>
                                {isStaffRole
                                    ? 'No gatepasses have been generated yet. Register a new visitor entry.'
                                    : 'Create a gatepass for your visitors to ensure smooth entry.'}
                            </Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => router.push(isStaffRole ? '/add-visitor' : '/create-gatepass')}>
                                <Text style={styles.createBtnText}>{isStaffRole ? 'Register Visitor' : 'Create First Gatepass'}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

function DetailItem({ icon, text }: any) {
    return (
        <View style={styles.detailItem}>
            <Ionicons name={icon} size={14} color="#94a3b8" />
            <Text style={styles.detailText}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#23272a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    visitorName: { fontSize: 18, fontWeight: '800', color: '#fff' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    cardDetails: { gap: 8, marginBottom: 15 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    detailText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    purposeText: { fontSize: 12, color: '#4c1d95', fontWeight: '700', textTransform: 'uppercase' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 22 },
    createBtn: { backgroundColor: '#4c1d95', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 30 },
    createBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 }
});
