import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, TextInput, Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityFinanceApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function AdminFinanceScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState<'month' | 'week' | 'day'>('month');
    const [reportData, setReportData] = useState<any>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    // Transaction Creation State
    const [showCreate, setShowCreate] = useState(false);
    const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Maintenance');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    const loadFinanceData = async () => {
        setLoading(true);
        try {
            const currentYear = new Date().getFullYear();
            const [repRes, transRes] = await Promise.all([
                communityFinanceApi.getReports({ period, year: currentYear }),
                communityFinanceApi.getTransactions({ page: 1, limit: 20 })
            ]);
            setReportData(repRes.data);
            setTransactions(transRes.data.items || []);
        } catch (e) {
            console.error('Failed to load community finance reports', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFinanceData();
    }, [period]);

    const handleCreateTransaction = async () => {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            Alert.alert('Error', 'Please enter a valid amount.');
            return;
        }

        setSaving(true);
        try {
            await communityFinanceApi.addTransaction({
                type,
                amount: Number(amount),
                category,
                description,
                date: new Date()
            });
            Alert.alert('Success', 'Transaction logged successfully!');
            setShowCreate(false);
            setAmount('');
            setDescription('');
            loadFinanceData();
        } catch (e) {
            Alert.alert('Error', 'Failed to log transaction.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Finance Center</Text>
                <TouchableOpacity onPress={() => setShowCreate(true)} style={styles.addBtn}>
                    <Ionicons name="add" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Period Tabs */}
                    <View style={styles.tabRow}>
                        {(['month', 'week', 'day'] as const).map(p => (
                            <TouchableOpacity 
                                key={p} 
                                style={[styles.tabBtn, period === p && styles.tabBtnActive]}
                                onPress={() => setPeriod(p)}
                            >
                                <Text style={[styles.tabBtnText, period === p && styles.tabBtnTextActive]}>
                                    {p.toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Stats Summary Card */}
                    {reportData && (
                        <View style={styles.summaryCard}>
                            <View style={styles.statRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Total Income</Text>
                                    <Text style={[styles.statValue, { color: '#10b981' }]}>₹ {reportData.totalIncome.toLocaleString()}</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Total Expense</Text>
                                    <Text style={[styles.statValue, { color: '#ef4444' }]}>₹ {reportData.totalExpense.toLocaleString()}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.savingsBox}>
                                <Text style={styles.savingsLabel}>Total Savings</Text>
                                <Text style={styles.savingsValue}>₹ {reportData.savings.toLocaleString()}</Text>
                            </View>
                        </View>
                    )}

                    {/* Dynamic Analytics Visual Chart */}
                    <Text style={styles.sectionTitle}>Inflow & Outflow Analytics</Text>
                    {reportData?.chartData?.length > 0 ? (
                        <View style={styles.chartCard}>
                            <View style={styles.chartContainer}>
                                {reportData.chartData.map((d: any, index: number) => {
                                    const maxVal = Math.max(...reportData.chartData.map((x: any) => Math.max(x.income, x.expense)), 1);
                                    const incHeight = (d.income / maxVal) * 100;
                                    const expHeight = (d.expense / maxVal) * 100;

                                    return (
                                        <View key={index} style={styles.chartBarCol}>
                                            <View style={styles.barsRow}>
                                                <View style={[styles.bar, { height: `${incHeight}%`, backgroundColor: '#10b981' }]} />
                                                <View style={[styles.bar, { height: `${expHeight}%`, backgroundColor: '#ef4444' }]} />
                                            </View>
                                            <Text style={styles.barLabel} numberOfLines={1}>{d.label.split(' ')[0]}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                            <View style={styles.chartLegend}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
                                    <Text style={styles.legendText}>Income</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                                    <Text style={styles.legendText}>Expense</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.emptyChartCard}>
                            <Text style={styles.emptyChartText}>No cashflow records logged yet for this year.</Text>
                        </View>
                    )}

                    {/* Transaction Ledger */}
                    <View style={styles.ledgerHeader}>
                        <Text style={styles.sectionTitle}>Transaction Ledger</Text>
                        <Text style={styles.ledgerCount}>{transactions.length} total</Text>
                    </View>

                    {transactions.length === 0 ? (
                        <View style={styles.emptyLedger}>
                            <Text style={styles.emptyLedgerText}>No transactions logged yet.</Text>
                        </View>
                    ) : (
                        transactions.map(t => (
                            <View key={t.id} style={styles.transactionCard}>
                                <View style={styles.ledgerLeft}>
                                    <View style={[styles.ledgerIconBox, { backgroundColor: t.type === 'INCOME' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }]}>
                                        <Ionicons 
                                            name={t.type === 'INCOME' ? 'arrow-down-circle' : 'arrow-up-circle'} 
                                            size={22} 
                                            color={t.type === 'INCOME' ? '#10b981' : '#ef4444'} 
                                        />
                                    </View>
                                    <View style={{ marginLeft: 15 }}>
                                        <Text style={styles.ledgerCategory}>{t.category}</Text>
                                        <Text style={styles.ledgerDesc} numberOfLines={1}>{t.description || 'No description'}</Text>
                                        <Text style={styles.ledgerDate}>{new Date(t.date).toLocaleDateString()}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.ledgerAmount, { color: t.type === 'INCOME' ? '#10b981' : '#fff' }]}>
                                    {t.type === 'INCOME' ? '+' : '-'} ₹{t.amount.toLocaleString()}
                                </Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Create Transaction Modal */}
            <Modal
                visible={showCreate}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreate(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Log Transaction</Text>
                            <TouchableOpacity onPress={() => setShowCreate(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Inflow vs Outflow */}
                            <Text style={styles.inputLabel}>Transaction Type</Text>
                            <View style={styles.typeRow}>
                                <TouchableOpacity 
                                    style={[styles.typeBtn, type === 'INCOME' && { backgroundColor: '#10b981' }]} 
                                    onPress={() => setType('INCOME')}
                                >
                                    <Text style={[styles.typeBtnText, type === 'INCOME' && styles.typeBtnTextActive]}>INFLOW (INCOME)</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.typeBtn, type === 'EXPENSE' && { backgroundColor: '#ef4444' }]} 
                                    onPress={() => setType('EXPENSE')}
                                >
                                    <Text style={[styles.typeBtnText, type === 'EXPENSE' && styles.typeBtnTextActive]}>OUTFLOW (EXPENSE)</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Amount */}
                            <Text style={styles.inputLabel}>Amount (INR)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="₹ Enter amount"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />

                            {/* Category selector */}
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.categoryRow}>
                                {['Maintenance', 'Sinking Fund', 'Staff Salary', 'Electricity', 'Events', 'Repairs', 'Other'].map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        style={[styles.catBtn, category === cat && styles.catBtnActive]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[styles.catBtnText, category === cat && styles.catBtnTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Description */}
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                                placeholder="Write additional reference note here..."
                                placeholderTextColor="#64748b"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: type === 'INCOME' ? '#10b981' : '#ef4444' }]} 
                                onPress={handleCreateTransaction}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Log Cashflow Record</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4C5C68' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    tabRow: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 5, borderRadius: 14, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
    tabBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
    tabBtnTextActive: { color: '#fff' },

    summaryCard: { backgroundColor: '#2E3A42', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 25 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
    statValue: { fontSize: 18, fontWeight: '900', marginTop: 6 },
    divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },
    savingsBox: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, alignItems: 'center', marginTop: 18 },
    savingsLabel: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
    savingsValue: { fontSize: 20, fontWeight: '900', color: '#fff', marginTop: 4 },

    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#fff', marginBottom: 15 },
    chartCard: { backgroundColor: '#2E3A42', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 25 },
    chartContainer: { height: 160, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 },
    chartBarCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
    barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: '80%', marginBottom: 8 },
    bar: { width: 10, borderRadius: 4, minHeight: 4 },
    barLabel: { color: '#cbd5e1', fontSize: 9, fontWeight: '700', marginTop: 4 },
    chartLegend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
    emptyChartCard: { height: 100, backgroundColor: '#2E3A42', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
    emptyChartText: { color: '#64748b', fontSize: 12, fontWeight: '600' },

    ledgerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    ledgerCount: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
    emptyLedger: { backgroundColor: '#2E3A42', padding: 25, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    emptyLedgerText: { color: '#64748b', fontSize: 13, fontWeight: '600' },

    transactionCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    ledgerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    ledgerIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    ledgerCategory: { color: '#fff', fontSize: 14, fontWeight: '800' },
    ledgerDesc: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginTop: 2, marginRight: 15 },
    ledgerDate: { color: '#64748b', fontSize: 10, fontWeight: '600', marginTop: 4 },
    ledgerAmount: { fontSize: 15, fontWeight: '900' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2E3A42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 15 },
    typeRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    typeBtn: { flex: 1, paddingVertical: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    typeBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '900' },
    typeBtnTextActive: { color: '#fff' },

    textInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, fontSize: 16, fontWeight: '600' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    catBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    catBtnActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
    catBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
    catBtnTextActive: { color: '#fff', fontWeight: '800' },

    submitBtn: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' }
});
