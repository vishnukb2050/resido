import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CreateGatepassScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        visitorName: '',
        personsCount: '1',
        purpose: '',
        vehicleNumber: '',
        visitTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        visitDate: new Date().toLocaleDateString(),
    });

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    const handleSave = async () => {
        if (!formData.visitorName) {
            Alert.alert('Error', 'Visitor name is required');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`http://localhost:3003/gatepass`, {
                ...formData,
                residentId: user?.id,
                residentName: user?.name,
                residentUnit: 'N/A', // In a real app, this would come from user profile
                personsCount: parseInt(formData.personsCount)
            }, {
                headers: { 'x-tenant-id': activeWorkspace?.tenantId }
            });

            Alert.alert('Success', 'Gatepass generated successfully!', [
                { text: 'View QR Code', onPress: () => router.replace({ pathname: '/gatepass-details', params: { id: res.data.id } }) }
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
                            <Text style={styles.label}>Vehicle Number (Optional)</Text>
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

                    <View style={styles.row}>
                        <TouchableOpacity style={[styles.inputGroup, { flex: 1 }]} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.label}>Date</Text>
                            <View style={styles.dateSelector}>
                                <Text style={styles.dateText}>{formData.visitDate}</Text>
                                <Ionicons name="calendar" size={18} color="#6366f1" />
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity style={[styles.inputGroup, { flex: 1 }]} onPress={() => setShowTimePicker(true)}>
                            <Text style={styles.label}>Time</Text>
                            <View style={styles.dateSelector}>
                                <Text style={styles.dateText}>{formData.visitTime}</Text>
                                <Ionicons name="time" size={18} color="#6366f1" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Generate Gatepass</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {showDatePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, date) => {
                        setShowDatePicker(false);
                        if (date) setFormData({...formData, visitDate: date.toLocaleDateString()});
                    }}
                />
            )}

            {showTimePicker && (
                <DateTimePicker
                    value={new Date()}
                    mode="time"
                    display="default"
                    onChange={(event, date) => {
                        setShowTimePicker(false);
                        if (date) setFormData({...formData, visitTime: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })});
                    }}
                />
            )}
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
    dateSelector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dateText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    submitBtn: { backgroundColor: '#6366f1', borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 20, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
