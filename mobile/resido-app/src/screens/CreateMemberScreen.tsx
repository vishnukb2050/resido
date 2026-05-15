import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { residentApi, authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function CreateMemberScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '',
        role: params.mode === 'STAFF' ? 'SECURITY_STAFF' : 'RESIDENT',
        occupancyType: 'RESIDENT',
        address: '',
        age: '',
        documentUrl: '',
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
            await residentApi.createMember({
                ...formData,
                age: formData.age ? parseInt(formData.age) : undefined
            });
            
            // 2. Sync membership in auth service (master DB) 
            const activeWorkspace = useAuthStore.getState().activeWorkspace;
            await authApi.syncMembership({
                phone: formData.phone,
                tenantId: activeWorkspace?.tenantId || '',
                tenantName: activeWorkspace?.tenantName || '',
                role: formData.role,
                name: formData.name,
                age: formData.age ? parseInt(formData.age) : undefined,
                address: formData.address
            });

            Alert.alert('Success', `${params.mode === 'STAFF' ? 'Staff' : 'Member'} added successfully`);
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
                <Text style={styles.headerTitle}>{params.mode === 'STAFF' ? 'Add Staff' : 'Add Resident'}</Text>
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

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Age</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.age} 
                            onChangeText={(t) => setFormData({ ...formData, age: t })}
                            placeholder="Age"
                            keyboardType="numeric"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>
                    <View style={[styles.field, { flex: 2 }]}>
                        <Text style={styles.label}>Role / Category</Text>
                        <View style={styles.pickerContainer}>
                            <TouchableOpacity style={styles.pickerTrigger}>
                                <Text style={styles.pickerText}>{formData.role.replace('_', ' ')}</Text>
                                <Ionicons name="chevron-down" size={16} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {params.mode === 'STAFF' && (
                    <View style={styles.staffRoles}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {['MEMBER', 'SECURITY_STAFF', 'CLEANING_STAFF', 'MAINTENANCE_STAFF', 'CARETAKER', 'ADMIN_STAFF'].map(r => (
                                <TouchableOpacity 
                                    key={r} 
                                    style={[styles.roleChip, formData.role === r && styles.roleChipActive]}
                                    onPress={() => setFormData({ ...formData, role: r })}
                                >
                                    <Text style={[styles.roleChipText, formData.role === r && styles.roleChipTextActive]}>{r.split('_')[0]}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.field}>
                    <Text style={styles.label}>Address / Unit Info</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        value={formData.address} 
                        onChangeText={(t) => setFormData({ ...formData, address: t })}
                        placeholder="Enter full address or unit details"
                        multiline
                        numberOfLines={3}
                        placeholderTextColor="#94a3b8"
                    />
                </View>

                {params.mode === 'STAFF' && (
                    <View style={styles.field}>
                        <Text style={styles.label}>Staff Documents (ID Proof/Contract)</Text>
                        <TouchableOpacity style={styles.uploadBtn}>
                            <Ionicons name="cloud-upload-outline" size={24} color="#6366f1" />
                            <Text style={styles.uploadBtnText}>Upload PDF or Image</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{params.mode === 'STAFF' ? 'Register Staff' : 'Add Resident'}</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    form: { padding: 20 },
    field: { marginBottom: 20 },
    row: { flexDirection: 'row', gap: 12 },
    label: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
    textArea: { height: 80, textAlignVertical: 'top' },
    
    pickerContainer: { backgroundColor: '#f8fafc', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
    pickerTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
    pickerText: { fontSize: 14, fontWeight: '700', color: '#1e293b' },

    staffRoles: { marginBottom: 20, flexDirection: 'row' },
    roleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    roleChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    roleChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    roleChipTextActive: { color: '#fff' },

    uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, padding: 25, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f8fafc' },
    uploadBtnText: { color: '#6366f1', fontWeight: '700', fontSize: 14 },

    submitBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
