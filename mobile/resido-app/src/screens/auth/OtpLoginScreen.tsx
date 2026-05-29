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
        if (!user) return;
        // Re-entry guard: if a returning user already finished onboarding,
        // skip this screen entirely. If they bailed mid-onboarding (no name
        // or username yet), send them back there instead of MySpace.
        const needsOnboarding = !user.name?.trim() || !user.profileName?.trim();
        router.replace(needsOnboarding ? '/onboarding-profile' : '/');
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

            // First-time accounts (and old accounts that never set a display
            // name + username) MUST complete the onboarding step before
            // landing on MySpace. The onboarding screen continues the
            // workspace-select flow on its own once the profile is filled.
            const needsOnboarding = !user?.name?.trim() || !user?.profileName?.trim();
            if (needsOnboarding) {
                router.replace('/onboarding-profile');
            } else if (workspaces.length > 1) {
                router.replace('/workspace-select');
            } else {
                router.replace('/');
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
    container: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', padding: 24 },
    card: { backgroundColor: '#ffffff', borderRadius: 20, padding: 32, borderWidth: 1, borderColor: '#D4C9E8' },
    logo: { fontSize: 36, fontWeight: '800', color: '#8b5cf6', textAlign: 'center', letterSpacing: -1 },
    tagline: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', marginBottom: 32, marginTop: 4 },
    label: { fontSize: 14, color: '#9A8EBA', marginBottom: 12, fontWeight: '600' },
    phoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 12, borderWidth: 1, borderColor: '#D4C9E8', marginBottom: 16 },
    countryCode: { color: '#9A8EBA', paddingHorizontal: 14, fontSize: 16, fontWeight: '600', borderRightWidth: 1, borderRightColor: '#D4C9E8' },
    input: { flex: 1, color: '#2D2445', padding: 14, fontSize: 18 },
    otpInput: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, color: '#000000', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 20, height: 60 },
    btn: { backgroundColor: '#8b5cf6', borderRadius: 12, padding: 16, alignItems: 'center' },
    btnText: { color: '#2D2445', fontWeight: '700', fontSize: 16 },
    backBtn: { marginTop: 16, alignItems: 'center' },
    backText: { color: '#8b5cf6', fontSize: 14 },
});
