import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
    Alert, Modal, Image, Linking
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import * as DocumentPicker from 'expo-document-picker';
import { mySpaceApi, authApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

const { width } = Dimensions.get('window');

const PRESET_SOURCES = ['Salary', 'Freelance', 'Business', 'Rental', 'Investment', 'Gift', 'Refund', 'Other'];

const todayIso = () => new Date().toISOString().split('T')[0];
const formatDateForDisplay = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AddIncomeScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ id?: string; data?: string }>();
    const isEdit = !!params?.id;

    // Pre-fill if edit mode was opened with a serialized entry.
    const editEntry = React.useMemo(() => {
        if (!params?.data) return null;
        try { return JSON.parse(String(params.data)); } catch { return null; }
    }, [params?.data]);

    const [source, setSource] = useState<string>(editEntry?.source || '');
    const [isCustomSource, setIsCustomSource] = useState<boolean>(
        editEntry?.source ? !PRESET_SOURCES.includes(editEntry.source) : false,
    );
    const [amount, setAmount] = useState<string>(editEntry?.amount ? String(editEntry.amount) : '');
    const [description, setDescription] = useState<string>(editEntry?.description || '');
    const [date, setDate] = useState<string>(
        editEntry?.date ? new Date(editEntry.date).toISOString().split('T')[0] : todayIso(),
    );
    const [showCalendar, setShowCalendar] = useState(false);

    const [receiptFile, setReceiptFile] = useState<any>(null);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(editEntry?.receiptUrl || null);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const pickReceipt = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
                setReceiptFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Pick receipt error', err);
        }
    };

    const uploadReceipt = async (): Promise<string | null> => {
        if (!receiptFile) return receiptUrl;
        try {
            setUploading(true);
            const fileName = receiptFile.name || `receipt_${Date.now()}.jpg`;
            const contentType = receiptFile.mimeType || 'image/jpeg';
            const { data } = await authApi.getPresignedUrl(fileName, contentType, 'finance');
            const response = await fetch(receiptFile.uri);
            const blob = await response.blob();
            const putRes = await fetch(data.uploadUrl, {
                method: 'PUT',
                body: blob,
                headers: { 'Content-Type': contentType },
            });
            if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
            // Prefer the public R2.dev URL the backend hands back; fall back to the
            // raw key (resolveMediaUrl turns it into a full URL at display time).
            return data.fileUrl || data.key || data.uploadUrl.split('?')[0];
        } catch (err) {
            console.error('Receipt upload failed', err);
            throw err;
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        const sourceVal = (isCustomSource ? source : source).trim();
        if (!sourceVal) {
            Alert.alert('Source required', 'Please select or enter an income source');
            return;
        }
        const amt = parseFloat(amount.replace(/,/g, ''));
        if (!amt || Number.isNaN(amt) || amt <= 0) {
            Alert.alert('Amount required', 'Please enter a valid amount');
            return;
        }
        if (!date) {
            Alert.alert('Date required', 'Please pick a date');
            return;
        }

        try {
            setSaving(true);
            const finalReceiptUrl = await uploadReceipt();

            const payload = {
                source: sourceVal,
                amount: amt,
                date,
                description: description.trim() || undefined,
                receiptUrl: finalReceiptUrl || undefined,
            };

            if (isEdit && params?.id) {
                await mySpaceApi.updateIncome(String(params.id), payload);
                Alert.alert('Updated', 'Income updated successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            } else {
                await mySpaceApi.addIncome(payload);
                Alert.alert('Saved', 'Income added successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch (error: any) {
            console.error('Failed to save income', error);
            const msg = error?.response?.data?.message || error?.message || 'Please try again.';
            Alert.alert('Could not save', String(msg));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = () => {
        if (!isEdit || !params?.id) return;
        Alert.alert('Delete income?', 'This entry will be removed permanently.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDeleting(true);
                        await mySpaceApi.deleteIncome(String(params.id));
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

    const previewReceipt = receiptFile?.uri || (receiptUrl ? resolveMediaUrl(receiptUrl) : null);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={22} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEdit ? 'Edit Income' : 'Add Income'}</Text>
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
                    {/* Source */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Income Source *</Text>
                        <View style={styles.chipsRow}>
                            {PRESET_SOURCES.map((s) => (
                                <TouchableOpacity
                                    key={s}
                                    style={[styles.chip, !isCustomSource && source === s && styles.activeChip]}
                                    onPress={() => { setIsCustomSource(false); setSource(s); }}
                                >
                                    <Text style={[styles.chipText, !isCustomSource && source === s && styles.activeChipText]}>{s}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity
                                style={[styles.chip, isCustomSource && styles.activeChip]}
                                onPress={() => { setIsCustomSource(true); setSource(''); }}
                            >
                                <Text style={[styles.chipText, isCustomSource && styles.activeChipText]}>+ Custom</Text>
                            </TouchableOpacity>
                        </View>
                        {isCustomSource && (
                            <View style={[styles.inputWrapper, { marginTop: 12 }]}>
                                <FontAwesome5 name="pencil-alt" size={14} color="#8b5cf6" style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type custom source"
                                    placeholderTextColor="#9A8EBA"
                                    value={source}
                                    onChangeText={setSource}
                                />
                            </View>
                        )}
                    </View>

                    {/* Amount */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (₹) *</Text>
                        <View style={styles.inputWrapper}>
                            <FontAwesome5 name="rupee-sign" size={16} color="#10b981" style={styles.inputIcon} />
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
                                placeholder="Any notes about this income…"
                                placeholderTextColor="#9A8EBA"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    {/* Receipt / Source upload */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Receipt / Source Proof (Optional)</Text>
                        <TouchableOpacity style={styles.uploadArea} onPress={pickReceipt}>
                            {previewReceipt ? (
                                <View style={styles.fileInfo}>
                                    {/* eslint-disable-next-line react-native/no-inline-styles */}
                                    {(receiptFile?.mimeType?.startsWith('image/') || receiptUrl) ? (
                                        <Image source={{ uri: previewReceipt }} style={styles.previewImg} />
                                    ) : (
                                        <Ionicons name="document-text" size={28} color="#8b5cf6" />
                                    )}
                                    <Text style={styles.fileName} numberOfLines={1}>
                                        {receiptFile?.name || 'Existing receipt'}
                                    </Text>
                                    <TouchableOpacity onPress={() => { setReceiptFile(null); setReceiptUrl(null); }}>
                                        <Ionicons name="close-circle" size={22} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={30} color="#8b5cf6" />
                                    <Text style={styles.uploadText}>Tap to upload receipt or source proof</Text>
                                    <Text style={styles.uploadHint}>JPG, PNG, PDF</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        {isEdit && receiptUrl && !receiptFile ? (
                            <TouchableOpacity
                                style={styles.viewExistingBtn}
                                onPress={() => Linking.openURL(resolveMediaUrl(receiptUrl) || receiptUrl)}
                            >
                                <Ionicons name="open-outline" size={14} color="#8b5cf6" />
                                <Text style={styles.viewExistingTxt}>View current receipt</Text>
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
                            <Text style={styles.saveBtnText}>{uploading ? 'Uploading receipt…' : 'Saving…'}</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.saveBtnText}>{isEdit ? 'Update Income' : 'Save Income'}</Text>
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

    saveBtn: { backgroundColor: '#10b981', height: 56, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, gap: 10 },
    saveBtnText: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(45,36,69,0.45)', justifyContent: 'center', paddingHorizontal: 20 },
    modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 12, borderWidth: 1, borderColor: '#E2D9F2' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 10 },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
});
