import React, { useState, useRef, useEffect } from 'react';
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
import { threadApi, businessApi } from '../services/api';
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
    const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
    const [pinToBusiness, setPinToBusiness] = useState(false);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [showBusinessPicker, setShowBusinessPicker] = useState(false);
    
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const videoRef = useRef<Video>(null);
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await businessApi.getMyProfiles();
                const list = Array.isArray(data) ? data : (data?.profiles || []);
                setMyBusinesses(list);
                if (list.length === 1) setSelectedBusinessId(list[0].id);
            } catch (e) {
                // Silently ignore — toggle simply stays hidden.
            }
        })();
    }, []);

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

            const tenantScope = activeWorkspace?.tenantId || `personal_${user.id}`;

            const uploadResult: any = await uploadToR2(
                video,
                tenantScope,
                'FLARE',
                'VIDEO',
                (progress) => setUploadProgress(progress * 0.8)
            );
            const sourceKey: string | undefined = uploadResult?.sourceKey;
            if (!sourceKey) throw new Error('Video upload did not return a storage key');

            let audioUrl: string | null = null;
            if (selectedAudio) {
                const audioResult: any = await uploadToR2(
                    selectedAudio.uri,
                    tenantScope,
                    'FLARE',
                    'VIDEO',
                    (progress) => setUploadProgress(0.8 + (progress * 0.2))
                );
                audioUrl = audioResult?.fileUrl || null;
            }

            // Accept "#summer #event", "summer event", or "summer, event" —
            // anything separated by whitespace, commas or `#` is one tag.
            const hashtagArray: string[] = (hashtags || '')
                .split(/[\s,#]+/)
                .map(h => h.trim().toLowerCase())
                .filter(h => h.length > 0 && h.length <= 50);

            const pinnedBusinessId =
                pinToBusiness && (selectedBusinessId || (myBusinesses.length === 1 ? myBusinesses[0].id : null))
                    ? selectedBusinessId || myBusinesses[0]?.id
                    : null;

            const payload: any = {
                title: title.trim() || 'New Flare',
                content: title.trim() || 'Flare Content',
                type: 'FLARE',
                mediaType: 'VIDEO',
                mediaAssets: [{ sourceKey, kind: 'VIDEO' }],
                authorName: user?.name || 'Resident',
                authorAvatar: user?.profilePhoto || undefined,
                musicName: selectedAudio ? selectedAudio.name : selectedMusic.name,
                musicId: selectedMusic.id,
                hashtags: hashtagArray,
                commentsEnabled,
                visibility: selectedVisibilities[0] || 'PUBLIC',
                tags: taggedUsers,
                location: activeWorkspace?.tenantName || 'Community',
            };
            if (audioUrl) payload.audioUrl = audioUrl;
            if (pinnedBusinessId) payload.businessProfileId = pinnedBusinessId;

            await threadApi.createFlare(payload);

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
            console.error('Publish error:', error?.response?.status, error?.response?.data || error?.message || error);
            const status = error?.response?.status;
            const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
            const reason = serverMsg || error?.message || 'Unknown error';
            Alert.alert('Publish Failed', `${reason}${status ? ` (HTTP ${status})` : ''}\n\nPlease check your connection and try again.`);
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
                                <Ionicons name="videocam" size={40} color="#1d4ed8" />
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
                            color={selectedAudio ? "#1d4ed8" : "#64748b"} 
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

                {/* Visibility Section - Public / Contacts / Followers (+ Business if available) */}
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
                                    color={selectedVisibilities.includes(opt.id) ? "#8b5cf6" : "#D4C9E8"}
                                />
                                <Text style={[styles.visibilityPillText, selectedVisibilities.includes(opt.id) && styles.visibilityPillTextActive]}>
                                    {opt.name}
                                </Text>
                            </TouchableOpacity>
                        ))}

                        {myBusinesses.length > 0 && (
                            <TouchableOpacity
                                style={[styles.visibilityPill, pinToBusiness && styles.visibilityPillActive]}
                                onPress={() => {
                                    const next = !pinToBusiness;
                                    setPinToBusiness(next);
                                    if (next && !selectedBusinessId) {
                                        if (myBusinesses.length === 1) {
                                            setSelectedBusinessId(myBusinesses[0].id);
                                        } else {
                                            setShowBusinessPicker(true);
                                        }
                                    }
                                }}
                            >
                                <Ionicons
                                    name={pinToBusiness ? "briefcase" : "briefcase-outline"}
                                    size={16}
                                    color={pinToBusiness ? "#8b5cf6" : "#D4C9E8"}
                                />
                                <Text style={[styles.visibilityPillText, pinToBusiness && styles.visibilityPillTextActive]}>
                                    Business
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {pinToBusiness && myBusinesses.length > 0 && (
                        <TouchableOpacity
                            style={styles.bizHintRow}
                            onPress={() => myBusinesses.length > 1 && setShowBusinessPicker(true)}
                            activeOpacity={myBusinesses.length > 1 ? 0.6 : 1}
                        >
                            <Ionicons name="information-circle-outline" size={14} color="#8b5cf6" />
                            <Text style={styles.bizHintText} numberOfLines={1}>
                                Will appear on {myBusinesses.find(b => b.id === selectedBusinessId)?.businessName || 'your business'}
                            </Text>
                            {myBusinesses.length > 1 && (
                                <Text style={styles.bizHintChange}>Change</Text>
                            )}
                        </TouchableOpacity>
                    )}
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
                        <Ionicons name="musical-notes" size={20} color="#1d4ed8" />
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
                                    <MaterialCommunityIcons name="music" size={20} color={selectedMusic.id === track.id ? "#fff" : "#1d4ed8"} />
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
                            trackColor={{ false: '#f1f5f9', true: '#1d4ed8' }}
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

            {/* Business Picker Modal */}
            <Modal visible={showBusinessPicker} animationType="slide" transparent>
                <View style={styles.pickerBackdrop}>
                    <View style={styles.pickerSheet}>
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>Choose business profile</Text>
                        <Text style={styles.pickerSub}>This flare will appear on the selected business profile.</Text>
                        <ScrollView style={{ maxHeight: 300 }}>
                            {myBusinesses.map(b => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[styles.pickerItem, selectedBusinessId === b.id && styles.pickerItemActive]}
                                    onPress={() => { setSelectedBusinessId(b.id); setShowBusinessPicker(false); }}
                                >
                                    <View style={styles.pickerLogo}>
                                        {b.logo ? (
                                            <Image source={{ uri: b.logo }} style={{ width: 36, height: 36, borderRadius: 8 }} />
                                        ) : (
                                            <Ionicons name="business" size={20} color="#1d4ed8" />
                                        )}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.pickerItemName}>{b.businessName}</Text>
                                        <Text style={styles.pickerItemCat}>{b.category}</Text>
                                    </View>
                                    {selectedBusinessId === b.id && (
                                        <Ionicons name="checkmark-circle" size={22} color="#1d4ed8" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.pickerClose} onPress={() => setShowBusinessPicker(false)}>
                            <Text style={styles.pickerCloseText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Upload Progress Overlay */}
            {isUploading && (
                <View style={styles.uploadModalOverlay}>
                    <View style={styles.uploadCard}>
                        <CircularProgress progress={uploadProgress} size={100} strokeWidth={8} color="#1d4ed8" />
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
    publishBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    publishText: { color: '#2D2445', fontWeight: '800', fontSize: 14 },

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
    videoCardActive: { borderColor: '#1d4ed8' },
    videoPreviewContainer: { flex: 1 },
    videoThumbnail: { width: '100%', height: '100%' },
    videoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
    changeVideoText: { color: '#2D2445', fontWeight: '800', marginTop: 8 },
    previewPlayBtn: { 
        position: 'absolute', 
        bottom: 20, 
        right: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(37, 99, 235, 0.9)', 
        paddingHorizontal: 15, 
        paddingVertical: 8, 
        borderRadius: 12 
    },
    previewBtnText: { color: '#2D2445', fontWeight: '700', marginLeft: 8 },
    
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
    audioPillActive: { backgroundColor: '#f5f3ff', borderColor: '#1d4ed8' },
    audioPillText: { flex: 1, marginLeft: 10, fontSize: 15, fontWeight: '700', color: '#64748b' },
    audioPillTextActive: { color: '#1d4ed8' },

    visibilityRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    visibilityPill: {
        flexGrow: 1,
        flexBasis: '22%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F4EEFC',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFE9F8',
    },
    visibilityPillActive: { backgroundColor: '#F0E7FE', borderColor: '#8b5cf6' },
    visibilityPillText: { marginLeft: 6, fontSize: 12, fontWeight: '700', color: '#7A6B9C' },
    visibilityPillTextActive: { color: '#5b21b6' },
    bizHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, marginTop: 6 },
    bizHintText: { flex: 1, fontSize: 12, color: '#5b21b6', fontWeight: '700' },
    bizHintChange: { fontSize: 12, color: '#8b5cf6', fontWeight: '800' },

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
        color: '#1d4ed8', 
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
    activeMusicCard: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
    musicIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    musicName: { color: '#1e293b', fontSize: 14, fontWeight: '800', marginBottom: 4 },
    artistName: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
    activeMusicText: { color: '#2D2445' },
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
    previewTitle: { color: '#2D2445', fontSize: 24, fontWeight: '900' },
    previewSub: { color: 'rgba(255,255,255,0.7)', fontSize: 16, marginTop: 5 },

    pickerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    pickerSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 30 },
    pickerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 14 },
    pickerTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    pickerSub: { fontSize: 13, color: '#64748b', marginBottom: 16, fontWeight: '600' },
    pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    pickerItemActive: { backgroundColor: '#eff6ff', borderColor: '#1d4ed8' },
    pickerLogo: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
    pickerItemName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    pickerItemCat: { fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: '600' },
    pickerClose: { marginTop: 12, backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
    pickerCloseText: { color: '#2D2445', fontSize: 15, fontWeight: '800' },

    uploadModalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    uploadCard: { width: width * 0.85, backgroundColor: '#fff', borderRadius: 32, padding: 30, alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    uploadingText: { fontSize: 20, fontWeight: '900', color: '#1e293b', marginTop: 25 },
    uploadingSub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 10, fontWeight: '500' }
});
