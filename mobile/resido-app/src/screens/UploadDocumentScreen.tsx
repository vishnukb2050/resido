import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, StatusBar, Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { mySpaceApi } from '../services/api';
import { storageApi } from '../services/storage';

/**
 * Upload a document with a friendly title + description before it lands in
 * the folder. If no `folderId` is provided, the server auto-files the upload
 * under the user's "General" folder.
 */
export default function UploadDocumentScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{ folderId?: string; folderName?: string }>();
    const folderId = typeof params.folderId === 'string' ? params.folderId : undefined;
    const folderName = typeof params.folderName === 'string' ? params.folderName : '';

    type PickedFile = {
        uri: string;
        name: string;
        mimeType: string;
        size?: number;
        kind: 'IMAGE' | 'FILE';
    } | null;

    const [file, setFile] = useState<PickedFile>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.85,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        const inferredName = asset.fileName || `image_${Date.now()}.jpg`;
        setFile({
            uri: asset.uri,
            name: inferredName,
            mimeType: asset.mimeType || 'image/jpeg',
            size: (asset as any).fileSize,
            kind: 'IMAGE',
        });
        if (!title) {
            setTitle(inferredName.replace(/\.[^.]+$/, ''));
        }
    };

    const pickFile = async () => {
        const result = await DocumentPicker.getDocumentAsync({
            type: '*/*',
            copyToCacheDirectory: true,
        });
        if (result.canceled) return;
        const asset: any = result.assets[0];
        setFile({
            uri: asset.uri,
            name: asset.name || `file_${Date.now()}`,
            mimeType: asset.mimeType || 'application/octet-stream',
            size: asset.size,
            kind: 'FILE',
        });
        if (!title && asset.name) {
            setTitle(String(asset.name).replace(/\.[^.]+$/, ''));
        }
    };

    const handleUpload = async () => {
        if (!file) {
            Alert.alert('Pick a file', 'Choose an image or document to upload.');
            return;
        }
        if (!title.trim()) {
            Alert.alert('Title required', 'Please enter a title for this document.');
            return;
        }

        try {
            setUploading(true);
            setProgress(0.1);

            // Use the shared storage helper: it streams local files natively via
            // FileSystem.uploadAsync, which is reliable for binary docs (PDFs) on
            // Android where the fetch().blob() round-trip corrupts the upload.
            const finalUrl = await storageApi.uploadFile(
                file.uri,
                file.name,
                file.mimeType,
                'DOCUMENTS',
            );
            setProgress(0.85);
            if (!finalUrl) {
                throw new Error('Could not upload the document.');
            }

            await mySpaceApi.addDocumentFile({
                folderId,
                name: file.name,
                title: title.trim(),
                description: description.trim() || undefined,
                url: finalUrl,
                type: file.kind,
                size: file.size,
            });

            setProgress(1);
            setTimeout(() => {
                setUploading(false);
                router.back();
            }, 400);
        } catch (err: any) {
            console.error('Document upload failed', err);
            const msg = err?.response?.data?.message || err?.message || 'Upload failed.';
            Alert.alert('Upload failed', msg);
            setUploading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={uploading}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Upload Document</Text>
                <View style={{ width: 40 }} />
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                    <Text style={styles.label}>Destination</Text>
                    <View style={styles.folderRow}>
                        <View style={styles.folderIconBox}>
                            <MaterialCommunityIcons name={folderId ? 'folder' : 'folder-star'} size={20} color="#fff" />
                        </View>
                        <Text style={styles.folderText} numberOfLines={1}>
                            {folderId ? (folderName || 'Selected folder') : 'General (default)'}
                        </Text>
                    </View>

                    <Text style={styles.label}>File</Text>
                    {file ? (
                        <View style={styles.filePickedCard}>
                            {file.kind === 'IMAGE' ? (
                                <Image source={{ uri: file.uri }} style={styles.filePreview} />
                            ) : (
                                <View style={[styles.filePreview, styles.fileGenericPreview]}>
                                    <MaterialCommunityIcons name="file-document" size={32} color="#8b5cf6" />
                                </View>
                            )}
                            <View style={{ flex: 1, marginLeft: 14 }}>
                                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                                <Text style={styles.fileMeta}>
                                    {file.kind} · {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'unknown size'}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setFile(null)} disabled={uploading}>
                                <Ionicons name="close-circle" size={22} color="#b91c1c" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.pickRow}>
                            <TouchableOpacity style={styles.pickBtn} onPress={pickImage} disabled={uploading}>
                                <Ionicons name="image-outline" size={22} color="#8b5cf6" />
                                <Text style={styles.pickBtnText}>Choose Image</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={uploading}>
                                <Ionicons name="document-text-outline" size={22} color="#8b5cf6" />
                                <Text style={styles.pickBtnText}>Choose File</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="e.g. PAN Card, Lease Agreement"
                        placeholderTextColor="#94a3b8"
                        editable={!uploading}
                    />

                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textarea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Add notes about this document (optional)"
                        placeholderTextColor="#94a3b8"
                        multiline
                        numberOfLines={4}
                        editable={!uploading}
                    />

                    <TouchableOpacity
                        style={[styles.saveBtn, (uploading || !file) && { opacity: 0.6 }]}
                        onPress={handleUpload}
                        disabled={uploading || !file}
                    >
                        {uploading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
                                <Text style={styles.saveBtnText}>Upload Document</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal transparent visible={uploading}>
                <View style={styles.overlay}>
                    <View style={styles.progressBox}>
                        <ActivityIndicator size="large" color="#8b5cf6" />
                        <Text style={styles.progressText}>Uploading… {Math.round(progress * 100)}%</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBar, { width: `${Math.round(progress * 100)}%` }]} />
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: {
        padding: 20, paddingTop: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },

    label: { fontSize: 12, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },

    folderRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4EEFC', padding: 12, borderRadius: 14,
        borderWidth: 1, borderColor: '#C4B5DC',
    },
    folderIconBox: {
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', marginRight: 12,
    },
    folderText: { color: '#2D2445', fontWeight: '700', fontSize: 14, flex: 1 },

    pickRow: { flexDirection: 'row', gap: 12 },
    pickBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 16,
        borderWidth: 1.5, borderColor: '#C4B5DC', gap: 8,
    },
    pickBtnText: { color: '#8b5cf6', fontWeight: '800', fontSize: 13 },

    filePickedCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#ffffff', borderRadius: 16, padding: 14,
        borderWidth: 1, borderColor: '#D4C9E8',
    },
    filePreview: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#F4EEFC' },
    fileGenericPreview: { alignItems: 'center', justifyContent: 'center' },
    fileName: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    fileMeta: { fontSize: 12, color: '#7A6B9C', marginTop: 2 },

    input: {
        backgroundColor: '#ffffff', borderRadius: 14, padding: 14, fontSize: 15,
        color: '#2D2445', borderWidth: 1, borderColor: '#D4C9E8',
    },
    textarea: { minHeight: 96, textAlignVertical: 'top' },

    saveBtn: {
        marginTop: 28,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 10,
        backgroundColor: '#8b5cf6', height: 54, borderRadius: 14,
    },
    saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '900' },

    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
    progressBox: { backgroundColor: '#ffffff', padding: 28, borderRadius: 22, alignItems: 'center', width: 280 },
    progressText: { color: '#2D2445', fontSize: 15, fontWeight: '700', marginTop: 18, marginBottom: 12 },
    progressBarBg: { width: '100%', height: 6, backgroundColor: '#EFE9F8', borderRadius: 3, overflow: 'hidden' },
    progressBar: { height: '100%', backgroundColor: '#8b5cf6' },
});
