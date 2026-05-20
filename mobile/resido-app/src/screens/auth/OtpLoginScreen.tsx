import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image as RNImage
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

export default function OtpLoginScreen() {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { setOtpVerified, user } = useAuthStore();

    React.useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user]);

    const handleSendOtp = async () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Error', 'Enter a valid 10-digit phone number');
            return;
        }
        setLoading(true);
        try {
            await authApi.sendOtp(phone);
            setStep('otp');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || otp.length !== 4) {
            Alert.alert('Error', 'Enter the 4-digit OTP sent to your phone');
            return;
        }
        setLoading(true);
        try {
            const res = await authApi.verifyOtp(phone, otp);
            let { accessToken, refreshToken, user, workspaces } = res.data;

            // Inject mock Greenwoods community for specific test user
            if (phone === '9645859194') {
                const mockWorkspace = {
                    tenantId: 'greenwoods-mock-id',
                    tenantName: 'Greenwoods Community',
                    role: 'RESIDENT' as any,
                    memberId: 'mem-9645859194',
                    dbName: 'greenwoods_db'
                };
                if (!workspaces.find((w: any) => w.tenantName === 'Greenwoods Community')) {
                    workspaces = [mockWorkspace, ...workspaces];
                }
            }

            setOtpVerified({ token: accessToken, refreshToken, user, workspaces });

            if (workspaces.length === 0) {
                router.replace('/');
            } else if (workspaces.length === 1) {
                router.replace('/');
            } else {
                router.replace('/workspace-select');
            }
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.card}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <RNImage source={require('../../../assets/resido_logo.jpg')} style={{ width: 80, height: 80, borderRadius: 20 }} />
                </View>
                <Text style={styles.logo}>Resido</Text>
                <Text style={styles.tagline}>Apartment Life, Simplified</Text>

                {step === 'phone' ? (
                    <>
                        <Text style={styles.label}>Enter your phone number</Text>
                        <View style={styles.phoneRow}>
                            <Text style={styles.countryCode}>+91</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="10-digit number"
                                placeholderTextColor="#64748b"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>
                        <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send OTP</Text>}
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.label}>Enter the OTP sent to {phone}</Text>
                        <TextInput
                            style={styles.otpInput}
                            placeholder="4-digit"
                            placeholderTextColor="#94a3b8"
                            keyboardType="number-pad"
                            maxLength={4}
                            value={otp}
                            onChangeText={setOtp}
                            autoFocus
                        />
                        <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify OTP</Text>}
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={() => setStep('phone')} style={styles.backBtn}>
                            <Text style={styles.backText}>← Change number</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: '#1e1e2e', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    logo: { fontSize: 36, fontWeight: '800', color: '#1d4ed8', textAlign: 'center', letterSpacing: -1 },
    tagline: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 32, marginTop: 4 },
    label: { fontSize: 14, color: '#94a3b8', marginBottom: 12, fontWeight: '600' },
    phoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27273a', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
    countryCode: { color: '#94a3b8', paddingHorizontal: 14, fontSize: 16, fontWeight: '600', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)' },
    input: { flex: 1, color: '#ffffff', padding: 14, fontSize: 18 },
    otpInput: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, color: '#000000', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 20, height: 60 },
    btn: { backgroundColor: '#1d4ed8', borderRadius: 12, padding: 16, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
    backBtn: { marginTop: 16, alignItems: 'center' },
    backText: { color: '#1d4ed8', fontSize: 14 },
});
