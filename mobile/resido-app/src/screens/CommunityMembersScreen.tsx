import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function CommunityMembersScreen() {
    const { activeWorkspace } = useAuthStore();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        communityApi.getMembers().then(r => setMembers(r.data)).finally(() => setLoading(false));
    }, [activeWorkspace]);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Neighbors</Text>
                <Text style={styles.subTitle}>{activeWorkspace?.tenantName}</Text>
            </View>
            <FlatList
                data={members}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, gap: 12 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name?.[0]}</Text>
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>{item.name}</Text>
                            <Text style={styles.unit}>Unit: {item.unitNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{item.role}</Text>
                        </View>
                    </View>
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
    subTitle: { fontSize: 13, color: '#6366f1', fontWeight: '600', marginTop: 2 },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 16, elevation: 1 },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#3b82f6', fontSize: 16, fontWeight: '700' },
    info: { flex: 1, marginLeft: 12 },
    name: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    unit: { fontSize: 12, color: '#64748b', marginTop: 2 },
    roleBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    roleText: { fontSize: 10, color: '#475569', fontWeight: '700', textTransform: 'uppercase' },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },
});
