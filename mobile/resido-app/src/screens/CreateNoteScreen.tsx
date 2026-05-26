import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function CreateNoteScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [title, setTitle] = useState(params.title as string || '');
    const [body, setBody] = useState(params.body as string || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!title.trim() || !body.trim()) {
            Alert.alert('Error', 'Please enter title and content');
            return;
        }

        try {
            setLoading(true);
            if (params.id) {
                // Update existing page (Need to add this to api.ts)
                await mySpaceApi.updateNotePage(params.id as string, {
                    title: title.trim(),
                    content: body.trim(),
                });
            } else {
                await mySpaceApi.createNotePage({
                    folderId: params.folderId as string,
                    title: title.trim(),
                    content: body.trim(),
                });
            }
            router.back();
        } catch (error: any) {
            console.error('Save note error:', error);
            const errorMsg = error.response?.data?.message || 'Failed to save note. Please try again.';
            Alert.alert('Error', errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={loading}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{params.id ? 'Edit Note' : 'New Note'}</Text>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading}>
                    {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={24} color="#fff" />}
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={{ flex: 1 }}
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    {/* Title Input */}
                    <TextInput 
                        style={styles.titleInput}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Note Title"
                        placeholderTextColor="#64748b"
                        multiline
                    />

                    {/* Folder Selector */}
                    <View style={styles.folderSelector}>
                        <View style={[styles.folderIconBox, { backgroundColor: '#f59e0b' }]}>
                            <MaterialCommunityIcons name="folder" size={16} color="#fff" />
                        </View>
                        <Text style={styles.folderName}>{params.folderName || 'General'}</Text>
                    </View>

                    {/* Body Input */}
                    <TextInput 
                        style={styles.bodyInput}
                        value={body}
                        onChangeText={setBody}
                        placeholder="Start typing..."
                        placeholderTextColor="#64748b"
                        multiline
                    />
                </ScrollView>

                {/* Formatting Toolbar */}
                <View style={styles.toolbar}>
                    <TouchableOpacity style={styles.toolBtn}><MaterialCommunityIcons name="format-size" size={22} color="#94a3b8" /></TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}><MaterialCommunityIcons name="checkbox-marked-outline" size={22} color="#94a3b8" /></TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}><Ionicons name="image-outline" size={22} color="#94a3b8" /></TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}><Ionicons name="mic-outline" size={22} color="#94a3b8" /></TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn}><Ionicons name="attach-outline" size={22} color="#94a3b8" /></TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 100, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    
    scrollContent: { padding: 20, paddingTop: 10 },
    titleInput: { fontSize: 24, fontWeight: '900', color: '#2D2445', marginBottom: 20, marginTop: 10, lineHeight: 32 },
    
    folderSelector: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#F4EEFC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 30, borderWidth: 1, borderColor: '#C4B5DC' },
    folderIconBox: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    folderName: { fontSize: 14, fontWeight: '700', color: '#2D2445', marginRight: 8 },

    bodyInput: { fontSize: 16, color: '#9A8EBA', lineHeight: 26, minHeight: 400, textAlignVertical: 'top' },

    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#EFE9F8', backgroundColor: '#F8F5FF' },
    toolBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }
});
