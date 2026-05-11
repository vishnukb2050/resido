import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, FlatList, Modal, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { threadApi, authApi } from '../services/api';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { Video as VideoCompressor } from 'react-native-compressor';
import { useAuthStore } from '../store/authStore';
import { uploadToR2 } from '../services/storage';

const { width } = Dimensions.get('window');

const CATEGORIES = [
    { id: 'general', name: 'General', icon: 'chatbubbles-outline', color: '#6366f1' },
    { id: 'news', name: 'News', icon: 'newspaper-outline', color: '#f59e0b' },
    { id: 'event', name: 'Event', icon: 'calendar-outline', color: '#10b981' },
    { id: 'marketplace', name: 'Market', icon: 'cart-outline', color: '#8b5cf6' },
    { id: 'social', name: 'Social', icon: 'people-outline', color: '#ec4899' },
    { id: 'services', name: 'Services', icon: 'briefcase-outline', color: '#06b6d4' },
];

const VISIBILITY_OPTIONS = [
    { id: 'PUBLIC', name: 'Public', icon: 'globe-outline', desc: 'Anyone on Resido can see' },
    { id: 'CONTACTS', name: 'Contacts', icon: 'people-outline', desc: 'Only your synced contacts' },
    { id: 'FOLLOWERS', name: 'Followers', icon: 'person-add-outline', desc: 'Only people who follow you' },
];

