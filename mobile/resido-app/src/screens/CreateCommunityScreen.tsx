import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { authApi } from '../../services/api';

export default function CreateCommunityScreen() {
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [caretakerEmail, setCaretakerEmail] = useState('');
    const [subAdminEmail, setSubAdminEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleCreate = async () => {
        if (!name || !adminEmail) {
            Alert.alert('Error', 'Please enter community name and admin email.');
            return;
        }

        setLoading(true);
        try {
            await authApi.createClient({
                name,
                adminEmail,
                caretakerEmail,
                subAdminEmail,
                plan: 'BASIC'
            });
            Alert.alert('Success', 'Community created successfully! Invite emails have been sent to the staff.', [
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
                    </div>

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
                        <Text style={styles.hint}>Full access to the web admin panel</Text>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Caretaker Email (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="caretaker@example.com"
                            placeholderTextColor="#64748b"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={caretakerEmail}
                            onChangeText={setCaretakerEmail}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Sub-Admin Email (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="staff@example.com"
                            placeholderTextColor="#64748b"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={subAdminEmail}
                            onChangeText={setSubAdminEmail}
                        />
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
