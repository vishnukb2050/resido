import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { amenitiesApi } from '../services/api';
import { storageApi } from '../services/storage';

export default function AddAmenityScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [rules, setRules] = useState('');
    const [maxPersons, setMaxPersons] = useState('10');
    
    // Photo state
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    // Time Slots builder state
    const [timeSlots, setTimeSlots] = useState<string[]>([]);
    const [newSlot, setNewSlot] = useState('');

    // Available dates
    const [availableDatesText, setAvailableDatesText] = useState('All Dates');

    const handleAddSlot = () => {
        if (!newSlot.trim()) return;
        if (timeSlots.includes(newSlot.trim())) {
            Alert.alert('Duplicate', 'This time slot is already added.');
            return;
        }
        setTimeSlots([...timeSlots, newSlot.trim()]);
        setNewSlot('');
    };

    const handleRemoveSlot = (index: number) => {
        setTimeSlots(timeSlots.filter((_, i) => i !== index));
    };

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Amenity Name is required.');
            return;
        }
        if (timeSlots.length === 0) {
            Alert.alert('Error', 'Please add at least one available Time Slot.');
            return;
        }

        setLoading(true);
        try {
            let uploadedPhotoUrl = '';
            if (photoUri) {
                const res = await storageApi.uploadFile(
                    photoUri,
                    `amenity_${Date.now()}.jpg`,
                    'image/jpeg',
                    'amenities'
                );
                uploadedPhotoUrl = res as string;
            }

            // Simple parser for dates: just store in array for now
            const datesArray = availableDatesText.split(',').map(d => d.trim()).filter(Boolean);

            await amenitiesApi.createAmenity({
                name: name.trim(),
                description: description.trim(),
                rules: rules.trim(),
                maxPersons: parseInt(maxPersons) || 10,
                photoUrl: uploadedPhotoUrl,
                timeSlots,
                availableDates: datesArray.length > 0 ? datesArray : ['All Dates']
            });

            Alert.alert('Success', 'Amenity added successfully!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Failed to add amenity:', error);
            Alert.alert('Error', 'Failed to add amenity');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Amenity</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 20 }}>
                {/* Photo Picker */}
                <Text style={styles.label}>Amenity Photo</Text>
                <TouchableOpacity style={styles.photoPicker} onPress={handlePickPhoto}>
                    {photoUri ? (
                        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    ) : (
                        <View style={styles.photoPlaceholder}>
                            <Ionicons name="image-outline" size={36} color="#94a3b8" />
                            <Text style={styles.photoPlaceholderText}>Upload cover image</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Form fields */}
                <View style={styles.field}>
                    <Text style={styles.label}>Name</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. Clubhouse, Tennis Court" 
                        placeholderTextColor="#94a3b8"
                        value={name}
                        onChangeText={setName}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="What is this amenity?" 
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={3}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Rules & Regulations</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea]} 
                        placeholder="e.g. No food allowed, Wearing proper shoes is mandatory" 
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={3}
                        value={rules}
                        onChangeText={setRules}
                    />
                </View>

                <View style={styles.row}>
                    <View style={[styles.field, { flex: 1 }]}>
                        <Text style={styles.label}>Max Persons per Slot</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="e.g. 10" 
                            placeholderTextColor="#94a3b8"
                            keyboardType="numeric"
                            value={maxPersons}
                            onChangeText={setMaxPersons}
                        />
                    </View>
                </View>

                {/* Time slots builder */}
                <View style={styles.field}>
                    <Text style={styles.label}>Add Time Slots</Text>
                    <View style={styles.slotInputRow}>
                        <TextInput 
                            style={[styles.input, { flex: 1 }]} 
                            placeholder="e.g. 09:00 AM - 10:00 AM" 
                            placeholderTextColor="#94a3b8"
                            value={newSlot}
                            onChangeText={setNewSlot}
                        />
                        <TouchableOpacity style={styles.addSlotBtn} onPress={handleAddSlot}>
                            <Ionicons name="add" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Time slots render */}
                    <View style={styles.slotsContainer}>
                        {timeSlots.map((slot, index) => (
                            <View key={index} style={styles.slotBadge}>
                                <Text style={styles.slotBadgeText}>{slot}</Text>
                                <TouchableOpacity onPress={() => handleRemoveSlot(index)}>
                                    <Ionicons name="close-circle" size={16} color="#6366f1" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>Dates of Availability (Comma separated, or 'All Dates')</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. All Dates, 2026-05-20, 2026-05-21" 
                        placeholderTextColor="#94a3b8"
                        value={availableDatesText}
                        onChangeText={setAvailableDatesText}
                    />
                </View>

                <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Save Amenity</Text>}
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },

    scroll: { flex: 1 },
    field: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '800', color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 14, fontSize: 15, color: '#1e293b' },
    textArea: { height: 80, textAlignVertical: 'top' },
    
    photoPicker: { height: 160, backgroundColor: '#fff', borderStyle: 'dashed', borderWidth: 2, borderColor: '#cbd5e1', borderRadius: 16, overflow: 'hidden', marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    photoPreview: { width: '100%', height: '100%' },
    photoPlaceholder: { alignItems: 'center' },
    photoPlaceholderText: { fontSize: 14, color: '#64748b', marginTop: 8, fontWeight: '600' },

    row: { flexDirection: 'row', gap: 16 },

    slotInputRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    addSlotBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    slotsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    slotBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    slotBadgeText: { fontSize: 13, color: '#4338ca', fontWeight: '700' },

    submitBtn: { backgroundColor: '#6366f1', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 10, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '800' }
});
