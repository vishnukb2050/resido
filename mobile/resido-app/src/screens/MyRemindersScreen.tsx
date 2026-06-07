import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityRemindersApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../utils/mediaUrl';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Renders an image at its natural aspect ratio so the full picture is visible. */
function ReminderImage({ uri }: { uri: string }) {
    const [aspect, setAspect] = useState(16 / 9);
    useEffect(() => {
        if (!uri) return;
        Image.getSize(uri, (w, h) => { if (w && h) setAspect(w / h); }, () => {});
    }, [uri]);
    return (
        <Image
            source={{ uri }}
            style={{ width: '100%', aspectRatio: aspect, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', marginTop: 12 }}
            resizeMode="contain"
        />
    );
}

function describeRecurrence(rem: any) {
    if (rem.recurrence === 'ONCE') {
        return rem.scheduledAt ? `Scheduled for ${new Date(rem.scheduledAt).toLocaleString()}` : 'One-time alert';
    }
    if (rem.recurrence === 'WEEKLY' && typeof rem.recurrenceDetail === 'number') {
        return `Every ${DAYS_OF_WEEK[rem.recurrenceDetail] || ''}`;
    }
    if (rem.recurrence === 'MONTHLY' && typeof rem.recurrenceDetail === 'number') {
        const d = rem.recurrenceDetail;
        const suffix = d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th';
        return `Monthly on the ${d}${suffix}`;
    }
    return rem.recurrence;
}

function targetLabel(rem: any) {
    if (rem.targetType === 'ALL') return 'Whole community';
    if (rem.targetType === 'SPECIFIC_UNITS') return 'Selected units';
    if (rem.targetType === 'STAFF_ROLE') return 'Staff roles';
    if (rem.targetType === 'SPECIFIC_MEMBERS') return 'Specific members';
    return rem.targetType;
}

export default function MyRemindersScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [reminders, setReminders] = useState<any[]>([]);

    const fetchMyReminders = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const { data } = await communityRemindersApi.getMyReminders();
            setReminders(data || []);
        } catch (e) {
            console.error('Failed to load my reminders', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchMyReminders();
        }, [fetchMyReminders]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchMyReminders(true);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle}>Reminders</Text>
                    <Text style={styles.headerSubtitle}>{activeWorkspace?.tenantName || 'Community'}</Text>
                </View>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#fbbf24" style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={reminders}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={({ item }) => <ReminderCard rem={item} />}
                    contentContainerStyle={styles.content}
                    refreshControl={<RefreshControl tintColor="#fbbf24" refreshing={refreshing} onRefresh={onRefresh} />}
                    removeClippedSubviews
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <Ionicons name="notifications-off-outline" size={56} color="rgba(255,255,255,0.08)" />
                            <Text style={styles.emptyTitle}>No reminders for you yet</Text>
                            <Text style={styles.emptyText}>
                                When an admin sends or schedules a reminder that targets you, it will appear here.
                            </Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const ReminderCard = React.memo(function ReminderCard({ rem }: { rem: any }) {
    const photo = rem.imageUrl ? resolveMediaUrl(rem.imageUrl) : null;
    return (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                    <Ionicons name="alarm-outline" size={20} color="#fbbf24" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{rem.title}</Text>
                    <Text style={styles.cardCategory}>{(rem.category || 'GENERAL').replace(/_/g, ' ')}</Text>
                </View>
                <View style={[styles.statusPill, rem.status === 'SENT'
                    ? { backgroundColor: 'rgba(16,185,129,0.15)' }
                    : rem.status === 'PENDING'
                        ? { backgroundColor: 'rgba(245,158,11,0.15)' }
                        : { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                    <Text style={[styles.statusPillText, { color: rem.status === 'SENT' ? '#10b981' : rem.status === 'PENDING' ? '#f59e0b' : '#ef4444' }]}>
                        {rem.status}
                    </Text>
                </View>
            </View>

            <Text style={styles.cardMessage}>{rem.message}</Text>

            {photo ? <ReminderImage uri={photo} /> : null}

            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    <Ionicons name="repeat-outline" size={13} color="#94a3b8" />
                    <Text style={styles.metaText}>{describeRecurrence(rem)}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color="#94a3b8" />
                    <Text style={styles.metaText}>{targetLabel(rem)}</Text>
                </View>
            </View>

            {rem.sentAt ? (
                <View style={styles.metaItem}>
                    <Ionicons name="checkmark-circle-outline" size={13} color="#10b981" />
                    <Text style={[styles.metaText, { color: '#10b981' }]}>
                        Last sent {new Date(rem.sentAt).toLocaleString()}
                    </Text>
                </View>
            ) : null}
        </View>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#2D2445', fontSize: 20, fontWeight: '900' },
    headerSubtitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 2 },

    content: { padding: 16, paddingBottom: 80 },

    card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    iconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(251, 191, 36, 0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)' },
    cardTitle: { color: '#2D2445', fontWeight: '900', fontSize: 15 },
    cardCategory: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPillText: { fontSize: 10, fontWeight: '900' },

    cardMessage: { color: '#cbd5e1', fontSize: 13, lineHeight: 19, fontWeight: '600', marginBottom: 4 },

    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    metaText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyTitle: { color: '#2D2445', fontWeight: '800', fontSize: 16, marginTop: 16 },
    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: '600' },
});
