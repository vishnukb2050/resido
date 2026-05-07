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
                <Text style={{ fontSize: 20 }}>{icon}</Text>
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuLabel}>{label}</Text>
                {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Header Profile Summary */}
                <View style={styles.profileHeader}>
                    <View style={styles.photoWrapper}>
                        <View style={styles.photoContainer}>
                            {user?.profilePhoto ? (
                                <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
                            ) : (
                                <View style={[styles.photo, styles.placeholder]}>
                                    <Ionicons name="person" size={40} color="#94a3b8" />
                                </View>
                            )}
                        </View>
                        <TouchableOpacity style={styles.miniCamera} onPress={pickImage} disabled={uploading}>
                            {uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={14} color="#fff" />}
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Resido User'}</Text>
                    <View style={styles.roleBadge}>
                        <Text style={styles.userRole}>{user?.role?.replace('_', ' ') || 'Resident'}</Text>
                    </View>
                </View>

                {/* Menu Sections */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>
                    <View style={styles.menuCard}>
                        <MenuOption icon="👤" label="Personal Information" sublabel="Update name, bio, and photo" onPress={() => setShowProfileEditor(true)} />
                        <View style={styles.separator} />
                        <MenuOption icon="🛡️" label="Account Privacy" sublabel="Control who sees your activity" onPress={() => {}} />
                        <View style={styles.separator} />
                        <MenuOption icon="🔗" label="Sharing" sublabel="Manage shared resources" onPress={() => {}} />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Community</Text>
                    <View style={styles.menuCard}>
                        <MenuOption icon="🏢" label="Management" sublabel="Settings for your community" onPress={() => {}} />
                        <View style={styles.separator} />
                        <MenuOption icon="➕" label="Create Community" sublabel="Start a new residential project" onPress={() => navigation.navigate('CreateCommunity')} color="#10b981" />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Settings</Text>
                    <View style={styles.menuCard}>
                        <MenuOption icon="❓" label="Help Center" onPress={() => {}} />
                        <View style={styles.separator} />
                        <MenuOption icon="📄" label="Terms of Service" onPress={() => {}} />
                    </View>
                </View>

                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={22} color="#ef4444" />
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
                
                <Text style={styles.versionText}>Resido v1.0.4</Text>
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
                            <TextInput style={styles.input} value={formData.name} onChangeText={(t) => setFormData({...formData, name: t})} placeholder="John Doe" placeholderTextColor="#94a3b8" />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput style={styles.input} value={formData.age} onChangeText={(t) => setFormData({...formData, age: t})} keyboardType="numeric" placeholder="25" placeholderTextColor="#94a3b8" />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.label}>Bio / Description</Text>
                            <TextInput style={[styles.input, styles.textArea]} value={formData.description} onChangeText={(t) => setFormData({...formData, description: t})} multiline numberOfLines={4} placeholder="Tell us about yourself..." placeholderTextColor="#94a3b8" />
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    profileHeader: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 15, elevation: 2 },
    photoWrapper: { position: 'relative', marginBottom: 20 },
    photoContainer: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#f1f5f9', padding: 4, borderWidth: 1, borderColor: '#f1f5f9' },
    photo: { width: '100%', height: '100%', borderRadius: 55 },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    miniCamera: { position: 'absolute', bottom: 5, right: 5, backgroundColor: '#6366f1', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff', elevation: 4 },
    userName: { fontSize: 24, fontWeight: '900', color: '#1e293b' },
    roleBadge: { backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8 },
    userRole: { fontSize: 12, color: '#6366f1', fontWeight: '800', textTransform: 'uppercase' },

    section: { paddingHorizontal: 20, marginTop: 30 },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 12, marginLeft: 5 },
    menuCard: { backgroundColor: '#fff', borderRadius: 24, padding: 8, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    menuIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    menuContent: { flex: 1, marginLeft: 16 },
    menuLabel: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    menuSublabel: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '500' },
    separator: { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 12 },

    logoutBtn: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 40, padding: 18, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', borderWidth: 1, borderColor: '#fee2e2' },
    logoutText: { marginLeft: 10, fontSize: 16, fontWeight: '800', color: '#ef4444' },
    versionText: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 20, fontWeight: '600' },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    modalSave: { color: '#6366f1', fontWeight: '900', fontSize: 16 },
    modalForm: { padding: 24 },
    field: { marginBottom: 28 },
    label: { fontSize: 12, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
    input: { backgroundColor: '#fcfcfd', borderRadius: 18, padding: 18, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
    textArea: { height: 120, textAlignVertical: 'top' },
});
