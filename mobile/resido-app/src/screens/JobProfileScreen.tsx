import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const CATEGORIES = ['PLUMBER', 'ELECTRICIAN', 'CLEANER', 'PAINTER', 'CARPENTER', 'MECHANIC', 'GARDENER', 'OTHER'];

export default function JobProfileScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({
        category: 'OTHER',
        description: '',
        expertise: '',
        pincode: '',
        city: '',
        district: '',
        state: '',
    });

    useEffect(() => {
        fetchJobProfile();
    }, []);

    const fetchJobProfile = async () => {
        try {
            const { data } = await api.get('/profile/job');
            if (data) {
                setFormData({
                    category: data.category,
                    description: data.description,
                    expertise: data.expertise,
                    pincode: data.pincode,
                    city: data.city,
                    district: data.district,
                    state: data.state,
                });
            }
        } catch (error) {
            // Might be 404 if not created yet
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.description || !formData.pincode || !formData.city) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }

        setSaving(true);
        try {
            await api.post('/profile/job', formData);
            Alert.alert('Success', 'Job Profile published!');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to save job profile');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#6366f1" /></View>;

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Professional Profile</Text>
            </View>

            <View style={styles.form}>
                <View style={styles.field}>
                    <Text style={styles.label}>Service Category</Text>
                    <View style={styles.categoryContainer}>
                        {CATEGORIES.map(cat => (
                            <TouchableOpacity 
                                key={cat} 
                                style={[styles.catBtn, formData.category === cat && styles.catBtnActive]}
                                onPress={() => setFormData({...formData, category: cat})}
                            >
                                <Text style={[styles.catBtnText, formData.category === cat && styles.catBtnTextActive]}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Expertise Details</Text>
                    <TextInput 
                        style={styles.input} 
                        value={formData.expertise}
                        onChangeText={(t) => setFormData({...formData, expertise: t})}
                        placeholder="e.g. 5 years experience in residential wiring"
                        placeholderTextColor="#64748b"
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Service Description</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        value={formData.description}
                        onChangeText={(t) => setFormData({...formData, description: t})}
                        multiline
                        numberOfLines={4}
                        placeholder="Describe the services you offer..."
                        placeholderTextColor="#64748b"
                    />
                </View>

                <Text style={styles.sectionTitle}>Service Area</Text>
                
                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Pincode</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.pincode}
                            onChangeText={(t) => setFormData({...formData, pincode: t})}
                            keyboardType="numeric"
                            placeholder="123456"
                            placeholderTextColor="#64748b"
                        />
                    </View>
                    <View style={[styles.field, { flex: 2 }]}>
                        <Text style={styles.label}>City</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.city}
                            onChangeText={(t) => setFormData({...formData, city: t})}
                            placeholder="e.g. Bangalore"
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>District</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.district}
                            onChangeText={(t) => setFormData({...formData, district: t})}
                            placeholder="District"
                            placeholderTextColor="#64748b"
                        />
                    </View>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>State</Text>
                        <TextInput 
                            style={styles.input} 
                            value={formData.state}
                            onChangeText={(t) => setFormData({...formData, state: t})}
                            placeholder="State"
                            placeholderTextColor="#64748b"
                        />
                    </View>
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Publish Job Profile</Text>}
                </TouchableOpacity>
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0f1a', padding: 24, paddingTop: 60 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 15, marginBottom: 30 },
    title: { fontSize: 24, fontWeight: '800', color: '#e2e8f0' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f0f1a' },
    
    form: { gap: 20 },
    field: { gap: 8 },
    label: { fontSize: 13, color: '#6366f1', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
    sectionTitle: { fontSize: 18, color: '#f8fafc', fontWeight: 'bold', marginTop: 10 },
    input: { backgroundColor: '#1e1e2e', borderRadius: 12, padding: 14, color: '#fff', fontSize: 16, borderWidth: 1, borderColor: '#2d2d3d' },
    textArea: { height: 100, textAlignVertical: 'top' },
    row: { flexDirection: 'row', gap: 12 },
    
    categoryContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#27273a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    catBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    catBtnText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    catBtnTextActive: { color: '#fff' },
    
    saveBtn: { backgroundColor: '#6366f1', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
