import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, FlatList, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { visitorApi } from '../services/api';

export default function GatepassListScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [gatepasses, setGatepasses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchGatepasses();
    }, []);

    const fetchGatepasses = async () => {
        try {
            const { data } = await visitorApi.getEntries();
            setGatepasses(data);
        } catch (e) {
            console.error('Fetch gatepasses failed', e);
        } finally {
            setLoading(false);
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
                <Text style={styles.headerTitle}>My Gatepasses</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/create-gatepass')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#0d9488" style={{ marginTop: 50 }} />
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
                                <Ionicons name="qr-code" size={20} color="#0d9488" />
                            </View>
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="shield-checkmark" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Gatepasses Yet</Text>
                            <Text style={styles.emptySub}>Create a gatepass for your visitors to ensure smooth entry.</Text>
                            <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/create-gatepass')}>
                                <Text style={styles.createBtnText}>Create First Gatepass</Text>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0d9488', alignItems: 'center', justifyContent: 'center' },
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
    purposeText: { fontSize: 12, color: '#0d9488', fontWeight: '700', textTransform: 'uppercase' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10, lineHeight: 22 },
    createBtn: { backgroundColor: '#0d9488', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 24, marginTop: 30 },
    createBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 }
});
