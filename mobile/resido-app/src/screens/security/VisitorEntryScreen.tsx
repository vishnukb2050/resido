import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    StyleSheet, Alert, Image, ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { communityApi } from '../../services/api';
import { storageApi } from '../../services/storage';
import dayjs from 'dayjs';

export default function VisitorEntryScreen() {
    const [form, setForm] = useState({
        visitorName: '',
        phone: '',
        purpose: '',
        unitToVisit: '',
    });
    const [photo, setPhoto] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickPhoto = async () => {
        const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
        if (!result.canceled) setPhoto(result.assets[0].uri);
    };

    const handleSubmit = async () => {
        if (!form.visitorName || !form.unitToVisit) {
            Alert.alert('Error', 'Visitor name and unit are required');
            return;
        }
        setLoading(true);
        try {
            let photoUrl = '';
            if (photo) {
                photoUrl = await storageApi.uploadFile(photo, `visitor_${Date.now()}.jpg`, 'image/jpeg');
            }

            await communityApi.createGatepass({
                ...form,
                photoUrl,
                status: 'ENTERED' // Security logging an entry
            });

            Alert.alert('Success', 'Visitor entry logged!');
            setForm({ visitorName: '', phone: '', purpose: '', unitToVisit: '' });
            setPhoto(null);
        } catch (error) {
            console.error('Visitor log failed:', error);
            Alert.alert('Error', 'Failed to log visitor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Gate Registry</Text>
            <Text style={styles.sub}>{dayjs().format('DD MMM YYYY, HH:mm')}</Text>

            {(['visitorName', 'phone', 'unitToVisit', 'purpose'] as const).map((field) => (
                <View key={field} style={styles.group}>
                    <Text style={styles.label}>{field.replace(/([A-Z])/g, ' $1').trim()}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder={`Enter ${field}`}
                        placeholderTextColor="#64748b"
                        value={form[field]}
                        onChangeText={(v) => setForm((p) => ({ ...p, [field]: v }))}
                        keyboardType={field === 'phone' ? 'phone-pad' : 'default'}
                    />
                </View>
            ))}

            <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
                {photo ? (
                    <Image source={{ uri: photo }} style={styles.photoPreview} />
                ) : (
                    <Text style={styles.photoBtnText}>📷  Take Visitor Photo</Text>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Log Entry</Text>}
            </TouchableOpacity>
        </ScrollView>
    );
}

const s = StyleSheet.create;
const styles = s({
    container: { flex: 1, backgroundColor: '#23272a', padding: 20 },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0', marginTop: 40 },
    sub: { color: '#64748b', fontSize: 13, marginBottom: 24, marginTop: 4 },
    group: { marginBottom: 16 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'capitalize', marginBottom: 6 },
    input: { backgroundColor: '#1e1e2e', borderRadius: 10, padding: 14, color: '#e2e8f0', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    photoBtn: { backgroundColor: '#1e1e2e', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderStyle: 'dashed', height: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    photoBtnText: { color: '#64748b', fontWeight: '600' },
    photoPreview: { width: '100%', height: '100%', borderRadius: 12 },
    submitBtn: { backgroundColor: '#4c1d95', borderRadius: 12, padding: 16, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
