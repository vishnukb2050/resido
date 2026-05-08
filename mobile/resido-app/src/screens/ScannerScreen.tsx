import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../services/api';
import BottomNav from '../components/BottomNav';

export default function ScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [activeTab, setActiveTab] = useState<'SCAN' | 'HISTORY'>('SCAN');
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (activeTab === 'HISTORY') {
            fetchHistory();
        }
    }, [activeTab]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const r = await api.get('/profile/scans');
            setHistory(r.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBarCodeScanned = async ({ type, data }: any) => {
        setScanned(true);
        Alert.alert(
            'Scan Successful',
            `Data: ${data}`,
            [
                { text: 'Discard', onPress: () => setScanned(false), style: 'cancel' },
                { text: 'Save', onPress: () => saveScan(data, type) }
            ]
        );
    };

    const saveScan = async (data: string, type: string) => {
        try {
            await api.post('/profile/scans', { data, type });
            Alert.alert('Saved', 'Scan data saved successfully.');
        } catch (e) {
            Alert.alert('Error', 'Failed to save scan.');
        } finally {
            setScanned(false);
        }
    };

    if (!permission) {
        return <View style={styles.center}><ActivityIndicator size="large" /></View>;
    }

    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Ionicons name="camera-outline" size={64} color="#94a3b8" />
                <Text style={styles.errorText}>We need your permission to show the camera</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
                    <Text style={styles.primaryBtnText}>Grant Permission</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>QR Scanner</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tab, activeTab === 'SCAN' && styles.activeTab]} onPress={() => setActiveTab('SCAN')}>
                    <Text style={[styles.tabText, activeTab === 'SCAN' && styles.activeTabText]}>Scanner</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, activeTab === 'HISTORY' && styles.activeTab]} onPress={() => setActiveTab('HISTORY')}>
                    <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.activeTabText]}>Saved Scans</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'SCAN' ? (
                <View style={styles.cameraContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr"],
                        }}
                    />
                    <View style={styles.overlay}>
                        <View style={styles.unfocusedContainer}></View>
                        <View style={styles.middleContainer}>
                            <View style={styles.unfocusedContainer}></View>
                            <View style={styles.focusedContainer}>
                                <View style={styles.cornerTopLeft} />
                                <View style={styles.cornerTopRight} />
                                <View style={styles.cornerBottomLeft} />
                                <View style={styles.cornerBottomRight} />
                            </View>
                            <View style={styles.unfocusedContainer}></View>
                        </View>
                        <View style={styles.unfocusedContainer}>
                            <Text style={styles.hint}>Align the QR code within the frame</Text>
                        </View>
                    </View>
                </View>
            ) : (
                <View style={styles.historyContainer}>
                    {loading ? (
                        <ActivityIndicator style={{ marginTop: 20 }} />
                    ) : (
                        <FlatList
                            data={history}
                            keyExtractor={i => i.id}
                            contentContainerStyle={{ padding: 20 }}
                            renderItem={({ item }) => (
                                <View style={styles.historyCard}>
                                    <View style={styles.historyHeader}>
                                        <Ionicons name="qr-code-outline" size={20} color="#6366f1" />
                                        <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={styles.historyData}>{item.data}</Text>
                                </View>
                            )}
                            ListEmptyComponent={<Text style={styles.emptyText}>No saved scans found.</Text>}
                        />
                    )}
                </View>
            )}
            <BottomNav />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fcfcfd', padding: 40 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { color: '#1e293b', fontSize: 18, fontWeight: '900' },
    errorText: { marginTop: 20, textAlign: 'center', color: '#64748b', fontSize: 16, marginBottom: 20, fontWeight: '500' },
    primaryBtn: { backgroundColor: '#6366f1', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12, marginBottom: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    primaryBtnText: { color: '#fff', fontWeight: '800' },
    backBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
    backBtnText: { color: '#475569', fontWeight: '800' },

    tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: '#6366f1' },
    tabText: { fontSize: 14, fontWeight: '700', color: '#94a3b8' },
    activeTabText: { color: '#6366f1' },

    cameraContainer: { flex: 1, position: 'relative', marginBottom: 85 },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    middleContainer: { flexDirection: 'row', height: 250 },
    focusedContainer: { width: 250, position: 'relative' },
    hint: { color: '#fff', fontSize: 14, fontWeight: '600', textAlign: 'center', marginTop: 20 },

    cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 40, height: 40, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#6366f1' },
    cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#6366f1' },
    cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 40, height: 40, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#6366f1' },
    cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 40, height: 40, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#6366f1' },

    historyContainer: { flex: 1, marginBottom: 85 },
    historyCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    historyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    historyDate: { fontSize: 12, color: '#64748b', fontWeight: '700', marginLeft: 8 },
    historyData: { fontSize: 15, color: '#1e293b', fontWeight: '800' },
    emptyText: { textAlign: 'center', marginTop: 60, color: '#94a3b8', fontSize: 15, fontWeight: '600' }
});
