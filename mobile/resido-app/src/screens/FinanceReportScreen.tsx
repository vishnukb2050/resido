import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
    Image, Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

const PERIODS = [
    { label: 'Week', value: 'WEEK' },
    { label: 'Month', value: 'MONTH' },
    { label: 'Year', value: 'YEAR' },
    { label: 'Custom', value: 'CUSTOM' }
];

export default function FinanceReportScreen() {
    const router = useRouter();
    const [period, setPeriod] = useState('MONTH');
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [period])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const { data } = await mySpaceApi.getFinanceReport({ period });
            setReport(data);
        } catch (error) {
            console.error('Failed to load finance report', error);
        } finally {
            setLoading(false);
        }
    };

    const summary = report?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
    const allTransactions = [...(report?.incomes || []), ...(report?.expenses || [])]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Financial Report</Text>
                <TouchableOpacity style={styles.backBtn} onPress={loadData}>
                    <Ionicons name="refresh" size={22} color="#fff" />
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

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator color="#1d4ed8" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Summary Cards */}
                        <View style={styles.summaryGrid}>
                            <View style={styles.mainSummaryCard}>
                                <Text style={styles.summaryLabel}>Total Balance</Text>
                                <Text style={styles.summaryValue}>₹ {summary.balance.toLocaleString()}</Text>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                                        <Text style={styles.summarySubLabel}>Income</Text>
                                        <Text style={styles.summarySubValue}>₹ {summary.totalIncome.toLocaleString()}</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.summaryItem}>
                                        <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                                        <Text style={styles.summarySubLabel}>Expenses</Text>
                                        <Text style={styles.summarySubValue}>₹ {summary.totalExpense.toLocaleString()}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Transactions List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Transaction History</Text>
                            
                            {allTransactions.length === 0 ? (
                                <View style={styles.emptyContainer}>
                                    <FontAwesome5 name="receipt" size={40} color="rgba(255,255,255,0.05)" />
                                    <Text style={styles.emptyText}>No transactions for this period</Text>
                                </View>
                            ) : (
                                allTransactions.map((tx: any) => (
                                    <View key={tx.id} style={styles.txCard}>
                                        <View style={[styles.txIconBox, { backgroundColor: tx.source ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                                            <FontAwesome5 
                                                name={tx.source ? 'wallet' : (tx.category === 'Food' ? 'utensils' : 'shopping-bag')} 
                                                size={18} 
                                                color={tx.source ? '#10b981' : '#ef4444'} 
                                            />
                                        </View>
                                        <View style={styles.txInfo}>
                                            <Text style={styles.txTitle}>{tx.source || tx.category}</Text>
                                            <View style={styles.txSubRow}>
                                                <Text style={styles.txSubText}>{new Date(tx.date).toLocaleDateString()}</Text>
                                                {tx.paymentMethod && (
                                                    <>
                                                        <View style={styles.smallDot} />
                                                        <Text style={styles.txSubText}>{tx.paymentMethod}</Text>
                                                    </>
                                                )}
                                            </View>
                                            {tx.description ? <Text style={styles.txDesc} numberOfLines={1}>{tx.description}</Text> : null}
                                        </View>
                                        <View style={styles.txRight}>
                                            <Text style={[styles.txAmount, { color: tx.source ? '#10b981' : '#ef4444' }]}>
                                                {tx.source ? '+' : '-'} ₹ {tx.amount.toLocaleString()}
                                            </Text>
                                            {tx.billUrl && (
                                                <TouchableOpacity onPress={() => Linking.openURL(tx.billUrl)} style={styles.billBtn}>
                                                    <Ionicons name="receipt-outline" size={14} color="#1d4ed8" />
                                                    <Text style={styles.billBtnText}>View Bill</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    
    periodContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 20, borderRadius: 14, padding: 4, marginBottom: 20 },
    periodTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activePeriodTab: { backgroundColor: '#1d4ed8' },
    periodText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    activePeriodText: { color: '#fff' },

    summaryGrid: { paddingHorizontal: 20 },
    mainSummaryCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    summaryLabel: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
    summaryValue: { fontSize: 32, fontWeight: '900', color: '#fff', marginTop: 8, marginBottom: 24 },
    summaryRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 24 },
    summaryItem: { flex: 1, alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
    summarySubLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    summarySubValue: { fontSize: 16, fontWeight: '800', color: '#fff', marginTop: 4 },
    divider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', mx: 10 },

    section: { paddingHorizontal: 20, marginTop: 32 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 16 },
    
    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    txIconBox: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1, marginLeft: 16 },
    txTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    txSubRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    txSubText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    smallDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#475569', marginHorizontal: 6 },
    txDesc: { fontSize: 11, color: '#475569', marginTop: 4 },
    txRight: { alignItems: 'flex-end', gap: 6 },
    txAmount: { fontSize: 15, fontWeight: '900' },
    billBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(37, 99, 235, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    billBtnText: { fontSize: 10, color: '#1d4ed8', fontWeight: '800' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40, gap: 16 },
    emptyText: { fontSize: 15, color: '#475569', fontWeight: '600' }
});
