import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity,
    StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView, ActivityIndicator,
    SafeAreaView, Image
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '../services/api';
import { storageApi } from '../services/storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';

export default function CreateCommunityScreen() {
    const [name, setName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [adminPhone, setAdminPhone] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [memberPhones, setMemberPhones] = useState('');
    const [residentPhones, setResidentPhones] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Photo upload state
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const router = useRouter();

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleCreate = async () => {
        if (!name || !adminEmail || !adminPhone || !adminPassword) {
            Alert.alert('Error', 'Community Name, Admin Mobile, Email and Password are required.');
            return;
        }

        setLoading(true);
        try {
            let uploadedPhotoUrl = '';
            if (photoUri) {
                const res = await storageApi.uploadFile(
                    photoUri,
                    `community_${Date.now()}.jpg`,
                    'image/jpeg',
                    'communities'
                );
                uploadedPhotoUrl = res as string;
            }

            await authApi.createClient({
                name,
                adminEmail,
                adminPhone,
                adminPassword,
                photoUrl: uploadedPhotoUrl,
                memberPhones: memberPhones.split(',').map(p => p.trim()).filter(p => p.length >= 10),
                residentPhones: residentPhones.split(',').map(p => p.trim()).filter(p => p.length >= 10),
                plan: 'BASIC'
            });
            
            // Fetch updated workspaces without requiring re-login!
            try {
                const res = await authApi.getWorkspaces();
                useAuthStore.getState().setWorkspaces(res.data);
            } catch (e) {
                console.warn('Failed to fetch workspaces after creation:', e);
            }
            
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
                            <Ionicons name="business" size={40} color="#4c1d95" />
                        </View>
                        <Text style={styles.title}>Launch Community</Text>
                        <Text style={styles.subtitle}>Initialize your smart apartment ecosystem with administrative and resident access.</Text>
                    </View>

                    <View style={styles.form}>
                        {/* Basic Info */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="information-circle-outline" size={18} color="#4c1d95" />
                            <Text style={styles.sectionHeaderText}>Basic Information</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Community Cover Photo</Text>
                            <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                                ) : (
                                    <View style={styles.photoPlaceholder}>
                                        <Ionicons name="camera-outline" size={32} color="#64748b" />
                                        <Text style={styles.photoPlaceholderText}>Select cover photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                        
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

                        {/* Admin Setup */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="shield-checkmark-outline" size={18} color="#10b981" />
                            <Text style={styles.sectionHeaderText}>Admin Setup</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Admin Mobile</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Admin Mobile Number"
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
                                placeholder="admin@community.com"
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
                                placeholder="••••••••"
                                placeholderTextColor="#64748b"
                                secureTextEntry
                                value={adminPassword}
                                onChangeText={setAdminPassword}
                            />
                        </View>

                        {/* Onboarding */}
                        <View style={styles.sectionHeader}>
                            <Ionicons name="people-outline" size={18} color="#f59e0b" />
                            <Text style={styles.sectionHeaderText}>Initial Onboarding</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Member Mobile Numbers (Admin Staff)</Text>
                            <View style={styles.textAreaContainer}>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter mobile numbers separated by commas..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    value={memberPhones}
                                    onChangeText={setMemberPhones}
                                />
                            </View>
                            <Text style={styles.hint}>Authorized to manage the community (Caretakers, Staff)</Text>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Resident Mobile Numbers</Text>
                            <View style={styles.textAreaContainer}>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    placeholder="Enter resident mobile numbers separated by commas..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    value={residentPhones}
                                    onChangeText={setResidentPhones}
                                />
                            </View>
                            <Text style={styles.hint}>Authorized to join as residents</Text>
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Launch Community</Text>}
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
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: -10 },
    sectionHeaderText: { fontSize: 14, fontWeight: '800', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
    inputGroup: { gap: 10 },
    photoPicker: {
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderStyle: 'dashed',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center' },
    photoPlaceholderText: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '600' },
    label: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
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
    textAreaContainer: { borderRadius: 16, overflow: 'hidden' },
    textArea: { height: 100, textAlignVertical: 'top' },
    hint: { fontSize: 11, color: '#475569', fontWeight: '500', marginTop: -4 },
    submitBtn: {
        backgroundColor: '#4c1d95',
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#4c1d95',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8
    },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
