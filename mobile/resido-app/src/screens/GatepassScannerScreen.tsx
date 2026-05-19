import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
    Alert, ActivityIndicator, TextInput, ScrollView, StyleSheet as RNStyleSheet
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';
import { getThemeColors } from '../utils/theme';

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

    useEffect(() => {
        if (mode === 'SCAN') {
            requestPermission();
        }
    }, [mode]);

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
        try {
            const { data: gp } = await communityApi.getGatepassDetails(id);
            setVerifiedGatepass(gp);
        } catch (e) {
            Alert.alert('Verification Failed', 'Invalid Gatepass ID or failed to fetch details.');
            setScanned(false); // Reset scan lock
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!verifiedGatepass) return;

        setApproving(true);
        try {
            await communityApi.approveGatepassEntry(verifiedGatepass.id, user?.id || 'security-01');
            Alert.alert('Approved', 'Visitor entry recorded and gatepass approved successfully!');
            
            // Reset states
            setVerifiedGatepass(null);
            setScannedId('');
            setScanned(false);
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
                            <View>
                                <Text style={styles.visitorNameText}>{verifiedGatepass.visitorName || 'Unknown Visitor'}</Text>
                                <Text style={styles.visitorPassId}>{verifiedGatepass.id}</Text>
                            </View>
                            <View style={[styles.statusBadge, { backgroundColor: verifiedGatepass.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)' }]}>
                                <Text style={[styles.statusBadgeText, { color: verifiedGatepass.status === 'APPROVED' ? '#34d399' : '#fbbf24' }]}>
                                    {verifiedGatepass.status}
                                </Text>
                            </View>
                        </View>

                        {/* Review Content Grid */}
                        <View style={styles.detailsGrid}>
                            <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                <Ionicons name="call" size={16} color={theme.primary} />
                                <View>
                                    <Text style={styles.detailLabel}>Phone Number</Text>
                                    <Text style={styles.detailValue}>{verifiedGatepass.phone || 'Not Provided'}</Text>
                                </View>
                            </View>

                            <View style={[styles.detailItem, { backgroundColor: theme.surface }]}>
                                <Ionicons name="car" size={16} color={theme.primary} />
                                <View>
                                    <Text style={styles.detailLabel}>Vehicle Number</Text>
                                    <Text style={styles.detailValue}>{verifiedGatepass.vehicleNumber || 'No Vehicle'}</Text>
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
                                    <Text style={styles.detailValue}>{verifiedGatepass.residentUnit || 'N/A'}</Text>
                                </View>
                            </View>

                            <View style={[styles.detailItemFull, { backgroundColor: theme.surface }]}>
                                <Ionicons name="clipboard-outline" size={16} color={theme.primary} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.detailLabel}>Purpose of Visit</Text>
                                    <Text style={styles.detailValue}>{verifiedGatepass.purpose || 'Visitor entry'}</Text>
                                </View>
                            </View>
                        </View>

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
                                        <Text style={styles.approveActionBtnText}>Approve & Record Entry</Text>
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
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { 
        width: 44, height: 44, borderRadius: 22, 
        backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' 
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    scrollContent: { padding: 24 },
    tabContainer: { 
        flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', 
        borderRadius: 12, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
        marginBottom: 24
    },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomWidth: 2 },
    tabText: { fontSize: 13, color: '#64748b', fontWeight: '700' },
    activeTabText: { color: '#fff' },
    
    scannerWrapper: { height: 380, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    fallbackContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
    fallbackText: { color: '#64748b', textAlign: 'center', fontSize: 14, fontWeight: '600' },
    permissionBtn: { borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
    permissionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    
    cameraBox: { flex: 1 },
    overlayContainer: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    scanTarget: { width: 220, height: 220, borderWidth: 3, borderRadius: 16, backgroundColor: 'transparent' },
    overlayText: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginTop: 24 },
    
    manualCard: { padding: 24, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    manualLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    input: { borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 20 },
    verifyBtn: { borderRadius: 12, padding: 18, alignItems: 'center' },
    verifyBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    
    loaderContainer: { alignItems: 'center', padding: 40, gap: 12 },
    loaderText: { color: '#64748b', fontWeight: '600' },
    
    visitorCard: { padding: 24, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', gap: 20 },
    visitorHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 },
    visitorIconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    visitorNameText: { fontSize: 16, fontWeight: '800', color: '#fff' },
    visitorPassId: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
    statusBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    statusBadgeText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    
    detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    detailItem: { width: '48%', padding: 16, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
    detailItemFull: { width: '100%', padding: 16, borderRadius: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
    detailLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    detailValue: { fontSize: 14, color: '#fff', fontWeight: '700', marginTop: 2 },
    
    actionContainer: { gap: 12, marginTop: 12 },
    approveActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, padding: 18 },
    approveActionBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    resetBtn: { borderRadius: 12, padding: 14, alignItems: 'center' },
    resetBtnText: { color: '#64748b', fontWeight: '700', fontSize: 14 }
});
