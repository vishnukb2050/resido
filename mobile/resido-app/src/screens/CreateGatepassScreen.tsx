import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../store/authStore';
import { communityApi, residentApi } from '../services/api';

const CATEGORIES = ['Visitor', 'Delivery', 'Maintenance & Repair'];

export default function CreateGatepassScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        purpose: '',
        category: 'Visitor',
        description: '',
        vehicleNumber: '',
        unitToVisit: user?.location || '',
    });

    const [showCategories, setShowCategories] = useState(false);
    const [entryDate, setEntryDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    React.useEffect(() => {
        const fetchResidentAddress = async () => {
            if (activeWorkspace?.memberId && activeWorkspace?.role === 'RESIDENT') {
                try {
                    const { data } = await residentApi.getMember(activeWorkspace.memberId);
                    if (data?.family?.unit) {
                        const blockName = data.family.unit.block?.name || '';
                        const unitNumber = data.family.unit.number || '';
                        const addressStr = blockName ? `${blockName} - ${unitNumber}` : unitNumber;
                        if (addressStr) {
                            setFormData(prev => ({ ...prev, unitToVisit: addressStr }));
                        }
                    }
                } catch (e) {
                    console.error('Failed to pre-fill resident address:', e);
                }
            }
        };
        fetchResidentAddress();
    }, [activeWorkspace]);

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const currentDate = new Date(entryDate);
            currentDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setEntryDate(currentDate);
        }
    };

    const onTimeChange = (event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const currentDate = new Date(entryDate);
            currentDate.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setEntryDate(currentDate);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.mobile || !formData.unitToVisit) {
            Alert.alert('Error', 'Name, Mobile, and Unit to Visit are required');
            return;
        }

        setLoading(true);
        try {
            const { data } = await communityApi.createGatepass({
                visitorName: formData.name,
                phone: formData.mobile,
                purpose: formData.purpose,
                category: formData.category,
                description: formData.description,
                vehicleNumber: formData.vehicleNumber,
                unitToVisit: formData.unitToVisit,
                personsCount: 1,
                residentName: user?.name,
                residentPhone: user?.phone,
                memberId: activeWorkspace?.memberId || user?.id,
                tenantId: activeWorkspace?.tenantId,
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
                <Text style={styles.headerTitle}>Gatepass</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Visitor Name"
                            placeholderTextColor="#64748b"
                            value={formData.name}
                            onChangeText={(t) => setFormData({...formData, name: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Mobile Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="+91 00000 00000"
                            placeholderTextColor="#64748b"
                            keyboardType="phone-pad"
                            value={formData.mobile}
                            onChangeText={(t) => setFormData({...formData, mobile: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Unit/Address to Visit</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="E.g., A-101"
                            placeholderTextColor="#64748b"
                            value={formData.unitToVisit}
                            onChangeText={(t) => setFormData({...formData, unitToVisit: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => setShowCategories(!showCategories)}
                        >
                            <Text style={styles.selectorText}>{formData.category}</Text>
                            <Ionicons name="chevron-down" size={20} color="#2563eb" />
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
                        <Text style={styles.label}>Purpose</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Reason for visit"
                            placeholderTextColor="#64748b"
                            value={formData.purpose}
                            onChangeText={(t) => setFormData({...formData, purpose: t})}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Vehicle Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="KL-01-AB-1234"
                            placeholderTextColor="#64748b"
                            autoCapitalize="characters"
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

                    <View style={styles.row}>
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Date</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => setShowDatePicker(true)}>
                                <Text style={styles.selectorText}>{entryDate.toLocaleDateString()}</Text>
                                <Ionicons name="calendar-outline" size={20} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ width: 15 }} />
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Time</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => setShowTimePicker(true)}>
                                <Text style={styles.selectorText}>
                                    {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Ionicons name="time-outline" size={20} color="#2563eb" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            value={entryDate}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                        />
                    )}

                    {showTimePicker && (
                        <DateTimePicker
                            value={entryDate}
                            mode="time"
                            display="default"
                            onChange={onTimeChange}
                        />
                    )}

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Generate Gatepass</Text>}
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
    form: { gap: 24 },
    row: { flexDirection: 'row', alignItems: 'center' },
    inputGroup: { gap: 10 },
    label: { fontSize: 13, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    selector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    dropdown: { backgroundColor: '#1e293b', borderRadius: 16, marginTop: 8, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dropdownItem: { padding: 15, borderRadius: 10 },
    dropdownItemText: { color: '#94a3b8', fontSize: 15, fontWeight: '600' },
    selectedItemText: { color: '#2563eb' },
    submitBtn: { backgroundColor: '#1d4ed8', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 10, shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
