import React, { useState, useEffect } from 'react';
import {
    View, Text, Image, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, ScrollView, TextInput, Modal, SafeAreaView, Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storageApi } from '../services/storage';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
    const { user, updateUser, logout } = useAuthStore();
    const navigation = useNavigation<any>();
    
    // UI State
    const [showProfileEditor, setShowProfileEditor] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        age: user?.age?.toString() || '',
        description: user?.description || '',
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                age: user.age?.toString() || '',
                description: user.description || '',
            });
        }
    }, [user]);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            uploadProfilePhoto(result.assets[0]);
        }
    };

    const uploadProfilePhoto = async (asset: ImagePicker.ImagePickerAsset) => {
        setUploading(true);
        try {
            if (!user) return;
            const fileName = asset.fileName || `profile_${Date.now()}.jpg`;
            const contentType = asset.mimeType || 'image/jpeg';
            const fileUrl = await storageApi.uploadFile(asset.uri, fileName, contentType, 'profile');

            await api.put(`/profile/user`, { profilePhoto: fileUrl });
            updateUser({ ...user, profilePhoto: fileUrl });
            Alert.alert('Success', 'Profile photo updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const { data } = await api.put('/profile/user', {
                ...formData,
                age: formData.age ? parseInt(formData.age) : null,
            });
            updateUser(data);
            setShowProfileEditor(false);
            Alert.alert('Success', 'Profile updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: logout }
        ]);
    };

    const MenuOption = ({ icon, label, sublabel, onPress, color = "#6366f1" }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={[styles.menuIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{label}</Text>
                {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header Profile Summary */}
                <View style={styles.profileSummary}>
                    <View style={styles.photoContainer}>
                        {user?.profilePhoto ? (
                            <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
                        ) : (
                            <View style={[styles.photo, styles.placeholder]}>
                                <Ionicons name="person" size={40} color="#64748b" />
                            </View>
                        )}
                        <TouchableOpacity style={styles.miniCamera} onPress={pickImage} disabled={uploading}>
                            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                    <View style={styles.summaryText}>
                        <Text style={styles.userName}>{user?.name || 'Resido User'}</Text>
                        <Text style={styles.userRole}>{user?.role?.replace('_', ' ')}</Text>
                        <TouchableOpacity onPress={() => setShowProfileEditor(true)}>
                            <Text style={styles.editProfileText}>Edit Profile</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Menu Sections */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Settings</Text>
                    <MenuOption icon="person-outline" label="Personal Information" sublabel="Update name, bio, and photo" onPress={() => setShowProfileEditor(true)} />
                    <MenuOption icon="shield-checkmark-outline" label="Account Privacy" sublabel="Control who sees your activity" onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon')} />
                    <MenuOption icon="share-social-outline" label="Sharing" sublabel="Manage shared resources" onPress={() => Alert.alert('Sharing', 'Sharing options coming soon')} />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Community</Text>
                    <MenuOption icon="business-outline" label="Community Management" sublabel="Settings for your current community" onPress={() => Alert.alert('Management', 'Admin panel access required')} />
                    <MenuOption icon="add-circle-outline" label="Create Community" sublabel="Start a new residential project" onPress={() => navigation.navigate('CreateCommunity')} color="#10b981" />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Support & Legal</Text>
                    <MenuOption icon="help-circle-outline" label="Help Center" onPress={() => {}} />
                    <MenuOption icon="document-text-outline" label="Terms of Service" onPress={() => {}} />
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
                
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Profile Editor Modal */}
            <Modal visible={showProfileEditor} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setShowProfileEditor(false)}>
                            <Ionicons name="close" size={28} color="#1e293b" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Profile</Text>
                        <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#6366f1" /> : <Text style={styles.modalSave}>Save</Text>}
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.modalForm}>
                        <View style={styles.field}>
                            <Text style={styles.label}>Full Name</Text>
                            <TextInput style={styles.input} value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput style={styles.input} value={formData.age} onChangeText={(t) => setFormData({...formData, age: t})} keyboardType="numeric" />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Bio / Description</Text>
                            <TextInput style={[styles.input, styles.textArea]} value={formData.description} onChangeText={(t) => setFormData({...formData, description: t})} multiline numberOfLines={4} />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    profileSummary: { flexDirection: 'row', padding: 24, alignItems: 'center', backgroundColor: '#f8fafc', margin: 20, borderRadius: 24 },
    photoContainer: { position: 'relative' },
    photo: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e2e8f0' },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    miniCamera: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#6366f1', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    summaryText: { marginLeft: 20, flex: 1 },
    userName: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    userRole: { fontSize: 13, color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    editProfileText: { color: '#64748b', fontSize: 14, marginTop: 8, fontWeight: '600' },

    section: { paddingHorizontal: 24, marginBottom: 32 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
    menuIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    menuContent: { flex: 1, marginLeft: 16 },
    menuLabel: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
    menuSublabel: { fontSize: 13, color: '#64748b', marginTop: 2 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, padding: 18, backgroundColor: '#fef2f2', borderRadius: 16, justifyContent: 'center' },
    logoutText: { marginLeft: 10, fontSize: 16, fontWeight: '700', color: '#ef4444' },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    modalSave: { color: '#6366f1', fontWeight: '800', fontSize: 16 },
    modalForm: { padding: 24 },
    field: { marginBottom: 24 },
    label: { fontSize: 13, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 },
    input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
    textArea: { height: 100, textAlignVertical: 'top' },
});
