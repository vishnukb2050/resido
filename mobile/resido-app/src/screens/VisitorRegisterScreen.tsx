import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { visitorApi } from '../services/api';

export default function VisitorRegisterScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRegister();
    }, []);

    const fetchRegister = async () => {
        try {
            const { data } = await visitorApi.getRegister();
            setEntries(data);
        } catch (e) {
            console.error('Fetch register failed', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Visitor Register</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/add-visitor')}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={entries}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.entryCard}>
                            <View style={styles.entryMain}>
                                <View style={styles.iconBox}>
                                    <Ionicons 
                                        name={item.category === 'Delivery' ? 'bicycle' : item.category === 'Visitor' ? 'person' : 'construct'} 
                                        size={24} 
                                        color="#fff" 
                                    />
                                </View>
                                <View style={styles.entryInfo}>
                                    <Text style={styles.visitorName}>{item.visitorName}</Text>
                                    <Text style={styles.entrySub}>{item.phone} • {item.unitToVisit}</Text>
                                    <Text style={styles.entryPurpose}>{item.purpose}</Text>
                                </View>
                                <View style={styles.timeBox}>
                                    <Text style={styles.timeText}>{new Date(item.inTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                                    <Text style={styles.statusText}>{item.outTime ? 'EXITED' : 'INSIDE'}</Text>
                                </View>
                            </View>
                            {item.vehicleNumber && (
                                <View style={styles.entryExtra}>
                                    <Ionicons name="car-outline" size={14} color="#64748b" />
                                    <Text style={styles.extraText}>{item.vehicleNumber}</Text>
                                </View>
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="id-card-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>Empty Register</Text>
                            <Text style={styles.emptySub}>No visitor entries recorded for today.</Text>
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
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    entryCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, marginBottom: 15, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    entryMain: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    entryInfo: { flex: 1, marginLeft: 15 },
    visitorName: { fontSize: 16, fontWeight: '800', color: '#fff' },
    entrySub: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    entryPurpose: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
    timeBox: { alignItems: 'flex-end' },
    timeText: { fontSize: 14, fontWeight: '900', color: '#fff' },
    statusText: { fontSize: 9, fontWeight: '900', color: '#10b981', marginTop: 4, letterSpacing: 1 },
    entryExtra: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },
    extraText: { fontSize: 12, color: '#64748b', fontWeight: '700' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },
});
