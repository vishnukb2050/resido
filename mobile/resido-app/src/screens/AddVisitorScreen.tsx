import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const CATEGORIES = ['Visitor', 'Delivery', 'Maintenance & Repair'];

export default function AddVisitorScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [showCats, setShowCats] = useState(false);

    const [formData, setFormData] = useState({
        visitorName: '',
        phone: '',
        purpose: '',
        unitToVisit: '',
        category: 'Visitor',
        description: '',
        vehicleNumber: '',
    });

    const handleSave = async () => {
        if (!formData.visitorName || !formData.unitToVisit) {
            Alert.alert('Error', 'Visitor Name and Unit to Visit are required');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`http://localhost:3004/visitors`, {
                ...formData,
                loggedBy: user?.id || 'security'
            }, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });

            Alert.alert('Success', 'Visitor registered successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to register visitor');
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
                <Text style={styles.headerTitle}>Manual Registration</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity style={styles.selector} onPress={() => setShowCats(!showCats)}>
                            <Text style={styles.selectorText}>{formData.category}</Text>
                            <Ionicons name="chevron-down" size={20} color="#6366f1" />
                        </TouchableOpacity>
                        
                        {showCats && (
                            <View style={styles.dropdown}>
                                {CATEGORIES.map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setFormData({...formData, category: cat});
                                            setShowCats(false);
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, formData.category === cat && styles.selectedItemText]}>{cat}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Visitor Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#64748b"
                            value={formData.visitorName}
                            onChangeText={(t) => setFormData({...formData, visitorName: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Primary Contact"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={formData.phone}
                            onChangeText={(t) => setFormData({...formData, phone: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Unit to Visit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 101, Block A..."
                            placeholderTextColor="#64748b"
                            value={formData.unitToVisit}
                            onChangeText={(t) => setFormData({...formData, unitToVisit: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Purpose of Visit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Delivery, Meeting"
                            placeholderTextColor="#64748b"
                            value={formData.purpose}
                            onChangeText={(t) => setFormData({...formData, purpose: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Optional"
                            placeholderTextColor="#64748b"
                            value={formData.vehicleNumber}
                            onChangeText={(t) => setFormData({...formData, vehicleNumber: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Additional details..."
                            placeholderTextColor="#64748b"
                            multiline
                            numberOfLines={3}
                            value={formData.description}
                            onChangeText={(t) => setFormData({...formData, description: t})}
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Entry</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24 },
    form: { gap: 20 },
    inputGroup: { gap: 10 },
    label: { fontSize: 12, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    selector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    dropdown: { backgroundColor: '#1e293b', borderRadius: 16, marginTop: 4, padding: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dropdownItem: { padding: 15, borderRadius: 10 },
    dropdownItemText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
    selectedItemText: { color: '#6366f1' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    submitBtn: { backgroundColor: '#10b981', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 20 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
