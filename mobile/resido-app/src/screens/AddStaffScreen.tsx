import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { residentApi, authApi } from '../services/api';

const CATEGORIES = [
    { label: 'Security', role: 'SECURITY_STAFF' },
    { label: 'Maintenance', role: 'MAINTENANCE_STAFF' },
    { label: 'Cleaning', role: 'CLEANING_STAFF' },
    { label: 'Caretaker', role: 'CARETAKER' },
    { label: 'Other Staff', role: 'STAFF' }
];

export default function AddStaffScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const params = useLocalSearchParams<{ role?: string; category?: string }>();
    const [loading, setLoading] = useState(false);
    const [showCategories, setShowCategories] = useState(false);

    // Pre-select category from route params (when launched from category folder)
    const initialCategory = params.category
        ? CATEGORIES.find(c => c.role === params.role) ?? CATEGORIES[0]
        : CATEGORIES[0];

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        jobRole: '',
        category: initialCategory.label,
        role: initialCategory.role,
        description: '',
        contactDetails: ''
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

            Alert.alert('Success', 'Staff added successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to add staff');
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
                <Text style={styles.headerTitle}>Add Community Staff</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity style={styles.selector} onPress={() => setShowCategories(!showCategories)}>
                            <Text style={styles.selectorText}>{formData.category}</Text>
                            <Ionicons name="chevron-down" size={20} color="#8b5cf6" />
                        </TouchableOpacity>
                        
                        {showCategories && (
                            <View style={styles.dropdown}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity 
                                        key={cat.role} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setFormData({...formData, category: cat.label, role: cat.role});
                                            setShowCategories(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, formData.category === cat.label && styles.selectedItemText]}>{cat.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#64748b"
                            value={formData.name}
                            onChangeText={(t) => setFormData({...formData, name: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Mobile Number"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(t) => setFormData({...formData, phone: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Job Role / Designation</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Lead Electrician, Senior Guard"
                            placeholderTextColor="#64748b"
                            value={formData.jobRole}
                            onChangeText={(t) => setFormData({...formData, jobRole: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Short description about their role..."
                            placeholderTextColor="#64748b"
                            multiline
                            numberOfLines={3}
                            value={formData.description}
                            onChangeText={(t) => setFormData({...formData, description: t})}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Staff Member</Text>}
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
    form: { gap: 20 },
    inputGroup: { gap: 10 },
    label: { fontSize: 12, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    selector: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#2D2445', fontSize: 16, fontWeight: '600' },
    dropdown: { backgroundColor: '#ffffff', borderRadius: 16, marginTop: 8, padding: 10, borderWidth: 1, borderColor: '#C4B5DC' },
    dropdownItem: { padding: 15, borderRadius: 10 },
    dropdownItemText: { color: '#9A8EBA', fontSize: 15, fontWeight: '600' },
    selectedItemText: { color: '#8b5cf6' },
    input: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', color: '#2D2445', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#8b5cf6', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 20 },
    submitText: { color: '#2D2445', fontWeight: '900', fontSize: 16 }
});
