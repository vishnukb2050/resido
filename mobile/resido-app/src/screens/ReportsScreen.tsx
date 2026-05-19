import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { name: 'Groceries', percent: 40, amount: 12980, color: '#10b981' },
    { name: 'Utilities', percent: 20, amount: 6490, color: '#4c1d95' },
    { name: 'Shopping', percent: 15, amount: 4870, color: '#ec4899' },
    { name: 'Transport', percent: 10, amount: 3250, color: '#3b82f6' },
    { name: 'Food & Dining', percent: 8, amount: 2600, color: '#f43f5e' },
    { name: 'Others', percent: 7, amount: 2260, color: '#8b5cf6' },
];

export default function ReportsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Overview');
    const [period, setPeriod] = useState('This Month');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{activeTab}</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Main Tabs */}
                <View style={styles.tabContainer}>
                    {['Overview', 'Categories', 'Trend'].map(tab => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.tab, activeTab === tab && styles.activeTab]} 
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Period Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
                    {['This Week', 'This Month', 'This Year', 'Custom'].map(p => (
                        <TouchableOpacity 
                            key={p} 
                            style={[styles.periodTab, period === p && styles.activePeriodTab]}
                            onPress={() => setPeriod(p)}
                        >
                            <Text style={[styles.periodTabText, period === p && styles.activePeriodTabText]}>{p}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Summary Section */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <Text style={styles.summaryTitle}>Summary</Text>
                        <Text style={styles.summaryDate}>May 1 — May 13, 2025</Text>
                    </View>
                    <View style={styles.summaryStats}>
                        <SummaryStat label="Income" value="₹ 48,750" color="#10b981" />
                        <SummaryStat label="Expense" value="₹ 32,450" color="#ef4444" />
                        <SummaryStat label="Savings" value="₹ 16,300" color="#4c1d95" />
                    </View>
                </View>

                {/* Chart Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Expense Breakdown</Text>
                    <View style={styles.donutContainer}>
                        <View style={styles.donutPlaceholder}>
                            <Text style={styles.donutAmount}>₹ 32,450</Text>
                            <Text style={styles.donutLabel}>Total Expense</Text>
                        </View>
                        <View style={styles.legendGrid}>
                            {CATEGORIES.map(cat => (
                                <View key={cat.name} style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: cat.color }]} />
                                    <Text style={styles.legendText}>{cat.name}</Text>
                                    <Text style={styles.legendPercent}>{cat.percent}%</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Category List (Matches Screenshot 5) */}
                {activeTab === 'Categories' && (
                    <View style={styles.section}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity key={cat.name} style={styles.catItem}>
                                <View style={[styles.catIconBox, { backgroundColor: cat.color + '20' }]}>
                                    <View style={[styles.catIconInner, { backgroundColor: cat.color }]} />
                                </View>
                                <View style={styles.catInfo}>
                                    <Text style={styles.catName}>{cat.name}</Text>
                                    <Text style={styles.catPercent}>{cat.percent}%</Text>
                                </View>
                                <Text style={styles.catAmount}>₹ {cat.amount.toLocaleString()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Bar Chart Placeholder */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Income vs Expense</Text>
                    <View style={styles.barChartPlaceholder}>
                        <View style={styles.barLegend}>
                            <View style={styles.barLegendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                                <Text style={styles.legendText}>Income</Text>
                            </View>
                            <View style={styles.barLegendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                                <Text style={styles.legendText}>Expense</Text>
                            </View>
                        </View>
                        <View style={styles.chartBars}>
                            {[1, 2].map(i => (
                                <View key={i} style={styles.barGroup}>
                                    <View style={[styles.bar, { height: 80, backgroundColor: '#10b981' }]} />
                                    <View style={[styles.bar, { height: 50, backgroundColor: '#ef4444' }]} />
                                </View>
                            ))}
                        </View>
                        <View style={styles.chartXAxis}>
                            <Text style={styles.xAxisText}>May 1-7</Text>
                            <Text style={styles.xAxisText}>May 8-13</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const SummaryStat = ({ label, value, color }: any) => (
    <View style={styles.summaryStat}>
        <Text style={styles.summaryStatLabel}>{label}</Text>
        <Text style={[styles.summaryStatValue, { color }]}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, paddingTop: 20, backgroundColor: '#0f172a' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    
    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#4c1d95' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#fff' },

    periodScroll: { flexDirection: 'row', gap: 10 },
    periodTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 10 },
    activePeriodTab: { backgroundColor: '#4c1d95' },
    periodTabText: { fontSize: 13, color: '#94a3b8', fontWeight: '700' },
    activePeriodTabText: { color: '#fff' },

    summaryContainer: { paddingHorizontal: 20, marginTop: 10 },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    summaryTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    summaryDate: { fontSize: 12, color: '#64748b' },
    summaryStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    summaryStat: { flex: 1 },
    summaryStatLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    summaryStatValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },

    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 20 },
    
    donutContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    donutPlaceholder: { width: 120, height: 120, borderRadius: 60, borderWidth: 15, borderColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    donutAmount: { fontSize: 16, fontWeight: '900', color: '#fff' },
    donutLabel: { fontSize: 10, color: '#64748b', marginTop: 2 },
    legendGrid: { flex: 1, marginLeft: 20, gap: 12 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    legendText: { fontSize: 11, color: '#94a3b8', flex: 1 },
    legendPercent: { fontSize: 11, color: '#fff', fontWeight: '700' },

    catItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    catIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    catIconInner: { width: 10, height: 10, borderRadius: 5 },
    catInfo: { flex: 1, marginLeft: 16 },
    catName: { fontSize: 15, fontWeight: '700', color: '#fff' },
    catPercent: { fontSize: 12, color: '#64748b', marginTop: 4 },
    catAmount: { fontSize: 15, fontWeight: '900', color: '#fff' },

    barChartPlaceholder: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    barLegend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, marginBottom: 20 },
    barLegendItem: { flexDirection: 'row', alignItems: 'center' },
    chartBars: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 120 },
    barGroup: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
    bar: { width: 16, borderRadius: 4 },
    chartXAxis: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
    xAxisText: { fontSize: 11, color: '#64748b' },
});
