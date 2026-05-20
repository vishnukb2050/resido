import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, TouchableOpacity } from 'react-native';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityMembersScreen() {
    const { activeWorkspace } = useAuthStore();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        communityApi.getMembers().then(r => setMembers(r.data)).finally(() => setLoading(false));
    }, [activeWorkspace]);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#4c1d95" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View>
                        <Text style={styles.title}>Neighbors</Text>
                        <Text style={styles.subTitle}>{activeWorkspace?.tenantName}</Text>
                    </View>
                    {(activeWorkspace?.role === 'APARTMENT_ADMIN' || activeWorkspace?.role === 'STAFF') && (
                        <TouchableOpacity 
                            style={styles.addButton}
                            onPress={() => router.push('/create-member')}
                        >
                            <Ionicons name="person-add" size={20} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
            <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, gap: 12 }}
                renderItem={({ item }) => (
                    <TouchableOpacity 
                        style={styles.card} 
                        onPress={() => router.push({
                            pathname: '/member-profile',
                            params: {
                                userId: item.userId,
                                name: item.name,
                                profileName: item.profileName,
                                profilePhoto: item.profilePhoto,
                                phone: item.phone
                            }
                        })}
                    >
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(item.profileName || item.name)?.[0]}</Text>
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.profileName || item.name}</Text>
                            {item.profileName && item.name && <Text style={styles.realName}>({item.name})</Text>}
                            <Text style={styles.unit}>Unit/Address: {item.unitNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{item.role}</Text>
                        </View>
                    </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No neighbors found in this community</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    subTitle: { fontSize: 13, color: '#4c1d95', fontWeight: '600', marginTop: 2 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 16, elevation: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#3b82f6', fontSize: 16, fontWeight: '700' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    realName: { fontSize: 11, color: '#94a3b8', marginTop: -2 },
    unit: { fontSize: 12, color: '#64748b', marginTop: 2 },
    roleBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    roleText: { fontSize: 10, color: '#475569', fontWeight: '700', textTransform: 'uppercase' },
    addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center', shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
});
