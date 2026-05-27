import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    ActivityIndicator, StatusBar, Dimensions, Modal
} from 'react-native';

import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '../services/api';
import BottomNav from '../components/BottomNav';
import { resolveMediaUrl, withCacheBust } from '../utils/mediaUrl';

const { width } = Dimensions.get('window');

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [isVisibilityModalVisible, setIsVisibilityModalVisible] = useState(false);
    const [imageTimestamp, setImageTimestamp] = useState(Date.now());

    const [formData, setFormData] = useState({
        name: user?.name || '',
        username: user?.username || 'johndoe_resido',
        email: user?.email || 'john.doe@gmail.com',
        phone: user?.phone || '+1 234 567 8900',
        bio: user?.description || 'Greenwoods resident | Love community & smart living',
        location: 'Greenwoods, Block A, Unit 1203',
        instagram: user?.instagram || '',
        linkedin: user?.linkedin || '',
        website: user?.website || '',
        visibility: 'Greenwoods Residents',
        // Only seed from the actual user record. Avoid using a public placeholder
        // (i.pravatar) because the save flow would then POST that URL back as the
        // user's profile photo, leaving the bubble showing the stock avatar
        // instead of falling back to the user's initial.
        profilePhoto: user?.profilePhoto || '',
    });

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setFormData({ ...formData, profilePhoto: result.assets[0].uri });
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const hasNewImage = formData.profilePhoto && (formData.profilePhoto.startsWith('file://') || formData.profilePhoto.startsWith('content://') || !formData.profilePhoto.startsWith('http'));
            
            let uploadedPhotoUrl: string = formData.profilePhoto;
            
            if (hasNewImage) {
                const uriParts = formData.profilePhoto.split('.');
                const fileExt = uriParts[uriParts.length - 1].toLowerCase().split('?')[0];
                const fileType = ['jpg', 'jpeg', 'png'].includes(fileExt) ? fileExt : 'jpeg';
                const fileName = `profile_${Date.now()}.${fileType}`;
                const contentType = `image/${fileType === 'jpg' ? 'jpeg' : fileType}`;

                // 1. Get presigned URL from correct endpoint (uses req.user.userId)
                const { data: presignedData } = await authApi.getPresignedUrl(fileName, contentType, 'profiles');
                const { uploadUrl, fileUrl } = presignedData;

                // 2. Upload directly to R2 via XHR
                await new Promise<void>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('PUT', uploadUrl);
                    xhr.setRequestHeader('Content-Type', contentType);
                    xhr.onreadystatechange = () => {
                        if (xhr.readyState === 4) {
                            if (xhr.status === 200 || xhr.status === 201) {
                                resolve();
                            } else {
                                reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
                            }
                        }
                    };
                    xhr.onerror = () => reject(new Error('Network error during upload'));
                    fetch(formData.profilePhoto)
                        .then(r => r.blob())
                        .then(blob => xhr.send(blob))
                        .catch(reject);
                });

                uploadedPhotoUrl = fileUrl;
            }

            const dataToSubmit = {
                name: formData.name,
                profileName: formData.username,
                email: formData.email,
                phone: formData.phone,
                description: formData.bio,
                instagram: formData.instagram,
                linkedin: formData.linkedin,
                website: formData.website,
                location: formData.location,
                profilePhoto: uploadedPhotoUrl
            };

            const { data: updatedUser } = await authApi.updateProfile(dataToSubmit);

            // Re-fetch full profile to get the final S3 URL
            try {
                const { data: freshProfile } = await authApi.getProfile();
                updateUser(freshProfile);
                const wsRes = await authApi.getWorkspaces();
                if (wsRes?.data) {
                    useAuthStore.getState().setWorkspaces(wsRes.data);
                }
            } catch {
                // Fallback: use the returned user from the update
                updateUser(updatedUser);
            }
            setImageTimestamp(Date.now()); // bust local image cache
            Alert.alert('Success', 'Profile updated successfully! ✨');
            router.back();
        } catch (error: any) {
            console.error('Update profile error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to update profile. Please check your connection.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.headerTitle}>Edit Profile</Text>
                        <Text style={styles.headerSub}>Update your information and how others see you</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            <Image 
                            source={{
                                uri: withCacheBust(
                                    resolveMediaUrl(formData.profilePhoto) || `https://i.pravatar.cc/100?u=${user?.id}`,
                                    imageTimestamp,
                                ),
                            }}
                            style={styles.avatar} 
                        />
                            <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                                <Ionicons name="camera" size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={pickImage}>
                            <Text style={styles.changePhotoText}>Change Photo</Text>
                        </TouchableOpacity>
                        <Text style={styles.uploadHint}>JPG, PNG up to 5MB</Text>
                    </View>

                    {/* Personal Information */}
                    <Text style={styles.sectionTitle}>Personal Information</Text>
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <View style={styles.inputLabelRow}>
                                <Ionicons name="person-outline" size={16} color="#64748b" />
                                <Text style={styles.inputLabel}>Full Name</Text>
                            </View>
                            <TextInput 
                                style={styles.input} 
                                value={formData.name}
                                onChangeText={t => setFormData({...formData, name: t})}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <View style={styles.inputLabelRow}>
                                <MaterialCommunityIcons name="at" size={16} color="#64748b" />
                                <Text style={styles.inputLabel}>Username</Text>
                            </View>
                            <TextInput 
                                style={styles.input} 
                                value={formData.username}
                                onChangeText={t => setFormData({...formData, username: t})}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons name="mail-outline" size={16} color="#64748b" />
                            <Text style={styles.inputLabel}>Email Address</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            value={formData.email}
                            keyboardType="email-address"
                            onChangeText={t => setFormData({...formData, email: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons name="call-outline" size={16} color="#64748b" />
                            <Text style={styles.inputLabel}>Phone Number</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            value={formData.phone}
                            keyboardType="phone-pad"
                            onChangeText={t => setFormData({...formData, phone: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Feather name="edit-3" size={16} color="#64748b" />
                            <Text style={styles.inputLabel}>Bio</Text>
                            <Text style={styles.charCount}>{formData.bio.length}/150</Text>
                        </View>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            multiline
                            maxLength={150}
                            value={formData.bio}
                            onChangeText={t => setFormData({...formData, bio: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons name="location-outline" size={16} color="#64748b" />
                            <Text style={styles.inputLabel}>Location / Address</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Enter your location"
                            placeholderTextColor="#64748b"
                            value={formData.location}
                            onChangeText={t => setFormData({...formData, location: t})}
                        />
                    </View>

                    {/* Social Links */}
                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Social Links</Text>
                    <Text style={styles.subText}>Connect your social accounts to enhance your experience</Text>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                            <Text style={styles.inputLabel}>Instagram Username</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            placeholder="@username"
                            placeholderTextColor="#64748b"
                            value={formData.instagram}
                            onChangeText={t => setFormData({...formData, instagram: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons name="logo-linkedin" size={16} color="#0077B5" />
                            <Text style={styles.inputLabel}>LinkedIn Profile URL</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            placeholder="linkedin.com/in/username"
                            placeholderTextColor="#64748b"
                            value={formData.linkedin}
                            onChangeText={t => setFormData({...formData, linkedin: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <View style={styles.inputLabelRow}>
                            <Ionicons name="globe-outline" size={16} color="#8b5cf6" />
                            <Text style={styles.inputLabel}>Website</Text>
                        </View>
                        <TextInput 
                            style={styles.input} 
                            placeholder="https://yourwebsite.com"
                            placeholderTextColor="#64748b"
                            value={formData.website}
                            onChangeText={t => setFormData({...formData, website: t})}
                        />
                    </View>
                    
                    <TouchableOpacity style={styles.connectMoreBtn}>
                        <View style={styles.plusIcon}>
                            <Ionicons name="add" size={16} color="#fff" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.connectTitle}>Connect More Accounts</Text>
                            <Text style={styles.connectSub}>X (Twitter), Facebook and more coming soon</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#475569" />
                    </TouchableOpacity>

                    {/* Profile Preferences */}
                    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Profile Preferences</Text>
                    <View style={styles.preferenceCard}>
                        <View style={styles.prefIconBox}>
                            <Ionicons name="lock-closed-outline" size={20} color="#8b5cf6" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.prefTitle}>Profile Visibility</Text>
                            <Text style={styles.prefSub}>Choose who can see your profile</Text>
                        </View>
                        <TouchableOpacity style={styles.prefDropdown} onPress={() => setIsVisibilityModalVisible(true)}>
                            <Text style={styles.prefValue}>{formData.visibility}</Text>
                            <Ionicons name="chevron-down" size={16} color="#64748b" />
                        </TouchableOpacity>

                    </View>

                    {/* Action Buttons */}
                    <TouchableOpacity 
                        style={[styles.saveBtn, loading && { opacity: 0.7 }]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.deleteBtn}>
                        <Ionicons name="trash-outline" size={20} color="#ef4444" style={{ marginRight: 8 }} />
                        <Text style={styles.deleteBtnText}>Delete Account</Text>
                    </TouchableOpacity>

                </ScrollView>
            </KeyboardAvoidingView>

            {/* Visibility Selection Modal */}
            <Modal
                visible={isVisibilityModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setIsVisibilityModalVisible(false)}
            >
                <TouchableOpacity 
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setIsVisibilityModalVisible(false)}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Profile Visibility</Text>
                            <TouchableOpacity onPress={() => setIsVisibilityModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#2D2445" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSub}>Choose who can see your profile and contact information</Text>
                        
                        {['Community', 'Contacts', 'Groups', 'Followers', 'Global'].map((option) => {
                            const selectedOptions = formData.visibility ? formData.visibility.split(',').map(o => o.trim()) : [];
                            const isSelected = selectedOptions.includes(option);
                            
                            return (
                                <TouchableOpacity 
                                    key={option}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        let updated;
                                        if (isSelected) {
                                            updated = selectedOptions.filter(o => o !== option);
                                        } else {
                                            // If Global is selected, it clears others, or vice versa? 
                                            // Let's just allow combining them.
                                            updated = [...selectedOptions, option];
                                        }
                                        setFormData({ ...formData, visibility: updated.join(', ') });
                                    }}
                                >
                                    <Text style={[
                                        styles.modalOptionText, 
                                        isSelected && { color: '#8b5cf6', fontWeight: '800' }
                                    ]}>
                                        {option}
                                    </Text>
                                    <View style={[
                                        styles.checkbox,
                                        isSelected && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity 
                            style={[styles.saveBtn, { marginTop: 20 }]} 
                            onPress={() => setIsVisibilityModalVisible(false)}
                        >
                            <Text style={styles.saveBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>


            <BottomNav activeTab="Account" />
        </SafeAreaView>

    );
}

const SocialItem = ({ icon, label, value, color, isConnected }: any) => (
    <TouchableOpacity style={styles.socialItem}>
        <View style={[styles.socialIconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon} size={22} color={color} />
        </View>
        <Text style={styles.socialLabel}>{label}</Text>
        <Text style={styles.socialValue} numberOfLines={1}>{value}</Text>
        {isConnected && (
            <View style={styles.connectedBadge}>
                <Text style={styles.connectedText}>Connected</Text>
            </View>
        )}
        <Ionicons name="chevron-forward" size={18} color="#475569" style={{ marginLeft: 8 }} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, flexDirection: 'row', alignItems: 'center', paddingTop: 80 },

    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    headerSub: { fontSize: 13, color: '#9A8EBA', marginTop: 2 },
    
    scrollContent: { padding: 20, paddingBottom: 120 },
    
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarWrapper: { width: 100, height: 100, marginBottom: 12 },
    avatar: { width: '100%', height: '100%', borderRadius: 50, borderWidth: 2, borderColor: '#8b5cf6', backgroundColor: '#E8E2F2' },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#ffffff' },
    changePhotoText: { fontSize: 14, fontWeight: '800', color: '#8b5cf6' },
    uploadHint: { fontSize: 11, color: '#7A6B9C', marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 16 },
    subText: { fontSize: 13, color: '#9A8EBA', marginBottom: 20 },

    row: { flexDirection: 'row', gap: 12 },
    inputGroup: { marginBottom: 20 },
    inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#9A8EBA', flex: 1 },
    input: { backgroundColor: '#F4EEFC', borderRadius: 14, padding: 16, color: '#2D2445', fontSize: 15, borderWidth: 1, borderColor: '#D4C9E8' },
    textArea: { height: 80, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: '#7A6B9C' },

    pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4EEFC', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D4C9E8' },
    pickerText: { color: '#2D2445', fontSize: 15 },

    socialItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#D4C9E8' },
    socialIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    socialLabel: { fontSize: 14, fontWeight: '700', color: '#2D2445', marginLeft: 12 },
    socialValue: { flex: 1, fontSize: 13, color: '#7A6B9C', marginLeft: 12, textAlign: 'right' },
    connectedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
    connectedText: { color: '#10b981', fontSize: 11, fontWeight: '800' },

    connectMoreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(37, 99, 235, 0.03)', borderRadius: 16, padding: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(37, 99, 235, 0.2)' },
    plusIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
    connectTitle: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    connectSub: { fontSize: 11, color: '#7A6B9C', marginTop: 2 },

    preferenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#D4C9E8' },
    prefIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    prefTitle: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    prefSub: { fontSize: 12, color: '#7A6B9C', marginTop: 2 },
    prefDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    prefValue: { fontSize: 13, color: '#9A8EBA', fontWeight: '600' },

    saveBtn: { backgroundColor: '#8b5cf6', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 40, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    saveBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '900' },
    deleteBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', flexDirection: 'row' },
    deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '800' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    modalSub: { fontSize: 14, color: '#9A8EBA', marginBottom: 24, lineHeight: 20 },
    modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    modalOptionText: { fontSize: 16, color: '#2D2445', fontWeight: '600' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#64748b', alignItems: 'center', justifyContent: 'center' }
});


