import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { residentApi, authApi } from '../services/api';

export default function AddAdminStaffScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        jobRole: 'Admin Staff',
        role: 'ADMIN_STAFF',
        description: '',
    });

    const handleSave = async () => {
        if (!formData.name || !formData.phone) {
            Alert.alert('Error', 'Name and Phone are required');
            return;
        }

        setLoading(true);
        try {
            await residentApi.createMember({
                ...formData,
                tenantId: activeWorkspace?.tenantId
            });

            await authApi.syncMembership({
                phone: formData.phone,
                tenantId: activeWorkspace?.tenantId,
                tenantName: activeWorkspace?.tenantName,
                role: formData.role,
                name: formData.name,
            });

            try {
                const res = await authApi.getWorkspaces();
                useAuthStore.getState().setWorkspaces(res.data);
                if (activeWorkspace) {
                    const swRes = await authApi.switchWorkspace(activeWorkspace.tenantId, activeWorkspace.role);
                    useAuthStore.getState().setActiveWorkspace(swRes.data.workspace, swRes.data.accessToken);
                }
            } catch (err) {
                console.log('Failed to refresh workspaces', err);
            }

            Alert.alert('Success', 'Admin Staff added with full privileges!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to add admin staff');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Admin Staff</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.warningBox}>
                    <Ionicons name="shield-checkmark" size={24} color="#ec4899" />
                    <Text style={styles.warningText}>Admin staff will have full access to community management tools, equal to the Apartment Admin.</Text>
                </View>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Sarah Connor"
                            placeholderTextColor="#64748b"
                            value={formData.name}
                            onChangeText={(t) => setFormData({...formData, name: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Primary Contact"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(t) => setFormData({...formData, phone: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Designation</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Assistant Manager"
                            placeholderTextColor="#64748b"
                            value={formData.jobRole}
                            onChangeText={(t) => setFormData({...formData, jobRole: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description / Responsibilities</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Notes about their access..."
                            placeholderTextColor="#64748b"
                            multiline
                            numberOfLines={3}
                            value={formData.description}
                            onChangeText={(t) => setFormData({...formData, description: t})}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Grant Admin Access</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24 },
    warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(236, 72, 153, 0.1)', padding: 20, borderRadius: 24, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(236, 72, 153, 0.2)', gap: 15 },
    warningText: { flex: 1, fontSize: 13, color: '#ec4899', fontWeight: '700', lineHeight: 18 },
    form: { gap: 20 },
    inputGroup: { gap: 10 },
    label: { fontSize: 12, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', color: '#2D2445', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#ec4899', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 20 },
    submitText: { color: '#2D2445', fontWeight: '900', fontSize: 16 }
});
