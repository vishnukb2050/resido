import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, SafeAreaView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { residentApi, authApi, communityApi } from '../services/api';
import { storageApi } from '../services/storage';
import { useAuthStore } from '../store/authStore';

export default function CreateMemberScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [loading, setLoading] = useState(false);
    
    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [showBlockDropdown, setShowBlockDropdown] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);
    const [newBlockName, setNewBlockName] = useState('');
    const [newUnitNumber, setNewUnitNumber] = useState('');
    const [showRoleDropdown, setShowRoleDropdown] = useState(false);
    const [profilePhotoUri, setProfilePhotoUri] = useState<string | null>(null);
    const [docUri, setDocUri] = useState<string | null>(null);
    const [docName, setDocName] = useState<string | null>(null);
    const [docType, setDocType] = useState<string | null>(null);
    
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

    React.useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
        } catch (error) {
            console.error('Failed to fetch blocks:', error);
        }
    };

    const fetchUnits = async (blockId: string) => {
        try {
            const { data } = await communityApi.getUnits(blockId);
            setUnits(data || []);
        } catch (error) {
            console.error('Failed to fetch units:', error);
        }
    };


    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required to take a live photo.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setProfilePhotoUri(result.assets[0].uri);
        }
    };

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'image/*'],
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                setDocUri(asset.uri);
                setDocName(asset.name);
                setDocType(asset.mimeType || 'application/pdf');
            }
        } catch (error) {
            console.error('Failed to pick document:', error);
        }
    };

    const handleCreate = async () => {
        if (!formData.name || !formData.phone) {
            Alert.alert('Error', 'Name and Phone are required');
            return;
        }

        if (params.mode !== 'STAFF' && !selectedBlockId && !selectedUnitId) {
            Alert.alert('Error', 'Either Block or Address is mandatory for residents');
            return;
        }

        setLoading(true);
        try {
            let addressStr = '';

            if (selectedBlockId) {
                const b = blocks.find(x => x.id === selectedBlockId);
                addressStr = b?.name || '';
            }

            if (selectedUnitId && params.mode !== 'STAFF') {
                const u = units.find(x => x.id === selectedUnitId);
                addressStr += addressStr ? `, Unit ${u?.number || ''}` : `Unit ${u?.number || ''}`;
            }

            let profilePhotoUrl = undefined;
            let finalDocUrl = undefined;

            if (profilePhotoUri) {
                profilePhotoUrl = await storageApi.uploadFile(profilePhotoUri, `photo_${Date.now()}.jpg`, 'image/jpeg', 'profiles');
            }

            if (docUri && docName && docType) {
                finalDocUrl = await storageApi.uploadFile(docUri, docName, docType, 'documents');
            }

            // Create member in resident service (tenant DB)
            await residentApi.createMember({
                ...formData,
                address: addressStr,
                age: formData.age ? parseInt(formData.age) : undefined,
                profilePhoto: profilePhotoUrl,
                docUrl: finalDocUrl,
            });
            
            const activeWorkspace = useAuthStore.getState().activeWorkspace;
            await authApi.syncMembership({
                phone: formData.phone,
                tenantId: activeWorkspace?.tenantId || '',
                tenantName: activeWorkspace?.tenantName || '',
                role: formData.role
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

            Alert.alert('Success', `${params.mode === 'STAFF' ? 'Staff' : 'Member'} added successfully`);
            router.back();
        } catch (error: any) {
            console.error('Failed to create member:', error);
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
                {/* Live Photo Capture Section */}
                <View style={styles.avatarSection}>
                    <TouchableOpacity style={styles.avatarWrapper} onPress={takePhoto}>
                        {profilePhotoUri ? (
                            <Image source={{ uri: profilePhotoUri }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="camera" size={32} color="#94a3b8" />
                            </View>
                        )}
                        <View style={styles.cameraBadge}>
                            <Ionicons name="add" size={16} color="#fff" />
                        </View>
                    </TouchableOpacity>
                    <Text style={styles.avatarHint}>Take Live Photo</Text>
                </View>

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

                <View style={[styles.row, { zIndex: 100 }]}>
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
                    <View style={[styles.field, { flex: 2, position: 'relative' }]}>
                        <Text style={styles.label}>Role / Category</Text>
                        <View style={styles.pickerContainer}>
                            <TouchableOpacity 
                                style={styles.pickerTrigger} 
                                onPress={() => params.mode === 'STAFF' && setShowRoleDropdown(!showRoleDropdown)}
                            >
                                <Text style={styles.pickerText}>{formData.role.replace('_', ' ')}</Text>
                                <Ionicons name="chevron-down" size={16} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        {showRoleDropdown && params.mode === 'STAFF' && (
                            <View style={[styles.dropdownList, { position: 'absolute', top: 75, left: 0, right: 0, zIndex: 100 }]}>
                                {['SECURITY_STAFF', 'CLEANING_STAFF', 'MAINTENANCE_STAFF', 'CARETAKER', 'ADMIN_STAFF'].map(r => (
                                    <TouchableOpacity 
                                        key={r} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setFormData({ ...formData, role: r });
                                            setShowRoleDropdown(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownText}>{r.replace('_', ' ')}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Select Block</Text>
                    <View style={styles.pickerContainer}>
                        <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowBlockDropdown(!showBlockDropdown)}>
                            <Text style={[styles.pickerText, !selectedBlockId && { color: '#94a3b8' }]}>
                                {selectedBlockId ? blocks.find(b => b.id === selectedBlockId)?.name : 'Select Block'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                    {showBlockDropdown && (
                        <View style={styles.dropdownList}>
                            {blocks.map(b => (
                                <TouchableOpacity 
                                    key={b.id} 
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        setSelectedBlockId(b.id);
                                        fetchUnits(b.id);
                                        setShowBlockDropdown(false);
                                    }}
                                >
                                    <Text style={styles.dropdownText}>{b.name}</Text>
                                </TouchableOpacity>
                            ))}
                            {blocks.length === 0 && (
                                <View style={styles.dropdownItem}>
                                    <Text style={styles.emptyText}>No blocks created yet.</Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {params.mode !== 'STAFF' && (
                    <View style={styles.field}>
                        <Text style={styles.label}>Select Unit / Address</Text>
                        <View style={styles.pickerContainer}>
                            <TouchableOpacity style={styles.pickerTrigger} onPress={() => setShowUnitDropdown(!showUnitDropdown)}>
                                <Text style={[styles.pickerText, !selectedUnitId && { color: '#94a3b8' }]}>
                                    {selectedUnitId ? units.find(u => u.id === selectedUnitId)?.number : 'Select Address / Unit'}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color="#64748b" />
                            </TouchableOpacity>
                        </View>
                        {showUnitDropdown && (
                            <View style={styles.dropdownList}>
                                {units.map(u => (
                                    <TouchableOpacity 
                                        key={u.id} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setSelectedUnitId(u.id);
                                            setShowUnitDropdown(false);
                                        }}
                                    >
                                        <Text style={styles.dropdownText}>{u.number}</Text>
                                    </TouchableOpacity>
                                ))}
                                {units.length === 0 && (
                                    <View style={styles.dropdownItem}>
                                        <Text style={styles.emptyText}>
                                            {selectedBlockId ? "No units in this block." : "Select a block to see units."}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>
                )}




                {params.mode === 'STAFF' && (
                    <View style={styles.field}>
                        <Text style={styles.label}>Staff Documents (ID Proof/Contract)</Text>
                        <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
                            {docName ? (
                                <>
                                    <Ionicons name="document-text" size={24} color="#10b981" />
                                    <Text style={[styles.uploadBtnText, { color: '#10b981' }]}>{docName}</Text>
                                </>
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={24} color="#4c1d95" />
                                    <Text style={styles.uploadBtnText}>Upload PDF or Image</Text>
                                </>
                            )}
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
    roleChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8, marginBottom: 8, borderWidth: 1, borderColor: '#e2e8f0' },
    roleChipActive: { backgroundColor: '#4c1d95', borderColor: '#4c1d95' },
    roleChipText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    roleChipTextActive: { color: '#fff' },
    
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5 },
    emptyText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', fontStyle: 'italic', padding: 5 },

    dropdownList: { backgroundColor: '#fff', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    dropdownText: { color: '#1e293b', fontSize: 14, fontWeight: '600' },

    uploadBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 16, padding: 25, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#f8fafc' },
    uploadBtnText: { color: '#4c1d95', fontWeight: '700', fontSize: 14 },

    avatarSection: { alignItems: 'center', marginBottom: 24, marginTop: 10 },
    avatarWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', position: 'relative', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed' },
    avatar: { width: '100%', height: '100%', borderRadius: 50 },
    avatarPlaceholder: { width: '100%', height: '100%', borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    cameraBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#4c1d95', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    avatarHint: { marginTop: 8, fontSize: 13, fontWeight: '600', color: '#64748b' },

    submitBtn: { backgroundColor: '#4c1d95', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, shadowColor: '#4c1d95', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
