import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    TextInput, SafeAreaView, StatusBar, Dimensions, KeyboardAvoidingView, Platform,
    ActivityIndicator, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { mySpaceApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function CreateNoteScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const [title, setTitle] = useState(params.title as string || '');
    const [body, setBody] = useState(params.body as string || '');
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (!params.id) return;
        Alert.alert(
            `Delete "${title || 'this note'}"?`,
            'This note will be permanently deleted. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setDeleting(true);
                            await mySpaceApi.deleteNotePage(params.id as string);
                            router.back();
                        } catch (err: any) {
                            const msg = err?.response?.data?.message || 'Failed to delete note.';
                            Alert.alert('Error', msg);
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ],
        );
    };

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
                <View style={styles.headerActions}>
                    {params.id ? (
                        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} disabled={loading || deleting}>
                            {deleting ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Ionicons name="trash-outline" size={20} color="#b91c1c" />
                            )}
                        </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity onPress={handleSave} style={styles.saveBtn} disabled={loading || deleting}>
                        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="checkmark" size={24} color="#fff" />}
                    </TouchableOpacity>
                </View>
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
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    saveBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    deleteBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.2)',
        alignItems: 'center', justifyContent: 'center',
    },
    
    scrollContent: { padding: 20, paddingTop: 10 },
    titleInput: { fontSize: 24, fontWeight: '900', color: '#2D2445', marginBottom: 16, marginTop: 10, lineHeight: 32 },

    bodyInput: { fontSize: 16, color: '#2D2445', lineHeight: 26, minHeight: 400, textAlignVertical: 'top' },

    toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#EFE9F8', backgroundColor: '#F8F5FF' },
    toolBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }
});
