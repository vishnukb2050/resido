import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

const COLORS = ['#f59e0b', '#10b981', '#4c1d95', '#f97316', '#3b82f6', '#ec4899', '#ef4444'];

export default function CreateFolderScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const type = params.type as 'NOTE' | 'DOC' || 'NOTE';
    
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [selectedColor, setSelectedColor] = useState('#4c1d95');
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a folder name');
            return;
        }

        try {
            setLoading(true);
            if (type === 'NOTE') {
                await mySpaceApi.createNoteFolder(name.trim());
            } else {
                await mySpaceApi.createDocumentFolder({
                    name: name.trim(),
                    color: selectedColor,
                    icon: 'folder'
                });
            }
            router.back();
        } catch (error: any) {
            console.error('Create folder error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to create folder. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={loading}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New {type === 'NOTE' ? 'Note' : 'Doc'} Folder</Text>
                <TouchableOpacity onPress={handleCreate} style={styles.saveBtn} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={24} color="#fff" />}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Folder Icon Section */}
                <View style={styles.iconSection}>
                    <View style={[styles.largeFolderIcon, { backgroundColor: selectedColor }]}>
                        <MaterialCommunityIcons name="folder" size={100} color="#fff" />
                    </View>
                </View>

                {/* Inputs */}
                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Folder Name</Text>
                    <TextInput 
                        style={styles.input} 
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Marketing Materials"
                        placeholderTextColor="#64748b"
                        maxLength={50}
                    />
                    <Text style={styles.charCount}>{name.length}/50</Text>
                </View>

                {/* Color Picker */}
                <Text style={styles.sectionTitle}>Choose Color</Text>
                <View style={styles.colorRow}>
                    {COLORS.map(color => (
                        <TouchableOpacity 
                            key={color} 
                            style={[styles.colorCircle, { backgroundColor: color }, selectedColor === color && styles.activeColor]}
                            onPress={() => setSelectedColor(color)}
                        />
                    ))}
                </View>

                {/* Permissions (Static for now) */}
                <Text style={styles.sectionTitle}>Who can access</Text>
                <TouchableOpacity style={styles.permissionCard}>
                    <View style={styles.lockIconBox}>
                        <Ionicons name="lock-closed" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 16 }}>
                        <Text style={styles.permTitle}>Only me</Text>
                        <Text style={styles.permSub}>Private folder</Text>
                    </View>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#23272a' },
    header: { padding: 20, paddingTop: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4c1d95', alignItems: 'center', justifyContent: 'center' },
    
    scrollContent: { padding: 20, paddingTop: 10 },
    iconSection: { alignItems: 'center', marginTop: 20, marginBottom: 40 },
    largeFolderIcon: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', position: 'relative' },

    inputGroup: { marginBottom: 24 },
    inputLabel: { fontSize: 13, fontWeight: '700', color: '#94a3b8', marginBottom: 12 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 18, color: '#fff', fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#64748b', marginTop: 8 },

    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#fff', marginBottom: 16 },
    colorRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    colorCircle: { width: 32, height: 32, borderRadius: 16 },
    activeColor: { borderWidth: 3, borderColor: '#fff' },

    permissionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    lockIconBox: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    permTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    permSub: { fontSize: 12, color: '#64748b', marginTop: 2 }
});
