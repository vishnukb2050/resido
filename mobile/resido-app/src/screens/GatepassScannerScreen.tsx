import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, TextInput, ScrollView, StyleSheet as RNStyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';
import { getThemeColors } from '../utils/theme';

const CATEGORIES = ['Visitor', 'Delivery', 'Maintenance & Repair'];

export default function GatepassScannerScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    // Navigation & View Mode: 'SCAN' or 'MANUAL'
    const [mode, setMode] = useState<'SCAN' | 'MANUAL'>('SCAN');
    const [scannedId, setScannedId] = useState('');
    const [loading, setLoading] = useState(false);
    const [approving, setApproving] = useState(false);

    // Camera Permissions & Scanning States
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    // Double-Step Verification State
    const [verifiedGatepass, setVerifiedGatepass] = useState<any | null>(null);

    // Inline Edit States
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editVehicle, setEditVehicle] = useState('');
    const [editPurpose, setEditPurpose] = useState('');
    
    // Additional Aligned Edit States
    const [editCategory, setEditCategory] = useState('Visitor');
    const [editDescription, setEditDescription] = useState('');
    const [editUnitToVisit, setEditUnitToVisit] = useState('');

    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    
    const [showBlockDropdown, setShowBlockDropdown] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

    const [entryDate, setEntryDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    useEffect(() => {
        if (mode === 'SCAN') {
            requestPermission();
        }
    }, [mode]);

    useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
        } catch (error) {
            console.error('Failed to fetch blocks:', error);
        }
    };

    const fetchUnits = async (blockId: string) => {
        try {
            const { data } = await communityApi.getUnits(blockId);
            setUnits(data || []);
        } catch (error) {
            console.error('Failed to fetch units:', error);
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const currentDate = new Date(entryDate);
            currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setEntryDate(currentDate);
        }
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const currentDate = new Date(entryDate);
            currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setEntryDate(currentDate);
        }
    };

    const requestPermission = async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
    };

    const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
        if (scanned || loading) return;
        setScanned(true);
        
        let gatepassId = data.trim();
        
        // Try parsing JSON to be extremely resilient (e.g. {"id": "gp-123"})
        try {
            const parsed = JSON.parse(gatepassId);
            if (parsed && typeof parsed === 'object') {
                gatepassId = parsed.id || parsed.gatepassId || gatepassId;
            }
        } catch (e) {
            // Use the plain string as fallback
        }

        setScannedId(gatepassId);
        
        // Trigger verification immediately
        verifyGatepass(gatepassId);
    };

    const handleManualVerify = () => {
        if (!scannedId.trim()) {
            Alert.alert('Error', 'Please enter a Gatepass ID');
            return;
        }
        verifyGatepass(scannedId.trim());
    };

    const verifyGatepass = async (id: string) => {
        setLoading(true);
        setVerifiedGatepass(null);
        setIsEditing(false);
        try {
            const { data: gp } = await communityApi.getGatepassDetails(id);
            setVerifiedGatepass(gp);
            setEditName(gp.visitorName || gp.name || '');
            setEditPhone(gp.phone || '');
            setEditVehicle(gp.vehicleNumber || '');
            setEditPurpose(gp.purpose || '');
            
            // Set additional fields
            setEditCategory(gp.category || 'Visitor');
            setEditDescription(gp.description || '');
            const initialUnitToVisit = gp.unitToVisit || gp.residentUnit || '';
            setEditUnitToVisit(initialUnitToVisit);
            setEntryDate(gp.inTime ? new Date(gp.inTime) : new Date());

            // Pre-select Block and Unit from unitToVisit if possible
            if (initialUnitToVisit && initialUnitToVisit.includes(' - ')) {
                const parts = initialUnitToVisit.split(' - ');
                const bName = parts[0]?.trim();
                const uNum = parts[1]?.trim();

                const foundBlock = blocks.find(b => b.name?.toLowerCase() === bName.toLowerCase());
                if (foundBlock) {
                    setSelectedBlockId(foundBlock.id);
                    try {
                        const { data: fetchedUnits } = await communityApi.getUnits(foundBlock.id);
                        setUnits(fetchedUnits || []);
                        const foundUnit = fetchedUnits?.find((u: any) => u.number?.toLowerCase() === uNum.toLowerCase());
                        if (foundUnit) {
                            setSelectedUnitId(foundUnit.id);
                        } else {
                            setSelectedUnitId('');
                        }
                    } catch (error) {
                        console.error('Failed to fetch units for match:', error);
                    }
                } else {
                    setSelectedBlockId('');
                    setSelectedUnitId('');
                    setUnits([]);
                }
            } else if (initialUnitToVisit) {
                const foundBlock = blocks.find(b => b.name?.toLowerCase() === initialUnitToVisit.toLowerCase());
                if (foundBlock) {
                    setSelectedBlockId(foundBlock.id);
                    setSelectedUnitId('');
                    fetchUnits(foundBlock.id);
                } else {
                    setSelectedBlockId('');
                    setSelectedUnitId('');
                    setUnits([]);
                }
            } else {
                setSelectedBlockId('');
                setSelectedUnitId('');
                setUnits([]);
            }
        } catch (e) {
            Alert.alert('Verification Failed', 'Invalid Gatepass ID or failed to fetch details.');
            setScanned(false); // Reset scan lock
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!verifiedGatepass) return;

        if (!editName.trim() || !editPhone.trim() || !editUnitToVisit.trim()) {
            Alert.alert('Error', 'Visitor Name, Phone Number, and Destination Unit are required');
            return;
        }

        setApproving(true);
        try {
            const updates = {
                name: editName.trim(),
                phone: editPhone.trim(),
                vehicleNumber: editVehicle.trim(),
                purpose: editPurpose.trim(),
                category: editCategory,
                description: editDescription.trim(),
                unitToVisit: editUnitToVisit.trim(),
                inTime: entryDate.toISOString(),
            };
            await communityApi.approveGatepassEntry(verifiedGatepass.id, user?.id || 'security-01', updates);
            Alert.alert('Approved', 'Visitor entry recorded and gatepass approved successfully!');
            
            // Reset states
            setVerifiedGatepass(null);
            setScannedId('');
            setScanned(false);
            setIsEditing(false);
        } catch (e) {
            Alert.alert('Error', 'Failed to approve gatepass entry.');
        } finally {
            setApproving(false);
        }
    };

    const handleResetScanner = () => {
        setScanned(false);
        setVerifiedGatepass(null);
        setScannedId('');
        setIsEditing(false);
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verify Gatepass</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Segment Tabs */}
                {!verifiedGatepass && (
                    <View style={styles.tabContainer}>
                        <TouchableOpacity 
                            style={[styles.tab, mode === 'SCAN' && [styles.activeTab, { borderBottomColor: theme.primary }]]}
                            onPress={() => setMode('SCAN')}
                        >
                            <Ionicons name="qr-code-outline" size={18} color={mode === 'SCAN' ? '#fff' : '#64748b'} />
                            <Text style={[styles.tabText, mode === 'SCAN' && styles.activeTabText]}>Scan QR</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tab, mode === 'MANUAL' && [styles.activeTab, { borderBottomColor: theme.primary }]]}
                            onPress={() => setMode('MANUAL')}
                        >
                            <Ionicons name="keypad-outline" size={18} color={mode === 'MANUAL' ? '#fff' : '#64748b'} />
                            <Text style={[styles.tabText, mode === 'MANUAL' && styles.activeTabText]}>Manual ID</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Viewfinder or Manual inputs */}
                {!verifiedGatepass ? (
                    mode === 'SCAN' ? (
                        <View style={styles.scannerWrapper}>
                            {hasPermission === null ? (
                                <ActivityIndicator size="large" color={theme.primary} />
                            ) : hasPermission === false ? (
                                <View style={styles.fallbackContainer}>
                                    <Ionicons name="camera" size={48} color="#64748b" />
                                    <Text style={styles.fallbackText}>Camera permission is required to scan QR code.</Text>
                                    <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: theme.primary }]} onPress={requestPermission}>
                                        <Text style={styles.permissionBtnText}>Grant Permission</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.cameraBox}>
                                    <CameraView
                                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                                        barcodeScannerSettings={{
                                            barcodeTypes: ['qr'],
                                        }}
                                        style={RNStyleSheet.absoluteFillObject}
                                    />
                                    {/* Scan Overlay target border */}
                                    <View style={styles.overlayContainer}>
                                        <View style={[styles.scanTarget, { borderColor: theme.primary }]} />
                                        <Text style={styles.overlayText}>Position QR Code inside the frame</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.manualCard}>
                            <Text style={styles.manualLabel}>Gatepass ID</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: theme.surface }]}
                                placeholder="Enter Pass ID (e.g., gp-123)"
                                placeholderTextColor="#64748b"
                                autoCapitalize="none"
                                value={scannedId}
                                onChangeText={setScannedId}
                            />
                            <TouchableOpacity 
                                style={[styles.verifyBtn, { backgroundColor: theme.primary }]} 
                                onPress={handleManualVerify}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyBtnText}>Verify Pass</Text>}
                            </TouchableOpacity>
                        </View>
                    )
                ) : null}

                {loading && (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={styles.loaderText}>Verifying Gatepass...</Text>
                    </View>
                )}

                {/* DOUBLE-STEP: VISITOR DETAILS CONFIRMATION */}
                {verifiedGatepass && (
                    <View style={styles.visitorCard}>
                        {/* Status Header */}
                        <View style={styles.visitorHeader}>
                            <View style={styles.visitorIconBox}>
                                <Ionicons name="person-outline" size={28} color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.visitorNameText}>{isEditing ? editName || 'Unknown Visitor' : editName || verifiedGatepass.visitorName || 'Unknown Visitor'}</Text>
                                <Text style={styles.visitorPassId}>{verifiedGatepass.id}</Text>
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <TouchableOpacity 
                                    style={[styles.editModeToggleBtn, { borderColor: isEditing ? '#ef4444' : theme.primary }]} 
                                    onPress={() => setIsEditing(!isEditing)}
                                >
                                    <Ionicons name={isEditing ? "close-circle-outline" : "create-outline"} size={14} color={isEditing ? '#ef4444' : theme.primary} />
                                    <Text style={[styles.editModeToggleBtnText, { color: isEditing ? '#ef4444' : theme.primary }]}>
                                        {isEditing ? 'Cancel' : 'Edit'}
                                    </Text>
                                </TouchableOpacity>
                                {!isEditing && (
                                    <View style={[styles.statusBadge, { backgroundColor: verifiedGatepass.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                                        <Text style={[styles.statusBadgeText, { color: verifiedGatepass.status === 'APPROVED' ? '#34d399' : '#fbbf24' }]}>
                                            {verifiedGatepass.status}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Details View/Edit Grid */}
                        {isEditing ? (
                            <View style={styles.editFormContainer}>
                                <View style={styles.editSectionHeader}>
                                    <Ionicons name="create-outline" size={18} color={theme.primary} />
                                    <Text style={[styles.editSectionTitle, { color: theme.primary }]}>Edit Visitor Details</Text>
                                </View>

                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Visitor Name</Text>
                                    <TextInput
                                        style={[styles.editInput, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.08)' }]}
                                        value={editName}
                                        onChangeText={setEditName}
                                        placeholder="Visitor Name"
                                        placeholderTextColor="#64748b"
                                    />
                                </View>

                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Phone Number</Text>
                                    <TextInput
                                        style={[styles.editInput, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.08)' }]}
                                        value={editPhone}
                                        onChangeText={setEditPhone}
                                        placeholder="Phone Number"
                                        placeholderTextColor="#64748b"
                                        keyboardType="phone-pad"
                                    />
                                </View>

                                {/* Select Block Dropdown */}
                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Select Block</Text>
                                    <TouchableOpacity 
                                        style={styles.selector} 
                                        onPress={() => setShowBlockDropdown(!showBlockDropdown)}
                                    >
                                        <Text style={[styles.selectorText, !selectedBlockId && { color: '#64748b' }]}>
                                            {selectedBlockId ? blocks.find(b => b.id === selectedBlockId)?.name : 'Choose Block'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#10b981" />
                                    </TouchableOpacity>
                                    
                                    {showBlockDropdown && (
                                        <View style={styles.dropdown}>
                                            {blocks.map(b => (
                                                <TouchableOpacity 
                                                    key={b.id} 
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setSelectedBlockId(b.id);
                                                        setSelectedUnitId(''); // Reset selected unit
                                                        fetchUnits(b.id);
                                                        setShowBlockDropdown(false);
                                                        setEditUnitToVisit('');
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownItemText, selectedBlockId === b.id && styles.selectedItemText]}>{b.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {blocks.length === 0 && (
                                                <View style={styles.dropdownItem}>
                                                    <Text style={styles.dropdownItemText}>No blocks available</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Select Unit Dropdown */}
                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Select Unit</Text>
                                    <TouchableOpacity 
                                        style={styles.selector} 
                                        onPress={() => {
                                            if (!selectedBlockId) {
                                                Alert.alert('Info', 'Please select a block first');
                                                return;
                                            }
                                            setShowUnitDropdown(!showUnitDropdown);
                                        }}
                                    >
                                        <Text style={[styles.selectorText, !selectedUnitId && { color: '#64748b' }]}>
                                            {selectedUnitId ? units.find(u => u.id === selectedUnitId)?.number : 'Choose Unit'}
                                        </Text>
                                        <Ionicons name="chevron-down" size={20} color="#10b981" />
                                    </TouchableOpacity>
                                    
                                    {showUnitDropdown && (
                                        <View style={styles.dropdown}>
                                            {units.map(u => (
                                                <TouchableOpacity 
                                                    key={u.id} 
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setSelectedUnitId(u.id);
                                                        setShowUnitDropdown(false);
                                                        const blockName = blocks.find(b => b.id === selectedBlockId)?.name || '';
                                                        const unitName = u.number || '';
                                                        const combinedDestination = blockName ? `${blockName} - ${unitName}` : unitName;
                                                        setEditUnitToVisit(combinedDestination);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownItemText, selectedUnitId === u.id && styles.selectedItemText]}>{u.number}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            {units.length === 0 && (
                                                <View style={styles.dropdownItem}>
                                                    <Text style={styles.dropdownItemText}>No units in this block</Text>
                                                </View>
                                            )}
                                        </View>
                                    )}
                                </View>

                                {/* Select Category Dropdown */}
                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Category</Text>
                                    <TouchableOpacity 
                                        style={styles.selector} 
                                        onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                                    >
                                        <Text style={styles.selectorText}>{editCategory}</Text>
                                        <Ionicons name="chevron-down" size={20} color="#10b981" />
                                    </TouchableOpacity>
                                    
                                    {showCategoryDropdown && (
                                        <View style={styles.dropdown}>
                                            {CATEGORIES.map(cat => (
                                                <TouchableOpacity 
                                                    key={cat} 
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setEditCategory(cat);
                                                        setShowCategoryDropdown(false);
                                                    }}
                                                >
                                                    <Text style={[styles.dropdownItemText, editCategory === cat && styles.selectedItemText]}>{cat}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}
                                </View>

                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Purpose of Visit</Text>
                                    <TextInput
                                        style={[styles.editInput, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.08)' }]}
                                        value={editPurpose}
                                        onChangeText={setEditPurpose}
                                        placeholder="Purpose of Visit"
                                        placeholderTextColor="#64748b"
                                    />
                                </View>

                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Vehicle Number</Text>
                                    <TextInput
                                        style={[styles.editInput, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.08)' }]}
                                        value={editVehicle}
                                        onChangeText={setEditVehicle}
                                        placeholder="Vehicle Number (e.g. MH12AB1234)"
                                        placeholderTextColor="#64748b"
                                        autoCapitalize="characters"
                                    />
                                </View>

                                <View style={styles.editInputGroup}>
                                    <Text style={styles.editInputLabel}>Description</Text>
                                    <TextInput
                                        style={[styles.editInput, styles.textArea, { backgroundColor: theme.surface, borderColor: 'rgba(255,255,255,0.08)' }]}
                                        placeholder="Additional details..."
                                        placeholderTextColor="#64748b"
                                        multiline
                                        numberOfLines={3}
                                        value={editDescription}
                                        onChangeText={setEditDescription}
                                    />
                                </View>

                                {/* Date and Time Selection */}
                                <View style={styles.row}>
                                    <View style={[styles.editInputGroup, { flex: 1 }]}>
                                        <Text style={styles.editInputLabel}>Date</Text>
                                        <TouchableOpacity style={styles.selector} onPress={() => setShowDatePicker(true)}>
                                            <Text style={styles.selectorText}>{entryDate.toLocaleDateString()}</Text>
                                            <Ionicons name="calendar-outline" size={20} color="#10b981" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ width: 15 }} />
                                    <View style={[styles.editInputGroup, { flex: 1 }]}>
                                        <Text style={styles.editInputLabel}>Time</Text>
                                        <TouchableOpacity style={styles.selector} onPress={() => setShowTimePicker(true)}>
                                            <Text style={styles.selectorText}>
                                                {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                            <Ionicons name="time-outline" size={20} color="#10b981" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {showDatePicker && (
                                    <DateTimePicker
                                        value={entryDate}
                                        mode="date"
                                        display="default"
                                        onChange={onDateChange}
                                    />
                                )}

                                {showTimePicker && (
                                    <DateTimePicker
                                        value={entryDate}
                                        mode="time"
                                        display="default"
                                        onChange={onTimeChange}
                                    />
                                )}

                                {/* Host Details summary inside edit mode */}
                                <View style={styles.nonEditableSummary}>
                                    <View style={styles.nonEditableSummaryItem}>
                                        <Text style={styles.nonEditableLabel}>Host: </Text>
                                        <Text style={styles.nonEditableValue}>{verifiedGatepass.residentName || 'Resident'}</Text>
                                    </View>
                                    <View style={styles.nonEditableSummaryItem}>
                                        <Text style={styles.nonEditableLabel}>Unit: </Text>
                                        <Text style={styles.nonEditableValue}>{editUnitToVisit || verifiedGatepass.unitToVisit || verifiedGatepass.residentUnit || 'N/A'}</Text>
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.detailsGrid}>
                                <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="call" size={16} color={theme.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Phone Number</Text>
                                        <Text style={styles.detailValue}>{editPhone || 'Not Provided'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="car" size={16} color={theme.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Vehicle Number</Text>
                                        <Text style={styles.detailValue}>{editVehicle || 'No Vehicle'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="home" size={16} color={theme.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Visiting Host</Text>
                                        <Text style={styles.detailValue}>{verifiedGatepass.residentName || 'Resident'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="business" size={16} color={theme.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Unit Number</Text>
                                        <Text style={styles.detailValue}>{editUnitToVisit || verifiedGatepass.unitToVisit || verifiedGatepass.residentUnit || 'N/A'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="apps-outline" size={16} color={theme.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Category</Text>
                                        <Text style={styles.detailValue}>{editCategory || 'Visitor'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="clipboard-outline" size={16} color={theme.primary} />
                                    <View>
                                        <Text style={styles.detailLabel}>Purpose of Visit</Text>
                                        <Text style={styles.detailValue}>{editPurpose || 'Visitor entry'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItemFull, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="document-text-outline" size={16} color={theme.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Description</Text>
                                        <Text style={styles.detailValue}>{editDescription || 'No description provided'}</Text>
                                    </View>
                                </View>

                                <View style={[styles.detailItemFull, { backgroundColor: theme.surface }]}>
                                    <Ionicons name="time-outline" size={16} color={theme.primary} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.detailLabel}>Entry Date & Time</Text>
                                        <Text style={styles.detailValue}>
                                            {`${entryDate.toLocaleDateString()} ${entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        {/* Actions */}
                        <View style={styles.actionContainer}>
                            <TouchableOpacity 
                                style={[styles.approveActionBtn, { backgroundColor: '#10b981' }]} 
                                onPress={handleApprove}
                                disabled={approving}
                            >
                                {approving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                                        <Text style={styles.approveActionBtnText}>
                                            {isEditing ? 'Save & Record Entry' : 'Approve & Record Entry'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.resetBtn} onPress={handleResetScanner}>
                                <Text style={styles.resetBtnText}>Reset / Scan Another</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { 
        width: 44, height: 44, borderRadius: 22, 
        backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' 
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },
    scrollContent: { padding: 24 },
    tabContainer: { 
        flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', 
        borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 24
    },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomWidth: 2 },
    tabText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
    activeTabText: { color: '#2D2445' },
    
    scannerWrapper: { height: 380, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    fallbackContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    fallbackText: { color: '#64748b', textAlign: 'center', fontSize: 14, fontWeight: '600' },
    permissionBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    permissionBtnText: { color: '#2D2445', fontWeight: '700', fontSize: 14 },
    
    cameraBox: { flex: 1 },
    overlayContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    scanTarget: { width: 220, height: 220, borderWidth: 3, borderRadius: 16, backgroundColor: 'transparent' },
    overlayText: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginTop: 24 },
    
    manualCard: { padding: 24, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    manualLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    input: { borderRadius: 12, padding: 16, fontSize: 16, color: '#2D2445', fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
    verifyBtn: { borderRadius: 12, padding: 18, alignItems: 'center' },
    verifyBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 16 },
    
    loaderContainer: { alignItems: 'center', padding: 40, gap: 12 },
    loaderText: { color: '#64748b', fontWeight: '600' },
    
    visitorCard: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 20 },
    visitorHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 },
    visitorIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    visitorNameText: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    visitorPassId: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
    statusBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    detailItem: { width: '48%', padding: 16, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
    detailItemFull: { width: '100%', padding: 16, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
    detailLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    detailValue: { fontSize: 14, color: '#2D2445', fontWeight: '700', marginTop: 2 },
    
    actionContainer: { gap: 12, marginTop: 12 },
    approveActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, padding: 18 },
    approveActionBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 16 },
    resetBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
    resetBtnText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
    
    // Inline Edit Styles
    editModeToggleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    editModeToggleBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    editFormContainer: {
        width: '100%',
        gap: 16,
    },
    editSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    editSectionTitle: {
        fontSize: 14,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    editInputGroup: {
        width: '100%',
    },
    editInputLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    editInput: {
        borderRadius: 12,
        padding: 14,
        fontSize: 14,
        color: '#2D2445',
        fontWeight: '600',
        borderWidth: 1,
    },
    nonEditableSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.01)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.03)',
        marginTop: 4,
    },
    nonEditableSummaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    nonEditableLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    nonEditableValue: {
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: '700',
    },
    row: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    selector: { 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.1)', 
        padding: 14, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    selectorText: { 
        color: '#2D2445', 
        fontSize: 14, 
        fontWeight: '600' 
    },
    dropdown: { 
        backgroundColor: '#1e293b', 
        borderRadius: 12, 
        marginTop: 8, 
        padding: 10, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.1)' 
    },
    dropdownItem: { 
        padding: 12, 
        borderRadius: 8 
    },
    dropdownItemText: { 
        color: '#94a3b8', 
        fontSize: 14, 
        fontWeight: '600' 
    },
    selectedItemText: { 
        color: '#10b981' 
    },
    textArea: { 
        height: 80, 
        textAlignVertical: 'top' 
    },
});
