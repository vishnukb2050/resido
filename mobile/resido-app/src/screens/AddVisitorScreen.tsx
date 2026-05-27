import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthStore } from '../store/authStore';
import { visitorApi, communityApi } from '../services/api';

const CATEGORIES = ['Visitor', 'Delivery', 'Maintenance & Repair'];

export default function AddVisitorScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        mobile: '',
        purpose: '',
        category: 'Visitor',
        description: '',
        vehicleNumber: '',
        unitToVisit: '',
    });

    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [showBlockDropdown, setShowBlockDropdown] = useState(false);
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);

    const [showCategories, setShowCategories] = useState(false);
    const [entryDate, setEntryDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);

    React.useEffect(() => {
        fetchBlocks();
    }, []);

    const fetchBlocks = async () => {
        try {
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
        } catch (error) {
            console.error('Failed to fetch blocks:', error);
        }
    };

    const fetchUnits = async (blockId: string) => {
        try {
            const { data } = await communityApi.getUnits(blockId);
            setUnits(data || []);
        } catch (error) {
            console.error('Failed to fetch units:', error);
        }
    };

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
            await visitorApi.createEntry({
                visitorName: formData.name,
                phone: formData.mobile,
                purpose: formData.purpose,
                category: formData.category,
                description: formData.description,
                vehicleNumber: formData.vehicleNumber,
                unitToVisit: formData.unitToVisit,
                inTime: entryDate.toISOString(),
                loggedBy: activeWorkspace?.memberId || 'UNKNOWN'
            });

            Alert.alert('Success', 'Visitor registered successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (e) {
            Alert.alert('Error', 'Failed to register visitor');
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
                <Text style={styles.headerTitle}>Register Visitor</Text>
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

                    {/* Select Block */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Select Block</Text>
                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => setShowBlockDropdown(!showBlockDropdown)}
                        >
                            <Text style={[styles.selectorText, !selectedBlockId && { color: '#7A6B9C' }]}>
                                {selectedBlockId ? blocks.find(b => b.id === selectedBlockId)?.name : 'Choose Block'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#10b981" />
                        </TouchableOpacity>
                        
                        {showBlockDropdown && (
                            <View style={styles.dropdown}>
                                {blocks.map(b => (
                                    <TouchableOpacity 
                                        key={b.id} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setSelectedBlockId(b.id);
                                            setSelectedUnitId(''); // Reset selected unit
                                            fetchUnits(b.id);
                                            setShowBlockDropdown(false);
                                            setFormData(prev => ({ ...prev, unitToVisit: '' }));
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, selectedBlockId === b.id && styles.selectedItemText]}>{b.name}</Text>
                                    </TouchableOpacity>
                                ))}
                                {blocks.length === 0 && (
                                    <View style={styles.dropdownItem}>
                                        <Text style={styles.dropdownItemText}>No blocks available</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Select Unit */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Select Unit</Text>
                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => {
                                if (!selectedBlockId) {
                                    Alert.alert('Info', 'Please select a block first');
                                    return;
                                }
                                setShowUnitDropdown(!showUnitDropdown);
                            }}
                        >
                            <Text style={[styles.selectorText, !selectedUnitId && { color: '#7A6B9C' }]}>
                                {selectedUnitId ? units.find(u => u.id === selectedUnitId)?.number : 'Choose Unit'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color="#10b981" />
                        </TouchableOpacity>
                        
                        {showUnitDropdown && (
                            <View style={styles.dropdown}>
                                {units.map(u => (
                                    <TouchableOpacity 
                                        key={u.id} 
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            setSelectedUnitId(u.id);
                                            setShowUnitDropdown(false);
                                            const blockName = blocks.find(b => b.id === selectedBlockId)?.name || '';
                                            const unitName = u.number || '';
                                            const combinedDestination = blockName ? `${blockName} - ${unitName}` : unitName;
                                            setFormData(prev => ({ ...prev, unitToVisit: combinedDestination }));
                                        }}
                                    >
                                        <Text style={[styles.dropdownItemText, selectedUnitId === u.id && styles.selectedItemText]}>{u.number}</Text>
                                    </TouchableOpacity>
                                ))}
                                {units.length === 0 && (
                                    <View style={styles.dropdownItem}>
                                        <Text style={styles.dropdownItemText}>No units in this block</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Category</Text>
                        <TouchableOpacity 
                            style={styles.selector} 
                            onPress={() => setShowCategories(!showCategories)}
                        >
                            <Text style={styles.selectorText}>{formData.category}</Text>
                            <Ionicons name="chevron-down" size={20} color="#10b981" />
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
                                <Ionicons name="calendar-outline" size={20} color="#10b981" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ width: 15 }} />
                        <View style={[styles.inputGroup, { flex: 1 }]}>
                            <Text style={styles.label}>Time</Text>
                            <TouchableOpacity style={styles.selector} onPress={() => setShowTimePicker(true)}>
                                <Text style={styles.selectorText}>
                                    {entryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Ionicons name="time-outline" size={20} color="#10b981" />
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
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Complete Registration</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    scrollContent: { padding: 24 },
    form: { gap: 24 },
    row: { flexDirection: 'row', alignItems: 'center' },
    inputGroup: { gap: 10 },
    label: { fontSize: 13, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', color: '#2D2445', padding: 18, fontSize: 16, fontWeight: '600' },
    textArea: { height: 100, textAlignVertical: 'top' },
    selector: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    selectorText: { color: '#2D2445', fontSize: 16, fontWeight: '600' },
    dropdown: { backgroundColor: '#ffffff', borderRadius: 16, marginTop: 8, padding: 10, borderWidth: 1, borderColor: '#C4B5DC' },
    dropdownItem: { padding: 15, borderRadius: 10 },
    dropdownItemText: { color: '#9A8EBA', fontSize: 15, fontWeight: '600' },
    selectedItemText: { color: '#10b981' },
    submitBtn: { backgroundColor: '#10b981', borderRadius: 22, padding: 22, alignItems: 'center', marginTop: 10, shadowColor: '#10b981', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
    submitText: { color: '#2D2445', fontWeight: '900', fontSize: 16 }
});
