import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const CATEGORIES = [
    'Plumbing', 'Electrical', 'Handyman', 'Lift', 'Kitchen', 
    'Water', 'Electricity', 'Common Space', 'Amenities', 'Others'
];

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM'];

export default function CreateComplaintScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        category: 'Plumbing',
        description: '',
        priority: 'MEDIUM',
    });

    const [showCategories, setShowCategories] = useState(false);

    const handleSave = async () => {
        if (!formData.description) {
            Alert.alert('Error', 'Description is required');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`http://localhost:3002/community/complaints`, {
                ...formData,
                title: `${formData.category} Issue`,
                memberId: user?.id,
            }, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
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
                            <Ionicons name="chevron-down" size={20} color="#6366f1" />
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

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Raise Request</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
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
    selectedItemText: { color: '#6366f1' },
    priorityRow: { flexDirection: 'row', gap: 10 },
    priorityBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    priorityBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    priorityText: { color: '#94a3b8', fontSize: 12, fontWeight: '800' },
    priorityTextActive: { color: '#fff' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 150, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#6366f1', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
