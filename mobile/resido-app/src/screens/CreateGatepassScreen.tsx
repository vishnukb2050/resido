import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function CreateGatepassScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const now = new Date();
    const defaultDate = now.toLocaleDateString('en-GB'); // e.g. 16/05/2026
    const defaultTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); // e.g. 10:30 AM

    const [formData, setFormData] = useState({
        visitorName: '',
        personsCount: '1',
        purpose: '',
        vehicleNumber: '',
        visitTime: defaultTime,
        visitDate: defaultDate,
    });

    const handleSave = async () => {
        if (!formData.visitorName) {
            Alert.alert('Error', 'Visitor name is required');
            return;
        }

        setLoading(true);
        try {
            const { data } = await communityApi.createGatepass({
                ...formData,
                residentId: user?.id,
                tenantId: activeWorkspace?.tenantId,
                residentName: user?.name,
                residentUnit: 'N/A',
                personsCount: parseInt(formData.personsCount) || 1,
            });

            Alert.alert('Success', 'Gatepass generated successfully!', [
                { text: 'View QR Code', onPress: () => router.replace({ pathname: '/gatepass-details', params: { id: data.id } }) }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to generate gatepass');
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
                <Text style={styles.headerTitle}>New Gatepass</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    {/* Visitor Name */}
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

                    {/* Persons + Vehicle */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Persons</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="1"
                                placeholderTextColor="#64748b"
                                keyboardType="number-pad"
                                value={formData.personsCount}
                                onChangeText={(t) => setFormData({...formData, personsCount: t})}
                            />
                        </View>
                        <View style={[styles.inputGroup, { flex: 2 }]}>
                            <Text style={styles.label}>Vehicle No. (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="KL-01-AB-1234"
                                placeholderTextColor="#64748b"
                                autoCapitalize="characters"
                                value={formData.vehicleNumber}
                                onChangeText={(t) => setFormData({...formData, vehicleNumber: t})}
                            />
                        </View>
                    </View>

                    {/* Purpose */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Purpose of Visit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Guest / Delivery / Service"
                            placeholderTextColor="#64748b"
                            value={formData.purpose}
                            onChangeText={(t) => setFormData({...formData, purpose: t})}
                        />
                    </View>

                    {/* Date + Time as plain text inputs */}
                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Date</Text>
                            <View style={styles.dateSelector}>
                                <TextInput
                                    style={styles.dateInput}
                                    placeholder="DD/MM/YYYY"
                                    placeholderTextColor="#64748b"
                                    keyboardType="numbers-and-punctuation"
                                    value={formData.visitDate}
                                    onChangeText={(t) => setFormData({...formData, visitDate: t})}
                                />
                                <Ionicons name="calendar" size={18} color="#0d9488" />
                            </View>
                        </View>

                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Time</Text>
                            <View style={styles.dateSelector}>
                                <TextInput
                                    style={styles.dateInput}
                                    placeholder="HH:MM AM"
                                    placeholderTextColor="#64748b"
                                    value={formData.visitTime}
                                    onChangeText={(t) => setFormData({...formData, visitTime: t})}
                                />
                                <Ionicons name="time" size={18} color="#0d9488" />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading
                            ? <ActivityIndicator color="#fff" />
                            : <Text style={styles.submitText}>Generate Gatepass</Text>
                        }
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
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24 },
    form: { gap: 24 },
    inputGroup: { gap: 10 },
    label: { fontSize: 13, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, fontSize: 16, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 15 },
    dateSelector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' },
    dateInput: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '600', paddingVertical: 12 },
    submitBtn: { backgroundColor: '#0d9488', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, shadowColor: '#0d9488', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
