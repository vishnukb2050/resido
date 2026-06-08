import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { residentApi } from '../services/api';
import AppImage from '../components/AppImage';

export default function MemberListScreen() {
    const router = useRouter();
    const { role } = useLocalSearchParams();
    const { activeWorkspace } = useAuthStore();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMembers();
    }, [role]);

    const fetchMembers = async () => {
        try {
            const res = await residentApi.getMembers({ role });
            setMembers(res.data);
        } catch (e) {
            console.error('Fetch members failed', e);
        } finally {
            setLoading(false);
        }
    };

    const getAddRoute = () => {
        if (role === 'STAFF_GROUP') return '/add-staff';
        if (role === 'RESIDENT') return '/add-resident';
        if (role === 'ADMIN_STAFF') return '/add-admin-staff';
        return '/add-member';
    };

    const getTitle = () => {
        if (role === 'STAFF_GROUP') return 'Community Staff';
        if (role === 'RESIDENT') return 'Residents';
        return 'General Members';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{getTitle()}</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push(getAddRoute())}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={members}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={9}
                    removeClippedSubviews={true}
                    renderItem={({ item }) => (
                        <View style={styles.memberCard}>
                            <AppImage 
                                uri={item.profilePhoto || 'https://i.pravatar.cc/150?u=' + item.id} 
                                style={styles.memberImg} 
                            />
                            <View style={styles.memberInfo}>
                                <Text style={styles.memberName}>{item.name}</Text>
                                <Text style={styles.memberRole}>{item.role}</Text>
                                <Text style={styles.memberPhone}>{item.phone}</Text>
                                {item.family?.unit && (
                                    <View style={styles.unitBadge}>
                                        <Text style={styles.unitText}>{item.family.unit.number}</Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity style={styles.moreBtn}>
                                <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="people-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No {getTitle()} Yet</Text>
                            <Text style={styles.emptySub}>Click the + button to add your first entry.</Text>
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
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    memberImg: { width: 56, height: 56, borderRadius: 20 },
    memberInfo: { flex: 1, marginLeft: 15 },
    memberName: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    memberRole: { fontSize: 11, color: '#8b5cf6', fontWeight: '900', textTransform: 'uppercase', marginTop: 2 },
    memberPhone: { fontSize: 13, color: '#7A6B9C', marginTop: 4, fontWeight: '600' },
    unitBadge: { position: 'absolute', right: 0, top: 0, backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    unitText: { color: '#10b981', fontSize: 10, fontWeight: '900' },
    moreBtn: { padding: 8 },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', marginTop: 10 },
});
