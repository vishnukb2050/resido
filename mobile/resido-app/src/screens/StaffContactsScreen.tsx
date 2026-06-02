import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { residentApi } from '../services/api';

export default function StaffContactsScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            // Fetching staff with role filtering (CARETAKER, MAINTENANCE_STAFF, etc.)
            const res = await residentApi.getMembers({ role: 'STAFF_GROUP' });
            setStaff(res.data);
        } catch (e) {
            console.error('Fetch staff failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phone: string) => {
        if (!phone || phone.includes('*')) return;
        Linking.openURL(`tel:${phone}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Staff Contacts</Text>
                <View style={{ width: 44 }} />
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={staff}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => (
                        <View style={styles.staffCard}>
                            <Image 
                                source={{ uri: item.profilePhoto || 'https://i.pravatar.cc/150?u=' + item.id }} 
                                style={styles.staffImg} 
                            />
                            <View style={styles.staffInfo}>
                                <Text style={styles.staffName}>{item.name}</Text>
                                <Text style={styles.staffRole}>{item.role.replace('_', ' ')}</Text>
                                <Text style={styles.staffDesc}>{item.description || 'Community Support Staff'}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.callBtn, item.phone?.includes('*') && styles.disabledBtn]} 
                                onPress={() => handleCall(item.phone)}
                            >
                                <Ionicons name="call" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="call-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Staff Listed</Text>
                            <Text style={styles.emptySub}>Contact details for community staff will appear here.</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    staffCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 18, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: '#D4C9E8' },
    staffImg: { width: 64, height: 64, borderRadius: 22 },
    staffInfo: { flex: 1, marginLeft: 15 },
    staffName: { fontSize: 17, fontWeight: '800', color: '#2D2445' },
    staffRole: { fontSize: 11, color: '#8b5cf6', fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
    staffDesc: { fontSize: 12, color: '#7A6B9C', marginTop: 4, fontWeight: '600' },
    callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    disabledBtn: { backgroundColor: '#334155' },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', marginTop: 10 },
});
