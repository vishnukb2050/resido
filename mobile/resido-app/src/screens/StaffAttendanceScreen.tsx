import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, FlatList, RefreshControl, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { getThemeColors } from '../utils/theme';
import BottomNav from '../components/BottomNav';

type RangeKey = 'today' | '7d' | '30d' | 'custom';

const todayKey = (d = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};
const daysAgoKey = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return todayKey(d);
};

export default function StaffAttendanceScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const [marking, setMarking] = useState(false);
    const [todayRecord, setTodayRecord] = useState<any | null>(null);
    const [config, setConfig] = useState<any | null>(null);
    const [lastResult, setLastResult] = useState<{ status: string; message: string; distanceMeters?: number; radiusMeters?: number } | null>(null);

    const [range, setRange] = useState<RangeKey>('7d');
    const [customFrom, setCustomFrom] = useState(daysAgoKey(6));
    const [customTo, setCustomTo] = useState(todayKey());
    const [pickRangeOpen, setPickRangeOpen] = useState(false);

    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const dateRange = useMemo(() => {
        if (range === 'today') return { from: todayKey(), to: todayKey() };
        if (range === '7d') return { from: daysAgoKey(6), to: todayKey() };
        if (range === '30d') return { from: daysAgoKey(29), to: todayKey() };
        return { from: customFrom, to: customTo };
    }, [range, customFrom, customTo]);

    const loadOwnAttendance = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const { data } = await communityApi.listOwnAttendance({
                from: dateRange.from,
                to: dateRange.to,
            });
            setRecords(data?.records || []);
            setTodayRecord(data?.todayRecord || null);
            setConfig(data?.config || null);
        } catch (e) {
            console.warn('Load own attendance failed', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateRange.from, dateRange.to]);

    useFocusEffect(
        useCallback(() => {
            loadOwnAttendance();
        }, [loadOwnAttendance]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadOwnAttendance(true);
    };

    const markNow = async () => {
        if (!config) {
            Alert.alert(
                'Not configured',
                'Your community admin has not configured the attendance location yet. Please contact them.',
            );
            return;
        }
        try {
            setMarking(true);
            setLastResult(null);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to mark attendance.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const { data } = await communityApi.markAttendance({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            });
            setLastResult({
                status: data?.status || 'PRESENT',
                message: data?.message,
                distanceMeters: data?.distanceMeters,
                radiusMeters: data?.radiusMeters,
            });
            if (data?.success) {
                Alert.alert('Marked', data.message || 'Attendance marked successfully.');
            } else {
                Alert.alert('Out of range', data?.message || 'You are not in the allowed area.');
            }
            loadOwnAttendance(true);
        } catch (e: any) {
            const msg = e?.response?.data?.message || e?.message || 'Failed to mark attendance.';
            Alert.alert('Error', msg);
        } finally {
            setMarking(false);
        }
    };

    const renderRecord = ({ item }: { item: any }) => (
        <View style={[styles.recordCard, { backgroundColor: theme.surface }]}>
            <View style={styles.recordHeader}>
                <View>
                    <Text style={styles.recordDate}>{item.date}</Text>
                    <Text style={styles.recordTime}>
                        {new Date(item.markedAt).toLocaleTimeString()}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusPill,
                        item.status === 'PRESENT'
                            ? { backgroundColor: 'rgba(16,185,129,0.15)' }
                            : { backgroundColor: 'rgba(239,68,68,0.15)' },
                    ]}
                >
                    <Text
                        style={[
                            styles.statusPillText,
                            { color: item.status === 'PRESENT' ? '#10b981' : '#ef4444' },
                        ]}
                    >
                        {item.status}
                    </Text>
                </View>
            </View>
            <View style={styles.recordMeta}>
                <Ionicons name="navigate-outline" size={13} color="#94a3b8" />
                <Text style={styles.recordMetaText}>{item.distanceMeters}m from point</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle}>My Attendance</Text>
                    <Text style={styles.headerSubtitle}>
                        {user?.name || 'Staff'} • {activeWorkspace?.tenantName || ''}
                    </Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl tintColor="#6366f1" refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                {/* Mark now card */}
                <View style={[styles.markCard, { backgroundColor: theme.surface }]}>
                    <View style={styles.markIconWrap}>
                        <Ionicons name="finger-print" size={28} color="#fff" />
                    </View>
                    <Text style={styles.markTitle}>
                        {todayRecord ? "You're checked in" : 'Mark attendance for today'}
                    </Text>
                    <Text style={styles.markSubtitle}>
                        {config
                            ? `You must be within ${config.radiusMeters}m of the configured location.`
                            : 'Waiting for admin to set the attendance location…'}
                    </Text>

                    {todayRecord ? (
                        <View style={styles.todayBox}>
                            <View style={styles.todayPill}>
                                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                                <Text style={styles.todayPillText}>
                                    Marked at {new Date(todayRecord.markedAt).toLocaleTimeString()}
                                </Text>
                            </View>
                            <Text style={styles.todayMeta}>
                                Distance: {todayRecord.distanceMeters}m
                            </Text>
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={[styles.markBtn, { opacity: marking ? 0.6 : 1 }]}
                        onPress={markNow}
                        disabled={marking}
                    >
                        {marking ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="navigate" size={18} color="#fff" />
                                <Text style={styles.markBtnText}>
                                    {todayRecord ? 'Re-check location' : 'Mark Attendance Now'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    {lastResult ? (
                        <View
                            style={[
                                styles.resultBox,
                                lastResult.status === 'PRESENT'
                                    ? { backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)' }
                                    : { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' },
                            ]}
                        >
                            <Ionicons
                                name={lastResult.status === 'PRESENT' ? 'checkmark-circle' : 'alert-circle'}
                                size={18}
                                color={lastResult.status === 'PRESENT' ? '#10b981' : '#ef4444'}
                            />
                            <Text
                                style={[
                                    styles.resultText,
                                    { color: lastResult.status === 'PRESENT' ? '#10b981' : '#ef4444' },
                                ]}
                            >
                                {lastResult.message}
                            </Text>
                        </View>
                    ) : null}
                </View>

                {/* History */}
                <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>History</Text>
                    <View style={styles.rangeRow}>
                        {(['today', '7d', '30d', 'custom'] as RangeKey[]).map((k) => (
                            <TouchableOpacity
                                key={k}
                                style={[styles.rangeChip, range === k && styles.rangeChipActive]}
                                onPress={() => {
                                    setRange(k);
                                    if (k === 'custom') setPickRangeOpen(true);
                                }}
                            >
                                <Text
                                    style={[styles.rangeChipText, range === k && styles.rangeChipTextActive]}
                                >
                                    {k === 'today' ? 'Today' : k === '7d' ? '7D' : k === '30d' ? '30D' : 'Custom'}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {range === 'custom' ? (
                    <View style={styles.customRange}>
                        <Text style={styles.customRangeText}>
                            {customFrom} → {customTo}
                        </Text>
                        <TouchableOpacity onPress={() => setPickRangeOpen(true)}>
                            <Text style={styles.customRangeEdit}>Edit</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {loading ? (
                    <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 30 }} />
                ) : records.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="calendar-outline" size={50} color="rgba(255,255,255,0.08)" />
                        <Text style={styles.emptyTitle}>No attendance records yet</Text>
                        <Text style={styles.emptyText}>
                            Mark attendance to see your history here.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        data={records}
                        keyExtractor={(r) => r.id}
                        renderItem={renderRecord}
                        scrollEnabled={false}
                        contentContainerStyle={{ paddingBottom: 120 }}
                    />
                )}
            </ScrollView>

            <Modal visible={pickRangeOpen} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <View style={styles.modalBox}>
                        <Text style={styles.modalTitle}>Custom date range</Text>
                        <Text style={styles.label}>From (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-05-01"
                            placeholderTextColor="#64748b"
                            value={customFrom}
                            onChangeText={setCustomFrom}
                        />
                        <Text style={styles.label}>To (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-05-26"
                            placeholderTextColor="#64748b"
                            value={customTo}
                            onChangeText={setCustomTo}
                        />
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.06)' }]}
                                onPress={() => setPickRangeOpen(false)}
                            >
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: '#6366f1' }]}
                                onPress={() => {
                                    setRange('custom');
                                    setPickRangeOpen(false);
                                    setTimeout(() => loadOwnAttendance(), 0);
                                }}
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Apply</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#2D2445', fontSize: 20, fontWeight: '900' },
    headerSubtitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginTop: 2 },

    content: { padding: 16, paddingBottom: 140 },
    markCard: { padding: 20, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    markIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(99,102,241,0.18)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(99,102,241,0.35)' },
    markTitle: { color: '#2D2445', fontSize: 18, fontWeight: '900', marginTop: 14 },
    markSubtitle: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 6, textAlign: 'center' },
    markBtn: { width: '100%', marginTop: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 14 },
    markBtnText: { color: '#2D2445', fontWeight: '900', fontSize: 14 },

    todayBox: { marginTop: 14, alignItems: 'center', gap: 4 },
    todayPill: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.2)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    todayPillText: { color: '#10b981', fontSize: 12, fontWeight: '800' },
    todayMeta: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

    resultBox: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14, padding: 12, borderRadius: 12, borderWidth: 1, width: '100%' },
    resultText: { fontWeight: '800', fontSize: 12, flex: 1 },

    historyHeader: { marginTop: 28, marginBottom: 12 },
    historyTitle: { color: '#2D2445', fontWeight: '900', fontSize: 16, marginBottom: 10 },
    rangeRow: { flexDirection: 'row', gap: 8 },
    rangeChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)' },
    rangeChipActive: { backgroundColor: '#6366f1' },
    rangeChipText: { color: '#94a3b8', fontWeight: '800', fontSize: 11 },
    rangeChipTextActive: { color: '#2D2445' },

    customRange: { marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 12 },
    customRangeText: { color: '#2D2445', fontWeight: '700', fontSize: 12 },
    customRangeEdit: { color: '#6366f1', fontWeight: '800', fontSize: 12 },

    recordCard: { padding: 14, borderRadius: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    recordHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    recordDate: { color: '#2D2445', fontWeight: '800', fontSize: 13 },
    recordTime: { color: '#94a3b8', fontWeight: '600', fontSize: 11, marginTop: 2 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPillText: { fontSize: 10, fontWeight: '900' },
    recordMeta: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 10 },
    recordMetaText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

    empty: { alignItems: 'center', marginTop: 50, paddingHorizontal: 30 },
    emptyTitle: { color: '#2D2445', fontWeight: '800', fontSize: 14, marginTop: 14 },
    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: '600' },

    label: { color: '#94a3b8', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
    input: { backgroundColor: '#ffffff', borderColor: '#D4C9E8', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#2D2445', fontWeight: '600', fontSize: 14 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
    modalBox: { backgroundColor: '#0f172a', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    modalTitle: { color: '#2D2445', fontSize: 16, fontWeight: '900', marginBottom: 4 },
    modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
    modalBtnText: { color: '#94a3b8', fontWeight: '900' },
});
