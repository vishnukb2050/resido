import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { communityFinanceApi } from '../services/api';
import { storageApi } from '../services/storage';
import { useAuthStore } from '../store/authStore';

export default function ResidentPaymentsScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [bills, setBills] = useState<any[]>([]);
    
    // Payment Submission Modal State
    const [submitting, setSubmitting] = useState(false);
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [description, setDescription] = useState('');
    const [receiptUri, setReceiptUri] = useState<string | null>(null);

    const fetchBills = async () => {
        setLoading(true);
        try {
            const res = await communityFinanceApi.getResidentBills();
            setBills(res.data || []);
        } catch (e) {
            console.error('Failed to load resident bills', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBills();
    }, []);

    const handlePickReceipt = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setReceiptUri(result.assets[0].uri);
        }
    };

    const handleSubmitProof = async () => {
        if (!receiptUri) {
            Alert.alert('Error', 'Please upload a screenshot/photo of the transaction receipt.');
            return;
        }

        setSubmitting(true);
        try {
            // Upload proof to S3-compatible Cloudflare R2!
            const uploadedUrl = await storageApi.uploadFile(
                receiptUri,
                `receipt_${selectedBill.id}_${Date.now()}.jpg`,
                'image/jpeg',
                'receipts'
            );

            await communityFinanceApi.submitProof(selectedBill.id, {
                receiptUrl: uploadedUrl as string,
                paymentMethod,
                description
            });

            Alert.alert('Success', 'Payment proof submitted successfully! Admin will verify and notify you.');
            setSelectedBill(null);
            setReceiptUri(null);
            setDescription('');
            fetchBills();
        } catch (err: any) {
            Alert.alert('Error', 'Failed to upload or submit proof.');
        } finally {
            setSubmitting(false);
        }
    };

    const outstandingBills = bills.filter(b => b.status === 'UNPAID' || b.status === 'OVERDUE');
    const pendingBills = bills.filter(b => b.status === 'PENDING_VERIFICATION');
    const paidBills = bills.filter(b => b.status === 'PAID');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Payments</Text>
                <TouchableOpacity onPress={fetchBills} style={styles.backBtn}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Workspace/Community Card */}
                    <View style={styles.communityCard}>
                        <Ionicons name="business" size={24} color="#ec4899" />
                        <View style={{ marginLeft: 15 }}>
                            <Text style={styles.communityName}>{activeWorkspace?.tenantName || 'My Community'}</Text>
                            <Text style={styles.communityTag}>Maintenance Portal</Text>
                        </View>
                    </View>

                    {/* Section: Outstanding Bills */}
                    <Text style={styles.sectionTitle}>Outstanding Dues</Text>
                    {outstandingBills.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                            <Text style={styles.emptyText}>You are all caught up! No pending dues.</Text>
                        </View>
                    ) : (
                        outstandingBills.map(bill => (
                            <View key={bill.id} style={styles.billCard}>
                                <View style={styles.billRow}>
                                    <View>
                                        <Text style={styles.billMonth}>Maintenance - {getMonthName(bill.month)} {bill.year}</Text>
                                        <Text style={styles.billDue}>Due: {new Date(bill.dueDate).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.billAmount}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                </View>
                                {bill.rejectionReason && (
                                    <View style={styles.rejectionBox}>
                                        <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
                                        <Text style={styles.rejectionText}>{bill.rejectionReason}</Text>
                                    </View>
                                )}
                                <TouchableOpacity 
                                    style={styles.payBtn} 
                                    onPress={() => {
                                        setSelectedBill(bill);
                                        setPaymentMethod('UPI');
                                        setDescription('');
                                        setReceiptUri(null);
                                    }}
                                >
                                    <Text style={styles.payBtnText}>Submit Payment Receipt</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}

                    {/* Section: Pending Verification */}
                    {pendingBills.length > 0 && (
                        <>
                            <Text style={styles.sectionTitle}>Pending Verification</Text>
                            {pendingBills.map(bill => (
                                <View key={bill.id} style={[styles.billCard, { borderColor: 'rgba(245, 158, 11, 0.3)' }]}>
                                    <View style={styles.billRow}>
                                        <View>
                                            <Text style={styles.billMonth}>Maintenance - {getMonthName(bill.month)} {bill.year}</Text>
                                            <Text style={styles.billDue}>Verifying offline proof...</Text>
                                        </View>
                                        <Text style={[styles.billAmount, { color: '#f59e0b' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                    </View>
                                </View>
                            ))}
                        </>
                    )}

                    {/* Section: Payment History */}
                    <Text style={styles.sectionTitle}>Payment History</Text>
                    {paidBills.length === 0 ? (
                        <Text style={styles.noHistoryText}>No past paid bills found.</Text>
                    ) : (
                        paidBills.map(bill => (
                            <View key={bill.id} style={styles.historyCard}>
                                <View style={styles.billRow}>
                                    <View>
                                        <Text style={styles.historyMonth}>Paid - {getMonthName(bill.month)} {bill.year}</Text>
                                        <Text style={styles.historyDate}>Verified: {bill.paymentDate ? new Date(bill.paymentDate).toLocaleDateString() : 'Yes'}</Text>
                                    </View>
                                    <Text style={styles.historyAmount}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Submit Payment Proof Modal */}
            <Modal
                visible={selectedBill !== null}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSelectedBill(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Submit Receipt Proof</Text>
                            <TouchableOpacity onPress={() => setSelectedBill(null)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {selectedBill && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.modalSub}>
                                    Maintenance dues of ₹ {selectedBill.totalAmount.toLocaleString()} for {getMonthName(selectedBill.month)} {selectedBill.year}
                                </Text>

                                {/* Payment Method Picker */}
                                <Text style={styles.inputLabel}>Payment Method Used</Text>
                                <View style={styles.methodRow}>
                                    {['UPI', 'BANK_TRANSFER', 'CASH', 'CARD'].map(m => (
                                        <TouchableOpacity 
                                            key={m} 
                                            style={[styles.methodBtn, paymentMethod === m && styles.methodBtnActive]}
                                            onPress={() => setPaymentMethod(m)}
                                        >
                                            <Text style={[styles.methodBtnText, paymentMethod === m && styles.methodBtnTextActive]}>{m.replace('_', ' ')}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Receipt Upload Picker */}
                                <Text style={styles.inputLabel}>Transaction Receipt Screenshot</Text>
                                <TouchableOpacity style={styles.receiptPicker} onPress={handlePickReceipt}>
                                    {receiptUri ? (
                                        <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
                                    ) : (
                                        <View style={{ alignItems: 'center' }}>
                                            <Ionicons name="cloud-upload-outline" size={32} color="#94a3b8" />
                                            <Text style={styles.receiptPickerText}>Tap to choose receipt photo/screenshot</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                {/* Description Note */}
                                <Text style={styles.inputLabel}>Additional Note / Reference No.</Text>
                                <TextInput
                                    style={styles.textInput}
                                    placeholder="e.g. Transaction Ref: UPI9204859..."
                                    placeholderTextColor="#94a3b8"
                                    value={description}
                                    onChangeText={setDescription}
                                    multiline
                                />

                                <TouchableOpacity 
                                    style={styles.submitBtn} 
                                    onPress={handleSubmitProof}
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.submitBtnText}>Submit Proof to Admin</Text>
                                    )}
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
    
    communityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, marginTop: 10, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    communityName: { color: '#fff', fontSize: 16, fontWeight: '800' },
    communityTag: { color: '#94a3b8', fontSize: 11, fontWeight: '600', marginTop: 2 },

    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#fff', marginBottom: 15, marginTop: 5 },
    emptyCard: { backgroundColor: '#2E3A42', padding: 25, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 25 },
    emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 12 },

    billCard: { backgroundColor: '#2E3A42', padding: 20, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    billMonth: { fontSize: 15, fontWeight: '800', color: '#fff' },
    billDue: { fontSize: 12, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    billAmount: { fontSize: 16, fontWeight: '900', color: '#fff' },
    
    rejectionBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 12, marginTop: 12 },
    rejectionLabel: { color: '#f87171', fontSize: 11, fontWeight: '800' },
    rejectionText: { color: '#fca5a5', fontSize: 12, fontWeight: '600', marginTop: 2 },

    payBtn: { backgroundColor: '#ec4899', height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 15 },
    payBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

    noHistoryText: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 25, marginLeft: 5 },
    historyCard: { backgroundColor: '#2E3A42', padding: 18, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', opacity: 0.8 },
    historyMonth: { fontSize: 14, fontWeight: '800', color: '#cbd5e1' },
    historyDate: { fontSize: 11, color: '#64748b', marginTop: 4, fontWeight: '600' },
    historyAmount: { fontSize: 15, fontWeight: '800', color: '#10b981' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2E3A42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    modalSub: { fontSize: 13, color: '#94a3b8', marginBottom: 20, fontWeight: '600' },

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 15 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    methodBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    methodBtnActive: { backgroundColor: '#ec4899' },
    methodBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
    methodBtnTextActive: { color: '#fff' },

    receiptPicker: { height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    receiptPreview: { width: '100%', height: '100%' },
    receiptPickerText: { fontSize: 12, color: '#64748b', marginTop: 8, fontWeight: '600' },

    textInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 14, fontSize: 14, fontWeight: '600', height: 70, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#ec4899', height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 25, shadowColor: '#ec4899', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' }
});
