import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    ActivityIndicator, StatusBar, Dimensions
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import * as ImagePicker from 'expo-image-picker';
import { authApi } from '../services/api';
import { storageApi } from '../services/storage';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuthStore();
    const [loading, setLoading] = useState(false);

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
        profilePhoto: user?.profilePhoto || "https://i.pravatar.cc/100?u=john"
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
            const formDataToSubmit = new FormData();
            
            // Append basic info
            formDataToSubmit.append('name', formData.name);
            formDataToSubmit.append('profileName', formData.username); 
            formDataToSubmit.append('email', formData.email);
            formDataToSubmit.append('phone', formData.phone);
            formDataToSubmit.append('description', formData.bio);
            formDataToSubmit.append('instagram', formData.instagram);
            formDataToSubmit.append('linkedin', formData.linkedin);
            formDataToSubmit.append('website', formData.website);
            formDataToSubmit.append('location', formData.location);
            
            // Handle profile photo
            const photoUrl = formData.profilePhoto;
            if (photoUrl && (photoUrl.startsWith('file://') || photoUrl.startsWith('content://') || !photoUrl.startsWith('http'))) {
                const uriParts = photoUrl.split('.');
                const fileType = uriParts[uriParts.length - 1];
                
                formDataToSubmit.append('file', {
                    uri: photoUrl,
                    name: `profile.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            } else {
                formDataToSubmit.append('profilePhoto', photoUrl);
            }

            const { data: updatedUser } = await authApi.updateProfile(formDataToSubmit);
            
            updateUser(updatedUser);
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
            <StatusBar barStyle="light-content" />
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
                            <Image source={{ uri: formData.profilePhoto }} style={styles.avatar} />
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
                            <Ionicons name="globe-outline" size={16} color="#6366f1" />
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
                            <Ionicons name="lock-closed-outline" size={20} color="#6366f1" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.prefTitle}>Profile Visibility</Text>
                            <Text style={styles.prefSub}>Choose who can see your profile</Text>
                        </View>
                        <TouchableOpacity style={styles.prefDropdown}>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { padding: 20, flexDirection: 'row', alignItems: 'center', paddingTop: 80 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    
    scrollContent: { padding: 20, paddingBottom: 120 },
    
    avatarSection: { alignItems: 'center', marginBottom: 32 },
    avatarWrapper: { width: 100, height: 100, marginBottom: 12 },
    avatar: { width: '100%', height: '100%', borderRadius: 50, borderWidth: 2, borderColor: '#6366f1' },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#1e293b' },
    changePhotoText: { fontSize: 14, fontWeight: '800', color: '#6366f1' },
    uploadHint: { fontSize: 11, color: '#64748b', marginTop: 4 },

    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 16 },
    subText: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },

    row: { flexDirection: 'row', gap: 12 },
    inputGroup: { marginBottom: 20 },
    inputLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', flex: 1 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    textArea: { height: 80, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: '#64748b' },

    pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    pickerText: { color: '#fff', fontSize: 15 },

    socialItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    socialIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    socialLabel: { fontSize: 14, fontWeight: '700', color: '#fff', marginLeft: 12 },
    socialValue: { flex: 1, fontSize: 13, color: '#64748b', marginLeft: 12, textAlign: 'right' },
    connectedBadge: { backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
    connectedText: { color: '#10b981', fontSize: 11, fontWeight: '800' },

    connectMoreBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.03)', borderRadius: 16, padding: 14, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.2)' },
    plusIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    connectTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
    connectSub: { fontSize: 11, color: '#64748b', marginTop: 2 },

    preferenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    prefIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    prefTitle: { fontSize: 15, fontWeight: '800', color: '#fff' },
    prefSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
    prefDropdown: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    prefValue: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },

    saveBtn: { backgroundColor: '#6366f1', height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 40, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
    deleteBtn: { height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', flexDirection: 'row' },
    deleteBtnText: { color: '#ef4444', fontSize: 16, fontWeight: '800' }
});
