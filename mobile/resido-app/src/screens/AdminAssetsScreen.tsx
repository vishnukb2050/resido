import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Image, Linking
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { communityAssetsApi } from '../services/api';
import { storageApi } from '../services/storage';
import { useAuthStore } from '../store/authStore';

export default function AdminAssetsScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [assets, setAssets] = useState<any[]>([]);
    const [filterCategory, setFilterCategory] = useState<string>('ALL');

    // Create Modal state
    const [showCreate, setShowCreate] = useState(false);
    const [saving, setSaving] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [billUri, setBillUri] = useState<string | null>(null);
    const [billName, setBillName] = useState<string | null>(null);
    const [billMime, setBillMime] = useState<string | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [category, setCategory] = useState('MACHINERY');
    const [status, setStatus] = useState('ACTIVE');
    const [location, setLocation] = useState('');
    const [serialNumber, setSerialNumber] = useState('');
    const [purchaseCost, setPurchaseCost] = useState('');
    const [purchaseDate, setPurchaseDate] = useState<Date | null>(null);
    const [warrantyExpiry, setWarrantyExpiry] = useState<Date | null>(null);
    const [description, setDescription] = useState('');

    const [showPurchasePicker, setShowPurchasePicker] = useState(false);
    const [showWarrantyPicker, setShowWarrantyPicker] = useState(false);

    // Status modification state
    const [editingAsset, setEditingAsset] = useState<any | null>(null);

    const loadAssets = async () => {
        setLoading(true);
        try {
            const res = await communityAssetsApi.getAssets();
            setAssets(res.data || []);
        } catch (e) {
            console.error('Failed to query community assets inventory', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAssets();
    }, []);

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handlePickBill = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/*', 'application/pdf'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setBillUri(asset.uri);
                setBillName(asset.name);
                setBillMime(asset.mimeType || 'application/octet-stream');
            }
        } catch (error) {
            console.error('Failed to pick document', error);
            Alert.alert('Error', 'Failed to pick bill document.');
        }
    };

    const onPurchaseDateChange = (event: any, selectedDate?: Date) => {
        setShowPurchasePicker(false);
        if (selectedDate) {
            setPurchaseDate(selectedDate);
        }
    };

    const onWarrantyExpiryChange = (event: any, selectedDate?: Date) => {
        setShowWarrantyPicker(false);
        if (selectedDate) {
            setWarrantyExpiry(selectedDate);
        }
    };

    const handleCreateAsset = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a name for the asset.');
            return;
        }

        setSaving(true);
        try {
            let uploadedPhotoUrl = '';
            if (photoUri) {
                // Upload cover photo directly into R2 isolated environment
                const res = await storageApi.uploadFile(
                    photoUri,
                    `asset_${Date.now()}.jpg`,
                    'image/jpeg',
                    'assets'
                );
                uploadedPhotoUrl = res as string;
            }

            let uploadedBillUrl = '';
            if (billUri) {
                // Upload bill document directly into R2 isolated environment
                const extension = billName ? billName.split('.').pop() : 'pdf';
                const res = await storageApi.uploadFile(
                    billUri,
                    `asset_bill_${Date.now()}.${extension}`,
                    billMime || 'application/pdf',
                    'assets'
                );
                uploadedBillUrl = res as string;
            }

            await communityAssetsApi.createAsset({
                name,
                category,
                status,
                location,
                serialNumber: serialNumber || null,
                purchaseCost: purchaseCost ? Number(purchaseCost) : null,
                purchaseDate: purchaseDate ? purchaseDate.toISOString() : null,
                warrantyExpiry: warrantyExpiry ? warrantyExpiry.toISOString() : null,
                description,
                photoUrl: uploadedPhotoUrl || null,
                billUrl: uploadedBillUrl || null
            });

            Alert.alert('Success', 'Community Asset added to physical inventory register successfully!');
            setShowCreate(false);
            resetForm();
            loadAssets();
        } catch (e) {
            console.error('Failed to create asset:', e);
            Alert.alert('Error', 'Failed to register asset. Please verify input formats.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async (assetId: string, newStatus: string) => {
        try {
            await communityAssetsApi.updateAsset(assetId, { status: newStatus });
            Alert.alert('Success', `Asset status updated to ${newStatus}.`);
            setEditingAsset(null);
            loadAssets();
        } catch (e) {
            Alert.alert('Error', 'Failed to update asset status.');
        }
    };

    const handleDeleteAsset = (assetId: string) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to remove this asset from the community inventory database?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await communityAssetsApi.deleteAsset(assetId);
                            loadAssets();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to delete asset profile.');
                        }
                    }
                }
            ]
        );
    };

    const resetForm = () => {
        setName('');
        setCategory('MACHINERY');
        setStatus('ACTIVE');
        setLocation('');
        setSerialNumber('');
        setPurchaseCost('');
        setPurchaseDate(null);
        setWarrantyExpiry(null);
        setDescription('');
        setPhotoUri(null);
        setBillUri(null);
        setBillName(null);
        setBillMime(null);
    };

    // Filters
    const filteredAssets = filterCategory === 'ALL' 
        ? assets 
        : assets.filter(a => a.category === filterCategory);

    // Metrics calculations
    const totalCount = assets.length;
    const activeCount = assets.filter(a => a.status === 'ACTIVE').length;
    const maintenanceCount = assets.filter(a => a.status === 'MAINTENANCE').length;
    const totalValuation = assets.reduce((acc, current) => acc + (current.purchaseCost || 0), 0);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Assets</Text>
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
                    
                    {/* Workspace Tag */}
                    <View style={styles.workspaceTagRow}>
                        <Ionicons name="business" size={16} color="#d97706" />
                        <Text style={styles.workspaceText}>{activeWorkspace?.tenantName || 'My Township'}</Text>
                    </View>

                    {/* Stats Metric Panel */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricVal}>{totalCount}</Text>
                            <Text style={styles.metricLabel}>Total Assets</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricVal, { color: '#10b981' }]}>{activeCount}</Text>
                            <Text style={styles.metricLabel}>Operational</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{maintenanceCount}</Text>
                            <Text style={styles.metricLabel}>In Service</Text>
                        </View>
                    </View>

                    <View style={styles.valuationCard}>
                        <Text style={styles.valuationLabel}>Total Inventory Valuation</Text>
                        <Text style={styles.valuationValue}>₹ {totalValuation.toLocaleString()}</Text>
                    </View>

                    {/* Top Category Filter Slider */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryFilterRow}>
                        {['ALL', 'MACHINERY', 'ELECTRONICS', 'INFRASTRUCTURE', 'FURNITURE', 'OTHER'].map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.categoryTab, filterCategory === cat && styles.categoryTabActive]}
                                onPress={() => setFilterCategory(cat)}
                            >
                                <Text style={[styles.categoryTabText, filterCategory === cat && styles.categoryTabTextActive]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Assets Listing */}
                    <Text style={styles.sectionTitle}>Asset Directory ({filteredAssets.length})</Text>
                    {filteredAssets.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <Ionicons name="cube-outline" size={40} color="#cbd5e1" />
                            <Text style={styles.emptyText}>No registered assets found in this category.</Text>
                        </View>
                    ) : (
                        filteredAssets.map(asset => (
                            <View key={asset.id} style={styles.assetCard}>
                                {asset.photoUrl && (
                                    <Image source={{ uri: asset.photoUrl }} style={styles.assetImage} />
                                )}
                                <View style={styles.assetCardBody}>
                                    <View style={styles.cardHeaderRow}>
                                        <View style={{ flex: 1, marginRight: 10 }}>
                                            <Text style={styles.assetName}>{asset.name}</Text>
                                            <Text style={styles.assetCategory}>{asset.category}</Text>
                                        </View>
                                        <View style={[styles.statusBadge, getStatusStyle(asset.status)]}>
                                            <Text style={styles.statusBadgeText}>{asset.status}</Text>
                                        </View>
                                    </View>

                                    {/* Parameter details */}
                                    <View style={styles.paramsGrid}>
                                        <DetailRow icon="location" label="Location" value={asset.location || 'Not Specified'} />
                                        <DetailRow icon="barcode" label="Serial No." value={asset.serialNumber || 'N/A'} />
                                        <DetailRow icon="cash" label="Cost" value={asset.purchaseCost ? `₹ ${asset.purchaseCost.toLocaleString()}` : 'N/A'} />
                                        <DetailRow icon="calendar" label="Purchased" value={asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'N/A'} />
                                        <DetailRow icon="shield-checkmark" label="Warranty" value={asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : 'N/A'} />
                                    </View>

                                    {asset.billUrl && (
                                        <TouchableOpacity 
                                            style={styles.billRow} 
                                            onPress={() => Linking.openURL(asset.billUrl)}
                                        >
                                            <Ionicons name="document-text" size={14} color="#10b981" style={{ marginRight: 6 }} />
                                            <Text style={styles.billLabel}>Invoice / Bill Uploaded</Text>
                                            <Text style={styles.billValue}>View Bill ↗</Text>
                                        </TouchableOpacity>
                                    )}

                                    {asset.description && (
                                        <Text style={styles.assetDescription} numberOfLines={2}>{asset.description}</Text>
                                    )}

                                    {/* Buttons */}
                                    <View style={styles.actionsRow}>
                                        <TouchableOpacity 
                                            style={styles.actionBtn}
                                            onPress={() => setEditingAsset(asset)}
                                        >
                                            <Ionicons name="create-outline" size={16} color="#cbd5e1" style={{ marginRight: 6 }} />
                                            <Text style={styles.actionBtnText}>Status</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                                            onPress={() => handleDeleteAsset(asset.id)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                                            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}

            {/* Asset Status Editor Modal */}
            <Modal
                visible={editingAsset !== null}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setEditingAsset(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { paddingBottom: 35 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Modify Asset Status</Text>
                            <TouchableOpacity onPress={() => setEditingAsset(null)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        {editingAsset && (
                            <View style={{ gap: 15 }}>
                                <Text style={styles.modalSub}>
                                    Update operation state for: {editingAsset.name}
                                </Text>
                                {['ACTIVE', 'MAINTENANCE', 'BROKEN', 'REPLACED'].map(st => (
                                    <TouchableOpacity 
                                        key={st} 
                                        style={[styles.statusOptionBtn, editingAsset.status === st && styles.statusOptionActive]}
                                        onPress={() => handleUpdateStatus(editingAsset.id, st)}
                                    >
                                        <Text style={[styles.statusOptionText, editingAsset.status === st && styles.statusOptionTextActive]}>
                                            {st}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Create Asset Profile Modal */}
            <Modal
                visible={showCreate}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowCreate(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Register Asset</Text>
                            <TouchableOpacity onPress={() => setShowCreate(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Photo Picker */}
                            <Text style={styles.inputLabel}>Asset Cover Photo</Text>
                            <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Ionicons name="camera-outline" size={32} color="#94a3b8" />
                                        <Text style={styles.photoPickerText}>Select asset image</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Name */}
                            <Text style={styles.inputLabel}>Asset Name *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. 500kVA Diesel Generator"
                                placeholderTextColor="#64748b"
                                value={name}
                                onChangeText={setName}
                            />

                            {/* Category picker */}
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.methodRow}>
                                {['MACHINERY', 'ELECTRONICS', 'INFRASTRUCTURE', 'FURNITURE', 'OTHER'].map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        style={[styles.methodBtn, category === cat && styles.methodBtnActive]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[styles.methodBtnText, category === cat && styles.methodBtnTextActive]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Operational Status */}
                            <Text style={styles.inputLabel}>Operational Status</Text>
                            <View style={styles.methodRow}>
                                {['ACTIVE', 'MAINTENANCE', 'BROKEN'].map(st => (
                                    <TouchableOpacity 
                                        key={st} 
                                        style={[styles.methodBtn, status === st && styles.methodBtnActive]}
                                        onPress={() => setStatus(st)}
                                    >
                                        <Text style={[styles.methodBtnText, status === st && styles.methodBtnTextActive]}>{st}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Location */}
                            <Text style={styles.inputLabel}>Physical Location</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Block C Basement / Clubhouse Garden"
                                placeholderTextColor="#64748b"
                                value={location}
                                onChangeText={setLocation}
                            />

                            {/* Serial Number */}
                            <Text style={styles.inputLabel}>Serial Number / Model ID</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. SN-KIRLOSKAR-92038"
                                placeholderTextColor="#64748b"
                                value={serialNumber}
                                onChangeText={setSerialNumber}
                            />

                            {/* Cost */}
                            <Text style={styles.inputLabel}>Purchase Cost (INR)</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="₹ Enter acquisition cost"
                                placeholderTextColor="#64748b"
                                keyboardType="numeric"
                                value={purchaseCost}
                                onChangeText={setPurchaseCost}
                            />

                            {/* Bill Picker */}
                            <Text style={styles.inputLabel}>Purchase Invoice / Bill</Text>
                            <TouchableOpacity style={styles.billPicker} onPress={handlePickBill}>
                                {billUri ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Ionicons name="document-attach" size={24} color="#10b981" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.billPickerName} numberOfLines={1}>{billName}</Text>
                                            <Text style={styles.billPickerSub}>Tap to change bill document</Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                        <Ionicons name="cloud-upload-outline" size={20} color="#cbd5e1" />
                                        <Text style={styles.billPickerText}>Upload Bill (PDF or Image)</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Purchase Date */}
                            <Text style={styles.inputLabel}>Purchase Date</Text>
                            <TouchableOpacity 
                                style={styles.textInputSelector} 
                                onPress={() => setShowPurchasePicker(true)}
                            >
                                <Text style={[styles.selectorText, !purchaseDate && { color: '#64748b' }]}>
                                    {purchaseDate ? purchaseDate.toLocaleDateString() : 'Select purchase date'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#cbd5e1" />
                            </TouchableOpacity>

                            {/* Warranty Expiry */}
                            <Text style={styles.inputLabel}>Warranty Expiry Date</Text>
                            <TouchableOpacity 
                                style={styles.textInputSelector} 
                                onPress={() => setShowWarrantyPicker(true)}
                            >
                                <Text style={[styles.selectorText, !warrantyExpiry && { color: '#64748b' }]}>
                                    {warrantyExpiry ? warrantyExpiry.toLocaleDateString() : 'Select warranty expiry date'}
                                </Text>
                                <Ionicons name="calendar-outline" size={20} color="#cbd5e1" />
                            </TouchableOpacity>

                            {showPurchasePicker && (
                                <DateTimePicker
                                    value={purchaseDate || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onPurchaseDateChange}
                                />
                            )}

                            {showWarrantyPicker && (
                                <DateTimePicker
                                    value={warrantyExpiry || new Date()}
                                    mode="date"
                                    display="default"
                                    onChange={onWarrantyExpiryChange}
                                />
                            )}

                            {/* Description */}
                            <Text style={styles.inputLabel}>Description Details</Text>
                            <TextInput
                                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                                placeholder="Write additional operations, specifications, or contact data here..."
                                placeholderTextColor="#64748b"
                                value={description}
                                onChangeText={setDescription}
                                multiline
                            />

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: '#d97706' }]} 
                                onPress={handleCreateAsset}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>Add Asset to Registry</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function DetailRow({ icon, label, value }: { icon: string, label: string, value: string }) {
    return (
        <View style={styles.detailRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 100 }}>
                <Ionicons name={icon as any} size={14} color="#cbd5e1" style={{ marginRight: 6 }} />
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

function getStatusStyle(status: string) {
    if (status === 'ACTIVE') return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' };
    if (status === 'MAINTENANCE') return { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' };
    return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' };
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4C5C68' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    workspaceTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
    workspaceText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700' },

    metricsRow: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 15 },
    metricItem: { flex: 1, alignItems: 'center' },
    metricVal: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    metricLabel: { color: '#cbd5e1', fontSize: 10, fontWeight: '700', marginTop: 4 },
    verticalDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.1)' },

    valuationCard: { backgroundColor: '#2E3A42', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', marginBottom: 25 },
    valuationLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
    valuationValue: { fontSize: 18, fontWeight: '900', color: '#10b981', marginTop: 4 },

    categoryFilterRow: { gap: 10, marginBottom: 25, paddingBottom: 5 },
    categoryTab: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
    categoryTabActive: { backgroundColor: '#d97706' },
    categoryTabText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
    categoryTabTextActive: { color: '#2D2445' },

    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#2D2445', marginBottom: 15 },
    emptyCard: { backgroundColor: '#2E3A42', padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 12, textAlign: 'center' },

    assetCard: { backgroundColor: '#2E3A42', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 18, overflow: 'hidden' },
    assetImage: { width: '100%', height: 150, resizeMode: 'cover' },
    assetCardBody: { padding: 20 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    assetName: { color: '#2D2445', fontSize: 16, fontWeight: '800' },
    assetCategory: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2 },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
    statusBadgeText: { color: '#2D2445', fontSize: 10, fontWeight: '900' },

    paramsGrid: { gap: 10, marginBottom: 15 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
    detailValue: { color: '#2D2445', fontSize: 12, fontWeight: '700', flex: 1 },

    assetDescription: { color: '#94a3b8', fontSize: 12, lineHeight: 18, fontWeight: '600', marginBottom: 15, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 10 },

    actionsRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 15 },
    actionBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2E3A42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    modalSub: { fontSize: 13, color: '#cbd5e1', marginBottom: 15, fontWeight: '700' },

    statusOptionBtn: { height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statusOptionActive: { backgroundColor: '#d97706' },
    statusOptionText: { color: '#cbd5e1', fontSize: 13, fontWeight: '800' },
    statusOptionTextActive: { color: '#2D2445', fontWeight: '900' },

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 15 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
    methodBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    methodBtnActive: { backgroundColor: '#d97706' },
    methodBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
    methodBtnTextActive: { color: '#2D2445' },

    photoPicker: { height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    photoPreview: { width: '100%', height: '100%' },
    photoPickerText: { fontSize: 12, color: '#cbd5e1', marginTop: 8, fontWeight: '600' },

    textInput: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8', color: '#2D2445', padding: 16, fontSize: 15, fontWeight: '600', marginBottom: 5 },
    textInputSelector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16, marginBottom: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#2D2445', fontSize: 15, fontWeight: '600' },
    billPicker: { padding: 16, borderRadius: 16, borderStyle: 'dashed', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 5 },
    billPickerText: { fontSize: 13, color: '#cbd5e1', fontWeight: '700' },
    billPickerName: { fontSize: 14, color: '#2D2445', fontWeight: '800' },
    billPickerSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    billRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.15)', marginTop: 8 },
    billLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '700', flex: 1 },
    billValue: { color: '#10b981', fontSize: 12, fontWeight: '800' },
    submitBtn: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    submitBtnText: { color: '#2D2445', fontSize: 14, fontWeight: '900' }
});
