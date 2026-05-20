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
    { id: 'general', name: 'General', icon: 'chatbubbles-outline', color: '#1d4ed8' },
    { id: 'news', name: 'News', icon: 'newspaper-outline', color: '#f59e0b' },
    { id: 'event', name: 'Event', icon: 'calendar-outline', color: '#10b981' },
    { id: 'marketplace', name: 'Market', icon: 'cart-outline', color: '#3b82f6' },
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
    const [showPollBuilder, setShowPollBuilder] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [pollDuration, setPollDuration] = useState(7);

    const router = useRouter();

    const pickMedia = async (type: 'image' | 'video') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            const newMedia = result.assets.map(asset => ({
                uri: asset.uri,
                type: asset.type?.toUpperCase() === 'VIDEO' || asset.duration ? 'VIDEO' : 'IMAGE',
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
                authorAvatar: user?.profilePhoto,
                poll: showPollBuilder && pollQuestion && pollOptions.filter(o => o).length >= 2 ? {
                    question: pollQuestion,
                    options: pollOptions.filter(o => o),
                    durationDays: pollDuration
                } : undefined
            };

            await threadApi.createThread(payload);
            Alert.alert('Success', 'Thread published!');
            router.replace({ 
                pathname: '/thread', 
                params: { refresh: Date.now().toString() } 
            });
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
                {/* User Info */}
                <View style={styles.userSection}>
                    <Image source={{ uri: user?.profilePhoto || 'https://i.pravatar.cc/100' }} style={styles.userAvatar} />
                    <View style={styles.userMeta}>
                        <Text style={styles.userName}>{user?.name || 'Anonymous'}</Text>
                        <Text style={styles.userSubtitle}>Posting to Community</Text>
                    </View>
                </View>

                {/* Visibility Section - Simplified Horizontal Row */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Visibility</Text>
                    <View style={styles.visibilityRow}>
                        {VISIBILITY_OPTIONS.map(opt => (
                            <TouchableOpacity 
                                key={opt.id} 
                                style={[styles.visibilityPill, selectedVisibilities.includes(opt.id) && styles.visibilityPillActive]}
                                onPress={() => toggleVisibility(opt.id)}
                            >
                                <MaterialCommunityIcons 
                                    name={selectedVisibilities.includes(opt.id) ? "checkbox-marked-circle" : "checkbox-blank-circle-outline"} 
                                    size={18} 
                                    color={selectedVisibilities.includes(opt.id) ? "#1d4ed8" : "#cbd5e1"} 
                                />
                                <Text style={[styles.visibilityPillText, selectedVisibilities.includes(opt.id) && styles.visibilityPillTextActive]}>
                                    {opt.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Content Area */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Title</Text>
                    <TextInput 
                        style={styles.titleInput} 
                        placeholder="Give your thread a catchy title..." 
                        value={title}
                        onChangeText={setTitle}
                        placeholderTextColor="#94a3b8"
                    />

                    <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Your Thoughts</Text>
                    <TextInput 
                        style={styles.contentInput} 
                        placeholder="Share your story or thoughts with the community..." 
                        value={content}
                        onChangeText={setContent}
                        multiline
                        placeholderTextColor="#94a3b8"
                    />
                </View>

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

                {/* Poll Builder */}
                {showPollBuilder && (
                    <View style={styles.pollBuilder}>
                        <View style={styles.pollHeader}>
                            <Text style={styles.sectionTitle}>Create a Poll</Text>
                            <TouchableOpacity onPress={() => setShowPollBuilder(false)}>
                                <Ionicons name="trash-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.pollInputGroup}>
                            <Text style={styles.inputLabel}>Your question *</Text>
                            <TextInput 
                                style={styles.pollQuestionInput}
                                placeholder="Add question"
                                value={pollQuestion}
                                onChangeText={setPollQuestion}
                                maxLength={140}
                                multiline
                            />
                            <Text style={styles.charCount}>{pollQuestion.length}/140</Text>
                        </View>

                        {pollOptions.map((opt, idx) => (
                            <View key={idx} style={styles.pollInputGroup}>
                                <View style={styles.optionHeader}>
                                    <Text style={styles.inputLabel}>Option {idx + 1} *</Text>
                                    {pollOptions.length > 2 && (
                                        <TouchableOpacity onPress={() => setPollOptions(prev => prev.filter((_, i) => i !== idx))}>
                                            <Ionicons name="remove-circle-outline" size={18} color="#94a3b8" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <TextInput 
                                    style={styles.pollOptionInput}
                                    placeholder="Add option"
                                    value={opt}
                                    onChangeText={(text) => {
                                        const newOpts = [...pollOptions];
                                        newOpts[idx] = text;
                                        setPollOptions(newOpts);
                                    }}
                                    maxLength={30}
                                />
                                <Text style={styles.charCount}>{opt.length}/30</Text>
                            </View>
                        ))}

                        {pollOptions.length < 4 && (
                            <TouchableOpacity 
                                style={styles.addOptionBtn}
                                onPress={() => setPollOptions([...pollOptions, ''])}
                            >
                                <Ionicons name="add" size={18} color="#1d4ed8" />
                                <Text style={styles.addOptionText}>Add option</Text>
                            </TouchableOpacity>
                        )}

                        <View style={styles.pollInputGroup}>
                            <Text style={styles.inputLabel}>Poll duration</Text>
                            <View style={styles.durationPicker}>
                                <Text style={styles.durationText}>{pollDuration} days</Text>
                                <View style={styles.durationOptions}>
                                    {[1, 3, 7, 14].map(d => (
                                        <TouchableOpacity 
                                            key={d} 
                                            style={[styles.durationPill, pollDuration === d && styles.durationPillActive]}
                                            onPress={() => setPollDuration(d)}
                                        >
                                            <Text style={[styles.durationPillText, pollDuration === d && styles.durationPillTextActive]}>{d}d</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        <Text style={styles.pollNote}>We don't allow requests for political opinions, medical information or other sensitive data.</Text>
                    </View>
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
                        <Ionicons name="image-outline" size={24} color="#1d4ed8" />
                        <Text style={styles.toolbarLabel}>Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem} onPress={() => pickMedia('video')}>
                        <Ionicons name="videocam-outline" size={24} color="#f59e0b" />
                        <Text style={styles.toolbarLabel}>Video</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolbarItem} onPress={() => setShowPollBuilder(true)}>
                        <Ionicons name="stats-chart-outline" size={24} color="#1d4ed8" />
                        <Text style={styles.toolbarLabel}>Poll</Text>
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

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 45, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    closeBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    publishBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
    publishBtnDisabled: { opacity: 0.5 },
    publishText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    
    userSection: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9' },
    userMeta: { marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    userSubtitle: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    
    section: { paddingHorizontal: 20, marginBottom: 20 },
    visibilityGrid: { gap: 8, marginTop: 12 },
    
    titleInput: { 
        fontSize: 22, 
        fontWeight: '900', 
        color: '#1e293b', 
        paddingHorizontal: 20, 
        paddingVertical: 10,
        marginBottom: 5 
    },
    contentInput: { 
        fontSize: 18, 
        color: '#475569', 
        paddingHorizontal: 20, 
        minHeight: 150, 
        textAlignVertical: 'top',
        lineHeight: 26 
    },
    
    mediaScroll: { paddingLeft: 20, marginBottom: 20 },
    mediaItem: { width: 120, height: 160, borderRadius: 16, overflow: 'hidden', marginRight: 12, position: 'relative', backgroundColor: '#f1f5f9' },
    mediaImg: { width: '100%', height: '100%' },
    removeMediaBtn: { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
    videoBadge: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 4 },
    
    sectionTitle: { fontSize: 13, fontWeight: '900', color: '#94a3b8', marginHorizontal: 20, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    catScroll: { marginBottom: 30 },
    catContent: { paddingHorizontal: 20, gap: 10 },
    catPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    catLabel: { fontSize: 13, fontWeight: '700', color: '#64748b', marginLeft: 8 },
    
    actionToolbar: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 20 },
    toolbarItem: { alignItems: 'center' },
    toolbarLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', marginTop: 4 },
    
    visibilityRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 15 },
    visibilityPill: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center',
        backgroundColor: '#f8fafc', 
        paddingVertical: 12, 
        borderRadius: 12, 
        borderWidth: 1, 
        borderColor: '#f1f5f9' 
    },
    visibilityPillActive: { backgroundColor: '#f5f3ff', borderColor: '#1d4ed8' },
    visibilityPillText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#64748b' },
    visibilityPillTextActive: { color: '#1d4ed8' },
    
    communityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    communityIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    communityName: { flex: 1, marginLeft: 14, fontSize: 15, fontWeight: '700', color: '#1e293b' },
    doneBtnText: { color: '#1d4ed8', fontSize: 16, fontWeight: '800' },
    emptyText: { textAlign: 'center', color: '#94a3b8', marginVertical: 30 },

    pollBuilder: { backgroundColor: '#f8fafc', marginHorizontal: 20, padding: 20, borderRadius: 20, marginBottom: 30, borderWidth: 1, borderColor: '#e2e8f0' },
    pollHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    pollInputGroup: { marginBottom: 15 },
    inputLabel: { fontSize: 13, fontWeight: '800', color: '#64748b', marginBottom: 8 },
    pollQuestionInput: { backgroundColor: '#fff', borderRadius: 12, padding: 15, fontSize: 15, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0', minHeight: 80, textAlignVertical: 'top' },
    pollOptionInput: { backgroundColor: '#fff', borderRadius: 12, padding: 15, fontSize: 14, color: '#1e293b', borderWidth: 1, borderColor: '#e2e8f0' },
    charCount: { textAlign: 'right', fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    optionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    addOptionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#eff6ff', paddingVertical: 12, borderRadius: 12, marginBottom: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#1d4ed8' },
    addOptionText: { color: '#1d4ed8', fontSize: 14, fontWeight: '800', marginLeft: 8 },
    pollNote: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18, marginTop: 10 },
    
    durationPicker: { backgroundColor: '#fff', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#e2e8f0' },
    durationText: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 10 },
    durationOptions: { flexDirection: 'row', gap: 10 },
    durationPill: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
    durationPillActive: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    durationPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    durationPillTextActive: { color: '#fff' },
});
