import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Alert, ScrollView, Image, Modal, KeyboardAvoidingView, Platform, SafeAreaView
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
    
    // Theme colors mapping
    const theme = getThemeColors(activeWorkspace?.tenantId || undefined);

    // Navigation and layout states
    const [editingWorkspace, setEditingWorkspace] = useState<any | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Edit Community Details Form State
    const [name, setName] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [updatingDetails, setUpdatingDetails] = useState(false);

    // Admin Staff Management State
    const [staffList, setStaffList] = useState<any[]>([]);
    const [loadingStaff, setLoadingStaff] = useState(false);
    const [showAddStaffModal, setShowAddStaffModal] = useState(false);

    // Add Staff Form State
    const [staffName, setStaffName] = useState('');
    const [staffPhone, setStaffPhone] = useState('');
    const [staffRole, setStaffRole] = useState<'APARTMENT_ADMIN' | 'CARETAKER' | 'ADMIN_STAFF'>('ADMIN_STAFF');
    const [addingStaff, setAddingStaff] = useState(false);

    // Create Community Form State
    const [createName, setCreateName] = useState('');
    const [createEmail, setCreateEmail] = useState('');
    const [createPhone, setCreatePhone] = useState('');
    const [createPassword, setCreatePassword] = useState('');
    const [createPhotoUri, setCreatePhotoUri] = useState<string | null>(null);
    const [creatingCommunity, setCreatingCommunity] = useState(false);

    // ── Fetch Staff for Editing Workspace ─────────────────────────────
    const fetchStaff = async (tenantId: string) => {
        setLoadingStaff(true);
        try {
            const res = await authApi.getClientStaff(tenantId);
            setStaffList(res.data || []);
        } catch (e) {
            console.error('Failed to load staff list', e);
        } finally {
            setLoadingStaff(false);
        }
    };

    useEffect(() => {
        if (editingWorkspace?.tenantId) {
            fetchStaff(editingWorkspace.tenantId);
        }
    }, [editingWorkspace?.tenantId]);

    // ── Load Workspaces on Mount ──────────────────────────────────────
    const fetchWorkspacesList = async () => {
        try {
            const wsRes = await authApi.getWorkspaces();
            setWorkspaces(wsRes.data || []);
        } catch (e) {
            console.warn('Failed to fetch workspaces list:', e);
        }
    };

    useEffect(() => {
        fetchWorkspacesList();
    }, []);

    // ── Handle Select Workspace to Edit ────────────────────────────────
    const handleSelectWorkspace = (ws: any) => {
        setEditingWorkspace(ws);
        setName(ws.tenantName || '');
        setPhotoUri(ws.photoUrl || null);
    };

    // ── Image Pickers ─────────────────────────────────────────────────
    const handlePickPhoto = async (isForCreate: boolean) => {
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
            if (isForCreate) {
                setCreatePhotoUri(result.assets[0].uri);
            } else {
                setPhotoUri(result.assets[0].uri);
            }
        }
    };

    // ── Save Community Details ────────────────────────────────────────
    const handleSaveDetails = async () => {
        if (!editingWorkspace) return;
        if (!name.trim()) {
            Alert.alert('Error', 'Community Name cannot be empty.');
            return;
        }

        setUpdatingDetails(true);
        try {
            let uploadedPhotoUrl = photoUri;
            
            if (photoUri && !photoUri.startsWith('http')) {
                uploadedPhotoUrl = await storageApi.uploadFile(
                    photoUri,
                    `community_${Date.now()}.jpg`,
                    'image/jpeg',
                    'communities',
                    editingWorkspace.tenantId,
                ) as string;
            }

            await authApi.updateClient(editingWorkspace.tenantId, {
                name: name.trim(),
                photoUrl: uploadedPhotoUrl
            });

            // Update workspace locally
            const updatedWs = {
                ...editingWorkspace,
                tenantName: name.trim(),
                photoUrl: uploadedPhotoUrl
            };
            setEditingWorkspace(updatedWs);

            // Sync with activeWorkspace if they match
            if (activeWorkspace?.tenantId === editingWorkspace.tenantId) {
                setActiveWorkspace(updatedWs, useAuthStore.getState().token || '');
            }

            // Reload workspace catalog
            fetchWorkspacesList();

            Alert.alert('Success', 'Community details updated successfully!');
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to update community details');
        } finally {
            setUpdatingDetails(false);
        }
    };

    // ── Staff Management ──────────────────────────────────────────────
    const handleAddStaff = async () => {
        if (!editingWorkspace) return;
        if (!staffPhone.trim() || staffPhone.length < 10) {
            Alert.alert('Error', 'Please enter a valid phone number (at least 10 digits).');
            return;
        }

        setAddingStaff(true);
        try {
            await authApi.addClientStaff(editingWorkspace.tenantId, {
                phone: staffPhone.trim(),
                role: staffRole,
                name: staffName.trim() || undefined
            });

            Alert.alert('Success', 'Admin staff added successfully!');
            setShowAddStaffModal(false);
            setStaffName('');
            setStaffPhone('');
            setStaffRole('ADMIN_STAFF');
            fetchStaff(editingWorkspace.tenantId);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to add staff member');
        } finally {
            setAddingStaff(false);
        }
    };

    const handleRemoveStaff = (membership: any) => {
        if (!editingWorkspace) return;
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
                            await authApi.removeClientStaff(editingWorkspace.tenantId, membership.id);
                            fetchStaff(editingWorkspace.tenantId);
                        } catch (err) {
                            Alert.alert('Error', 'Failed to remove staff member');
                        }
                    }
                }
            ]
        );
    };

    // ── Create Community Action ───────────────────────────────────────
    const handleCreateCommunity = async () => {
        if (!createName.trim() || !createEmail.trim() || !createPhone.trim() || !createPassword) {
            Alert.alert('Error', 'Community Name, Admin Mobile, Email and Password are required.');
            return;
        }

        setCreatingCommunity(true);
        try {
            let uploadedPhotoUrl = '';
            if (createPhotoUri) {
                uploadedPhotoUrl = await storageApi.uploadFile(
                    createPhotoUri,
                    `community_${Date.now()}.jpg`,
                    'image/jpeg',
                    'communities'
                ) as string;
            }

            await authApi.createClient({
                name: createName.trim(),
                adminEmail: createEmail.trim(),
                adminPhone: createPhone.trim(),
                adminPassword: createPassword,
                photoUrl: uploadedPhotoUrl,
                plan: 'BASIC'
            });

            // Reload spaces list
            await fetchWorkspacesList();

            Alert.alert('🎉 Success', 'Community launched successfully! Tap on it from the list to manage.', [
                {
                    text: 'OK',
                    onPress: () => {
                        setShowCreateModal(false);
                        setCreateName('');
                        setCreateEmail('');
                        setCreatePhone('');
                        setCreatePassword('');
                        setCreatePhotoUri(null);
                    }
                }
            ]);
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Failed to create community');
        } finally {
            setCreatingCommunity(false);
        }
    };

    // ── Render List of Communities (Dashboard) ─────────────────────────
    if (!editingWorkspace) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#F8F5FF' }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Manage Communities</Text>
                    <View style={{ width: 44 }} />
                </View>

                {/* Dashboard List */}
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    
                    {/* Create community trigger card */}
                    <TouchableOpacity 
                        style={[styles.createTriggerCard, { borderColor: '#8b5cf6' }]}
                        onPress={() => setShowCreateModal(true)}
                    >
                        <View style={[styles.createTriggerIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                            <Ionicons name="add-circle" size={28} color="#8b5cf6" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.createTriggerTitle}>Launch New Community</Text>
                            <Text style={styles.createTriggerSub}>Set up a smart ecosystem for your apartment building or area</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#64748b" />
                    </TouchableOpacity>

                    <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Your Communities ({workspaces.length})</Text>

                    {workspaces.length === 0 ? (
                        <View style={styles.emptyCatalogContainer}>
                            <Ionicons name="business-outline" size={48} color="#475569" />
                            <Text style={styles.emptyCatalogText}>You are not a member of any community yet.</Text>
                            <TouchableOpacity 
                                style={[styles.launchBtnInline, { backgroundColor: '#8b5cf6' }]}
                                onPress={() => setShowCreateModal(true)}
                            >
                                <Text style={styles.launchBtnInlineText}>Launch First Community</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ gap: 14 }}>
                            {workspaces.map((ws: any) => (
                                <TouchableOpacity 
                                    key={ws.tenantId} 
                                    style={styles.communityListItem}
                                    onPress={() => handleSelectWorkspace(ws)}
                                >
                                    <Image 
                                        source={ws.photoUrl ? { uri: ws.photoUrl } : require('../../assets/greenwoods_logo.jpg')} 
                                        style={styles.communityListImg} 
                                    />
                                    <View style={{ flex: 1, marginLeft: 16, gap: 4 }}>
                                        <Text style={styles.communityListName} numberOfLines={1}>{ws.tenantName}</Text>
                                        <View style={styles.roleLabelTag}>
                                            <Ionicons name="shield-outline" size={10} color="#c084fc" />
                                            <Text style={styles.roleLabelText}>{ws.role || 'RESIDENT'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.manageLabelBox}>
                                        <Text style={styles.manageLabelText}>Configure</Text>
                                        <Ionicons name="settings-outline" size={14} color="#8b5cf6" />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>

                {/* CREATE COMMUNITY FULLSCREEN MODAL */}
                <Modal
                    visible={showCreateModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowCreateModal(false)}
                >
                    <SafeAreaView style={styles.modalFullscreen}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.backBtn}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Launch Community</Text>
                            <View style={{ width: 44 }} />
                        </View>

                        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.heroSection}>
                                <View style={styles.heroIconBox}>
                                    <Ionicons name="business" size={32} color="#8b5cf6" />
                                </View>
                                <Text style={styles.heroTitle}>Launch Community</Text>
                                <Text style={styles.heroSub}>Initialize your smart apartment ecosystem with administrative and resident access.</Text>
                            </View>

                            <View style={{ gap: 20 }}>
                                <Text style={styles.modalSectionLabel}>1. Cover Image</Text>
                                <TouchableOpacity style={styles.photoPicker} onPress={() => handlePickPhoto(true)}>
                                    {createPhotoUri ? (
                                        <Image source={{ uri: createPhotoUri }} style={styles.photoPreview} />
                                    ) : (
                                        <View style={styles.photoPlaceholder}>
                                            <Ionicons name="camera-outline" size={30} color="#64748b" />
                                            <Text style={styles.photoPlaceholderText}>Select cover photo</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <Text style={styles.modalSectionLabel}>2. Basic Information</Text>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.cardLabel}>Community Name *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="e.g. Greenwood Residency"
                                        placeholderTextColor="#64748b"
                                        value={createName}
                                        onChangeText={setCreateName}
                                    />
                                </View>

                                <Text style={styles.modalSectionLabel}>3. Admin Credentials</Text>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.cardLabel}>Admin Phone *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="Admin Phone Number"
                                        placeholderTextColor="#64748b"
                                        keyboardType="phone-pad"
                                        value={createPhone}
                                        onChangeText={setCreatePhone}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.cardLabel}>Admin Email *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="admin@community.com"
                                        placeholderTextColor="#64748b"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={createEmail}
                                        onChangeText={setCreateEmail}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.cardLabel}>Admin Password *</Text>
                                    <TextInput
                                        style={styles.modalInput}
                                        placeholder="••••••••"
                                        placeholderTextColor="#64748b"
                                        secureTextEntry
                                        value={createPassword}
                                        onChangeText={setCreatePassword}
                                    />
                                </View>

                                <TouchableOpacity 
                                    style={[styles.submitCreateBtn, { backgroundColor: '#8b5cf6' }]} 
                                    onPress={handleCreateCommunity} 
                                    disabled={creatingCommunity}
                                >
                                    {creatingCommunity ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <>
                                            <Ionicons name="rocket-outline" size={18} color="#fff" />
                                            <Text style={styles.submitCreateText}>Launch Community</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
            </SafeAreaView>
        );
    }

    // ── Render Specific Community Configurations ─────────────────────
    return (
        <KeyboardAvoidingView 
            style={[styles.container, { backgroundColor: theme.background }]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setEditingWorkspace(null)} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle} numberOfLines={1}>{editingWorkspace.tenantName}</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* 1. COVER PHOTO */}
                <Text style={styles.sectionLabel}>Community Cover Photo</Text>
                <TouchableOpacity style={styles.photoPicker} onPress={() => handlePickPhoto(false)}>
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
                        onPress={() => setShowAddStaffModal(true)}
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
                visible={showAddStaffModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowAddStaffModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Admin Staff</Text>
                            <TouchableOpacity onPress={() => setShowAddStaffModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ gap: 16 }} keyboardShouldPersistTaps="handled">
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
                                        <Text style={[styles.roleOptionText, staffRole === r && { color: '#2D2445' }]}>
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
        borderBottomWidth: 1, borderBottomColor: '#EFE9F8'
    },
    backBtn: { 
        width: 44, height: 44, borderRadius: 22, 
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' 
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },
    scrollContent: { padding: 24, paddingBottom: 60 },
    sectionLabel: { fontSize: 13, fontWeight: '800', color: '#7A6B9C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    photoPicker: {
        height: 165, borderRadius: 16, overflow: 'hidden', borderWidth: 2, 
        borderColor: '#D4C9E8', borderStyle: 'dashed', 
        backgroundColor: 'rgba(255,255,255,0.01)', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20
    },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center' },
    photoPlaceholderText: { fontSize: 13, color: '#7A6B9C', marginTop: 8, fontWeight: '600' },
    card: { padding: 20, borderRadius: 16, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', marginBottom: 32 },
    cardLabel: { fontSize: 11, color: '#7A6B9C', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    input: { borderRadius: 12, padding: 16, fontSize: 16, color: '#2D2445', fontWeight: '600', borderWidth: 1, borderColor: '#D4C9E8', marginBottom: 16 },
    saveBtn: { borderRadius: 12, padding: 18, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 16 },
    staffHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    addStaffBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
    addStaffBtnText: { fontSize: 12, fontWeight: '700' },
    emptyContainer: { alignItems: 'center', padding: 40, gap: 12 },
    emptyText: { color: '#7A6B9C', fontWeight: '600' },
    staffListContainer: { gap: 12 },
    staffCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8' },
    staffAvatar: { width: 48, height: 48, borderRadius: 24 },
    staffInfo: { flex: 1, marginLeft: 16, gap: 4 },
    staffName: { fontSize: 15, fontWeight: '700', color: '#2D2445' },
    staffPhone: { fontSize: 13, color: '#7A6B9C', fontWeight: '500' },
    roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    roleBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
    removeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.05)', alignItems: 'center', justifyContent: 'center' },
    
    // Modal & Overlay
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 16 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    modalLabel: { fontSize: 12, color: '#9A8EBA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
    modalInput: { borderRadius: 12, padding: 16, fontSize: 15, color: '#2D2445', fontWeight: '600', borderWidth: 1, borderColor: '#D4C9E8', backgroundColor: '#ffffff' },
    roleSelectionContainer: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    roleOption: { borderWidth: 1, borderColor: '#C4B5DC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#ffffff' },
    roleOptionText: { fontSize: 13, color: '#9A8EBA', fontWeight: '600' },
    modalSubmitBtn: { borderRadius: 12, padding: 18, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
    modalSubmitBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 16 },

    // Dashboard-Specific Styles
    createTriggerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1.5,
        marginBottom: 28,
        gap: 16
    },
    createTriggerIconBox: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    createTriggerTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    createTriggerSub: { fontSize: 11, color: '#9A8EBA', fontWeight: '600', marginTop: 3, lineHeight: 16 },
    emptyCatalogContainer: {
        alignItems: 'center',
        paddingVertical: 50,
        gap: 16
    },
    emptyCatalogText: { fontSize: 14, color: '#7A6B9C', fontWeight: '600', textAlign: 'center' },
    launchBtnInline: {
        paddingHorizontal: 22,
        paddingVertical: 13,
        borderRadius: 12,
        marginTop: 8
    },
    launchBtnInlineText: { color: '#2D2445', fontWeight: '800', fontSize: 13 },
    communityListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#D4C9E8'
    },
    communityListImg: { width: 50, height: 50, borderRadius: 12 },
    communityListName: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    roleLabelTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(192, 132, 252, 0.08)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 2,
        alignSelf: 'flex-start'
    },
    roleLabelText: { fontSize: 10, color: '#c084fc', fontWeight: '800', textTransform: 'uppercase' },
    manageLabelBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10
    },
    manageLabelText: { fontSize: 11, color: '#a78bfa', fontWeight: '800' },

    // Modal Fullscreen Styling
    modalFullscreen: { flex: 1, backgroundColor: '#F8F5FF' },
    heroSection: { alignItems: 'center', marginBottom: 28, marginTop: 10 },
    heroIconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(139, 92, 246, 0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    heroTitle: { fontSize: 24, fontWeight: '900', color: '#2D2445', textAlign: 'center' },
    heroSub: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', marginTop: 8, lineHeight: 20, paddingHorizontal: 24, fontWeight: '600' },
    modalSectionLabel: { fontSize: 12, fontWeight: '900', color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8 },
    inputGroup: { gap: 8 },
    submitCreateBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderRadius: 16,
        padding: 18,
        marginTop: 20
    },
    submitCreateText: { color: '#2D2445', fontWeight: '900', fontSize: 15 }
});
