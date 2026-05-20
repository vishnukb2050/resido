import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const TRANSACTIONS = [
    { id: '1', title: 'Salary', category: 'Income', amount: 45000, date: 'May 12, 2025', type: 'INCOME', icon: 'wallet', color: '#10b981' },
    { id: '2', title: 'Freelance Project', category: 'Income', amount: 3750, date: 'May 11, 2025', type: 'INCOME', icon: 'laptop-code', color: '#4c1d95' },
    { id: '3', title: 'Electricity Bill', category: 'Utilities', amount: 1250, date: 'May 10, 2025', type: 'EXPENSE', icon: 'bolt', color: '#ef4444' },
    { id: '4', title: 'Groceries', category: 'Shopping', amount: 2350, date: 'May 9, 2025', type: 'EXPENSE', icon: 'shopping-basket', color: '#f59e0b' },
    { id: '5', title: 'Mobile Recharge', category: 'Utilities', amount: 299, date: 'May 8, 2025', type: 'EXPENSE', icon: 'mobile-alt', color: '#8b5cf6' },
    { id: '6', title: 'Internet Bill', category: 'Utilities', amount: 799, date: 'May 7, 2025', type: 'EXPENSE', icon: 'wifi', color: '#ec4899' },
    { id: '7', title: 'Restaurant', category: 'Food & Dining', amount: 650, date: 'May 6, 2025', type: 'EXPENSE', icon: 'utensils', color: '#f43f5e' },
];

export default function TransactionsScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('All');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Transactions</Text>
                    <TouchableOpacity style={styles.iconBtn}><Ionicons name="options-outline" size={22} color="#fff" /></TouchableOpacity>
                </View>

                {/* Search */}
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput 
                        placeholder="Search transactions" 
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                {/* Tabs */}
                <View style={styles.tabContainer}>
                    {['All', 'Income', 'Expense'].map(tab => (
                        <TouchableOpacity 
                            key={tab} 
                            style={[styles.tab, activeTab === tab && styles.activeTab]} 
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Monthly Summary */}
                <View style={styles.monthHeader}>
                    <Text style={styles.monthTitle}>May 2025</Text>
                    <View style={styles.monthStats}>
                        <View style={styles.monthStat}>
                            <Text style={styles.monthStatLabel}>Total Income</Text>
                            <Text style={[styles.monthStatValue, { color: '#10b981' }]}>₹ 48,750</Text>
                        </View>
                        <View style={styles.monthStat}>
                            <Text style={styles.monthStatLabel}>Total Expense</Text>
                            <Text style={[styles.monthStatValue, { color: '#ef4444' }]}>₹ 32,450</Text>
                        </View>
                    </View>
                </View>

                {/* Transaction List */}
                <View style={styles.listContainer}>
                    {TRANSACTIONS.map((tx) => (
                        <TouchableOpacity key={tx.id} style={styles.txCard}>
                            <View style={[styles.txIconBox, { backgroundColor: tx.color + '20' }]}>
                                <FontAwesome5 name={tx.icon} size={18} color={tx.color} />
                            </View>
                            <View style={styles.txInfo}>
                                <Text style={styles.txTitle}>{tx.title}</Text>
                                <Text style={styles.txDate}>{tx.date}</Text>
                            </View>
                            <Text style={[styles.txAmount, { color: tx.type === 'INCOME' ? '#10b981' : '#ef4444' }]}>
                                {tx.type === 'INCOME' ? '+' : '-'} ₹ {tx.amount.toLocaleString()}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1e222b' },
    header: { padding: 20, paddingTop: 20, backgroundColor: '#1e222b' },
    headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 20 },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff', fontSize: 15 },

    tabContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 4 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    activeTab: { backgroundColor: '#4c1d95' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#fff' },

    monthHeader: { padding: 20, marginTop: 10 },
    monthTitle: { fontSize: 14, fontWeight: '800', color: '#4c1d95', textTransform: 'uppercase', marginBottom: 16 },
    monthStats: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    monthStat: { flex: 1 },
    monthStatLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    monthStatValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },

    listContainer: { paddingHorizontal: 20, marginTop: 10 },
    txCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    txIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    txInfo: { flex: 1, marginLeft: 16 },
    txTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    txDate: { fontSize: 12, color: '#64748b', marginTop: 4 },
    txAmount: { fontSize: 16, fontWeight: '900' },
});