export default function CreateThreadScreen() {
    const { user, workspaces } = useAuthStore();
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('general');
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [selectedVisibilities, setSelectedVisibilities] = useState<string[]>(['PUBLIC']);
    const [loading, setLoading] = useState(false);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);

    const router = useRouter();

    const pickMedia = async (type: 'image' | 'video') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: type === 'image',
            quality: 0.8,
        });

        if (!result.canceled) {
            const newMedia = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.type?.toUpperCase() === 'VIDEO' ? 'VIDEO' : 'IMAGE',
                mimeType: asset.mimeType || (type === 'image' ? 'image/jpeg' : 'video/mp4')
            }));
            setMediaList([...mediaList, ...newMedia]);
        }
    };

    const removeMedia = (index: number) => {
        setMediaList(mediaList.filter((_, i) => i !== index));
    };

    const handlePublish = async () => {
        if (!content) return Alert.alert('Error', 'Content is required');
        if (selectedVisibilities.length === 0) {
            return Alert.alert('Error', 'Please select at least one visibility option');
        }

        setLoading(true);
        try {
            const uploadedUrls = [];
            for (const item of mediaList) {
                let finalUri = item.uri;
                if (item.type === 'VIDEO') {
                    // Compress video before upload
                    finalUri = await VideoCompressor.compress(item.uri, {
                        compressionMethod: 'auto',
                    });
                }
                const { fileUrl } = await uploadToR2(finalUri, 'global', 'THREAD', item.type);
                uploadedUrls.push(fileUrl);
            }

            const payload = {
                title: title || 'New Post',
                content,
                category,
                mediaUrls: uploadedUrls,
                mediaType: mediaList.length > 0 ? mediaList[0].type : 'IMAGE',
                visibility: selectedVisibilities[0], // Using primary for backend simple enum
                visibilities: selectedVisibilities, // Extra info
                authorName: user?.name,
                authorAvatar: user?.profilePhoto,
            };

            await threadApi.createThread(payload);
            Alert.alert('Success', 'Thread published!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to publish thread');
        } finally {
            setLoading(false);
        }
    };

    const toggleVisibility = (id: string) => {
        if (selectedVisibilities.includes(id)) {
            setSelectedVisibilities(selectedVisibilities.filter(v => v !== id));
        } else {
            setSelectedVisibilities([...selectedVisibilities, id]);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Create Thread</Text>
                <TouchableOpacity 
                    style={[styles.publishBtn, (!content || loading) && styles.publishBtnDisabled]} 
                    onPress={handlePublish} 
                    disabled={loading || !content}
                >
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.publishText}>Post</Text>}
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* User Info & Visibility */}
                <View style={styles.userSection}>
                    <Image source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/100' }} style={styles.userAvatar} />
                    <View style={styles.userMeta}>
                        <Text style={styles.userName}>{user?.name || 'Anonymous'}</Text>
                        <TouchableOpacity style={styles.visibilitySelector} onPress={() => setShowVisibilityModal(true)}>
                            <Ionicons name={VISIBILITY_OPTIONS.find(o => o.id === selectedVisibilities[0])?.icon as any || 'globe-outline'} size={14} color="#6366f1" />
                            <Text style={styles.visibilityText}>
                                {selectedVisibilities.length > 1 ? `${selectedVisibilities.length} Options` : VISIBILITY_OPTIONS.find(o => o.id === selectedVisibilities[0])?.name || 'Public'}
                            </Text>
                            <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content Area */}
                <TextInput 
                    style={styles.contentInput} 
                    placeholder="What's on your mind?" 
                    value={content}
                    onChangeText={setContent}
                    multiline
                    placeholderTextColor="#94a3b8"
                />

                {/* Media Preview */}
                {mediaList.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
                        {mediaList.map((item, index) => (
                            <View key={index} style={styles.mediaItem}>
                                <Image source={{ uri: item.uri }} style={styles.mediaImg} />
                                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(index)}>
                                    <Ionicons name="close" size={16} color="#fff" />
                                </TouchableOpacity>
                                {item.type === 'VIDEO' && (
                                    <View style={styles.videoBadge}>
                                        <Ionicons name="videocam" size={12} color="#fff" />
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                )}

                {/* Categories */}
                <Text style={styles.sectionTitle}>Select Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
                    {CATEGORIES.map(cat => (
                        <TouchableOpacity 
                            key={cat.id} 
                            style={[styles.catPill, category === cat.id && { backgroundColor: cat.color + '20', borderColor: cat.color }]}
                            onPress={() => setCategory(cat.id)}
                        >
                            <Ionicons name={cat.icon as any} size={18} color={category === cat.id ? cat.color : '#64748b'} />
                            <Text style={[styles.catLabel, category === cat.id && { color: cat.color }]}>{cat.name}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.actionToolbar}>
                    <TouchableOpacity style={styles.toolbarItem} onPress={() => pickMedia('image')}>
                        <Ionicons name="image-outline" size={24} color="#6366f1" />
                        <Text style={styles.toolbarLabel}>Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem} onPress={() => pickMedia('video')}>
                        <Ionicons name="videocam-outline" size={24} color="#f59e0b" />
                        <Text style={styles.toolbarLabel}>Video</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem}>
                        <Ionicons name="at-outline" size={24} color="#10b981" />
                        <Text style={styles.toolbarLabel}>Tag</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem}>
                        <Ionicons name="location-outline" size={24} color="#ec4899" />
                        <Text style={styles.toolbarLabel}>Location</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Visibility Modal */}
            <Modal visible={showVisibilityModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Who can see this?</Text>
                            <TouchableOpacity onPress={() => setShowVisibilityModal(false)}>
                                <Text style={styles.doneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        {VISIBILITY_OPTIONS.map(opt => (
                            <TouchableOpacity 
                                key={opt.id} 
                                style={[styles.visibilityOption, selectedVisibilities.includes(opt.id) && styles.visibilityOptionActive]}
                                onPress={() => toggleVisibility(opt.id)}
                            >
                                <View style={styles.optIconContainer}>
                                    <Ionicons name={opt.icon as any} size={24} color={selectedVisibilities.includes(opt.id) ? '#6366f1' : '#64748b'} />
                                </View>
                                <View style={styles.optInfo}>
                                    <Text style={[styles.optName, selectedVisibilities.includes(opt.id) && { color: '#6366f1' }]}>{opt.name}</Text>
                                    <Text style={styles.optDesc}>{opt.desc}</Text>
                                </View>
                                <MaterialCommunityIcons 
                                    name={selectedVisibilities.includes(opt.id) ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                                    size={24} 
                                    color={selectedVisibilities.includes(opt.id) ? "#6366f1" : "#cbd5e1"} 
                                />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    publishBtn: { backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
    publishBtnDisabled: { opacity: 0.5 },
    publishText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    
    userSection: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9' },
    userMeta: { marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    visibilitySelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
    visibilityText: { fontSize: 12, fontWeight: '700', color: '#6366f1', marginHorizontal: 6 },
    
    contentInput: { fontSize: 18, color: '#1e293b', paddingHorizontal: 20, minHeight: 150, textAlignVertical: 'top' },
    
    mediaScroll: { paddingLeft: 20, marginBottom: 20 },
    mediaItem: { width: 120, height: 160, borderRadius: 16, overflow: 'hidden', marginRight: 12, position: 'relative', backgroundColor: '#f1f5f9' },
    mediaImg: { width: '100%', height: '100%' },
    removeMediaBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    videoBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 4 },
    
    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#94a3b8', marginHorizontal: 20, marginBottom: 12, textTransform: 'uppercase' },
    catScroll: { marginBottom: 30 },
    catContent: { paddingHorizontal: 20, gap: 10 },
    catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    catLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginLeft: 8 },
    
    actionToolbar: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 20 },
    toolbarItem: { alignItems: 'center' },
    toolbarLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 4 },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    
    visibilityOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    visibilityOptionActive: { backgroundColor: '#f5f3ff', borderColor: '#6366f1' },
    optIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    optInfo: { flex: 1, marginLeft: 16 },
    optName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    optDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
    
    communityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    communityIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    communityName: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '700', color: '#1e293b' },
    doneBtnText: { color: '#6366f1', fontSize: 16, fontWeight: '800' },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginVertical: 30 },
});
