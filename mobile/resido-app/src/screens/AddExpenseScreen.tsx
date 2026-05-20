import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, ActivityIndicator,
    Alert, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { mySpaceApi, authApi } from '../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES = ['Food', 'Transport', 'Rent', 'Shopping', 'Utilities', 'Health', 'Entertainment', 'Others'];
const METHODS = ['Cash', 'UPI', 'Card', 'Net Banking'];

export default function AddExpenseScreen() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('Food');
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [customCategory, setCustomCategory] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [description, setDescription] = useState('');
    const [billFile, setBillFile] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
            });
            if (!result.canceled) {
                setBillFile(result.assets[0]);
            }
        } catch (err) {
            console.error('Pick document error', err);
        }
    };

    const handleSave = async () => {
        if (!amount || (isCustomCategory && !customCategory)) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            let billUrl = '';

            if (billFile) {
                setUploading(true);
                const { data: { uploadUrl, fileKey } } = await authApi.getPresignedUrl(
                    billFile.name,
                    billFile.mimeType || 'image/jpeg',
                    'finance'
                );

                const response = await fetch(billFile.uri);
                const blob = await response.blob();
                await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': billFile.mimeType || 'image/jpeg' } });
                billUrl = uploadUrl.split('?')[0];
                setUploading(false);
            }

            await mySpaceApi.addExpense({
                amount: parseFloat(amount),
                category: isCustomCategory ? customCategory : category,
                date,
                paymentMethod,
                description,
                billUrl
            });

            Alert.alert('Success', 'Expense added successfully', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to add expense', error);
            Alert.alert('Error', 'Failed to save expense. Please try again.');
        } finally {
            setLoading(false);
            setUploading(false);
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
                <Text style={styles.headerTitle}>Add Expense</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
                <View style={styles.formCard}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Amount (₹)</Text>
                        <View style={styles.inputWrapper}>
                            <FontAwesome5 name="rupee-sign" size={16} color="#ef4444" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                placeholder="0.00"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <View style={styles.categoryGrid}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity 
                                    key={cat} 
                                    style={[styles.chip, category === cat && !isCustomCategory && styles.activeChip]}
                                    onPress={() => { setCategory(cat); setIsCustomCategory(false); }}
                                >
                                    <Text style={[styles.chipText, category === cat && !isCustomCategory && styles.activeChipText]}>{cat}</Text>
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
                                <TextInput 
                                    style={styles.input}
                                    placeholder="Enter custom category"
                                    placeholderTextColor="#64748b"
                                    value={customCategory}
                                    onChangeText={setCustomCategory}
                                />
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Payment Method</Text>
                        <View style={styles.categoryGrid}>
                            {METHODS.map((m) => (
                                <TouchableOpacity 
                                    key={m} 
                                    style={[styles.chip, paymentMethod === m && styles.activeChip]}
                                    onPress={() => setPaymentMethod(m)}
                                >
                                    <Text style={[styles.chipText, paymentMethod === m && styles.activeChipText]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Date</Text>
                        <View style={styles.inputWrapper}>
                            <Ionicons name="calendar-outline" size={20} color="#1d4ed8" style={styles.inputIcon} />
                            <TextInput 
                                style={styles.input}
                                value={date}
                                onChangeText={setDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748b"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <View style={[styles.inputWrapper, { height: 100, alignItems: 'flex-start', paddingTop: 12 }]}>
                            <TextInput 
                                style={[styles.input, { height: 80 }]}
                                placeholder="What was this for?"
                                placeholderTextColor="#64748b"
                                multiline
                                value={description}
                                onChangeText={setDescription}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Upload Bill (Optional)</Text>
                        <TouchableOpacity style={styles.uploadArea} onPress={pickDocument}>
                            {billFile ? (
                                <View style={styles.fileInfo}>
                                    <Ionicons name="document-text" size={24} color="#1d4ed8" />
                                    <Text style={styles.fileName} numberOfLines={1}>{billFile.name}</Text>
                                    <TouchableOpacity onPress={() => setBillFile(null)}>
                                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={32} color="#1d4ed8" />
                                    <Text style={styles.uploadText}>Tap to upload bill or receipt</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.saveBtn, (loading || uploading) && { opacity: 0.7 }]} 
                    onPress={handleSave}
                    disabled={loading || uploading}
                >
                    {loading || uploading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ActivityIndicator color="#fff" />
                            <Text style={styles.saveBtnText}>{uploading ? 'Uploading Bill...' : 'Saving...'}</Text>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.saveBtnText}>Save Expense</Text>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    
    formCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    inputGroup: { marginBottom: 24 },
    label: { fontSize: 14, fontWeight: '700', color: '#94a3b8', marginBottom: 12, marginLeft: 4 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, height: 56, fontSize: 16, color: '#fff', fontWeight: '600' },
    
    categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    activeChip: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    chipText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    activeChipText: { color: '#fff' },
    
    uploadArea: { height: 100, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#1d4ed8', backgroundColor: 'rgba(37, 99, 235, 0.05)', alignItems: 'center', justifyContent: 'center', gap: 8 },
    uploadText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
    fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
    fileName: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '600' },

    saveBtn: { backgroundColor: '#ef4444', height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 40, gap: 10, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    saveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
