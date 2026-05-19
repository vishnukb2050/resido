import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView, Image, Modal, FlatList, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../services/api';
import { storageApi } from '../services/storage';
import { getThemeColors } from '../utils/theme';

export default function ManageCommunityScreen() {
    const router = useRouter();
    const { activeWorkspace, setActiveWorkspace, workspaces, setWorkspaces } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    
    // Community Name & Photo State
    const [name, setName] = useState(activeWorkspace?.tenantName || '');
    const [photoUri, setPhotoUri] = useState<string | null>(activeWorkspace?.photoUrl || null);
    const [updatingDetails, setUpdatingDetails] = useState(false);

    // Admin Staff Management State
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);

    // Add Staff Form State
    const [staffName, setStaffName] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    const [staffRole, setStaffRole] = useState<'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF'>('ADMIN_STAFF');
    const [addingStaff, setAddingStaff] = useState(false);

    useEffect(() => {
        if (activeWorkspace?.tenantId) {
            fetchStaff();
        }
    }, [activeWorkspace?.tenantId]);

    const fetchStaff = async () => {
        setLoadingStaff(true);
        try {
            const res = await authApi.getClientStaff(activeWorkspace.tenantId);
            setStaffList(res.data);
        } catch (e) {
            console.error('Failed to load staff list', e);
        } finally {
            setLoadingStaff(false);
        }
    };

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

    const handleSaveDetails = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Community Name cannot be empty.');
            return;
        }

        setUpdatingDetails(true);
        try {
            let uploadedPhotoUrl = photoUri;
            
            // Upload to S3 if photo changed locally
            if (photoUri && !photoUri.startsWith('http')) {
                uploadedPhotoUrl = await storageApi.uploadFile(
                    photoUri,
                    `community_${Date.now()}.jpg`,
                    'image/jpeg',
                    'communities'
                ) as string;
            }

            const res = await authApi.updateClient(activeWorkspace.tenantId, {
                name: name.trim(),
                photoUrl: uploadedPhotoUrl
            });

            // Update local workspace store so changes reflect immediately!
            const updatedWorkspace = {
                ...activeWorkspace,
                tenantName: name.trim(),
                photoUrl: uploadedPhotoUrl
            };
            setActiveWorkspace(updatedWorkspace, useAuthStore.getState().token || '');

            // Also reload all workspaces
            try {
                const wsRes = await authApi.getWorkspaces();
                setWorkspaces(wsRes.data);
            } catch (e) {
                console.warn('Failed to update workspaces list:', e);
            }

            Alert.alert('Success', 'Community details updated successfully!');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update community details');
        } finally {
            setUpdatingDetails(false);
        }
    };

    const handleAddStaff = async () => {
        if (!staffPhone.trim() || staffPhone.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits).');
            return;
        }

        setAddingStaff(true);
        try {
            await authApi.addClientStaff(activeWorkspace.tenantId, {
                phone: staffPhone.trim(),
                role: staffRole,
                name: staffName.trim() || undefined
            });

            Alert.alert('Success', 'Admin staff added successfully!');
            setShowAddModal(false);
            setStaffName('');
            setStaffPhone('');
            setStaffRole('ADMIN_STAFF');
            fetchStaff();
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to add staff member');
        } finally {
            setAddingStaff(false);
        }
    };

    const handleRemoveStaff = (membership: any) => {
        Alert.alert(
            'Confirm Removal',
            `Are you sure you want to remove ${membership.user?.name || membership.user?.phone} from Admin Staff?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await authApi.removeClientStaff(activeWorkspace.tenantId, membership.id);
                            fetchStaff();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to remove staff member');
                        }
                    }
                }
            ]
        );
    };

    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Community</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* 1. COVER PHOTO */}
                <Text style={styles.sectionLabel}>Community Cover Photo</Text>
                <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="camera-outline" size={32} color="#64748b" />
                            <Text style={styles.photoPlaceholderText}>Upload Cover Photo</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* 2. COMMUNITY DETAILS FORM */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>Community Name</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.surface }]}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Greenwood Residency"
                        placeholderTextColor="#64748b"
                    />

                    <TouchableOpacity 
                        style={[styles.saveBtn, { backgroundColor: theme.primary }]} 
                        onPress={handleSaveDetails}
                        disabled={updatingDetails}
                    >
                        {updatingDetails ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Details</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* 3. ADMIN STAFF SECTION */}
                <View style={styles.staffHeader}>
                    <Text style={styles.sectionLabel}>Admin Staff Members</Text>
                    <TouchableOpacity 
                        style={[styles.addStaffBtn, { borderColor: theme.primary }]} 
                        onPress={() => setShowAddModal(true)}
                    >
                        <Ionicons name="add" size={16} color={theme.primary} />
                        <Text style={[styles.addStaffBtnText, { color: theme.primary }]}>Add Staff</Text>
                    </TouchableOpacity>
                </View>

                {loadingStaff ? (
                    <ActivityIndicator size="large" color={theme.primary} style={{ marginTop: 20 }} />
                ) : staffList.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color="#475569" />
                        <Text style={styles.emptyText}>No admin staff configured.</Text>
                    </View>
                ) : (
                    <View style={styles.staffListContainer}>
                        {staffList.map((member) => (
                            <View key={member.id} style={[styles.staffCard, { backgroundColor: theme.surface }]}>
                                <Image 
                                    source={{ uri: member.user?.profilePhoto || 'https://i.pravatar.cc/150?u=' + member.userId }} 
                                    style={styles.staffAvatar} 
                                />
                                <View style={styles.staffInfo}>
                                    <Text style={styles.staffName}>{member.user?.name || 'Unknown Staff'}</Text>
                                    <Text style={styles.staffPhone}>{member.user?.phone}</Text>
                                    <View style={[styles.roleBadge, { backgroundColor: member.role === 'APARTMENT_ADMIN' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)' }]}>
                                        <Text style={[styles.roleBadgeText, { color: member.role === 'APARTMENT_ADMIN' ? '#f87171' : '#60a5fa' }]}>
                                            {member.role.replace('_', ' ')}
                                        </Text>
                                    </View>
                                </View>
                                <TouchableOpacity 
                                    style={styles.removeBtn} 
                                    onPress={() => handleRemoveStaff(member)}
                                >
                                    <Ionicons name="trash-outline" size={20} color="#f87171" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>

            {/* ADD STAFF MODAL */}
            <Modal
                visible={showAddModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Admin Staff</Text>
                            <TouchableOpacity onPress={() => setShowAddModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ gap: 16 }}>
                            <Text style={styles.modalLabel}>Staff Name</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: theme.surface }]}
                                value={staffName}
                                onChangeText={setStaffName}
                                placeholder="e.g. John Doe"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.modalLabel}>Phone Number</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: theme.surface }]}
                                value={staffPhone}
                                onChangeText={setStaffPhone}
                                placeholder="e.g. +91 9876543210"
                                keyboardType="phone-pad"
                                placeholderTextColor="#64748b"
                            />

                            <Text style={styles.modalLabel}>Role Selection</Text>
                            <View style={styles.roleSelectionContainer}>
                                {['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].map((r: any) => (
                                    <TouchableOpacity
                                        key={r}
                                        style={[
                                            styles.roleOption,
                                            staffRole === r && { backgroundColor: theme.primary, borderColor: theme.primary }
                                        ]}
                                        onPress={() => setStaffRole(r)}
                                    >
                                        <Text style={[styles.roleOptionText, staffRole === r && { color: '#fff' }]}>
                                            {r.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, { backgroundColor: theme.primary }]}
                                onPress={handleAddStaff}
                                disabled={addingStaff}
                            >
                                {addingStaff ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitBtnText}>Add Staff Member</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
        paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16,
        borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { 
        width: 44, height: 44, borderRadius: 22, 
        backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' 
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    scrollContent: { padding: 24, paddingBottom: 60 },
    sectionLabel: { fontSize: 14, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    photoPicker: {
        height: 180, borderRadius: 16, overflow: 'hidden', borderWidth: 2, 
        borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', 
        backgroundColor: 'rgba(255,255,255,0.02)', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24
    },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center' },
    photoPlaceholderText: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '600' },
    card: { padding: 20, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 32 },
    cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    input: { borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 16 },
    saveBtn: { borderRadius: 12, padding: 18, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
    staffHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    addStaffBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    addStaffBtnText: { fontSize: 12, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: '#64748b', fontWeight: '600' },
    staffListContainer: { gap: 12 },
    staffCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    staffAvatar: { width: 48, height: 48, borderRadius: 24 },
    staffInfo: { flex: 1, marginLeft: 16, gap: 4 },
    staffName: { fontSize: 15, fontWeight: '700', color: '#fff' },
    staffPhone: { fontSize: 13, color: '#64748b', fontWeight: '500' },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    roleBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    removeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.05)', alignItems: 'center', justifyContent: 'center' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    modalLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
    modalInput: { borderRadius: 12, padding: 16, fontSize: 16, color: '#fff', fontWeight: '600', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    roleSelectionContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    roleOption: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.02)' },
    roleOptionText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
    modalSubmitBtn: { borderRadius: 12, padding: 18, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    modalSubmitBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 }
});
