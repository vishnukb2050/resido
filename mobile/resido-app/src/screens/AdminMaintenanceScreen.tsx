import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityFinanceApi } from '../services/api';

export default function AdminMaintenanceScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    
    // Lists
    const [paidList, setPaidList] = useState<any[]>([]);
    const [dueList, setDueList] = useState<any[]>([]);
    const [pendingList, setPendingList] = useState<any[]>([]);

    // Tabs
    const [activeTab, setActiveTab] = useState<'pending' | 'due' | 'paid'>('pending');

    // Config & Generation Modal state
    const [showConfig, setShowConfig] = useState(false);
    const [showGen, setShowGen] = useState(false);
    const [generating, setGenerating] = useState(false);

    // Config form states
    const [billingCycle, setBillingCycle] = useState('MONTHLY');
    const [calculationType, setCalculationType] = useState('FLAT_RATE');
    const [flatRateAmount, setFlatRateAmount] = useState('1000');
    const [ratePerSqFt, setRatePerSqFt] = useState('2');
    const [dueDateDay, setDueDateDay] = useState('10');

    // Verification Modal
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Config
            const configRes = await communityFinanceApi.getConfig();
            const config = configRes.data;
            if (config) {
                setBillingCycle(config.billingCycle);
                setCalculationType(config.calculationType);
                setFlatRateAmount(String(config.flatRateAmount));
                setRatePerSqFt(String(config.ratePerSqFt));
                setDueDateDay(String(config.dueDateDay));
            }

            // Load Status lists
            const statusRes = await communityFinanceApi.getStatus(month, year);
            setPaidList(statusRes.data.paid || []);
            setDueList(statusRes.data.due || []);
            setPendingList(statusRes.data.pending || []);
        } catch (e) {
            console.error('Failed to load maintenance configuration/status', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [month, year]);

    const handleSaveConfig = async () => {
        try {
            await communityFinanceApi.updateConfig({
                billingCycle,
                calculationType,
                flatRateAmount: Number(flatRateAmount),
                ratePerSqFt: Number(ratePerSqFt),
                dueDateDay: Number(dueDateDay)
            });
            Alert.alert('Success', 'Billing configuration saved successfully!');
            setShowConfig(false);
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to save billing configuration.');
        }
    };

    const handleGenerateBills = async () => {
        setGenerating(true);
        try {
            await communityFinanceApi.generateBills(month, year);
            Alert.alert('Success', 'Dues invoices successfully generated for all registered community units!');
            setShowGen(false);
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to generate community bills.');
        } finally {
            setGenerating(false);
        }
    };

    const handleVerify = async (action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT' && !rejectionReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for rejecting the receipt.');
            return;
        }

        setVerifying(true);
        try {
            await communityFinanceApi.verifyPayment(selectedBill.id, action, rejectionReason);
            Alert.alert('Success', `Receipt ${action === 'APPROVE' ? 'approved and added to community income' : 'rejected successfully'}.`);
            setSelectedBill(null);
            setRejectionReason('');
            loadData();
        } catch (e) {
            Alert.alert('Error', 'Failed to verify transaction receipt.');
        } finally {
            setVerifying(false);
        }
    };

    const totalCollected = paidList.reduce((acc, c) => acc + c.totalAmount, 0);
    const totalOutstanding = dueList.reduce((acc, c) => acc + c.totalAmount, 0);
    const totalPending = pendingList.reduce((acc, c) => acc + c.totalAmount, 0);
    const totalBills = paidList.length + dueList.length + pendingList.length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Maintenance Manager</Text>
                <TouchableOpacity onPress={() => setShowConfig(true)} style={styles.backBtn}>
                    <Ionicons name="settings" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Period Switcher Card */}
                    <View style={styles.periodCard}>
                        <TouchableOpacity 
                            style={styles.periodArrow} 
                            onPress={() => {
                                if (month === 1) {
                                    setMonth(12);
                                    setYear(year - 1);
                                } else {
                                    setMonth(month - 1);
                                }
                            }}
                        >
                            <Ionicons name="chevron-back" size={20} color="#fff" />
                        </TouchableOpacity>
                        
                        <Text style={styles.periodText}>{getMonthName(month)} {year}</Text>
                        
                        <TouchableOpacity 
                            style={styles.periodArrow}
                            onPress={() => {
                                if (month === 12) {
                                    setMonth(1);
                                    setYear(year + 1);
                                } else {
                                    setMonth(month + 1);
                                }
                            }}
                        >
                            <Ionicons name="chevron-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Stats Widget */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Collected</Text>
                            <Text style={[styles.statVal, { color: '#10b981' }]}>₹ {totalCollected.toLocaleString()}</Text>
                            <Text style={styles.statSub}>{paidList.length} Units Paid</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>Outstanding</Text>
                            <Text style={[styles.statVal, { color: '#ef4444' }]}>₹ {totalOutstanding.toLocaleString()}</Text>
                            <Text style={styles.statSub}>{dueList.length} Units Pending</Text>
                        </View>
                    </View>

                    {/* Collection Progress */}
                    {totalBills > 0 && (
                        <View style={styles.progressCard}>
                            <View style={styles.progressRow}>
                                <Text style={styles.progressText}>Collection Rate</Text>
                                <Text style={styles.progressPercent}>{Math.round((paidList.length / totalBills) * 100)}%</Text>
                            </View>
                            <View style={styles.progressBg}>
                                <View style={[styles.progressFill, { width: `${(paidList.length / totalBills) * 100}%` }]} />
                            </View>
                        </View>
                    )}

                    {/* Run Generator / Configuration Action */}
                    {totalBills === 0 && (
                        <TouchableOpacity style={styles.runGenBtn} onPress={() => setShowGen(true)}>
                            <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.runGenText}>Generate Bills for this Month</Text>
                        </TouchableOpacity>
                    )}

                    {/* Roster Tabs */}
                    <View style={styles.tabRow}>
                        {[
                            { key: 'pending', label: `Pending (${pendingList.length})` },
                            { key: 'due', label: `Due (${dueList.length})` },
                            { key: 'paid', label: `Paid (${paidList.length})` }
                        ].map(t => (
                            <TouchableOpacity 
                                key={t.key} 
                                style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]}
                                onPress={() => setActiveTab(t.key as any)}
                            >
                                <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>
                                    {t.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Dynamic Roster Lists */}
                    {activeTab === 'pending' && (
                        pendingList.length === 0 ? (
                            <Text style={styles.emptyText}>No pending payment proofs to verify.</Text>
                        ) : (
                            pendingList.map(bill => (
                                <TouchableOpacity key={bill.id} style={styles.billItem} onPress={() => setSelectedBill(bill)}>
                                    <View style={styles.billLeft}>
                                        <Ionicons name="time" size={24} color="#f59e0b" />
                                        <View style={{ marginLeft: 15 }}>
                                            <Text style={styles.unitNum}>{bill.unitNumber}</Text>
                                            <Text style={styles.residentName}>{bill.residentName}</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.amountText, { color: '#f59e0b' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                        <Text style={styles.verifyBtnText}>Tap to verify</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )
                    )}

                    {activeTab === 'due' && (
                        dueList.length === 0 ? (
                            <Text style={styles.emptyText}>No pending due bills found for this month.</Text>
                        ) : (
                            dueList.map(bill => (
                                <View key={bill.id} style={styles.billItem}>
                                    <View style={styles.billLeft}>
                                        <Ionicons name="alert-circle" size={24} color="#ef4444" />
                                        <View style={{ marginLeft: 15 }}>
                                            <Text style={styles.unitNum}>{bill.unitNumber}</Text>
                                            <Text style={styles.residentName}>{bill.residentName}</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.amountText, { color: '#ef4444' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                        <TouchableOpacity 
                                            style={styles.remindBtn}
                                            onPress={() => Alert.alert('Reminder Sent', `Payment reminder sent successfully to ${bill.residentName} (${bill.residentPhone})!`)}
                                        >
                                            <Text style={styles.remindBtnText}>Remind</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )
                    )}

                    {activeTab === 'paid' && (
                        paidList.length === 0 ? (
                            <Text style={styles.emptyText}>No paid collections registered for this month.</Text>
                        ) : (
                            paidList.map(bill => (
                                <View key={bill.id} style={styles.billItem}>
                                    <View style={styles.billLeft}>
                                        <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                        <View style={{ marginLeft: 15 }}>
                                            <Text style={styles.unitNum}>{bill.unitNumber}</Text>
                                            <Text style={styles.residentName}>{bill.residentName}</Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.amountText, { color: '#10b981' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                </View>
                            ))
                        )
                    )}
                </ScrollView>
            )}

            {/* Bill Verification Modal */}
            <Modal
                visible={selectedBill !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedBill(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Verify Transaction Receipt</Text>
                            <TouchableOpacity onPress={() => setSelectedBill(null)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {selectedBill && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.verifyDetailBox}>
                                    <Text style={styles.verifyTextLabel}>Resident Details</Text>
                                    <Text style={styles.verifyTextVal}>{selectedBill.residentName} ({selectedBill.unitNumber})</Text>
                                    <Text style={styles.verifyTextVal}>Mobile: {selectedBill.residentPhone}</Text>
                                    
                                    <Text style={styles.verifyTextLabel}>Amount Dues</Text>
                                    <Text style={styles.verifyTextVal}>₹ {selectedBill.totalAmount.toLocaleString()}</Text>

                                    <Text style={styles.verifyTextLabel}>Payment Mode</Text>
                                    <Text style={styles.verifyTextVal}>{selectedBill.paymentMethod}</Text>

                                    {selectedBill.description && (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Notes/Reference</Text>
                                            <Text style={styles.verifyTextVal}>{selectedBill.description}</Text>
                                        </>
                                    )}
                                </View>

                                {selectedBill.receiptUrl && (
                                    <>
                                        <Text style={styles.inputLabel}>Receipt Screenshot</Text>
                                        <Image source={{ uri: selectedBill.receiptUrl }} style={styles.verifyReceiptPreview} />
                                    </>
                                )}

                                <Text style={styles.inputLabel}>If rejecting, enter reason</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Provide rejection reason to the resident..."
                                    placeholderTextColor="#64748b"
                                    value={rejectionReason}
                                    onChangeText={setRejectionReason}
                                />

                                <View style={styles.decisionRow}>
                                    <TouchableOpacity 
                                        style={[styles.decisionBtn, { backgroundColor: '#ef4444' }]}
                                        onPress={() => handleVerify('REJECT')}
                                        disabled={verifying}
                                    >
                                        <Text style={styles.decisionBtnText}>Reject Receipt</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity 
                                        style={[styles.decisionBtn, { backgroundColor: '#10b981' }]}
                                        onPress={() => handleVerify('APPROVE')}
                                        disabled={verifying}
                                    >
                                        <Text style={styles.decisionBtnText}>Approve & Save</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Bill Generation Modal */}
            <Modal
                visible={showGen}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowGen(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Generate Monthly Bills</Text>
                            <TouchableOpacity onPress={() => setShowGen(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.genModalSub}>
                            This action will generate outstanding maintenance bills for all units registered inside the community based on your active calculations:
                            {calculationType === 'FLAT_RATE' ? ` Flat Rate of ₹ ${flatRateAmount} per unit.` : ` Sq. Ft Area Rate of ₹ ${ratePerSqFt} per sq. ft.`}
                        </Text>
                        <TouchableOpacity 
                            style={styles.submitBtn} 
                            onPress={handleGenerateBills}
                            disabled={generating}
                        >
                            {generating ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitBtnText}>Confirm and Generate Bills</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Config Settings Modal */}
            <Modal
                visible={showConfig}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowConfig(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Maintenance Settings</Text>
                            <TouchableOpacity onPress={() => setShowConfig(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Cycle Selector */}
                            <Text style={styles.inputLabel}>Billing Cycle</Text>
                            <View style={styles.methodRow}>
                                {['MONTHLY', 'QUARTERLY', 'ANNUALLY'].map(c => (
                                    <TouchableOpacity 
                                        key={c} 
                                        style={[styles.methodBtn, billingCycle === c && styles.methodBtnActive]}
                                        onPress={() => setBillingCycle(c)}
                                    >
                                        <Text style={[styles.methodBtnText, billingCycle === c && styles.methodBtnTextActive]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Calc Mode Selector */}
                            <Text style={styles.inputLabel}>Calculation Basis</Text>
                            <View style={styles.methodRow}>
                                {[
                                    { key: 'FLAT_RATE', label: 'Flat Fixed Rate' },
                                    { key: 'AREA_BASED', label: 'Per Sq. Ft Area Rate' }
                                ].map(c => (
                                    <TouchableOpacity 
                                        key={c.key} 
                                        style={[styles.methodBtn, calculationType === c.key && styles.methodBtnActive]}
                                        onPress={() => setCalculationType(c.key)}
                                    >
                                        <Text style={[styles.methodBtnText, calculationType === c.key && styles.methodBtnTextActive]}>{c.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Conditional Calculation fields */}
                            {calculationType === 'FLAT_RATE' ? (
                                <>
                                    <Text style={styles.inputLabel}>Flat Rate Amount (INR)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="₹ Enter flat amount"
                                        placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={flatRateAmount}
                                        onChangeText={setFlatRateAmount}
                                    />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.inputLabel}>Rate Per Sq. Ft. (INR)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="₹ e.g. 2.50"
                                        placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={ratePerSqFt}
                                        onChangeText={setSecondary => setRatePerSqFt(secondary => secondary)}
                                    />
                                </>
                            )}

                            {/* Due Date Day selector */}
                            <Text style={styles.inputLabel}>Due Date Day of Month (1 - 28)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. 10"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                value={dueDateDay}
                                onChangeText={setDueDateDay}
                            />

                            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveConfig}>
                                <Text style={styles.submitBtnText}>Save Configuration</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function getMonthName(m: number): string {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return months[m - 1] || 'N/A';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4C5C68' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    periodCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2E3A42', padding: 16, borderRadius: 20, marginTop: 10, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    periodArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    periodText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    statsContainer: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
    statVal: { fontSize: 18, fontWeight: '900', marginTop: 6 },
    statSub: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 4 },
    divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

    progressCard: { backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
    progressPercent: { color: '#10b981', fontSize: 13, fontWeight: '800' },
    progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },

    runGenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0ea5e9', padding: 16, borderRadius: 18, marginBottom: 25 },
    runGenText: { color: '#fff', fontSize: 13, fontWeight: '800' },

    tabRow: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 5, borderRadius: 14, marginBottom: 20 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
    tabBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
    tabBtnTextActive: { color: '#fff' },

    emptyText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: 20, marginBottom: 20 },

    billItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    billLeft: { flexDirection: 'row', alignItems: 'center' },
    unitNum: { color: '#fff', fontSize: 14, fontWeight: '800' },
    residentName: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginTop: 2 },
    amountText: { fontSize: 14, fontWeight: '800' },
    verifyBtnText: { color: '#0ea5e9', fontSize: 11, fontWeight: '800', marginTop: 4 },

    remindBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginTop: 6 },
    remindBtnText: { color: '#ef4444', fontSize: 10, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2E3A42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 15 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    methodBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    methodBtnActive: { backgroundColor: '#0ea5e9' },
    methodBtnText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
    methodBtnTextActive: { color: '#fff', fontWeight: '800' },

    textInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, fontSize: 16, fontWeight: '600', marginBottom: 10 },
    submitBtn: { backgroundColor: '#0ea5e9', height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    verifyDetailBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    verifyTextLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    verifyTextVal: { fontSize: 14, color: '#fff', fontWeight: '700', marginBottom: 15 },
    verifyReceiptPreview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 20, resizeMode: 'contain' },
    
    decisionRow: { flexDirection: 'row', gap: 15, marginTop: 25 },
    decisionBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    decisionBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    genModalSub: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: 20 }
});
