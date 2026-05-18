import React, { useState, useRef } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    ScrollView, Switch, Image, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Dimensions, Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Video, Audio, ResizeMode } from 'expo-av';
import { useRouter } from 'expo-router';
import { threadApi } from '../services/api';
import { uploadToR2 } from '../services/storage';
import { useAuthStore } from '../store/authStore';
import CircularProgress from '../components/CircularProgress';

const { width, height } = Dimensions.get('window');

const TRENDING_MUSIC = [
    { id: '1', name: 'Summer Vibes', artist: 'Lofi Girl' },
    { id: '2', name: 'Deep Focus', artist: 'Ambient Echo' },
    { id: '3', name: 'Energetic Beat', artist: 'Flash' },
    { id: '4', name: 'Sunset Glow', artist: 'Retro Wave' },
];

const VISIBILITY_OPTIONS = [
    { id: 'PUBLIC', name: 'Public', icon: 'globe-outline', desc: 'Anyone on Resido can see' },
    { id: 'CONTACTS', name: 'Contacts', icon: 'people-outline', desc: 'Only your synced contacts' },
    { id: 'FOLLOWERS', name: 'Followers', icon: 'person-add-outline', desc: 'Only people who follow you' },
];

export default function CreateFlareScreen() {
    const [video, setVideo] = useState<string | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<any>(null);
    const [previewMode, setPreviewMode] = useState(false);
    const [title, setTitle] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedVisibilities, setSelectedVisibilities] = useState<string[]>(['PUBLIC']);
    const [selectedMusic, setSelectedMusic] = useState(TRENDING_MUSIC[0]);
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [taggedUsers, setTaggedUsers] = useState<string[]>([]);
    
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const videoRef = useRef<Video>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 1,
        });

        if (!result.canceled) {
            setVideo(result.assets[0].uri);
        }
    };

    const pickAudio = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'audio/*',
                copyToCacheDirectory: true
            });

            if (!result.canceled) {
                setSelectedAudio(result.assets[0]);
                Alert.alert('Audio Selected', `File: ${result.assets[0].name}`);
            }
        } catch (e) {
            console.error('Pick audio error', e);
        }
    };

    const handlePreview = async () => {
        if (!video) return;
        setPreviewMode(true);
    };

    const stopPreview = async () => {
        if (soundRef.current) {
            await soundRef.current.stopAsync();
            await soundRef.current.unloadAsync();
            soundRef.current = null;
        }
        setPreviewMode(false);
    };

    const onPreviewReady = async () => {
        if (selectedAudio) {
            try {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: selectedAudio.uri },
                    { shouldPlay: true, isLooping: true }
                );
                soundRef.current = sound;
            } catch (e) {
                console.error('Sound preview error', e);
            }
        }
    };

    const handlePublish = async () => {
        if (!video) {
            Alert.alert('Error', 'Please select a video first');
            return;
        }

        if (!user?.id) {
            Alert.alert('Error', 'User session expired. Please log in again.');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // 1. Upload Video
            const uploadResult = await uploadToR2(
                video,
                activeWorkspace?.tenantId || 'global',
                'FLARE',
                'VIDEO',
                (progress) => setUploadProgress(progress * 0.8)
            );

            // 2. Upload Audio if selected
            let audioUrl = null;
            if (selectedAudio) {
                const audioResult = await uploadToR2(
                    selectedAudio.uri,
                    activeWorkspace?.tenantId || 'global',
                    'FLARE',
                    'VIDEO', // Use VIDEO bucket for consistent policy
                    (progress) => setUploadProgress(0.8 + (progress * 0.2))
                );
                audioUrl = audioResult.fileUrl;
            }

            // 3. Extract hashtags
            const hashtagArray = hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1));

            // 4. Create Flare in DB
            await threadApi.createFlare({
                tenantId: activeWorkspace?.tenantId || 'global',
                title: title.trim() || "New Flare",
                content: title.trim() || "Flare Content",
                type: 'FLARE',
                mediaType: 'VIDEO',
                mediaUrls: [uploadResult.fileUrl],
                audioUrl: audioUrl,
                authorName: user?.name || 'Resident',
                authorAvatar: user?.profilePhoto,
                musicName: selectedAudio ? selectedAudio.name : selectedMusic.name,
                musicId: selectedMusic.id,
                hashtags: hashtagArray,
                commentsEnabled,
                visibility: selectedVisibilities[0] || 'PUBLIC',
                tags: taggedUsers,
                location: activeWorkspace?.tenantName || 'Community'
            });

            setUploadProgress(1);
            Alert.alert('Success', 'Your Flare has been published!', [
                { 
                    text: 'OK', 
                    onPress: () => router.replace({ 
                        pathname: '/flares', 
                        params: { refresh: Date.now().toString() } 
                    }) 
                }
            ]);
        } catch (error: any) {
            console.error('Publish error:', error);
            const msg = error.response?.data?.message || error.message || 'Unknown error';
            Alert.alert('Publish Failed', `Reason: ${msg}\n\nPlease check your internet and try again.`);
        } finally {
            setIsUploading(false);
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
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Flare</Text>
                <View style={styles.headerRight}>
                    {isUploading ? (
                        <CircularProgress progress={uploadProgress} size={36} strokeWidth={4} />
                    ) : (
                        <TouchableOpacity 
                            onPress={handlePublish}
                            style={styles.publishBtn}
                        >
                            <Text style={styles.publishText}>Publish</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Video Selection Card */}
                <TouchableOpacity 
                    style={[styles.videoCard, video ? styles.videoCardActive : null]} 
                    onPress={pickVideo}
                >
                    {video ? (
                        <View style={styles.videoPreviewContainer}>
                            <Video
                                ref={videoRef}
                                style={styles.videoThumbnail}
                                source={{ uri: video }}
                                useNativeControls={false}
                                resizeMode={ResizeMode.COVER}
                                isMuted={true}
                                shouldPlay={false}
                            />
                            <View style={styles.videoOverlay}>
                                <Ionicons name="camera" size={32} color="#fff" />
                                <Text style={styles.changeVideoText}>Change Video</Text>
                            </View>
                            <TouchableOpacity style={styles.previewPlayBtn} onPress={handlePreview}>
                                <Ionicons name="play" size={24} color="#fff" />
                                <Text style={styles.previewBtnText}>Preview with Audio</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.emptyVideo}>
                            <View style={styles.videoIconContainer}>
                                <Ionicons name="videocam" size={40} color="#0d9488" />
                            </View>
                            <Text style={styles.selectVideoTitle}>Select Short Video</Text>
                            <Text style={styles.selectVideoSub}>MP4 or MOV, max 60 seconds</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Audio Selection Section */}
                <View style={styles.section}>
                    <Text style={styles.label}>Custom Background Audio</Text>
                    <TouchableOpacity 
                        style={[styles.audioPill, selectedAudio && styles.audioPillActive]} 
                        onPress={pickAudio}
                    >
                        <Ionicons 
                            name={selectedAudio ? "musical-note" : "cloud-upload-outline"} 
                            size={20} 
                            color={selectedAudio ? "#0d9488" : "#64748b"} 
                        />
                        <Text style={[styles.audioPillText, selectedAudio && styles.audioPillTextActive]} numberOfLines={1}>
                            {selectedAudio ? selectedAudio.name : "Upload Original Audio"}
                        </Text>
                        {selectedAudio && (
                            <TouchableOpacity onPress={() => setSelectedAudio(null)}>
                                <Ionicons name="close-circle" size={18} color="#64748b" style={{ marginLeft: 8 }} />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Visibility Section - Simplified Horizontal Row */}
                <View style={styles.section}>
                    <Text style={styles.label}>Visibility</Text>
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
                                    color={selectedVisibilities.includes(opt.id) ? "#0d9488" : "#cbd5e1"} 
                                />
                                <Text style={[styles.visibilityPillText, selectedVisibilities.includes(opt.id) && styles.visibilityPillTextActive]}>
                                    {opt.name}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Caption Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Caption</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="What's happening in your community?"
                        placeholderTextColor="#94a3b8"
                        multiline
                        value={title}
                        onChangeText={setTitle}
                    />
                </View>

                {/* Hashtags Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Hashtags</Text>
                    <TextInput
                        style={styles.tagInput}
                        placeholder="#summer #event #community"
                        placeholderTextColor="#94a3b8"
                        value={hashtags}
                        onChangeText={setHashtags}
                    />
                </View>

                {/* Music Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="musical-notes" size={20} color="#0d9488" />
                        <Text style={styles.sectionTitle}>Trending Music</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.musicList}>
                        {TRENDING_MUSIC.map(track => (
                            <TouchableOpacity 
                                key={track.id} 
                                style={[styles.musicCard, selectedMusic.id === track.id && styles.activeMusicCard]}
                                onPress={() => setSelectedMusic(track)}
                            >
                                <View style={styles.musicIcon}>
                                    <MaterialCommunityIcons name="music" size={20} color={selectedMusic.id === track.id ? "#fff" : "#0d9488"} />
                                </View>
                                <Text style={[styles.musicName, selectedMusic.id === track.id && styles.activeMusicText]}>{track.name}</Text>
                                <Text style={[styles.artistName, selectedMusic.id === track.id && styles.activeArtistText]}>{track.artist}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Settings Toggles */}
                <View style={styles.settingsContainer}>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Enable Comments</Text>
                            <Text style={styles.settingDesc}>Allow people to comment on your flare</Text>
                        </View>
                        <Switch
                            value={commentsEnabled}
                            onValueChange={setCommentsEnabled}
                            trackColor={{ false: '#f1f5f9', true: '#0d9488' }}
                            thumbColor="#fff"
                        />
                    </View>
                    <View style={styles.divider} />
                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Tag People</Text>
                            <Text style={styles.settingDesc}>Mention neighbors in this video</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Preview Modal */}
            <Modal visible={previewMode} animationType="slide" transparent={false}>
                <View style={styles.previewContainer}>
                    <Video
                        ref={videoRef}
                        style={styles.fullPreview}
                        source={{ uri: video || '' }}
                        useNativeControls={false}
                        resizeMode={ResizeMode.COVER}
                        shouldPlay={true}
                        isLooping={true}
                        onLoad={onPreviewReady}
                    />
                    <TouchableOpacity style={styles.closePreview} onPress={stopPreview}>
                        <Ionicons name="close-circle" size={40} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.previewInfo}>
                        <Text style={styles.previewTitle}>Preview Mode</Text>
                        <Text style={styles.previewSub}>Video with {selectedAudio ? "Custom Audio" : "Original Sound"}</Text>
                    </View>
                </View>
            </Modal>

            {/* Upload Progress Overlay */}
            {isUploading && (
                <View style={styles.uploadModalOverlay}>
                    <View style={styles.uploadCard}>
                        <CircularProgress progress={uploadProgress} size={100} strokeWidth={8} color="#0d9488" />
                        <Text style={styles.uploadingText}>Publishing Flare...</Text>
                        <Text style={styles.uploadingSub}>Optimizing and uploading your community content</Text>
                    </View>
                </View>
            )}
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9'
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    headerRight: { width: 80, alignItems: 'flex-end' },
    publishBtn: { backgroundColor: '#0d9488', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    publishText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    scrollContent: { padding: 20 },
    
    videoCard: { 
        width: '100%', 
        height: 240, 
        backgroundColor: '#f8fafc', 
        borderRadius: 24, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 25,
        justifyContent: 'center'
    },
    videoCardActive: { borderColor: '#0d9488' },
    videoPreviewContainer: { flex: 1 },
    videoThumbnail: { width: '100%', height: '100%' },
    videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    changeVideoText: { color: '#fff', fontWeight: '800', marginTop: 8 },
    previewPlayBtn: { 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(99, 102, 241, 0.9)', 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        borderRadius: 12 
    },
    previewBtnText: { color: '#fff', fontWeight: '700', marginLeft: 8 },
    
    emptyVideo: { alignItems: 'center' },
    videoIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    selectVideoTitle: { color: '#1e293b', fontSize: 18, fontWeight: '800', marginBottom: 5 },
    selectVideoSub: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },

    audioPill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#f8fafc', 
        paddingHorizontal: 15, 
        paddingVertical: 15, 
        borderRadius: 16, 
        borderWidth: 1, 
        borderColor: '#f1f5f9' 
    },
    audioPillActive: { backgroundColor: '#f5f3ff', borderColor: '#0d9488' },
    audioPillText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '700', color: '#64748b' },
    audioPillTextActive: { color: '#0d9488' },

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
    visibilityPillActive: { backgroundColor: '#f5f3ff', borderColor: '#0d9488' },
    visibilityPillText: { marginLeft: 6, fontSize: 13, fontWeight: '700', color: '#64748b' },
    visibilityPillTextActive: { color: '#0d9488' },

    inputSection: { marginBottom: 25 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 },
    captionInput: { 
        backgroundColor: '#f8fafc', 
        borderRadius: 16, 
        padding: 15, 
        color: '#1e293b', 
        fontSize: 16, 
        minHeight: 100, 
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    tagInput: { 
        backgroundColor: '#f8fafc', 
        borderRadius: 16, 
        padding: 15, 
        color: '#0d9488', 
        fontSize: 16,
        fontWeight: '700',
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },

    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, marginLeft: 5 },
    sectionTitle: { color: '#1e293b', fontSize: 16, fontWeight: '800' },
    musicList: { flexDirection: 'row' },
    musicCard: { 
        width: 130, 
        backgroundColor: '#f8fafc', 
        borderRadius: 20, 
        padding: 15, 
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    activeMusicCard: { backgroundColor: '#0d9488', borderColor: '#0d9488' },
    musicIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    musicName: { color: '#1e293b', fontSize: 14, fontWeight: '800', marginBottom: 4 },
    artistName: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
    activeMusicText: { color: '#fff' },
    activeArtistText: { color: 'rgba(255,255,255,0.8)' },

    settingsContainer: { 
        backgroundColor: '#f8fafc', 
        borderRadius: 24, 
        padding: 5,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#f1f5f9'
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20 },
    settingInfo: { flex: 1 },
    settingTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    settingDesc: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 18 },

    previewContainer: { flex: 1, backgroundColor: '#000' },
    fullPreview: { flex: 1 },
    closePreview: { position: 'absolute', top: 50, right: 20 },
    previewInfo: { position: 'absolute', bottom: 40, left: 20 },
    previewTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
    previewSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 5 },

    uploadModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    uploadCard: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 32, padding: 30, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    uploadingText: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 25 },
    uploadingSub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 10, fontWeight: '500' }
});
