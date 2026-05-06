import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storageApi } from '../services/storage';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
    const { user, updateUser } = useAuthStore();
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    
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

            const fileUrl = await storageApi.uploadFile(asset.uri, fileName, contentType);

            await api.put(`/profile/user`, {
                profilePhoto: fileUrl,
            });

            updateUser({ ...user, profilePhoto: fileUrl });
            Alert.alert('Success', 'Profile photo updated!');
        } catch (error) {
            console.error('Photo update error:', error);
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await api.put('/profile/user', {
                ...formData,
                age: formData.age ? parseInt(formData.age) : null,
            });
            updateUser(data);
            setEditing(false);
            Alert.alert('Success', 'Profile updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>My Profile</Text>
                {!editing ? (
                    <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditing(true)}>
                        <Ionicons name="create-outline" size={24} color="#6366f1" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setEditing(false)} disabled={saving}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveText}>Save</Text>}
                        </TouchableOpacity>
                    </View>
                )}
            </View>
            
            <View style={styles.photoContainer}>
                {user?.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
                ) : (
                    <View style={[styles.photo, styles.placeholder]}>
                        <Ionicons name="person-outline" size={60} color="#64748b" />
                    </View>
                )}
                
                <TouchableOpacity 
                    style={styles.changePhotoBtn} 
                    onPress={pickImage} 
                    disabled={uploading}
                >
                    <Ionicons name="camera" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <View style={styles.field}>
                    <Text style={styles.label}>Full Name</Text>
                    {editing ? (
                        <TextInput 
                            style={styles.input} 
                            value={formData.name}
                            onChangeText={(t) => setFormData({...formData, name: t})}
                            placeholder="Your Name"
                            placeholderTextColor="#64748b"
                        />
                    ) : (
                        <Text style={styles.value}>{user?.name || 'Not set'}</Text>
                    )}
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Phone Number</Text>
                    <Text style={styles.value}>{user?.phone}</Text>
                    <Text style={styles.subtext}>Phone number cannot be changed</Text>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Age</Text>
                    {editing ? (
                        <TextInput 
                            style={styles.input} 
                            value={formData.age}
                            onChangeText={(t) => setFormData({...formData, age: t})}
                            keyboardType="numeric"
                            placeholder="Your Age"
                            placeholderTextColor="#64748b"
                        />
                    ) : (
                        <Text style={styles.value}>{user?.age || 'Not set'}</Text>
                    )}
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Description / Bio</Text>
                    {editing ? (
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            value={formData.description}
                            onChangeText={(t) => setFormData({...formData, description: t})}
                            multiline
                            numberOfLines={4}
                            placeholder="Tell us about yourself..."
                            placeholderTextColor="#64748b"
                        />
                    ) : (
                        <Text style={styles.value}>{user?.description || 'No description added yet.'}</Text>
                    )}
                </View>

                {!editing && (
                    <View style={styles.roleTag}>
                        <Text style={styles.roleText}>{user?.role?.replace('_', ' ')}</Text>
                    </View>
                )}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', padding: 24, paddingTop: 60 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    title: { fontSize: 28, fontWeight: '800', color: '#e2e8f0' },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    cancelText: { color: '#94a3b8', fontSize: 16 },
    saveBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    saveText: { color: '#fff', fontWeight: 'bold' },
    editIconBtn: { padding: 8 },
    
    photoContainer: { alignSelf: 'center', position: 'relative', marginBottom: 40 },
    photo: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#1e1e2e', borderWidth: 3, borderColor: '#27273a' },
    placeholder: { alignItems: 'center', justifyContent: 'center' },
    changePhotoBtn: { 
        position: 'absolute', 
        bottom: 0, 
        right: 0, 
        backgroundColor: '#6366f1', 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        alignItems: 'center', 
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#0f0f1a'
    },
    
    form: { gap: 24 },
    field: { gap: 8 },
    label: { fontSize: 13, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
    value: { fontSize: 18, color: '#f8fafc', fontWeight: '500' },
    input: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2d2d3d' },
    textArea: { height: 100, textAlignVertical: 'top' },
    subtext: { fontSize: 12, color: '#64748b' },
    roleTag: { backgroundColor: 'rgba(99, 102, 241, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 10 },
    roleText: { color: '#6366f1', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }
});
