import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SectionList, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { communityFinanceApi, communitySplitsApi } from '../services/api';
import { storageApi } from '../services/storage';
import { useAuthStore } from '../store/authStore';
type PayMode = 'maintenance' | 'split';

type PaySection = {
    key: string;
    title: string;
    groupTitle?: string;
    groupTitleSpaced?: boolean;
    groupHint?: string;
    variant: 'maint-pay' | 'maint-pending' | 'maint-paid' | 'split-pay' | 'split-pending' | 'split-paid';
    data: any[];
};

const MaintDueCard = React.memo(function MaintDueCard({ bill, onPay }: { bill: any; onPay: (b: any) => void }) {
    return (
        <View style={styles.billCard}>
            <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billMonth}>{getMonthName(bill.month)} {bill.year}</Text>
                    <Text style={styles.billDue}>Due: {new Date(bill.dueDate).toLocaleDateString()}</Text>
                </View>
                <Text style={styles.billAmount}>₹ {bill.totalAmount.toLocaleString()}</Text>
            </View>
            {(bill.adminNote || bill.rejectionReason) && (
                <View style={styles.adminNoteBox}>
                    <Ionicons name="information-circle" size={14} color="#f87171" />
                    <Text style={styles.adminNoteText}>{bill.adminNote || bill.rejectionReason}</Text>
                </View>
            )}
            <TouchableOpacity style={styles.payBtn} onPress={() => onPay(bill)}>
                <Text style={styles.payBtnText}>Upload Payment Receipt</Text>
            </TouchableOpacity>
        </View>
    );
});

