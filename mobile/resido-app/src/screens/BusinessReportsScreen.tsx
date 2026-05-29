import React, { useCallback, useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
    ActivityIndicator, StatusBar, Alert, RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { businessApi } from '../services/api';

// ---------- helpers ---------------------------------------------------------

const toYMD = (d: Date) => d.toISOString().split('T')[0];

const formatDisplayDate = (ymd: string) => {
    if (!ymd) return '—';
    const d = new Date(ymd);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const formatShortDate = (ymd: string) => {
    if (!ymd) return '—';
    const d = new Date(ymd);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ---------- preset range chips ---------------------------------------------

type PresetKey = 'today' | '7' | '30' | '90' | 'custom';

const presetRange = (key: PresetKey): { from: string; to: string } | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const to = toYMD(today);
    if (key === 'today') return { from: to, to };
    if (key === '7') {
        const d = new Date(today); d.setDate(today.getDate() - 6);
        return { from: toYMD(d), to };
    }
    if (key === '30') {
        const d = new Date(today); d.setDate(today.getDate() - 29);
        return { from: toYMD(d), to };
    }
    if (key === '90') {
        const d = new Date(today); d.setDate(today.getDate() - 89);
        return { from: toYMD(d), to };
    }
    return null;
};

// ---------- screen ----------------------------------------------------------

export default function BusinessReportsScreen() {
    const router = useRouter();
    const { profileId } = useLocalSearchParams<{ profileId?: string }>();

    const [report, setReport] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activePreset, setActivePreset] = useState<PresetKey>('30');

    const initial = presetRange('30')!;
    const [from, setFrom] = useState<string>(initial.from);
    const [to, setTo] = useState<string>(initial.to);

    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);

    const fetchReport = useCallback(async () => {
        if (!profileId) return;
        try {
            const { data } = await businessApi.getBookingReport(profileId as string, { from, to });
            setReport(data);
        } catch (err: any) {
            console.error('Failed to load report:', err);
            Alert.alert('Error', err?.response?.data?.message || 'Could not load report.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [profileId, from, to]);

    useEffect(() => { fetchReport(); }, [fetchReport]);

    const applyPreset = (key: PresetKey) => {
        setActivePreset(key);
        const range = presetRange(key);
        if (range) {
            setFrom(range.from);
            setTo(range.to);
        }
    };

    const onPickFrom = (_: any, picked?: Date) => {
        setShowFromPicker(false);
        if (!picked) return;
        const dateStr = toYMD(picked);
        if (dateStr > to) {
            Alert.alert('Invalid date', '"From" date cannot be after the "To" date.');
            return;
        }
        setActivePreset('custom');
        setFrom(dateStr);
    };

    const onPickTo = (_: any, picked?: Date) => {
        setShowToPicker(false);
        if (!picked) return;
        const dateStr = toYMD(picked);
        if (dateStr < from) {
            Alert.alert('Invalid date', '"To" date cannot be before the "From" date.');
            return;
        }
        setActivePreset('custom');
        setTo(dateStr);
    };

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    const summary = report?.summary || { totalBookings: 0, confirmedBookings: 0, cancelledBookings: 0, totalGuests: 0 };
    const byDate = Array.isArray(report?.byDate) ? report.byDate : [];
    const bookings = Array.isArray(report?.bookings) ? report.bookings : [];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
                    <Ionicons name="arrow-back" size={22} color="#2D2445" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>Booking Reports</Text>
                    {report?.profile?.businessName ? (
                        <Text style={styles.subtitle} numberOfLines={1}>{report.profile.businessName}</Text>
                    ) : null}
                </View>
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} tintColor="#8b5cf6" />}
            >
                {/* Preset chips */}
                <View style={styles.presetRow}>
                    {([
                        { key: 'today', label: 'Today' },
                        { key: '7', label: 'Last 7 days' },
                        { key: '30', label: 'Last 30 days' },
                        { key: '90', label: 'Last 90 days' },
                        { key: 'custom', label: 'Custom' },
                    ] as { key: PresetKey; label: string }[]).map(p => (
                        <TouchableOpacity
                            key={p.key}
                            style={[styles.presetChip, activePreset === p.key && styles.presetChipActive]}
                            onPress={() => applyPreset(p.key)}
                        >
                            <Text style={[styles.presetText, activePreset === p.key && styles.presetTextActive]}>{p.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Date range picker */}
                <View style={styles.rangeCard}>
                    <TouchableOpacity style={styles.rangeBox} onPress={() => setShowFromPicker(true)}>
                        <Text style={styles.rangeLabel}>From</Text>
                        <Text style={styles.rangeValue}>{formatDisplayDate(from)}</Text>
                    </TouchableOpacity>
                    <Ionicons name="arrow-forward" size={18} color="#8b5cf6" />
                    <TouchableOpacity style={styles.rangeBox} onPress={() => setShowToPicker(true)}>
                        <Text style={styles.rangeLabel}>To</Text>
                        <Text style={styles.rangeValue}>{formatDisplayDate(to)}</Text>
                    </TouchableOpacity>
                </View>

                {showFromPicker && (
                    <DateTimePicker
                        value={new Date(from)}
                        mode="date"
                        display="calendar"
                        maximumDate={new Date(to)}
                        onChange={onPickFrom}
                    />
                )}
                {showToPicker && (
                    <DateTimePicker
                        value={new Date(to)}
                        mode="date"
                        display="calendar"
                        minimumDate={new Date(from)}
                        maximumDate={new Date()}
                        onChange={onPickTo}
                    />
                )}

                {/* Summary tiles */}
                <View style={styles.summaryGrid}>
                    <SummaryTile color="#8b5cf6" icon="calendar" label="Total" value={summary.totalBookings} />
                    <SummaryTile color="#10b981" icon="checkmark-circle" label="Confirmed" value={summary.confirmedBookings} />
                    <SummaryTile color="#ef4444" icon="close-circle" label="Cancelled" value={summary.cancelledBookings} />
                    <SummaryTile color="#f59e0b" icon="people" label="Guests" value={summary.totalGuests} />
                </View>

                {/* Per-day breakdown */}
                <Text style={styles.sectionTitle}>Daily breakdown</Text>
                {byDate.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="document-text-outline" size={36} color="#9A8EBA" />
                        <Text style={styles.emptyText}>No bookings in this date range.</Text>
                    </View>
                ) : (
                    byDate.map((day: any) => (
                        <View key={day.date} style={styles.dayCard}>
                            <View style={styles.dayHeader}>
                                <View>
                                    <Text style={styles.dayDate}>{formatDisplayDate(day.date)}</Text>
                                    <Text style={styles.daySub}>
                                        {day.confirmed} confirmed
                                        {day.cancelled ? ` · ${day.cancelled} cancelled` : ''}
                                    </Text>
                                </View>
                                <View style={styles.dayCountPill}>
                                    <Text style={styles.dayCountText}>{day.persons}</Text>
                                </View>
                            </View>
                        </View>
                    ))
                )}

                {/* Booking-level detail */}
                <Text style={[styles.sectionTitle, { marginTop: 18 }]}>Bookings ({bookings.length})</Text>
                {bookings.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <Ionicons name="ticket-outline" size={36} color="#9A8EBA" />
                        <Text style={styles.emptyText}>No booking records for this window.</Text>
                    </View>
                ) : (
                    bookings.map((b: any) => {
                        const isCancelled = b.status === 'CANCELLED';
                        const tokenStr = b.tokenNumber ? String(b.tokenNumber).padStart(4, '0') : '—';
                        return (
                            <View key={b.id} style={[styles.bookingCard, isCancelled && { opacity: 0.55 }]}>
                                <View style={styles.bookingTokenBox}>
                                    <Text style={styles.bookingTokenLabel}>TOKEN</Text>
                                    <Text style={styles.bookingTokenValue}>{tokenStr}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.bookingName} numberOfLines={1}>
                                        {b.userName || 'Customer'}
                                    </Text>
                                    <Text style={styles.bookingMeta} numberOfLines={1}>
                                        {b.userPhone || 'No phone'} · {b.persons || 1} guest{(b.persons || 1) === 1 ? '' : 's'}
                                    </Text>
                                    <Text style={styles.bookingMeta} numberOfLines={1}>
                                        {formatShortDate(b.bookingDate)} · {b.timeSlot}
                                        {b.slot?.name ? ` · ${b.slot.name}` : ''}
                                    </Text>
                                </View>
                                <View style={[
                                    styles.bookingStatusBadge,
                                    { backgroundColor: isCancelled ? '#FEE2E2' : '#DCFCE7' },
                                ]}>
                                    <Text style={[
                                        styles.bookingStatusText,
                                        { color: isCancelled ? '#dc2626' : '#16a34a' },
                                    ]}>
                                        {b.status}
                                    </Text>
                                </View>
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

function SummaryTile({ color, icon, label, value }: any) {
    return (
        <View style={[styles.summaryTile, { borderColor: `${color}33` }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.summaryValue}>{value}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
        borderBottomWidth: 1, borderBottomColor: '#EFE9F8',
    },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    title: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    subtitle: { fontSize: 12, color: '#7A6B9C', fontWeight: '700', marginTop: 2 },

    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    presetChip: {
        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18,
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4C9E8',
    },
    presetChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    presetText: { fontSize: 12, color: '#7A6B9C', fontWeight: '800' },
    presetTextActive: { color: '#fff' },

    rangeCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        gap: 8, backgroundColor: '#fff', borderRadius: 18, padding: 14,
        borderWidth: 1, borderColor: '#D4C9E8', marginBottom: 18,
    },
    rangeBox: { flex: 1 },
    rangeLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3 },
    rangeValue: { fontSize: 14, color: '#2D2445', fontWeight: '800', marginTop: 2 },

    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 18 },
    summaryTile: {
        width: '48%', backgroundColor: '#fff', borderRadius: 16, padding: 14,
        marginBottom: 10, borderWidth: 1,
    },
    summaryIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
    summaryValue: { fontSize: 22, fontWeight: '900', color: '#2D2445' },
    summaryLabel: { fontSize: 11, color: '#7A6B9C', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

    sectionTitle: { fontSize: 14, fontWeight: '900', color: '#2D2445', marginBottom: 10 },

    emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#EFE9F8', gap: 8 },
    emptyText: { color: '#7A6B9C', fontSize: 13 },

    dayCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#EFE9F8' },
    dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    dayDate: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    daySub: { fontSize: 11, color: '#7A6B9C', fontWeight: '600', marginTop: 2 },
    dayCountPill: { backgroundColor: '#F4EEFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    dayCountText: { color: '#8b5cf6', fontSize: 13, fontWeight: '900' },

    bookingCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#fff', borderRadius: 14, padding: 12,
        marginBottom: 8, borderWidth: 1, borderColor: '#EFE9F8',
    },
    bookingTokenBox: {
        width: 56, height: 56, borderRadius: 12,
        backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center',
    },
    bookingTokenLabel: { fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: '900', letterSpacing: 0.5 },
    bookingTokenValue: { fontSize: 14, color: '#fff', fontWeight: '900' },
    bookingName: { fontSize: 14, color: '#2D2445', fontWeight: '800' },
    bookingMeta: { fontSize: 11, color: '#7A6B9C', fontWeight: '600', marginTop: 2 },
    bookingStatusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
    bookingStatusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.3 },
});
