import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { storageApi } from '../services/storage';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

export default function ProfileScreen() {
    const { user, updateUser } = useAuthStore(); // Assuming authStore has user info
    const [uploading, setUploading] = useState(false);

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

            // 1 & 2 & 3: Get URL and Upload to S3
            const fileUrl = await storageApi.uploadFile(asset.uri, fileName, contentType);

            // 4: Send file URL to backend
            await api.patch(`/members/${user.id}/profile-photo`, {
                profilePhoto: fileUrl,
            });

            // Update local state
            updateUser({ ...user, profilePhoto: fileUrl });
            Alert.alert('Success', 'Profile photo updated!');
        } catch (error) {
            Alert.alert('Error', 'Failed to upload image');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>My Profile</Text>
            
            <View style={styles.photoContainer}>
                {user?.profilePhoto ? (
                    <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
                ) : (
                    <View style={[styles.photo, styles.placeholder]}>
                        <Text style={styles.placeholderText}>No Photo</Text>
                    </View>
                )}
                
                <TouchableOpacity 
                    style={styles.editBtn} 
                    onPress={pickImage} 
                    disabled={uploading}
                >
                    {uploading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.editBtnText}>Change Photo</Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.info}>
                <Text style={styles.name}>{user?.name}</Text>
                <Text style={styles.role}>{user?.role?.replace('_', ' ')}</Text>
                <Text style={styles.phone}>{user?.phone}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', padding: 24, paddingTop: 60 },
    title: { fontSize: 28, fontWeight: '800', color: '#e2e8f0', marginBottom: 40 },
    photoContainer: { alignItems: 'center', marginBottom: 40 },
    photo: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#1e1e2e' },
    placeholder: { alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#6366f1' },
    placeholderText: { color: '#64748b' },
    editBtn: {
        marginTop: 16,
        backgroundColor: '#6366f1',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20
    },
    editBtnText: { color: '#fff', fontWeight: 'bold' },
    info: { gap: 8, alignItems: 'center' },
    name: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
    role: { fontSize: 14, color: '#6366f1', textTransform: 'uppercase', fontWeight: '700' },
    phone: { fontSize: 16, color: '#94a3b8' }
});
