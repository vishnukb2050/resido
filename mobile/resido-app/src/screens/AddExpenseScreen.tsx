import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
    Alert, Image, Modal, Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as DocumentPicker from 'expo-document-picker';
import { mySpaceApi, authApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    'Food', 'Groceries', 'Transport', 'Fuel', 'Rent', 'Utilities',
    'Shopping', 'Health', 'Education', 'Entertainment', 'Travel',
    'Subscriptions', 'Maintenance', 'EMI / Loans', 'Gifts', 'Insurance',
    'Personal Care', 'Donations', 'Others',
];
const METHODS = ['Cash', 'UPI', 'Card', 'Net Banking', 'Wallet', 'Cheque'];

const todayIso = () => new Date().toISOString().split('T')[0];
const formatDateForDisplay = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AddExpenseScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; data?: string }>();
    const isEdit = !!params?.id;

    const editEntry = React.useMemo(() => {
        if (!params?.data) return null;
        try { return JSON.parse(String(params.data)); } catch { return null; }
    }, [params?.data]);

    const [amount, setAmount] = useState<string>(editEntry?.amount ? String(editEntry.amount) : '');
    const [category, setCategory] = useState<string>(
        editEntry?.category && CATEGORIES.includes(editEntry.category) ? editEntry.category : 'Food',
    );
    const [isCustomCategory, setIsCustomCategory] = useState<boolean>(
        editEntry?.category ? !CATEGORIES.includes(editEntry.category) : false,
    );
    const [customCategory, setCustomCategory] = useState<string>(
        editEntry?.category && !CATEGORIES.includes(editEntry.category) ? editEntry.category : '',
    );

    const [paymentMethod, setPaymentMethod] = useState<string>(
        editEntry?.paymentMethod && METHODS.includes(editEntry.paymentMethod) ? editEntry.paymentMethod : 'Cash',
    );
    const [isCustomMethod, setIsCustomMethod] = useState<boolean>(
        editEntry?.paymentMethod ? !METHODS.includes(editEntry.paymentMethod) : false,
    );
    const [customMethod, setCustomMethod] = useState<string>(
        editEntry?.paymentMethod && !METHODS.includes(editEntry.paymentMethod) ? editEntry.paymentMethod : '',
    );

    const [date, setDate] = useState<string>(
        editEntry?.date ? new Date(editEntry.date).toISOString().split('T')[0] : todayIso(),
    );
    const [showCalendar, setShowCalendar] = useState(false);

    const [description, setDescription] = useState<string>(editEntry?.description || '');
    const [billFile, setBillFile] = useState<any>(null);
    const [billUrl, setBillUrl] = useState<string | null>(editEntry?.billUrl || null);

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
                setBillFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Pick document error', err);
        }
    };

    const uploadBill = async (): Promise<string | null> => {
        if (!billFile) return billUrl;
        try {
            setUploading(true);
            const fileName = billFile.name || `bill_${Date.now()}.jpg`;
            const contentType = billFile.mimeType || 'image/jpeg';
            const { data } = await authApi.getPresignedUrl(fileName, contentType, 'finance');
            const response = await fetch(billFile.uri);
            const blob = await response.blob();
            const putRes = await fetch(data.uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': contentType },
            });
            if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
            return data.fileUrl || data.key || data.uploadUrl.split('?')[0];
        } catch (err) {
            console.error('Bill upload failed', err);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        const amt = parseFloat(amount.replace(/,/g, ''));
        if (!amt || Number.isNaN(amt) || amt <= 0) {
            Alert.alert('Amount required', 'Please enter a valid amount.');
            return;
        }
        const finalCategory = (isCustomCategory ? customCategory : category).trim();
        if (!finalCategory) {
            Alert.alert('Category required', 'Please pick or type a category.');
            return;
        }
        const finalMethod = (isCustomMethod ? customMethod : paymentMethod).trim();
        if (!finalMethod) {
            Alert.alert('Payment method required', 'Please pick or type a payment method.');
            return;
        }
        if (!date) {
            Alert.alert('Date required', 'Please pick a date.');
            return;
        }

        try {
            setSaving(true);
            const finalBillUrl = await uploadBill();

            const payload = {
                amount: amt,
                category: finalCategory,
                date,
                paymentMethod: finalMethod,
                description: description.trim() || undefined,
                billUrl: finalBillUrl || undefined,
            };

            if (isEdit && params?.id) {
                await mySpaceApi.updateExpense(String(params.id), payload);
                Alert.alert('Updated', 'Expense updated successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                await mySpaceApi.addExpense(payload);
                Alert.alert('Saved', 'Expense added successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch (error: any) {
            console.error('Failed to save expense', error);
            const msg = error?.response?.data?.message || error?.message || 'Please try again.';
            Alert.alert('Could not save', String(msg));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!isEdit || !params?.id) return;
        Alert.alert('Delete expense?', 'This entry will be removed permanently.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDeleting(true);
                        await mySpaceApi.deleteExpense(String(params.id));
                        router.back();
                    } catch (e: any) {
                        Alert.alert('Could not delete', e?.response?.data?.message || 'Please try again.');
                    } finally {
                        setDeleting(false);
                    }
                },
            },
        ]);
    };

    const previewBill = billFile?.uri || (billUrl ? resolveMediaUrl(billUrl) : null);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
                {isEdit ? (
                    <TouchableOpacity onPress={handleDelete} style={styles.backBtn} disabled={deleting}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                <View style={styles.formCard}>
                    {/* Amount */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (₹) *</Text>
                        <View style={styles.inputWrapper}>
                            <FontAwesome5 name="rupee-sign" size={16} color="#ef4444" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#9A8EBA"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                    </View>

                    {/* Category */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category *</Text>
                        <View style={styles.chipsRow}>
                            {CATEGORIES.map((c) => (
                                <TouchableOpacity
                                    key={c}
                                    style={[styles.chip, !isCustomCategory && category === c && styles.activeChip]}
                                    onPress={() => { setCategory(c); setIsCustomCategory(false); }}
                                >
                                    <Text style={[styles.chipText, !isCustomCategory && category === c && styles.activeChipText]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.chip, isCustomCategory && styles.activeChip]}
                                onPress={() => setIsCustomCategory(true)}
                            >
                                <Text style={[styles.chipText, isCustomCategory && styles.activeChipText]}>+ Custom</Text>
                            </TouchableOpacity>
                        </View>
                        {isCustomCategory && (
                            <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                                <FontAwesome5 name="pencil-alt" size={14} color="#8b5cf6" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type custom category"
                                    placeholderTextColor="#9A8EBA"
                                    value={customCategory}
                                    onChangeText={setCustomCategory}
                                />
                            </View>
                        )}
                    </View>

                    {/* Payment method */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Payment Method *</Text>
                        <View style={styles.chipsRow}>
                            {METHODS.map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.chip, !isCustomMethod && paymentMethod === m && styles.activeChip]}
                                    onPress={() => { setPaymentMethod(m); setIsCustomMethod(false); }}
                                >
                                    <Text style={[styles.chipText, !isCustomMethod && paymentMethod === m && styles.activeChipText]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.chip, isCustomMethod && styles.activeChip]}
                                onPress={() => setIsCustomMethod(true)}
                            >
                                <Text style={[styles.chipText, isCustomMethod && styles.activeChipText]}>+ Custom</Text>
                            </TouchableOpacity>
                        </View>
                        {isCustomMethod && (
                            <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                                <FontAwesome5 name="pencil-alt" size={14} color="#8b5cf6" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type method (e.g. PhonePe, Paytm, EMI)"
                                    placeholderTextColor="#9A8EBA"
                                    value={customMethod}
                                    onChangeText={setCustomMethod}
                                />
                            </View>
                        )}
                    </View>

                    {/* Date */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date *</Text>
                        <TouchableOpacity style={styles.inputWrapper} onPress={() => setShowCalendar(true)}>
                            <Ionicons name="calendar-outline" size={20} color="#8b5cf6" style={styles.inputIcon} />
                            <Text style={[styles.input, { textAlignVertical: 'center', paddingTop: 18 }]}>
                                {formatDateForDisplay(date)}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#9A8EBA" />
                        </TouchableOpacity>
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description (Optional)</Text>
                        <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingVertical: 12 }]}>
                            <TextInput
                                style={[styles.input, { height: 80, paddingTop: 0 }]}
                                placeholder="What was this for?"
                                placeholderTextColor="#9A8EBA"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    {/* Bill upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Upload Bill (Optional)</Text>
                        <TouchableOpacity style={styles.uploadArea} onPress={pickDocument}>
                            {previewBill ? (
                                <View style={styles.fileInfo}>
                                    {(billFile?.mimeType?.startsWith('image/') || billUrl) ? (
                                        <Image source={{ uri: previewBill }} style={styles.previewImg} />
                                    ) : (
                                        <Ionicons name="document-text" size={28} color="#8b5cf6" />
                                    )}
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {billFile?.name || 'Existing bill'}
                                    </Text>
                                    <TouchableOpacity onPress={() => { setBillFile(null); setBillUrl(null); }}>
                                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={30} color="#8b5cf6" />
                                    <Text style={styles.uploadText}>Tap to upload bill or receipt</Text>
                                    <Text style={styles.uploadHint}>JPG, PNG, PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {isEdit && billUrl && !billFile ? (
                            <TouchableOpacity
                                style={styles.viewExistingBtn}
                                onPress={() => Linking.openURL(resolveMediaUrl(billUrl) || billUrl)}
                            >
                                <Ionicons name="open-outline" size={14} color="#8b5cf6" />
                                <Text style={styles.viewExistingTxt}>View current bill</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.saveBtn, (saving || uploading) && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving || uploading}
                >
                    {saving || uploading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.saveBtnText}>{uploading ? 'Uploading bill…' : 'Saving…'}</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.saveBtnText}>{isEdit ? 'Update Expense' : 'Save Expense'}</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>

            {/* Date picker modal */}
            <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Pick a date</Text>
                            <TouchableOpacity onPress={() => setShowCalendar(false)}>
                                <Ionicons name="close" size={22} color="#2D2445" />
                            </TouchableOpacity>
                        </View>
                        <Calendar
                            current={date}
                            maxDate={todayIso()}
                            onDayPress={(d: any) => { setDate(d.dateString); setShowCalendar(false); }}
                            markedDates={{ [date]: { selected: true, selectedColor: '#8b5cf6' } }}
                            theme={{
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
                            }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },

    formCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#D4C9E8' },
    inputGroup: { marginBottom: 22 },
    label: { fontSize: 13, fontWeight: '700', color: '#7A6B9C', marginBottom: 10, marginLeft: 2 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#D4C9E8', paddingHorizontal: 14, minHeight: 54 },
    inputIcon: { marginRight: 10 },
    input: { flex: 1, height: 54, fontSize: 15, color: '#2D2445', fontWeight: '600' },

    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#D4C9E8' },
    activeChip: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    chipText: { fontSize: 12, fontWeight: '700', color: '#7A6B9C' },
    activeChipText: { color: '#ffffff' },

    uploadArea: { minHeight: 110, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#C4B5DC', backgroundColor: '#FAF7FF', alignItems: 'center', justifyContent: 'center', padding: 14, gap: 6 },
    uploadText: { fontSize: 13, color: '#7A6B9C', fontWeight: '700' },
    uploadHint: { fontSize: 11, color: '#9A8EBA' },
    fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingHorizontal: 8 },
    fileName: { flex: 1, fontSize: 13, color: '#2D2445', fontWeight: '700' },
    previewImg: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F4EEFC' },
    viewExistingBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
    viewExistingTxt: { color: '#8b5cf6', fontWeight: '700', fontSize: 12 },

    saveBtn: { backgroundColor: '#ef4444', height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 10 },
    saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(45,36,69,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#E2D9F2' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
});
