import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../services/api';

export default function CreateCommunityScreen() {
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [caretakerEmail, setCaretakerEmail] = useState('');
    const [memberPhones, setMemberPhones] = useState('');
    const [residentPhones, setResidentPhones] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!name || !adminEmail || !adminPhone || !adminPassword) {
            Alert.alert('Error', 'Please enter community name, admin email, phone and password.');
            return;
        }

        setLoading(true);
        try {
            await authApi.createClient({
                name,
                adminEmail,
                adminPhone,
                adminPassword,
                caretakerEmail,
                memberPhones: memberPhones.split(',').map(p => p.trim()).filter(p => p.length >= 10),
                residentPhones: residentPhones.split(',').map(p => p.trim()).filter(p => p.length >= 10),
                plan: 'BASIC'
            });
            Alert.alert('Success', 'Community created successfully!', [
                { text: 'OK', onPress: () => router.replace('/workspace-select') }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create community');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Text style={styles.backBtn}>← Back</Text>
                    </TouchableOpacity>
                    <Text style={styles.title}>Create a Community</Text>
                    <Text style={styles.subtitle}>Set up a new apartment complex on Resido</Text>
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

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 9645859194"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={adminPhone}
                            onChangeText={setAdminPhone}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Admin Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="admin@example.com"
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
                            placeholder="Set a strong password"
                            placeholderTextColor="#64748b"
                            secureTextEntry
                            value={adminPassword}
                            onChangeText={setAdminPassword}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Member Mobile Numbers (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 9876543210, 9988776655"
                            placeholderTextColor="#64748b"
                            value={memberPhones}
                            onChangeText={setMemberPhones}
                        />
                        <Text style={styles.hint}>Comma separated staff/committee numbers</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Resident Mobile Numbers (Optional)</Text>
                        <TextInput
                            style={[styles.input, { height: 80 }]}
                            placeholder="e.g. 9123456789, 9234567890"
                            placeholderTextColor="#64748b"
                            multiline
                            value={residentPhones}
                            onChangeText={setResidentPhones}
                        />
                        <Text style={styles.hint}>Comma separated resident numbers</Text>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Community</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a' },
    scrollContent: { padding: 24, paddingTop: 60 },
    header: { marginBottom: 32 },
    backBtn: { color: '#6366f1', fontSize: 16, marginBottom: 16 },
    title: { fontSize: 28, fontWeight: '800', color: '#e2e8f0', letterSpacing: -0.5 },
    subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
    form: { gap: 20 },
    inputGroup: { gap: 8 },
    label: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
    input: {
        backgroundColor: '#1e1e2e',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        color: '#e2e8f0',
        padding: 14,
        fontSize: 16
    },
    hint: { fontSize: 12, color: '#475569' },
    submitBtn: {
        backgroundColor: '#6366f1',
        borderRadius: 12,
        padding: 18,
        alignItems: 'center',
        marginTop: 12
    },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
