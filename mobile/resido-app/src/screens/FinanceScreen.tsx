import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function FinanceScreen() {
    const router = useRouter();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        try {
            setLoading(true);
            const { data } = await mySpaceApi.getFinanceReport({ period: 'MONTH' });
            setReport(data);
        } catch (error) {
            console.error('Failed to load finance data', error);
        } finally {
            setLoading(false);
        }
    };

    const summary = report?.summary || { totalIncome: 0, totalExpense: 0, balance: 0 };
    const incomes = (report?.incomes || []).map((i: any) => ({ ...i, _kind: 'INCOME' as const }));
    const expenses = (report?.expenses || []).map((e: any) => ({ ...e, _kind: 'EXPENSE' as const }));
    const transactions = [...incomes, ...expenses]
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    const openEdit = (tx: any) => {
        const payload = encodeURIComponent(JSON.stringify(tx));
        if (tx._kind === 'INCOME') {
            router.push({ pathname: '/add-income', params: { id: tx.id, data: payload } });
        } else {
            router.push({ pathname: '/add-expense', params: { id: tx.id, data: payload } });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
                            <Ionicons name="arrow-back" size={24} color="#2D2445" />
                        </TouchableOpacity>
                        <View style={styles.logoBox}>
                            <FontAwesome5 name="wallet" size={24} color="#fff" />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.headerTitle}>Finance</Text>
                            <Text style={styles.headerSub}>Manage your finances smartly</Text>
                        </View>
                    </View>
                </View>

                {/* Quick Overview */}
                <View style={styles.overviewHeader}>
                    <Text style={styles.overviewTitle}>Quick Overview</Text>
                    <View style={styles.monthSelector}>
                        <Text style={styles.monthText}>This Month</Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Income</Text>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>₹ {summary.totalIncome.toLocaleString()}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Expenses</Text>
                        <Text style={[styles.statValue, { color: '#ef4444' }]}>₹ {summary.totalExpense.toLocaleString()}</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { marginTop: 12, width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={styles.savingsIcon}>
                        <FontAwesome5 name="piggy-bank" size={20} color="#8b5cf6" />
                    </View>
                    <View style={{ marginLeft: 16 }}>
                        <Text style={styles.statLabel}>Net Savings</Text>
                        <Text style={styles.statValue}>₹ {summary.balance.toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {loading ? (
                    <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {/* Shortcuts */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Shortcuts</Text>
                            <View style={styles.shortcutGrid}>
                                <ShortcutItem icon="plus" label="Add Income" color="#10b981" onPress={() => router.push('/add-income')} />
                                <ShortcutItem icon="minus" label="Add Expense" color="#ef4444" onPress={() => router.push('/add-expense')} />
                                <ShortcutItem icon="file-upload" label="Bills" color="#8b5cf6" onPress={() => router.push('/bills')} />
                                <ShortcutItem icon="chart-bar" label="View Report" color="#94a3b8" onPress={() => router.push('/finance-report')} />
                            </View>
                        </View>

                        {/* Recent Transactions */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                            </View>

                            {transactions.length === 0 ? (
                                <Text style={styles.emptyText}>No transactions yet</Text>
                            ) : (
                                transactions.map((tx: any) => (
                                    <TouchableOpacity
                                        key={`${tx._kind}-${tx.id}`}
                                        style={styles.txCard}
                                        activeOpacity={0.85}
                                        onPress={() => openEdit(tx)}
                                    >
                                        <View style={[styles.txIconBox, { backgroundColor: '#F4EEFC' }]}>
                                            <FontAwesome5
                                                name={tx._kind === 'INCOME' ? 'wallet' : 'shopping-basket'}
                                                size={18}
                                                color={tx._kind === 'INCOME' ? '#10b981' : '#ef4444'}
                                            />
                                        </View>
                                        <View style={styles.txInfo}>
                                            <Text style={styles.txTitle}>{tx.source || tx.category}</Text>
                                            <Text style={styles.txCategory}>
                                                {tx._kind === 'INCOME' ? 'Income' : (tx.paymentMethod || 'Expense')}
                                            </Text>
                                        </View>
                                        <View style={styles.txRight}>
                                            <Text style={[styles.txAmount, { color: tx._kind === 'INCOME' ? '#10b981' : '#ef4444' }]}>
                                                {tx._kind === 'INCOME' ? '+' : '-'} ₹ {Number(tx.amount).toLocaleString()}
                                            </Text>
                                            <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </View>
                    </>
                )}
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const ShortcutItem = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity style={styles.shortcutItem} onPress={onPress}>
        <View style={[styles.shortcutIcon, { borderColor: color }]}>
            <FontAwesome5 name={icon} size={18} color={color} />
        </View>
        <Text style={styles.shortcutLabel}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 30, backgroundColor: '#F8F5FF' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C4B5DC' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445' },
    headerSub: { fontSize: 12, color: '#9A8EBA', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    profileImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#8b5cf6' },
    
    overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
    overviewTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F4EEFC', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    monthText: { fontSize: 12, color: '#9A8EBA', fontWeight: '700' },

    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#D4C9E8' },
    statLabel: { fontSize: 13, color: '#9A8EBA', fontWeight: '600' },
    statValue: { fontSize: 20, fontWeight: '900', color: '#2D2445', marginTop: 6 },
    statTrend: { fontSize: 11, color: '#7A6B9C', marginTop: 6 },
    savingsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    viewAll: { fontSize: 13, color: '#8b5cf6', fontWeight: '700' },

    shortcutGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    shortcutItem: { alignItems: 'center', flex: 1 },
    shortcutIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff' },
    shortcutLabel: { fontSize: 11, color: '#9A8EBA', marginTop: 10, fontWeight: '700' },

    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    txIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1, marginLeft: 16 },
    txTitle: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    txCategory: { fontSize: 12, color: '#7A6B9C', marginTop: 4 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 15, fontWeight: '900' },
    txDate: { fontSize: 11, color: '#7A6B9C', marginTop: 4 },
    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 40, fontSize: 15, fontWeight: '600' },
});
