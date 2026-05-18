import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function GatepassScannerScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [scannedId, setScannedId] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!scannedId.trim()) {
            Alert.alert('Error', 'Please enter a Gatepass ID');
            return;
        }

        setLoading(true);
        try {
            // Data should be the gatepass ID
            const { data: gp } = await communityApi.getGatepassDetails(scannedId.trim());

            Alert.alert(
                'Gatepass Found',
                `Visitor: ${gp.visitorName}\nFrom: ${gp.residentName}\nUnit: ${gp.residentUnit || 'N/A'}\nVehicle: ${gp.vehicleNumber || 'N/A'}\n\nApprove Entry?`,
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Approve & Enter', onPress: () => approveEntry(gp.id) }
                ]
            );
        } catch (e) {
            Alert.alert('Error', 'Invalid Gatepass ID or failed to fetch details');
        } finally {
            setLoading(false);
        }
    };

    const approveEntry = async (id: string) => {
        setLoading(true);
        try {
            await communityApi.approveGatepassEntry(id, user?.id || 'security-01');
            Alert.alert('Approved', 'Visitor entry recorded successfully!');
            setScannedId('');
        } catch (e) {
            Alert.alert('Error', 'Failed to approve gatepass');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Verify Gatepass</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconWrapper}>
                    <Ionicons name="shield-checkmark-outline" size={80} color="#0d9488" />
                </View>

                <Text style={styles.title}>Manual Verification</Text>
                <Text style={styles.subtitle}>Enter the Pass ID provided by the visitor or shown on their QR code.</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Gatepass ID</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter Pass ID (e.g., gp-123)"
                        placeholderTextColor="#64748b"
                        autoCapitalize="none"
                        value={scannedId}
                        onChangeText={setScannedId}
                    />
                </View>

                <TouchableOpacity style={styles.verifyBtn} onPress={handleVerify} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verify & Approve</Text>}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    content: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
    iconWrapper: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
    subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 32, paddingHorizontal: 20, lineHeight: 20 },
    inputGroup: { width: '100%', gap: 10, marginBottom: 24 },
    label: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, fontSize: 16, fontWeight: '600', width: '100%' },
    verifyBtn: { width: '100%', backgroundColor: '#0d9488', borderRadius: 16, padding: 18, alignItems: 'center', shadowColor: '#0d9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    verifyText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
