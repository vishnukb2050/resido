import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { residentApi, authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function CreateMemberScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        role: 'RESIDENT',
        occupancyType: 'RESIDENT',
        address: '',
        tenantName: '',
        tenantPhone: '',
    });

    const handleCreate = async () => {
        if (!formData.name || !formData.phone) {
            Alert.alert('Error', 'Name and Phone are required');
            return;
        }

        setLoading(true);
        try {
            // 1. Create member in resident service (tenant DB)
            const res = await residentApi.createMember(formData);
            
            // 2. Sync membership in auth service (master DB) 
            // This ensures the user sees this community in their dropdown
            const activeWorkspace = useAuthStore.getState().activeWorkspace;
            await authApi.syncMembership({
                phone: formData.phone,
                tenantId: activeWorkspace?.tenantId || '',
                tenantName: activeWorkspace?.tenantName || '',
                role: formData.role
            });

            Alert.alert('Success', 'Member added successfully and linked to community');
            router.back();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to add member');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Resident</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.field}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.name} 
                        onChangeText={(t) => setFormData({ ...formData, name: t })}
                        placeholder="Enter full name"
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Mobile Number</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.phone} 
                        onChangeText={(t) => setFormData({ ...formData, phone: t })}
                        placeholder="Enter mobile number"
                        keyboardType="phone-pad"
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Email (Optional)</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.email} 
                        onChangeText={(t) => setFormData({ ...formData, email: t })}
                        placeholder="Enter email address"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Classification</Text>
                    <View style={styles.typeContainer}>
                        <TouchableOpacity 
                            style={[styles.typeOption, formData.occupancyType === 'RESIDENT' && styles.typeActive]}
                            onPress={() => setFormData({ ...formData, occupancyType: 'RESIDENT' })}
                        >
                            <Ionicons name="home" size={20} color={formData.occupancyType === 'RESIDENT' ? '#fff' : '#6366f1'} />
                            <Text style={[styles.typeText, formData.occupancyType === 'RESIDENT' && styles.typeTextActive]}>Resident (Owner)</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.typeOption, formData.occupancyType === 'RENTAL' && styles.typeActive]}
                            onPress={() => setFormData({ ...formData, occupancyType: 'RENTAL' })}
                        >
                            <Ionicons name="key" size={20} color={formData.occupancyType === 'RENTAL' ? '#fff' : '#6366f1'} />
                            <Text style={[styles.typeText, formData.occupancyType === 'RENTAL' && styles.typeTextActive]}>Rental</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Address / Unit Info</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        value={formData.address} 
                        onChangeText={(t) => setFormData({ ...formData, address: t })}
                        placeholder="Enter unit number, block, etc."
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                {formData.occupancyType === 'RENTAL' && (
                    <View style={styles.tenantSection}>
                        <Text style={styles.sectionTitle}>Tenant Details</Text>
                        <View style={styles.field}>
                            <Text style={styles.label}>Tenant Name</Text>
                            <TextInput 
                                style={styles.input} 
                                value={formData.tenantName} 
                                onChangeText={(t) => setFormData({ ...formData, tenantName: t })}
                                placeholder="Enter tenant name"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                        <View style={styles.field}>
                            <Text style={styles.label}>Tenant Phone</Text>
                            <TextInput 
                                style={styles.input} 
                                value={formData.tenantPhone} 
                                onChangeText={(t) => setFormData({ ...formData, tenantPhone: t })}
                                placeholder="Enter tenant phone"
                                keyboardType="phone-pad"
                                placeholderTextColor="#94a3b8"
                            />
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Add Resident</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    form: { padding: 20 },
    field: { marginBottom: 20 },
    label: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
    textArea: { height: 80, textAlignVertical: 'top' },
    typeContainer: { flexDirection: 'row', gap: 12 },
    typeOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', gap: 8 },
    typeActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    typeText: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
    typeTextActive: { color: '#fff' },
    tenantSection: { marginTop: 10, padding: 15, backgroundColor: '#f8fafc', borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#6366f1', marginBottom: 15 },
    submitBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
