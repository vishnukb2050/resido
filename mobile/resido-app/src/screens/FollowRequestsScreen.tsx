import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, FlatList, StatusBar, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

export default function FollowRequestsScreen() {
    const router = useRouter();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [acting, setActing] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        try {
            const { data } = await authApi.listFollowRequests();
            setItems(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch follow requests:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

    const handleAccept = async (requestId: string) => {
        if (acting.has(requestId)) return;
        setActing(prev => new Set(prev).add(requestId));
        try {
            await authApi.acceptFollowRequest(requestId);
            setItems(prev => prev.filter(r => r.id !== requestId));
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not accept request.');
        } finally {
            setActing(prev => {
                const next = new Set(prev); next.delete(requestId); return next;
            });
        }
    };

    const handleReject = async (requestId: string) => {
        if (acting.has(requestId)) return;
        setActing(prev => new Set(prev).add(requestId));
        try {
            await authApi.rejectFollowRequest(requestId);
            setItems(prev => prev.filter(r => r.id !== requestId));
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Could not reject request.');
        } finally {
            setActing(prev => {
                const next = new Set(prev); next.delete(requestId); return next;
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.title}>Follow Requests</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.center}><ActivityIndicator color="#8b5cf6" /></View>
            ) : (
                <FlatList
                    data={items}
                    keyExtractor={i => i.id}
                    contentContainerStyle={items.length === 0 ? { flex: 1 } : { padding: 16 }}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#8b5cf6" />
                    }
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={56} color="#9A8EBA" />
                            <Text style={styles.emptyTitle}>No pending requests</Text>
                            <Text style={styles.emptySub}>
                                When someone wants to follow your restricted profile, you'll be able
                                to accept or decline them here.
                            </Text>
                        </View>
                    }
                    renderItem={({ item }) => {
                        const inFlight = acting.has(item.id);
                        const photo = resolveMediaUrl(item.requester?.profilePhoto) ||
                            `https://i.pravatar.cc/150?u=${item.requester?.id}`;
                        return (
                            <View style={styles.card}>
                                <TouchableOpacity
                                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                                    onPress={() => router.push({ pathname: '/user-profile', params: { id: item.requester?.id } })}
                                >
                                    <Image source={{ uri: photo }} style={styles.avatar} />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.name} numberOfLines={1}>
                                            {item.requester?.name || 'User'}
                                        </Text>
                                        {item.requester?.profileName ? (
                                            <Text style={styles.handle}>@{item.requester.profileName}</Text>
                                        ) : null}
                                    </View>
                                </TouchableOpacity>
                                <View style={styles.actions}>
                                    <TouchableOpacity
                                        style={[styles.acceptBtn, inFlight && { opacity: 0.5 }]}
                                        onPress={() => handleAccept(item.id)}
                                        disabled={inFlight}
                                    >
                                        <Ionicons name="checkmark" size={16} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.rejectBtn, inFlight && { opacity: 0.5 }]}
                                        onPress={() => handleReject(item.id)}
                                        disabled={inFlight}
                                    >
                                        <Ionicons name="close" size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#EFE9F8',
    },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '900', color: '#2D2445' },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, gap: 12 },
    emptyTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    emptySub: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', lineHeight: 20 },

    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#fff', borderRadius: 18, padding: 12, marginBottom: 10,
        borderWidth: 1, borderColor: '#EFE9F8',
    },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#E8E2F2' },
    name: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    handle: { fontSize: 12, color: '#7A6B9C', fontWeight: '600', marginTop: 2 },

    actions: { flexDirection: 'row', gap: 8 },
    acceptBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#8b5cf6',
        alignItems: 'center', justifyContent: 'center',
    },
    rejectBtn: {
        width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEE2E2',
        alignItems: 'center', justifyContent: 'center',
    },
});
