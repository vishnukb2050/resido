import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, Dimensions, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const RECENT_TRANSACTIONS = [
    { id: '1', title: 'Salary', category: 'Income', amount: 45000, date: 'May 12, 2025', type: 'INCOME', icon: 'wallet', color: '#10b981' },
    { id: '2', title: 'Electricity Bill', category: 'Utilities', amount: 1250, date: 'May 10, 2025', type: 'EXPENSE', icon: 'bolt', color: '#6366f1' },
    { id: '3', title: 'Groceries', category: 'Shopping', amount: 2350, date: 'May 9, 2025', type: 'EXPENSE', icon: 'shopping-basket', color: '#f59e0b' },
];

export default function FinanceScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        <View style={styles.logoBox}>
                            <FontAwesome5 name="wallet" size={24} color="#fff" />
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.headerTitle}>Finance</Text>
                            <Text style={styles.headerSub}>Manage your finances smartly</Text>
                        </View>
                    </View>
                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.iconBtn}><Ionicons name="notifications" size={22} color="#fff" /></TouchableOpacity>
                        <Image source={{ uri: 'https://i.pravatar.cc/100?u=vishnu' }} style={styles.profileImg} />
                    </View>
                </View>

                {/* Quick Overview */}
                <View style={styles.overviewHeader}>
                    <Text style={styles.overviewTitle}>Quick Overview</Text>
                    <TouchableOpacity style={styles.monthSelector}>
                        <Text style={styles.monthText}>This Month</Text>
                        <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                    </TouchableOpacity>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Income</Text>
                        <Text style={[styles.statValue, { color: '#10b981' }]}>₹ 48,750</Text>
                        <Text style={styles.statTrend}><Text style={{ color: '#10b981' }}>+12.5%</Text> from last month</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Expenses</Text>
                        <Text style={[styles.statValue, { color: '#ef4444' }]}>₹ 32,450</Text>
                        <Text style={styles.statTrend}><Text style={{ color: '#ef4444' }}>-8.2%</Text> from last month</Text>
                    </View>
                </View>

                <View style={[styles.statCard, { marginTop: 12, width: '100%', flexDirection: 'row', alignItems: 'center' }]}>
                    <View style={styles.savingsIcon}>
                        <FontAwesome5 name="piggy-bank" size={20} color="#6366f1" />
                    </View>
                    <View style={{ marginLeft: 16 }}>
                        <Text style={styles.statLabel}>Net Savings</Text>
                        <Text style={styles.statValue}>₹ 16,300</Text>
                        <Text style={styles.statTrend}><Text style={{ color: '#10b981' }}>+20.3%</Text> from last month</Text>
                    </View>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Shortcuts */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Shortcuts</Text>
                    <View style={styles.shortcutGrid}>
                        <ShortcutItem icon="plus" label="Add Income" color="#10b981" />
                        <ShortcutItem icon="minus" label="Add Expense" color="#ef4444" onPress={() => router.push('/add-expense')} />
                        <ShortcutItem icon="file-upload" label="Upload Bill" color="#6366f1" />
                        <ShortcutItem icon="chart-bar" label="View Report" color="#94a3b8" onPress={() => router.push('/reports')} />
                    </View>
                </View>

                {/* Recent Transactions */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                        <TouchableOpacity onPress={() => router.push('/transactions')}>
                            <Text style={styles.viewAll}>View All</Text>
                        </TouchableOpacity>
                    </View>

                    {RECENT_TRANSACTIONS.map((tx) => (
                        <TouchableOpacity key={tx.id} style={styles.txCard}>
                            <View style={[styles.txIconBox, { backgroundColor: 'rgba(255,255,255,0.05)' }]}>
                                <FontAwesome5 name={tx.icon} size={18} color={tx.color} />
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={styles.txTitle}>{tx.title}</Text>
                                <Text style={styles.txCategory}>{tx.category}</Text>
                            </View>
                            <View style={styles.txRight}>
                                <Text style={[styles.txAmount, { color: tx.type === 'INCOME' ? '#10b981' : '#ef4444' }]}>
                                    {tx.type === 'INCOME' ? '+' : '-'} ₹ {tx.amount.toLocaleString()}
                                </Text>
                                <Text style={styles.txDate}>{tx.date}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 30, backgroundColor: '#0f172a' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    profileImg: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#6366f1' },
    
    overviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 16 },
    overviewTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    monthText: { fontSize: 12, color: '#94a3b8', fontWeight: '700' },

    statsRow: { flexDirection: 'row', gap: 12 },
    statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statLabel: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
    statValue: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 6 },
    statTrend: { fontSize: 11, color: '#64748b', marginTop: 6 },
    savingsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    viewAll: { fontSize: 13, color: '#6366f1', fontWeight: '700' },

    shortcutGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    shortcutItem: { alignItems: 'center', flex: 1 },
    shortcutIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
    shortcutLabel: { fontSize: 11, color: '#94a3b8', marginTop: 10, fontWeight: '700' },

    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    txIconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1, marginLeft: 16 },
    txTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    txCategory: { fontSize: 12, color: '#64748b', marginTop: 4 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: 15, fontWeight: '900' },
    txDate: { fontSize: 11, color: '#64748b', marginTop: 4 },
});
