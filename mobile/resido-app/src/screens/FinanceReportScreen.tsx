import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, Dimensions, ActivityIndicator, Linking, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

type PeriodValue = 'DAY' | 'MONTH' | 'CUSTOM' | 'ALL';
const PERIODS: { label: string; value: PeriodValue }[] = [
    { label: 'Day', value: 'DAY' },
    { label: 'Month', value: 'MONTH' },
    { label: 'Custom', value: 'CUSTOM' },
    { label: 'All', value: 'ALL' },
];

const todayIso = () => new Date().toISOString().split('T')[0];
const startOfMonthIso = (d: Date = new Date()) =>
    new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];

const monthLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};
const dayLabel = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};
const shortDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
};

type TxRowProps = {
    tx: any;
    onEdit: (tx: any) => void;
    onDelete: (tx: any) => void;
};

const TxRow = React.memo(function TxRow({ tx, onEdit, onDelete }: TxRowProps) {
    return (
        <TouchableOpacity
            style={styles.txCard}
            activeOpacity={0.85}
            onPress={() => onEdit(tx)}
            onLongPress={() => onDelete(tx)}
        >
            <View style={[styles.txIconBox, { backgroundColor: tx._kind === 'INCOME' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.10)' }]}>
                <FontAwesome5
                    name={tx._kind === 'INCOME' ? 'wallet' : 'shopping-bag'}
                    size={16}
                    color={tx._kind === 'INCOME' ? '#10b981' : '#ef4444'}
                />
            </View>
            <View style={styles.txInfo}>
                <Text style={styles.txTitle} numberOfLines={1}>{tx.source || tx.category}</Text>
                <View style={styles.txSubRow}>
                    <Text style={styles.txSubText}>{new Date(tx.date).toLocaleDateString()}</Text>
                    {tx.paymentMethod ? (
                        <>
                            <View style={styles.smallDot} />
                            <Text style={styles.txSubText}>{tx.paymentMethod}</Text>
                        </>
                    ) : null}
                </View>
                {tx.description ? <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text> : null}
            </View>
            <View style={styles.txRight}>
                <Text style={[styles.txAmount, { color: tx._kind === 'INCOME' ? '#10b981' : '#ef4444' }]}>
                    {tx._kind === 'INCOME' ? '+' : '-'} ₹ {Number(tx.amount).toLocaleString()}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                    {(tx.billUrl || tx.receiptUrl) ? (
                        <TouchableOpacity
                            onPress={() => Linking.openURL(tx.billUrl || tx.receiptUrl)}
                            style={styles.miniBtn}
                        >
                            <Ionicons name="receipt-outline" size={12} color="#8b5cf6" />
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={() => onEdit(tx)} style={styles.miniBtn}>
                        <Ionicons name="create-outline" size={12} color="#8b5cf6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onDelete(tx)} style={styles.miniBtn}>
                        <Ionicons name="trash-outline" size={12} color="#ef4444" />
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
});

export default function FinanceReportScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState<PeriodValue>('MONTH');
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Period-specific anchor dates
    const [dayDate, setDayDate] = useState<string>(todayIso());
    const [monthDate, setMonthDate] = useState<string>(startOfMonthIso());
    const [customStart, setCustomStart] = useState<string>(startOfMonthIso());
    const [customEnd, setCustomEnd] = useState<string>(todayIso());

    // Picker modals
    const [showDayPicker, setShowDayPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    const [showCustomStart, setShowCustomStart] = useState(false);
    const [showCustomEnd, setShowCustomEnd] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const params: any = { period };
            if (period === 'DAY') params.startDate = dayDate;
            if (period === 'MONTH') params.startDate = monthDate;
            if (period === 'CUSTOM') {
                params.startDate = customStart;
                params.endDate = customEnd;
            }
            const { data } = await mySpaceApi.getFinanceReport(params);
            setReport(data);
        } catch (error) {
            console.error('Failed to load finance report', error);
        } finally {
            setLoading(false);
        }
    }, [period, dayDate, monthDate, customStart, customEnd]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const summary = report?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
    // Tag rows so we can route to the right edit screen.
    const incomes = (report?.incomes || []).map((i: any) => ({ ...i, _kind: 'INCOME' as const }));
    const expenses = (report?.expenses || []).map((e: any) => ({ ...e, _kind: 'EXPENSE' as const }));
    const allTransactions: any[] = [...incomes, ...expenses].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    const periodLabel = (() => {
        if (period === 'DAY') return dayLabel(dayDate);
        if (period === 'MONTH') return monthLabel(monthDate);
        if (period === 'CUSTOM') return `${shortDate(customStart)} – ${shortDate(customEnd)}`;
        return 'All time';
    })();

    const openEdit = useCallback((tx: any) => {
        const payload = encodeURIComponent(JSON.stringify(tx));
        if (tx._kind === 'INCOME') {
            router.push({ pathname: '/add-income', params: { id: tx.id, data: payload } });
        } else {
            router.push({ pathname: '/add-expense', params: { id: tx.id, data: payload } });
        }
    }, [router]);

    const handleDelete = useCallback((tx: any) => {
        Alert.alert(
            'Delete entry?',
            'This entry will be removed permanently.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (tx._kind === 'INCOME') await mySpaceApi.deleteIncome(tx.id);
                            else await mySpaceApi.deleteExpense(tx.id);
                            loadData();
                        } catch (e: any) {
                            Alert.alert('Could not delete', e?.response?.data?.message || 'Please try again.');
                        }
                    },
                },
            ],
        );
    }, [loadData]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Financial Report</Text>
                <TouchableOpacity style={styles.backBtn} onPress={loadData}>
                    <Ionicons name="refresh" size={20} color="#2D2445" />
                </TouchableOpacity>
            </View>

            {/* Period Selector */}
            <View style={styles.periodContainer}>
                {PERIODS.map((p) => (
                    <TouchableOpacity
                        key={p.value}
                        style={[styles.periodTab, period === p.value && styles.activePeriodTab]}
                        onPress={() => setPeriod(p.value)}
                    >
                        <Text style={[styles.periodText, period === p.value && styles.activePeriodText]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Anchor row */}
            <View style={styles.anchorRow}>
                {period === 'DAY' && (
                    <TouchableOpacity style={styles.anchorChip} onPress={() => setShowDayPicker(true)}>
                        <Ionicons name="calendar-outline" size={16} color="#8b5cf6" />
                        <Text style={styles.anchorChipText}>{dayLabel(dayDate)}</Text>
                        <Ionicons name="chevron-down" size={14} color="#7A6B9C" />
                    </TouchableOpacity>
                )}
                {period === 'MONTH' && (
                    <TouchableOpacity style={styles.anchorChip} onPress={() => setShowMonthPicker(true)}>
                        <Ionicons name="calendar-outline" size={16} color="#8b5cf6" />
                        <Text style={styles.anchorChipText}>{monthLabel(monthDate)}</Text>
                        <Ionicons name="chevron-down" size={14} color="#7A6B9C" />
                    </TouchableOpacity>
                )}
                {period === 'CUSTOM' && (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                        <TouchableOpacity style={styles.anchorChip} onPress={() => setShowCustomStart(true)}>
                            <Text style={styles.anchorMini}>From</Text>
                            <Text style={styles.anchorChipText}>{shortDate(customStart)}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.anchorChip} onPress={() => setShowCustomEnd(true)}>
                            <Text style={styles.anchorMini}>To</Text>
                            <Text style={styles.anchorChipText}>{shortDate(customEnd)}</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {period === 'ALL' && (
                    <View style={styles.anchorChip}>
                        <Ionicons name="infinite-outline" size={16} color="#8b5cf6" />
                        <Text style={styles.anchorChipText}>All time</Text>
                    </View>
                )}
            </View>

            <FlatList
                data={loading ? [] : allTransactions}
                keyExtractor={(tx: any) => `${tx._kind}-${tx.id}`}
                renderItem={({ item }) => (
                    <TxRow tx={item} onEdit={openEdit} onDelete={handleDelete} />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListHeaderComponent={
                    loading ? (
                        <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
                    ) : (
                        <>
                            {/* Summary */}
                            <View style={styles.summaryGrid}>
                                <View style={styles.mainSummaryCard}>
                                    <Text style={styles.summaryLabel}>Net Balance · {periodLabel}</Text>
                                    <Text style={[styles.summaryValue, { color: summary.balance < 0 ? '#ef4444' : '#2D2445' }]}>
                                        ₹ {Number(summary.balance).toLocaleString()}
                                    </Text>
                                    <View style={styles.summaryRow}>
                                        <View style={styles.summaryItem}>
                                            <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                                            <Text style={styles.summarySubLabel}>Income</Text>
                                            <Text style={styles.summarySubValue}>₹ {Number(summary.totalIncome).toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.divider} />
                                        <View style={styles.summaryItem}>
                                            <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                                            <Text style={styles.summarySubLabel}>Expenses</Text>
                                            <Text style={styles.summarySubValue}>₹ {Number(summary.totalExpense).toLocaleString()}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>

                            {/* Transactions */}
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Transactions</Text>
                                <Text style={styles.sectionCount}>{allTransactions.length}</Text>
                            </View>
                        </>
                    )
                }
                ListEmptyComponent={
                    loading ? null : (
                        <View style={styles.emptyContainer}>
                            <FontAwesome5 name="receipt" size={36} color="#D4C9E8" />
                            <Text style={styles.emptyText}>No transactions for this period</Text>
                        </View>
                    )
                }
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
            />

            {/* DAY picker */}
            <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ModalHeader title="Pick a day" onClose={() => setShowDayPicker(false)} />
                        <Calendar
                            current={dayDate}
                            maxDate={todayIso()}
                            onDayPress={(d: any) => { setDayDate(d.dateString); setShowDayPicker(false); }}
                            markedDates={{ [dayDate]: { selected: true, selectedColor: '#8b5cf6' } }}
                            theme={calendarTheme}
                        />
                    </View>
                </View>
            </Modal>

            {/* MONTH picker — use calendar in month mode (tap any day in the month) */}
            <Modal visible={showMonthPicker} transparent animationType="fade" onRequestClose={() => setShowMonthPicker(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ModalHeader title="Pick a month" onClose={() => setShowMonthPicker(false)} />
                        <Calendar
                            current={monthDate}
                            maxDate={todayIso()}
                            onMonthChange={(m: any) => {
                                // Anchor on the first day of whichever month the user navigates to.
                                const iso = new Date(m.year, m.month - 1, 1).toISOString().split('T')[0];
                                setMonthDate(iso);
                            }}
                            onDayPress={(d: any) => {
                                const iso = new Date(new Date(d.dateString).getFullYear(), new Date(d.dateString).getMonth(), 1)
                                    .toISOString().split('T')[0];
                                setMonthDate(iso);
                                setShowMonthPicker(false);
                            }}
                            markedDates={{ [monthDate]: { selected: true, selectedColor: '#8b5cf6' } }}
                            theme={calendarTheme}
                        />
                        <Text style={styles.modalHint}>Tip: navigate months with the arrows; tap any day to confirm.</Text>
                    </View>
                </View>
            </Modal>

            {/* CUSTOM start */}
            <Modal visible={showCustomStart} transparent animationType="fade" onRequestClose={() => setShowCustomStart(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ModalHeader title="From date" onClose={() => setShowCustomStart(false)} />
                        <Calendar
                            current={customStart}
                            maxDate={customEnd || todayIso()}
                            onDayPress={(d: any) => { setCustomStart(d.dateString); setShowCustomStart(false); }}
                            markedDates={{ [customStart]: { selected: true, selectedColor: '#8b5cf6' } }}
                            theme={calendarTheme}
                        />
                    </View>
                </View>
            </Modal>

            {/* CUSTOM end */}
            <Modal visible={showCustomEnd} transparent animationType="fade" onRequestClose={() => setShowCustomEnd(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <ModalHeader title="To date" onClose={() => setShowCustomEnd(false)} />
                        <Calendar
                            current={customEnd}
                            minDate={customStart}
                            maxDate={todayIso()}
                            onDayPress={(d: any) => { setCustomEnd(d.dateString); setShowCustomEnd(false); }}
                            markedDates={{ [customEnd]: { selected: true, selectedColor: '#8b5cf6' } }}
                            theme={calendarTheme}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const ModalHeader = ({ title, onClose }: { title: string; onClose: () => void }) => (
    <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>{title}</Text>
        <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={22} color="#2D2445" />
        </TouchableOpacity>
    </View>
);

const calendarTheme = {
    backgroundColor: '#FFFFFF',
    calendarBackground: '#FFFFFF',
    textSectionTitleColor: '#7A6B9C',
    selectedDayBackgroundColor: '#8b5cf6',
    selectedDayTextColor: '#FFFFFF',
    todayTextColor: '#8b5cf6',
    dayTextColor: '#2D2445',
    textDisabledColor: 'rgba(45, 36, 69, 0.35)',
    monthTextColor: '#2D2445',
    arrowColor: '#8b5cf6',
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },

    periodContainer: { flexDirection: 'row', backgroundColor: '#F4EEFC', marginHorizontal: 20, borderRadius: 14, padding: 4, marginBottom: 10 },
    periodTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activePeriodTab: { backgroundColor: '#8b5cf6' },
    periodText: { fontSize: 12, fontWeight: '700', color: '#9A8EBA' },
    activePeriodText: { color: '#FFFFFF' },

    anchorRow: { paddingHorizontal: 20, marginBottom: 12, flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    anchorChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
    anchorChipText: { fontSize: 13, fontWeight: '800', color: '#2D2445' },
    anchorMini: { fontSize: 10, fontWeight: '800', color: '#9A8EBA', textTransform: 'uppercase', letterSpacing: 0.5 },

    summaryGrid: { paddingHorizontal: 20 },
    mainSummaryCard: { backgroundColor: '#ffffff', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center' },
    summaryLabel: { fontSize: 12, color: '#7A6B9C', fontWeight: '700' },
    summaryValue: { fontSize: 28, fontWeight: '900', marginTop: 6, marginBottom: 18 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F8F5FF', padding: 14, borderRadius: 18 },
    summaryItem: { flex: 1, alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
    summarySubLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '700', textTransform: 'uppercase' },
    summarySubValue: { fontSize: 15, fontWeight: '800', color: '#2D2445', marginTop: 4 },
    divider: { width: 1, height: 30, backgroundColor: '#D4C9E8', marginHorizontal: 10 },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 24, paddingHorizontal: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    sectionCount: { fontSize: 12, fontWeight: '800', color: '#7A6B9C' },

    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 18, marginBottom: 10, marginHorizontal: 20, borderWidth: 1, borderColor: '#D4C9E8' },
    txIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1, marginLeft: 12 },
    txTitle: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    txSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    txSubText: { fontSize: 11, color: '#7A6B9C', fontWeight: '600' },
    smallDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#9A8EBA', marginHorizontal: 6 },
    txDesc: { fontSize: 11, color: '#5B4B8A', marginTop: 3 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 14, fontWeight: '900' },
    miniBtn: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 30, marginHorizontal: 20, gap: 12 },
    emptyText: { fontSize: 13, color: '#7A6B9C', fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(45,36,69,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#E2D9F2' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    modalHint: { fontSize: 11, color: '#7A6B9C', textAlign: 'center', paddingHorizontal: 10, paddingBottom: 8, paddingTop: 4 },
});
