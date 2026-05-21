import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Alert, Image, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import dayjs from 'dayjs';
import { communityApi } from '../../services/api';
import { storageApi } from '../../services/storage';
import { useAuthStore } from '../../store/authStore';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'SECURITY', 'CARPENTRY', 'LIFT', 'COMMON_AREA', 'OTHER'];

export default function RaiseComplaintScreen() {
    const { user, activeWorkspace } = useAuthStore();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('OTHER');
    const [photos, setPhotos] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const pickPhoto = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true });
        if (!result.canceled) setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)]);
    };

    const handleSubmit = async () => {
        if (!title || !description) {
            Alert.alert('Error', 'Title and description are required');
            return;
        }
        if (!user?.id) return;

        setLoading(true);
        try {
            // 1. Upload photos to S3 and get public URLs
            const uploadedUrls = await Promise.all(
                photos.map(uri => 
                    storageApi.uploadFile(uri, `complaint_${Date.now()}.jpg`, 'image/jpeg')
                )
            );

            // 2. Submit complaint with S3 URLs
            await communityApi.createComplaint({
                title,
                description,
                category,
                mediaUrls: uploadedUrls,
                memberId: activeWorkspace?.memberId || user.id
            });

            Alert.alert('Success', 'Complaint raised successfully');
            setTitle(''); setDescription(''); setPhotos([]);
        } catch (error) {
            console.error('Complaint submission failed:', error);
            Alert.alert('Error', 'Failed to raise complaint');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Raise Complaint</Text>

            <View style={styles.group}>
                <Text style={styles.label}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {CATEGORIES.map((c) => (
                        <TouchableOpacity
                            key={c}
                            style={[styles.chip, category === c && styles.chipActive]}
                            onPress={() => setCategory(c)}
                        >
                            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>
                                {c.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.group}>
                <Text style={styles.label}>Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Brief title" placeholderTextColor="#64748b" />
            </View>

            <View style={styles.group}>
                <Text style={styles.label}>Description</Text>
                <TextInput style={[styles.input, { height: 100 }]} value={description} onChangeText={setDescription} placeholder="Describe the issue..." placeholderTextColor="#64748b" multiline />
            </View>

            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                <Text style={styles.photoBtnText}>📷  Add Photos ({photos.length})</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
                <ScrollView horizontal style={{ marginBottom: 16 }} contentContainerStyle={{ gap: 8 }}>
                    {photos.map((uri, i) => <Image key={i} source={{ uri }} style={styles.thumb} />)}
                </ScrollView>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Complaint</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000', padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', marginTop: 40, marginBottom: 24 },
    group: { marginBottom: 18 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
    input: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14, color: '#e2e8f0', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1e1e2e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chipActive: { backgroundColor: 'rgba(37,99,235,0.2)', borderColor: '#1d4ed8' },
    chipText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    chipTextActive: { color: '#1d4ed8' },
    photoBtn: { backgroundColor: '#1e1e2e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    photoBtnText: { color: '#64748b', fontWeight: '600' },
    thumb: { width: 80, height: 80, borderRadius: 8 },
    submitBtn: { backgroundColor: '#1d4ed8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
