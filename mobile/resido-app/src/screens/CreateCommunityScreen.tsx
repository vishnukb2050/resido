import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
    SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../services/api';
import { Ionicons } from '@expo/vector-icons';

export default function CreateCommunityScreen() {
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [memberPhones, setMemberPhones] = useState('');
    const [residentPhones, setResidentPhones] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!name || !adminEmail || !adminPhone || !adminPassword) {
            Alert.alert('Error', 'Community Name, Admin Mobile, Email and Password are required.');
            return;
        }

        setLoading(true);
        try {
            await authApi.createClient({
                name,
                adminEmail,
                adminPhone,
                adminPassword,
                memberPhones: memberPhones.split(',').map(p => p.trim()).filter(p => p.length >= 10),
                residentPhones: residentPhones.split(',').map(p => p.trim()).filter(p => p.length >= 10),
                plan: 'BASIC'
            });
            
            Alert.alert('Success', 'Community created successfully! You can now switch to this workspace.', [
                { text: 'OK', onPress: () => router.replace('/workspace-select') }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create community');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Launch Community</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.heroSection}>
                        <View style={styles.heroIconBox}>
                            <Ionicons name="business" size={40} color="#6366f1" />
                        </View>
                        <Text style={styles.title}>Start Your Community</Text>
                        <Text style={styles.subtitle}>Enter details to initialize your smart apartment ecosystem</Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Community Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Greenwood Residency"
                                placeholderTextColor="#64748b"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Admin Mobile</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="9645859194"
                                    placeholderTextColor="#64748b"
                                    keyboardType="phone-pad"
                                    value={adminPhone}
                                    onChangeText={setAdminPhone}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Admin Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="admin@resido.com"
                                placeholderTextColor="#64748b"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                value={adminEmail}
                                onChangeText={setAdminEmail}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Admin Password</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Secure password"
                                placeholderTextColor="#64748b"
                                secureTextEntry
                                value={adminPassword}
                                onChangeText={setAdminPassword}
                            />
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Member Mobile Numbers</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="9876543210, 9988776655"
                                placeholderTextColor="#64748b"
                                value={memberPhones}
                                onChangeText={setMemberPhones}
                            />
                            <Text style={styles.hint}>Comma separated staff or committee numbers</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Resident Mobile Numbers</Text>
                            <TextInput
                                style={[styles.input, { height: 100 }]}
                                placeholder="9123456789, 9234567890"
                                placeholderTextColor="#64748b"
                                multiline
                                textAlignVertical="top"
                                value={residentPhones}
                                onChangeText={setResidentPhones}
                            />
                            <Text style={styles.hint}>Comma separated resident mobile numbers</Text>
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Community</Text>}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24, paddingBottom: 60 },
    heroSection: { alignItems: 'center', marginBottom: 32 },
    heroIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    title: { fontSize: 26, fontWeight: '900', color: '#fff', textAlign: 'center' },
    subtitle: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 10, lineHeight: 22, paddingHorizontal: 20 },
    form: { gap: 24 },
    inputGroup: { gap: 10 },
    row: { flexDirection: 'row', gap: 15 },
    label: { fontSize: 13, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        color: '#fff',
        padding: 16,
        fontSize: 16,
        fontWeight: '600'
    },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 10 },
    hint: { fontSize: 12, color: '#475569', fontWeight: '500' },
    submitBtn: {
        backgroundColor: '#6366f1',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8
    },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
