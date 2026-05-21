import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';
import { storageApi } from '../services/storage';

const CATEGORIES = [
    'Plumbing', 'Electrical', 'Handyman', 'Lift', 'Kitchen', 
    'Water', 'Electricity', 'Common Space', 'Amenities', 'Others'
];

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM'];

export default function CreateComplaintScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    
    const [formData, setFormData] = useState({
        category: 'Plumbing',
        description: '',
        priority: 'MEDIUM',
    });

    const [showCategories, setShowCategories] = useState(false);

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required to upload photos.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!formData.description) {
            Alert.alert('Error', 'Description is required');
            return;
        }

        setLoading(true);
        try {
            const mediaUrls: string[] = [];

            if (photoUri) {
                // Upload photo to S3/R2 storage
                const uploadedUrl = await storageApi.uploadFile(
                    photoUri,
                    `complaint_${user?.id || 'unknown'}_${Date.now()}.jpg`,
                    'image/jpeg',
                    'complaints'
                );
                if (uploadedUrl) {
                    mediaUrls.push(uploadedUrl as string);
                }
            }

            await communityApi.createComplaint({
                ...formData,
                title: `${formData.category} Issue`,
                memberId: activeWorkspace?.memberId || user?.id,
                tenantId: activeWorkspace?.tenantId,
                mediaUrls,
            });

            Alert.alert('Success', 'Request raised successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to raise request');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Request</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => setShowCategories(!showCategories)}
                        >
                            <Text style={styles.selectorText}>{formData.category}</Text>
                            <Ionicons name="chevron-down" size={20} color="#1d4ed8" />
                        </TouchableOpacity>
                        
                        {showCategories && (
                            <View style={styles.dropdown}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setFormData({...formData, category: cat});
                                            setShowCategories(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, formData.category === cat && styles.selectedItemText]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Priority</Text>
                        <View style={styles.priorityRow}>
                            {PRIORITIES.map(p => (
                                <TouchableOpacity 
                                    key={p} 
                                    style={[styles.priorityBtn, formData.priority === p && styles.priorityBtnActive]}
                                    onPress={() => setFormData({...formData, priority: p})}
                                >
                                    <Text style={[styles.priorityText, formData.priority === p && styles.priorityTextActive]}>{p}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Tell us more about the issue..."
                            placeholderTextColor="#64748b"
                            multiline
                            numberOfLines={5}
                            value={formData.description}
                            onChangeText={(t) => setFormData({...formData, description: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Photo Evidence</Text>
                        {photoUri ? (
                            <View style={styles.photoContainer}>
                                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                                    <Ionicons name="trash-outline" size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                                <Ionicons name="camera-outline" size={32} color="#1d4ed8" />
                                <Text style={styles.photoPickerText}>Attach Photo</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Raise Request</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24 },
    form: { gap: 30 },
    inputGroup: { gap: 12 },
    label: { fontSize: 13, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    selector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    dropdown: { backgroundColor: '#1e293b', borderRadius: 16, marginTop: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dropdownItem: { padding: 15, borderRadius: 10 },
    dropdownItemText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
    selectedItemText: { color: '#1d4ed8' },
    priorityRow: { flexDirection: 'row', gap: 10 },
    priorityBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    priorityBtnActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    priorityText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
    priorityTextActive: { color: '#fff' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 150, textAlignVertical: 'top' },
    photoPicker: { height: 120, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(29, 78, 216, 0.3)', backgroundColor: 'rgba(255, 255, 255, 0.02)', alignItems: 'center', justifyContent: 'center', gap: 8 },
    photoPickerText: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
    photoContainer: { height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    photoPreview: { width: '100%', height: '100%' },
    removePhotoBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(239, 68, 68, 0.85)', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    submitBtn: { backgroundColor: '#1d4ed8', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 10, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