const MaintPendingCard = React.memo(function MaintPendingCard({ bill }: { bill: any }) {
    return (
        <View style={[styles.billCard, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billMonth}>{getMonthName(bill.month)} {bill.year}</Text>
                    <Text style={styles.billDue}>Awaiting admin verification</Text>
                    {bill.amountPaid ? <Text style={styles.paidAmtTag}>Submitted: ₹{bill.amountPaid.toLocaleString()}</Text> : null}
                </View>
                <Text style={[styles.billAmount, { color: '#f59e0b' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
            </View>
            {bill.description ? <Text style={styles.residentNote}>Your note: {bill.description}</Text> : null}
        </View>
    );
});

const MaintPaidCard = React.memo(function MaintPaidCard({ bill }: { bill: any }) {
    return (
        <View style={styles.historyCard}>
            <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.historyMonth}>{getMonthName(bill.month)} {bill.year}</Text>
                    <Text style={styles.historyDate}>
                        Paid: {bill.paymentDate ? new Date(bill.paymentDate).toLocaleDateString() : '—'}
                        {bill.amountPaid ? ` · ₹${bill.amountPaid.toLocaleString()}` : ''}
                    </Text>
                    {bill.adminNote ? <Text style={styles.adminNoteInline}>{bill.adminNote}</Text> : null}
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            </View>
        </View>
    );
});

const SplitDueCard = React.memo(function SplitDueCard({ share, onPay }: { share: any; onPay: (s: any) => void }) {
    return (
        <View style={[styles.billCard, { borderColor: 'rgba(167, 139, 250, 0.3)' }]}>
            <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billMonth}>{share.purpose}</Text>
                    {share.splitDescription ? <Text style={styles.billDue}>{share.splitDescription}</Text> : null}
                    {share.dueDate ? <Text style={styles.billDue}>Due: {new Date(share.dueDate).toLocaleDateString()}</Text> : null}
                </View>
                <Text style={[styles.billAmount, { color: '#a78bfa' }]}>₹ {share.amount.toLocaleString()}</Text>
            </View>
            {(share.adminNote || share.rejectionReason) && (
                <View style={styles.adminNoteBox}>
                    <Ionicons name="information-circle" size={14} color="#f87171" />
                    <Text style={styles.adminNoteText}>{share.adminNote || share.rejectionReason}</Text>
                </View>
            )}
            <TouchableOpacity style={[styles.payBtn, { backgroundColor: '#7c3aed' }]} onPress={() => onPay(share)}>
                <Text style={styles.payBtnText}>Upload Payment Receipt</Text>
            </TouchableOpacity>
        </View>
    );
});

const SplitPendingCard = React.memo(function SplitPendingCard({ share }: { share: any }) {
    return (
        <View style={[styles.billCard, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
            <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.billMonth}>{share.purpose}</Text>
                    <Text style={styles.billDue}>Awaiting admin verification</Text>
                </View>
                <Text style={[styles.billAmount, { color: '#f59e0b' }]}>₹ {share.amount.toLocaleString()}</Text>
            </View>
        </View>
    );
});

const SplitPaidCard = React.memo(function SplitPaidCard({ share }: { share: any }) {
    return (
        <View style={styles.historyCard}>
            <View style={styles.billRow}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.historyMonth}>{share.purpose}</Text>
                    <Text style={styles.historyDate}>
                        Paid: {share.paymentDate ? new Date(share.paymentDate).toLocaleDateString() : '—'}
                    </Text>
                    {share.adminNote ? <Text style={styles.adminNoteInline}>{share.adminNote}</Text> : null}
                </View>
                <Ionicons name="checkmark-circle" size={22} color="#10b981" />
            </View>
        </View>
    );
});

export default function ResidentPaymentsScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [bills, setBills] = useState<any[]>([]);
    const [splitShares, setSplitShares] = useState<any[]>([]);
    const [unitLabel, setUnitLabel] = useState<string | null>(null);
    const [unitInfo, setUnitInfo] = useState<any | null>(null);

    // Payment modal
    const [payMode, setPayMode] = useState<PayMode>('maintenance');
    const [submitting, setSubmitting] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [selectedShare, setSelectedShare] = useState<any | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [description, setDescription] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);

    const fetchAll = async () => {
        try {
            const [billsRes, splitsRes] = await Promise.all([
                communityFinanceApi.getResidentBills(),
                communitySplitsApi.mine(),
            ]);

            // Backend now returns { unit, unitLabel, bills } / { unit, unitLabel, shares }
            // for unit-wise scoping. Fall back to legacy array shape for safety.
            const billsData = billsRes.data;
            if (Array.isArray(billsData)) {
                setBills(billsData);
            } else {
                setBills(billsData?.bills || []);
                setUnitLabel(billsData?.unitLabel || null);
                setUnitInfo(billsData?.unit || null);
            }

            const splitData = splitsRes.data;
            if (Array.isArray(splitData)) {
                setSplitShares(splitData);
            } else {
                setSplitShares(splitData?.shares || []);
                if (!unitLabel && splitData?.unitLabel) setUnitLabel(splitData.unitLabel);
                if (!unitInfo && splitData?.unit) setUnitInfo(splitData.unit);
            }
        } catch (e) {
            console.error('Failed to load payments', e);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try { await fetchAll(); } finally { setLoading(false); }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try { await fetchAll(); } finally { setRefreshing(false); }
    };

    useFocusEffect(useCallback(() => { loadData(); }, []));

    const openMaintenancePay = useCallback((bill: any) => {
        setPayMode('maintenance');
        setSelectedBill(bill);
        setSelectedShare(null);
        setPaymentMethod('UPI');
        setDescription('');
        setAmountPaid(String(bill.totalAmount));
        setReceiptUri(null);
    }, []);

    const openSplitPay = useCallback((share: any) => {
        setPayMode('split');
        setSelectedShare(share);
        setSelectedBill(null);
        setPaymentMethod('UPI');
        setDescription('');
        setAmountPaid(String(share.amount));
        setReceiptUri(null);
    }, []);

    const closeModal = () => {
        setSelectedBill(null);
        setSelectedShare(null);
        setReceiptUri(null);
    };

    const handlePickReceipt = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Gallery access is required to upload receipts.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.8,
        });
        if (!result.canceled) setReceiptUri(result.assets[0].uri);
    };

    const handleSubmitProof = async () => {
        if (!receiptUri) {
            Alert.alert('Required', 'Please upload a payment receipt image.');
            return;
        }
        if (!amountPaid || Number(amountPaid) <= 0) {
            Alert.alert('Required', 'Please enter the amount you paid.');
            return;
        }

        setSubmitting(true);
        try {
            const uploadedUrl = await storageApi.uploadFile(
                receiptUri,
                `receipt_${Date.now()}.jpg`,
                'image/jpeg',
                'receipts',
                activeWorkspace?.tenantId,
            );

            const payload = {
                receiptUrl: uploadedUrl as string,
                paymentMethod,
                description: description.trim() || undefined,
                amountPaid: Number(amountPaid),
            };

            if (payMode === 'maintenance' && selectedBill) {
                await communityFinanceApi.submitProof(selectedBill.id, payload);
            } else if (payMode === 'split' && selectedShare) {
                await communitySplitsApi.submitProof(selectedShare.id, payload);
            }

            Alert.alert('Submitted', 'Payment proof sent to admin for verification.');
            closeModal();
            fetchAll();
        } catch {
            Alert.alert('Error', 'Failed to upload or submit payment proof.');
        } finally {
            setSubmitting(false);
        }
    };

    const outstandingBills = bills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE');
    const pendingBills = bills.filter(b => b.status === 'PENDING_VERIFICATION');
    const paidBills = bills.filter(b => b.status === 'PAID');

    const outstandingSplits = splitShares.filter(s => s.status === 'UNPAID' || s.status === 'OVERDUE');
    const pendingSplits = splitShares.filter(s => s.status === 'PENDING_VERIFICATION');
    const paidSplits = splitShares.filter(s => s.status === 'PAID');

    const sections: PaySection[] = [];

    sections.push({
        key: 'maint-out',
        groupTitle: 'Monthly Maintenance',
        title: 'Outstanding Dues',
        variant: 'maint-pay',
        data: outstandingBills.length ? outstandingBills : [{ __empty: 'maint-out' }],
    });
    if (pendingBills.length > 0) {
        sections.push({ key: 'maint-pend', title: 'Pending Verification', variant: 'maint-pending', data: pendingBills });
    }
    sections.push({
        key: 'maint-paid',
        title: 'Paid Months',
        variant: 'maint-paid',
        data: paidBills.length ? paidBills : [{ __empty: 'maint-paid' }],
    });

    const hasSplits = outstandingSplits.length > 0 || pendingSplits.length > 0 || paidSplits.length > 0;
    let splitGroupAttached = false;
    const attachSplitGroup = (s: PaySection): PaySection => {
        if (!splitGroupAttached) {
            splitGroupAttached = true;
            return { ...s, groupTitle: 'Shared Payments', groupTitleSpaced: true, groupHint: 'One-time charges split by admin (not part of monthly maintenance)' };
        }
        return s;
    };
    if (hasSplits) {
        if (outstandingSplits.length > 0) {
            sections.push(attachSplitGroup({ key: 'split-out', title: 'Your Share — Due', variant: 'split-pay', data: outstandingSplits }));
        }
        if (pendingSplits.length > 0) {
            sections.push(attachSplitGroup({ key: 'split-pend', title: 'Pending Verification', variant: 'split-pending', data: pendingSplits }));
        }
        if (paidSplits.length > 0) {
            sections.push(attachSplitGroup({ key: 'split-paid', title: 'Paid Shares', variant: 'split-paid', data: paidSplits }));
        }
    }

    const modalOpen = selectedBill !== null || selectedShare !== null;
    const modalTarget = payMode === 'maintenance' ? selectedBill : selectedShare;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Payments</Text>
                <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item: any, index) => (item.__empty ? `${item.__empty}` : String(item.id)) + index}
                    stickySectionHeadersEnabled={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
                    ListHeaderComponent={
                        <>
                            <View style={styles.communityCard}>
                                <Ionicons name="business" size={24} color="#ec4899" />
                                <View style={{ marginLeft: 15, flex: 1 }}>
                                    <Text style={styles.communityName}>{activeWorkspace?.tenantName || 'My Community'}</Text>
                                    {unitLabel ? (
                                        <Text style={styles.unitTag}>Unit {unitLabel} · shared with all unit residents</Text>
                                    ) : (
                                        <Text style={styles.communityTag}>Monthly maintenance & shared payments</Text>
                                    )}
                                </View>
                            </View>

                            {!unitLabel && (
                                <View style={styles.noUnitBanner}>
                                    <Ionicons name="alert-circle" size={18} color="#f59e0b" />
                                    <Text style={styles.noUnitText}>
                                        You aren't linked to a unit yet. Ask your community admin to assign you to a unit so you can see its maintenance bills and split payments.
                                    </Text>
                                </View>
                            )}
                        </>
                    }
                    renderSectionHeader={({ section }) => {
                        const s = section as unknown as PaySection;
                        return (
                            <>
                                {s.groupTitle ? (
                                    <Text style={[styles.sectionTitle, s.groupTitleSpaced && { marginTop: 28 }]}>{s.groupTitle}</Text>
                                ) : null}
                                {s.groupHint ? <Text style={styles.splitSectionHint}>{s.groupHint}</Text> : null}
                                <Text style={styles.subSectionTitle}>{s.title}</Text>
                            </>
                        );
                    }}
                    renderItem={({ item, section }) => {
                        if (item.__empty === 'maint-out') {
                            return (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="checkmark-circle" size={28} color="#10b981" />
                                    <Text style={styles.emptyText}>No pending maintenance dues.</Text>
                                </View>
                            );
                        }
                        if (item.__empty === 'maint-paid') {
                            return <Text style={styles.noHistoryText}>No paid maintenance records yet.</Text>;
                        }
                        switch ((section as unknown as PaySection).variant) {
                            case 'maint-pay':
                                return <MaintDueCard bill={item} onPay={openMaintenancePay} />;
                            case 'maint-pending':
                                return <MaintPendingCard bill={item} />;
                            case 'maint-paid':
                                return <MaintPaidCard bill={item} />;
                            case 'split-pay':
                                return <SplitDueCard share={item} onPay={openSplitPay} />;
                            case 'split-pending':
                                return <SplitPendingCard share={item} />;
                            case 'split-paid':
                                return <SplitPaidCard share={item} />;
                            default:
                                return null;
                        }
                    }}
                    removeClippedSubviews
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                />
            )}

            {/* Submit Payment Proof Modal */}
            <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={closeModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Submit Payment Receipt</Text>
                            <TouchableOpacity onPress={closeModal}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>

                        {modalTarget && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalSub}>
                                    {payMode === 'maintenance'
                                        ? `Maintenance — ${getMonthName(modalTarget.month)} ${modalTarget.year}`
                                        : `Split: ${modalTarget.purpose}`}
                                    {' · '}Due: ₹ {(modalTarget.totalAmount ?? modalTarget.amount).toLocaleString()}
                                </Text>

                                <Text style={styles.inputLabel}>Amount Paid (INR) *</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="Enter amount you paid"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={amountPaid}
                                    onChangeText={setAmountPaid}
                                />

                                <Text style={styles.inputLabel}>Payment Method</Text>
                                <View style={styles.methodRow}>
                                    {['UPI', 'BANK_TRANSFER', 'CASH', 'CARD'].map(m => (
                                        <TouchableOpacity key={m} style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]} onPress={() => setPaymentMethod(m)}>
                                            <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>{m.replace('_', ' ')}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.inputLabel}>Receipt Image *</Text>
                                <TouchableOpacity style={styles.receiptPicker} onPress={handlePickReceipt}>
                                    {receiptUri ? (
                                        <Image source={{ uri: receiptUri }} style={styles.receiptPreview} resizeMode="contain" />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
                                            <Text style={styles.receiptPickerText}>Tap to upload receipt (full image)</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <Text style={styles.inputLabel}>Description / Reference No.</Text>
                                <TextInput
                                    style={[styles.textInput, { height: 70 }]}
                                    placeholder="e.g. UPI Ref: 9204859123..."
                                    placeholderTextColor="#94a3b8"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                />

                                <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitProof} disabled={submitting}>
                                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit to Admin</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function getMonthName(m: number): string {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1] || 'N/A';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4C5C68' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    communityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, marginTop: 10, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    communityName: { color: '#2D2445', fontSize: 16, fontWeight: '800' },
    communityTag: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },
    unitTag: { color: '#38bdf8', fontSize: 12, fontWeight: '700', marginTop: 4 },

    noUnitBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)', borderWidth: 1, padding: 14, borderRadius: 14, marginBottom: 20 },
    noUnitText: { color: '#fbbf24', fontSize: 12, fontWeight: '600', flex: 1, lineHeight: 18 },

    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    subSectionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 4 },
    splitSectionHint: { color: '#64748b', fontSize: 11, fontWeight: '600', marginBottom: 14, marginTop: -6 },

    emptyCard: { backgroundColor: '#2E3A42', padding: 22, borderRadius: 22, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 10 },

    billCard: { backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billMonth: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    billDue: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    billAmount: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    paidAmtTag: { color: '#f59e0b', fontSize: 11, fontWeight: '700', marginTop: 4 },
    residentNote: { color: '#94a3b8', fontSize: 11, marginTop: 8, fontStyle: 'italic' },

    adminNoteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: 'rgba(239, 68, 68, 0.08)', padding: 10, borderRadius: 10, marginTop: 10 },
    adminNoteText: { color: '#fca5a5', fontSize: 12, fontWeight: '600', flex: 1 },
    adminNoteInline: { color: '#94a3b8', fontSize: 11, fontStyle: 'italic', marginTop: 4 },

    payBtn: { backgroundColor: '#ec4899', height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
    payBtnText: { color: '#2D2445', fontSize: 13, fontWeight: '800' },

    noHistoryText: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 20, marginLeft: 4 },
    historyCard: { backgroundColor: '#2E3A42', padding: 16, borderRadius: 18, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    historyMonth: { fontSize: 14, fontWeight: '800', color: '#cbd5e1' },
    historyDate: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2E3A42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '88%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    modalSub: { fontSize: 13, color: '#94a3b8', marginBottom: 16, fontWeight: '600' },

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 12 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    methodBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    methodBtnActive: { backgroundColor: '#ec4899' },
    methodBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
    methodBtnTextActive: { color: '#2D2445' },

    textInput: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8', color: '#2D2445', padding: 14, fontSize: 14, fontWeight: '600' },
    receiptPicker: { minHeight: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    receiptPreview: { width: '100%', minHeight: 120 },
    receiptPickerText: { fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: '600' },

    submitBtn: { backgroundColor: '#ec4899', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 10 },
    submitBtnText: { color: '#2D2445', fontSize: 14, fontWeight: '900' },
});
