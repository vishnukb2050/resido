import React, { useState } from 'react';
import { 
    Text, View, StyleSheet, TouchableOpacity, Alert, 
    ActivityIndicator, SafeAreaView, StatusBar, Dimensions 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';

const { width } = Dimensions.get('window');

export default function BusinessScannerScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const router = useRouter();

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        setScanned(true);
        console.log('Scanned QR code data:', data);

        // Robust parsing of business ID
        let businessId = null;
        if (data.includes('id=')) {
            const parts = data.split('id=');
            if (parts.length > 1) {
                businessId = parts[1].split('&')[0];
            }
        } else {
            // Check if raw UUID
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(data.trim())) {
                businessId = data.trim();
            }
        }

        if (businessId) {
            router.replace({
                pathname: '/business-detail',
                params: { id: businessId }
            });
        } else {
            Alert.alert(
                'Invalid QR Code',
                'This QR code does not contain a valid Resido business profile.',
                [{ text: 'Try Again', onPress: () => setScanned(false) }]
            );
        }
    };

    if (!permission) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#a084ca" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <SafeAreaView style={styles.errorContainer}>
                <StatusBar barStyle="light-content" />
                <View style={styles.errorContent}>
                    <View style={styles.errorIconBox}>
                        <Ionicons name="camera" size={60} color="#a084ca" />
                    </View>
                    <Text style={styles.errorTitle}>Camera Permission Required</Text>
                    <Text style={styles.errorText}>
                        We need access to your camera to scan business QR codes and instantly view their booking profiles.
                    </Text>
                    <TouchableOpacity style={styles.grantBtn} onPress={requestPermission}>
                        <Text style={styles.grantBtnText}>Grant Camera Access</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                        <Text style={styles.backLinkText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr"],
                }}
            />

            {/* Custom Premium Scanning Mask Overlay */}
            <View style={styles.overlay}>
                <View style={styles.overlayHeader}>
                    <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.overlayTitle}>Scan Business QR</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.unfocusedContainer} />
                
                <View style={styles.middleContainer}>
                    <View style={styles.unfocusedContainer} />
                    <View style={styles.focusedContainer}>
                        <View style={styles.cornerTopLeft} />
                        <View style={styles.cornerTopRight} />
                        <View style={styles.cornerBottomLeft} />
                        <View style={styles.cornerBottomRight} />
                        
                        {/* Dynamic Scan Line Animation */}
                        <View style={styles.scanLine} />
                    </View>
                    <View style={styles.unfocusedContainer} />
                </View>
                
                <View style={[styles.unfocusedContainer, styles.hintBox]}>
                    <Text style={styles.hintText}>
                        Align the business QR code within the frame to instantly book services
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0b0f19' },
    
    // Permission state styling (Matching our MySpace black/violet/lavender aesthetic)
    errorContainer: { flex: 1, backgroundColor: '#000000' },
    errorContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
    errorIconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(160, 132, 202, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(160, 132, 202, 0.2)' },
    errorTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 12, textAlign: 'center' },
    errorText: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
    grantBtn: { width: '100%', height: 56, borderRadius: 16, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8b5cf6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    grantBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
    backLink: { marginTop: 20 },
    backLinkText: { color: '#a084ca', fontSize: 15, fontWeight: '700' },

    // Mask layout
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    overlayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    overlayTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },

    unfocusedContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
    middleContainer: { flexDirection: 'row', height: 260 },
    focusedContainer: { width: 260, position: 'relative', overflow: 'hidden' },
    
    // Corners for scan area
    cornerTopLeft: { position: 'absolute', top: 0, left: 0, width: 30, height: 30, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#a084ca', borderTopLeftRadius: 12 },
    cornerTopRight: { position: 'absolute', top: 0, right: 0, width: 30, height: 30, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#a084ca', borderTopRightRadius: 12 },
    cornerBottomLeft: { position: 'absolute', bottom: 0, left: 0, width: 30, height: 30, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#a084ca', borderBottomLeftRadius: 12 },
    cornerBottomRight: { position: 'absolute', bottom: 0, right: 0, width: 30, height: 30, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#a084ca', borderBottomRightRadius: 12 },
    
    scanLine: { position: 'absolute', width: '100%', height: 3, backgroundColor: '#c084fc', opacity: 0.8, shadowColor: '#c084fc', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 1, shadowRadius: 10, elevation: 4 },
    
    hintBox: { justifyContent: 'flex-start', alignItems: 'center', paddingHorizontal: 40, paddingTop: 30 },
    hintText: { color: '#e2e8f0', fontSize: 14, fontWeight: '600', textAlign: 'center', lineHeight: 22, opacity: 0.9 }
});
