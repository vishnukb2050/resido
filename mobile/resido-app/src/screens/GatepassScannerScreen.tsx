import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import { BarCodeScanner } from 'expo-barcode-scanner';

export default function GatepassScannerScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await BarCodeScanner.requestPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const handleBarCodeScanned = async ({ type, data }: any) => {
        setScanned(true);
        setLoading(true);
        try {
            // Data should be the gatepass ID
            const res = await axios.get(`http://localhost:3003/gatepass/${data}`, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });

            const gp = res.data;
            Alert.alert(
                'Gatepass Found',
                `Visitor: ${gp.visitorName}\nFrom: ${gp.residentName}\nUnit: ${gp.residentUnit}\nVehicle: ${gp.vehicleNumber || 'N/A'}\n\nApprove Entry?`,
                [
                    { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
                    { text: 'Approve & Enter', onPress: () => approveEntry(gp.id) }
                ]
            );
        } catch (e) {
            Alert.alert('Error', 'Invalid Gatepass QR Code');
            setScanned(false);
        } finally {
            setLoading(false);
        }
    };

    const approveEntry = async (id: string) => {
        try {
            await axios.patch(`http://localhost:3003/gatepass/${id}/approve`, {
                securityMemberId: user?.id || 'security-01'
            }, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });
            Alert.alert('Approved', 'Visitor entry recorded successfully!');
        } catch (e) {
            Alert.alert('Error', 'Failed to approve gatepass');
        } finally {
            setScanned(false);
        }
    };

    if (hasPermission === null) {
        return <View style={styles.center}><Text style={styles.text}>Requesting camera permission...</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.center}><Text style={styles.text}>No access to camera</Text></View>;
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>QR Scanner</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.scannerWrapper}>
                <BarCodeScanner
                    onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
                    style={StyleSheet.absoluteFillObject}
                />
                <View style={styles.overlay}>
                    <View style={styles.unfocusedContainer}></View>
                    <View style={styles.middleContainer}>
                        <View style={styles.unfocusedContainer}></View>
                        <View style={styles.focusedContainer}>
                            <View style={[styles.corner, styles.topLeft]} />
                            <View style={[styles.corner, styles.topRight]} />
                            <View style={[styles.corner, styles.bottomLeft]} />
                            <View style={[styles.corner, styles.bottomRight]} />
                        </View>
                        <View style={styles.unfocusedContainer}></View>
                    </View>
                    <View style={styles.unfocusedContainer}>
                        <Text style={styles.hint}>Align Gatepass QR within the frame</Text>
                    </View>
                </View>
            </View>

            {scanned && (
                <TouchableOpacity style={styles.scanAgainBtn} onPress={() => setScanned(false)}>
                    <Text style={styles.scanAgainText}>Tap to Scan Again</Text>
                </TouchableOpacity>
            )}

            {loading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#6366f1" />
                    <Text style={{color: '#fff', marginTop: 10}}>Verifying Gatepass...</Text>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
    text: { color: '#fff', fontSize: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40, backgroundColor: '#0f172a', zIndex: 10 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    scannerWrapper: { flex: 1, position: 'relative' },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    middleContainer: { flexDirection: 'row', height: 280 },
    focusedContainer: { width: 280, position: 'relative' },
    corner: { position: 'absolute', width: 40, height: 40, borderColor: '#6366f1', borderWidth: 4 },
    topLeft: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
    topRight: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
    bottomLeft: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
    bottomRight: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
    hint: { color: '#fff', fontSize: 16, fontWeight: '600' },
    scanAgainBtn: { position: 'absolute', bottom: 50, alignSelf: 'center', backgroundColor: '#6366f1', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30 },
    scanAgainText: { color: '#fff', fontWeight: '800' },
    loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' }
});
