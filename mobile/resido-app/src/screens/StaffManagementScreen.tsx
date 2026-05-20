import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { communityApi } from '../services/api';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const STAFF_ROLES = [
    'CLEANING_STAFF',
    'CARETAKER',
    'SECURITY_STAFF',
    'ACCOUNTS_STAFF',
    'MAINTENANCE_STAFF',
    'ADMIN_STAFF',
    'STAFF',
    'SERVICE_STAFF'
];

export default function StaffManagementScreen() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await communityApi.getMembers();
            setStaff(res.data.filter((m: any) => STAFF_ROLES.includes(m.role)));
        } catch (e) {
            console.error('Failed to fetch staff', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#1d4ed8" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Staff Management</Text>
                    <Text style={styles.subTitle}>{staff.length} Active Personnel</Text>
                </View>
                <TouchableOpacity 
                    style={styles.addButton}
                    onPress={() => router.push('/create-member')}
                >
                    <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={staff}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, gap: 12 }}
                renderItem={({ item }) => (
                    <TouchableOpacity style={styles.card}>
                        <View style={styles.avatar}>
                            {item.profilePhoto ? (
                                <Image source={{ uri: item.profilePhoto }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarText}>{item.name[0]}</Text>
                            )}
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name}</Text>
                            <View style={styles.roleRow}>
                                <View style={[styles.roleDot, { backgroundColor: item.role === 'CLEANING_STAFF' ? '#1d4ed8' : '#10b981' }]} />
                                <Text style={styles.roleText}>{item.role.replace('_', ' ')}</Text>
                            </View>
                            <Text style={styles.phone}>{item.phone}</Text>
                        </View>
                        <View style={styles.statusBadge}>
                            <Text style={styles.statusText}>{item.isActive ? 'ON DUTY' : 'OFF'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                    </TouchableOpacity>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    subTitle: { fontSize: 13, color: '#1d4ed8', fontWeight: '600', marginTop: 2 },
    addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, elevation: 1 },
    avatar: { width: 50, height: 50, borderRadius: 16, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    avatarImg: { width: '100%', height: '100%' },
    avatarText: { color: '#3b82f6', fontSize: 18, fontWeight: '700' },
    info: { flex: 1, marginLeft: 16 },
    name: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    roleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
    roleDot: { width: 6, height: 6, borderRadius: 3 },
    roleText: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    phone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    statusBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginRight: 12 },
    statusText: { fontSize: 9, color: '#10b981', fontWeight: '900' },
});
