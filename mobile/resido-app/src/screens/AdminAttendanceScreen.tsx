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

type TabKey = 'config' | 'reports';
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

const safeRoleLabel = (r?: string | null) =>
    r ? r.replace('_STAFF', '').replace(/_/g, ' ') : 'STAFF';

export default function AdminAttendanceScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const [tab, setTab] = useState<TabKey>('config');

    // Config state
    const [config, setConfig] = useState<any | null>(null);
    const [savingConfig, setSavingConfig] = useState(false);
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [radius, setRadius] = useState('500');
    const [address, setAddress] = useState('');
    const [fetchingGps, setFetchingGps] = useState(false);

    // Reports state
    const [range, setRange] = useState<RangeKey>('today');
    const [customFrom, setCustomFrom] = useState(todayKey());
    const [customTo, setCustomTo] = useState(todayKey());
    const [records, setRecords] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [pickRangeOpen, setPickRangeOpen] = useState(false);

    const dateRange = useMemo(() => {
        if (range === 'today') return { from: todayKey(), to: todayKey() };
        if (range === '7d') return { from: daysAgoKey(6), to: todayKey() };
        if (range === '30d') return { from: daysAgoKey(29), to: todayKey() };
        return { from: customFrom, to: customTo };
    }, [range, customFrom, customTo]);

    const loadConfig = useCallback(async () => {
        try {
            const { data } = await communityApi.getAttendanceConfig();
            if (data) {
                setConfig(data);
                setLatitude(String(data.latitude));
                setLongitude(String(data.longitude));
                setRadius(String(data.radiusMeters));
                setAddress(data.address || '');
            }
        } catch (e) {
            console.warn('Load attendance config failed', e);
        }
    }, []);

    const loadRecords = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoadingRecords(true);
            const { data } = await communityApi.listAttendance({
                from: dateRange.from,
                to: dateRange.to,
            });
            setRecords(data?.records || []);
            setSummary(data?.summary || null);
        } catch (e) {
            console.warn('Load attendance records failed', e);
        } finally {
            setLoadingRecords(false);
            setRefreshing(false);
        }
    }, [dateRange.from, dateRange.to]);

    useFocusEffect(
        useCallback(() => {
            loadConfig();
            loadRecords();
        }, [loadConfig, loadRecords]),
    );

    const fetchGps = async () => {
        try {
            setFetchingGps(true);
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission denied', 'Allow location access to capture GPS.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            setLatitude(String(loc.coords.latitude.toFixed(6)));
            setLongitude(String(loc.coords.longitude.toFixed(6)));
            try {
                const geo = await Location.reverseGeocodeAsync({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                });
                if (geo?.[0]) {
                    const g = geo[0];
                    const parts = [g.name, g.street, g.district, g.city, g.region, g.postalCode]
                        .filter(Boolean)
                        .join(', ');
                    if (parts) setAddress(parts);
                }
            } catch {}
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to read GPS location.');
        } finally {
            setFetchingGps(false);
        }
    };

    const saveConfig = async () => {
        if (!activeWorkspace?.tenantId) {
            Alert.alert(
                'Community required',
                'Open your community workspace from the top switcher, then save attendance settings.',
            );
            return;
        }

        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const r = parseInt(radius, 10);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            Alert.alert('Error', 'Enter valid latitude and longitude (use Capture GPS).');
            return;
        }
        if (!Number.isFinite(r) || r < 50) {
            Alert.alert('Error', 'Radius must be at least 50 meters.');
            return;
        }
        try {
            setSavingConfig(true);
            const { data } = await communityApi.setAttendanceConfig({
                latitude: lat,
                longitude: lng,
                radiusMeters: r,
                address: address || undefined,
            });
            setConfig(data);
            Alert.alert('Saved', 'Attendance location & radius updated.');
        } catch (e: any) {
            const status = e?.response?.status;
            const serverMsg =
                e?.response?.data?.message ||
                (Array.isArray(e?.response?.data?.message)
                    ? e.response.data.message.join(', ')
                    : null) ||
                e?.response?.data?.error;
            const reason = serverMsg || e?.message || 'Failed to save configuration.';
            Alert.alert(
                'Save failed',
                `${reason}${status ? ` (HTTP ${status})` : ''}`,
            );
        } finally {
            setSavingConfig(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadRecords(true);
    };

    const renderRecord = ({ item }: { item: any }) => (
        <View style={[styles.recordCard, { backgroundColor: theme.surface }]}>
            <View style={styles.recordHeader}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                        {(item.member?.name || '?').charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.recordName}>{item.member?.name || 'Unknown'}</Text>
                    <Text style={styles.recordRole}>
                        {safeRoleLabel(item.member?.role)} • {item.member?.phone || ''}
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
                        {item.status === 'PRESENT' ? 'PRESENT' : 'OUT'}
                    </Text>
                </View>
            </View>
            <View style={styles.recordMeta}>
                <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#7A6B9C" />
                    <Text style={styles.metaItemText}>{item.date}</Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#7A6B9C" />
                    <Text style={styles.metaItemText}>
                        {new Date(item.markedAt).toLocaleTimeString()}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="navigate-outline" size={13} color="#7A6B9C" />
                    <Text style={styles.metaItemText}>{item.distanceMeters}m</Text>
                </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#2D2445" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle}>Attendance</Text>
                    <Text style={styles.headerSubtitle}>
                        {activeWorkspace?.tenantName || 'Community'}
                    </Text>
                </View>
            </View>

            <View style={styles.tabRow}>
                <TouchableOpacity
                    style={[styles.tab, tab === 'config' && styles.tabActive]}
                    onPress={() => setTab('config')}
                >
                    <Ionicons name="location-outline" size={16} color={tab === 'config' ? '#fff' : '#7A6B9C'} />
                    <Text style={[styles.tabText, tab === 'config' && styles.tabTextActive]}>
                        Location & Radius
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, tab === 'reports' && styles.tabActive]}
                    onPress={() => setTab('reports')}
                >
                    <Ionicons name="people-outline" size={16} color={tab === 'reports' ? '#fff' : '#7A6B9C'} />
                    <Text style={[styles.tabText, tab === 'reports' && styles.tabTextActive]}>
                        Staff Reports
                    </Text>
                </TouchableOpacity>
            </View>

            {tab === 'config' ? (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={[styles.card, { backgroundColor: theme.surface }]}>
                        <Text style={styles.cardTitle}>Office / Community Location</Text>
                        <Text style={styles.helper}>
                            Staff must mark attendance from within the configured radius (default 500m).
                        </Text>

                        <TouchableOpacity
                            style={styles.gpsBtn}
                            onPress={fetchGps}
                            disabled={fetchingGps}
                        >
                            {fetchingGps ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="navigate" size={18} color="#fff" />
                                    <Text style={styles.gpsBtnText}>Capture current GPS location</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                                <Text style={styles.label}>Latitude</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 10.0150"
                                    placeholderTextColor="#9A8EBA"
                                    value={latitude}
                                    onChangeText={setLatitude}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={{ flex: 1, marginLeft: 8 }}>
                                <Text style={styles.label}>Longitude</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g. 76.3030"
                                    placeholderTextColor="#9A8EBA"
                                    value={longitude}
                                    onChangeText={setLongitude}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        <Text style={styles.label}>Radius (meters)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="500"
                            placeholderTextColor="#9A8EBA"
                            value={radius}
                            onChangeText={setRadius}
                            keyboardType="numeric"
                        />
                        <Text style={styles.helper}>
                            Minimum 50m. Increase if your campus is large; decrease for stricter check-in.
                        </Text>

                        <Text style={styles.label}>Address (optional)</Text>
                        <TextInput
                            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                            placeholder="Auto-filled when you capture GPS"
                            placeholderTextColor="#9A8EBA"
                            value={address}
                            onChangeText={setAddress}
                            multiline
                        />

                        <TouchableOpacity
                            style={[styles.saveBtn, { opacity: savingConfig ? 0.6 : 1 }]}
                            onPress={saveConfig}
                            disabled={savingConfig}
                        >
                            {savingConfig ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveBtnText}>
                                    {config ? 'Update Settings' : 'Save Attendance Settings'}
                                </Text>
                            )}
                        </TouchableOpacity>

                        {config ? (
                            <View style={styles.summaryBox}>
                                <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                                <Text style={styles.summaryText}>
                                    Configured at {config.latitude.toFixed(5)}, {config.longitude.toFixed(5)} with{' '}
                                    {config.radiusMeters}m radius.
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
            ) : (
                <>
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
                                    {k === 'today' ? 'Today' : k === '7d' ? '7 Days' : k === '30d' ? '30 Days' : 'Custom'}
                                </Text>
                            </TouchableOpacity>
                        ))}
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

                    {summary ? (
                        <View style={styles.summaryRow}>
                            <View style={[styles.summaryPill, { backgroundColor: theme.surface }]}>
                                <Text style={styles.summaryPillLabel}>RECORDS</Text>
                                <Text style={styles.summaryPillValue}>{summary.totalRecords}</Text>
                            </View>
                            <View style={[styles.summaryPill, { backgroundColor: theme.surface }]}>
                                <Text style={styles.summaryPillLabel}>STAFF</Text>
                                <Text style={styles.summaryPillValue}>{summary.uniqueStaff}</Text>
                            </View>
                            <View style={[styles.summaryPill, { backgroundColor: theme.surface }]}>
                                <Text style={styles.summaryPillLabel}>RANGE</Text>
                                <Text style={styles.summaryPillValueSmall}>
                                    {dateRange.from === dateRange.to
                                        ? dateRange.from
                                        : `${dateRange.from} → ${dateRange.to}`}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {loadingRecords ? (
                        <ActivityIndicator size="large" color="#8b5cf6" style={{ marginTop: 30 }} />
                    ) : (
                        <FlatList
                            data={records}
                            keyExtractor={(r) => r.id}
                            renderItem={renderRecord}
                            refreshControl={
                                <RefreshControl tintColor="#8b5cf6" refreshing={refreshing} onRefresh={onRefresh} />
                            }
                            contentContainerStyle={styles.listContent}
                            ListEmptyComponent={
                                <View style={styles.empty}>
                                    <Ionicons name="checkmark-done-circle-outline" size={56} color="#D4C9E8" />
                                    <Text style={styles.emptyTitle}>No attendance yet</Text>
                                    <Text style={styles.emptyText}>
                                        Once staff mark attendance for this date range, records will appear here.
                                    </Text>
                                </View>
                            }
                        />
                    )}

                    <Modal visible={pickRangeOpen} transparent animationType="fade">
                        <View style={styles.modalBg}>
                            <View style={styles.modalBox}>
                                <Text style={styles.modalTitle}>Custom date range</Text>
                                <Text style={styles.label}>From (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2026-05-01"
                                    placeholderTextColor="#9A8EBA"
                                    value={customFrom}
                                    onChangeText={setCustomFrom}
                                />
                                <Text style={styles.label}>To (YYYY-MM-DD)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="2026-05-26"
                                    placeholderTextColor="#9A8EBA"
                                    value={customTo}
                                    onChangeText={setCustomTo}
                                />
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { backgroundColor: '#F4EEFC' }]}
                                        onPress={() => setPickRangeOpen(false)}
                                    >
                                        <Text style={styles.modalBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtn, { backgroundColor: '#8b5cf6' }]}
                                        onPress={() => {
                                            setRange('custom');
                                            setPickRangeOpen(false);
                                            setTimeout(loadRecords, 0);
                                        }}
                                    >
                                        <Text style={[styles.modalBtnText, { color: '#fff' }]}>Apply</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </>
            )}

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 12,
    },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#2D2445', fontSize: 20, fontWeight: '900' },
    headerSubtitle: { color: '#7A6B9C', fontSize: 12, fontWeight: '700', marginTop: 2 },

    tabRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
    tab: { flex: 1, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#D4C9E8' },
    tabActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    tabText: { color: '#7A6B9C', fontSize: 12, fontWeight: '800' },
    tabTextActive: { color: '#2D2445' },

    content: { padding: 16, paddingBottom: 140 },
    card: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#D4C9E8', backgroundColor: '#ffffff' },
    cardTitle: { color: '#2D2445', fontWeight: '900', fontSize: 16 },
    helper: { color: '#7A6B9C', fontSize: 12, marginTop: 6, marginBottom: 12, fontWeight: '600' },

    gpsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, marginBottom: 16 },
    gpsBtnText: { color: '#2D2445', fontWeight: '900', fontSize: 13 },

    row: { flexDirection: 'row', marginBottom: 6 },
    label: { color: '#7A6B9C', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginTop: 10, marginBottom: 6, letterSpacing: 0.5 },
    input: { backgroundColor: '#F4EEFC', borderColor: '#D4C9E8', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#2D2445', fontWeight: '700', fontSize: 14 },

    saveBtn: { backgroundColor: '#8b5cf6', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
    saveBtnText: { color: '#2D2445', fontWeight: '900' },

    summaryBox: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16, padding: 12, backgroundColor: 'rgba(16,185,129,0.08)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)' },
    summaryText: { color: '#047857', fontWeight: '700', fontSize: 12, flex: 1 },

    rangeRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
    rangeChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#D4C9E8' },
    rangeChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    rangeChipText: { color: '#7A6B9C', fontWeight: '800', fontSize: 11 },
    rangeChipTextActive: { color: '#2D2445' },

    customRange: { marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    customRangeText: { color: '#2D2445', fontWeight: '700', fontSize: 12 },
    customRangeEdit: { color: '#8b5cf6', fontWeight: '800', fontSize: 12 },

    summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    summaryPill: { flex: 1, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: '#D4C9E8', backgroundColor: '#ffffff' },
    summaryPillLabel: { color: '#7A6B9C', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    summaryPillValue: { color: '#2D2445', fontSize: 20, fontWeight: '900', marginTop: 4 },
    summaryPillValueSmall: { color: '#2D2445', fontSize: 11, fontWeight: '800', marginTop: 4 },

    listContent: { paddingHorizontal: 16, paddingBottom: 140 },
    recordCard: { padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#D4C9E8' },
    recordHeader: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F0EAFB', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D2BEF6' },
    avatarText: { color: '#8b5cf6', fontWeight: '900', fontSize: 13 },
    recordName: { color: '#2D2445', fontWeight: '800', fontSize: 14 },
    recordRole: { color: '#7A6B9C', fontSize: 11, fontWeight: '700', marginTop: 2 },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusPillText: { fontSize: 10, fontWeight: '900' },
    recordMeta: { flexDirection: 'row', gap: 14, marginTop: 10 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaItemText: { color: '#7A6B9C', fontSize: 11, fontWeight: '700' },

    empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
    emptyTitle: { color: '#2D2445', fontWeight: '800', fontSize: 16, marginTop: 16 },
    emptyText: { color: '#7A6B9C', textAlign: 'center', marginTop: 6, fontSize: 12, fontWeight: '600' },

    modalBg: { flex: 1, backgroundColor: 'rgba(45, 36, 69, 0.55)', justifyContent: 'center', padding: 20 },
    modalBox: { backgroundColor: '#ffffff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#D4C9E8' },
    modalTitle: { color: '#2D2445', fontSize: 16, fontWeight: '900', marginBottom: 4 },
    modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
    modalBtnText: { color: '#7A6B9C', fontWeight: '900' },
});
