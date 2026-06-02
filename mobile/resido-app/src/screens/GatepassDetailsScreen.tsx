import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Share, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function GatepassDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [gatepass, setGatepass] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDetails();
    }, [id]);

    const fetchDetails = async () => {
        try {
            const { data } = await communityApi.getGatepassDetails(id as string);
            setGatepass(data);
        } catch (e) {
            console.error('Fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Resido Gatepass for ${gatepass.visitorName}\nDate: ${gatepass.visitDate}\nTime: ${gatepass.visitTime}\nPass Code: ${gatepass.passCode}\n\nQR Code: https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${gatepass.id}\n\nPlease show this at the gate.`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator color="#8b5cf6" size="large" /></View>;
    if (!gatepass) return <View style={styles.center}><Text style={{color: '#2D2445'}}>Not Found</Text></View>;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Gatepass QR</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                    <Ionicons name="share-outline" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.qrContainer}>
                    <View style={styles.qrBox}>
                        <Image 
                            source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${gatepass.id}` }} 
                            style={{ width: 200, height: 200, borderRadius: 16 }} 
                        />
                    </View>
                    <Text style={styles.passId}>PASS CODE: {gatepass.passCode}</Text>
                    <Text style={styles.scanHint}>Show this pass code to the Security Guard</Text>
                </View>

                <View style={styles.detailsCard}>
                    <Text style={styles.cardTitle}>Visitor Details</Text>
                    
                    <DetailRow label="Visitor Name" value={gatepass.visitorName} />
                    <DetailRow label="Persons" value={gatepass.personsCount.toString()} />
                    <DetailRow label="Purpose" value={gatepass.purpose} />
                    <DetailRow label="Vehicle" value={gatepass.vehicleNumber || 'N/A'} />
                    <DetailRow label="Date & Time" value={`${gatepass.visitDate} @ ${gatepass.visitTime}`} />
                    
                    <View style={styles.divider} />
                    
                    <DetailRow label="Status" value={gatepass.status} isStatus />
                </View>

                <TouchableOpacity style={styles.mainShareBtn} onPress={handleShare}>
                    <Ionicons name="logo-whatsapp" size={24} color="#fff" style={{marginRight: 10}} />
                    <Text style={styles.shareText}>Send to Visitor</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

function DetailRow({ label, value, isStatus }: any) {
    return (
        <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{label}</Text>
            <Text style={[styles.detailValue, isStatus && { color: value === 'APPROVED' ? '#10b981' : '#f59e0b', fontWeight: '900' }]}>
                {value}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    center: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    shareBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    content: { padding: 24, alignItems: 'center' },
    qrContainer: { alignItems: 'center', marginBottom: 32 },
    qrBox: { padding: 20, backgroundColor: '#ffffff', borderRadius: 32, borderWidth: 2, borderColor: '#8b5cf6', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
    qrFallback: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: 10 },
    qrPassText: { fontSize: 18, color: '#8b5cf6', fontWeight: '900', letterSpacing: 3 },
    passId: { fontSize: 12, color: '#9A8EBA', fontWeight: '800', marginTop: 20, letterSpacing: 2 },
    scanHint: { fontSize: 14, color: '#8b5cf6', fontWeight: '600', marginTop: 10, textAlign: 'center' },
    detailsCard: { width: '100%', backgroundColor: '#ffffff', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: '#D4C9E8' },
    cardTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445', marginBottom: 20 },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    detailLabel: { fontSize: 14, color: '#7A6B9C', fontWeight: '600' },
    detailValue: { fontSize: 14, color: '#9A8EBA', fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#F4EEFC', marginVertical: 10 },
    mainShareBtn: { width: '100%', height: 64, backgroundColor: '#10b981', borderRadius: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24 },
    shareText: { color: '#2D2445', fontSize: 16, fontWeight: '900' }
});
