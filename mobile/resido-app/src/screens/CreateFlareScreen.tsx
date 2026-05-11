import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    ScrollView, Switch, Image, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Dimensions, Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { threadApi } from '../services/api';
import { uploadToR2 } from '../services/storage';
import { useAuthStore } from '../store/authStore';
import CircularProgress from '../components/CircularProgress';

const { width } = Dimensions.get('window');

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
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    
    const [video, setVideo] = useState<any>(null);
    const [title, setTitle] = useState('');
    const [hashtags, setHashtags] = useState('');
    const [selectedMusic, setSelectedMusic] = useState(TRENDING_MUSIC[0]);
    const [commentsEnabled, setCommentsEnabled] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedVisibilities, setSelectedVisibilities] = useState<string[]>(['PUBLIC']);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [taggedUsers, setTaggedUsers] = useState<string[]>([]);

    const pickVideo = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            aspect: [9, 16],
            quality: 1,
        });

        if (!result.canceled) {
            setVideo(result.assets[0]);
        }
    };

    const handlePublish = async () => {
        if (!video) {
            Alert.alert('Error', 'Please select a video first');
            return;
        }
        if (!title.trim()) {
            Alert.alert('Error', 'Please add a caption');
            return;
        }
        if (selectedVisibilities.length === 0) {
            Alert.alert('Error', 'Please select at least one visibility option');
            return;
        }

        try {
            setIsUploading(true);
            setUploadProgress(0);
            
            // 1. Upload Video to R2 with Progress
            const uploadResult = await uploadToR2(
                video.uri, 
                activeWorkspace?.tenantId || 'global',
                'FLARE',
                'VIDEO',
                (progress) => setUploadProgress(progress)
            );

            // 2. Extract hashtags
            const hashtagArray = hashtags.split(' ').filter(h => h.startsWith('#')).map(h => h.slice(1));

            // 3. Create Flare in DB
            await threadApi.createFlare({
                title: title.trim(),
                content: title.trim(),
                type: 'FLARE',
                mediaType: 'VIDEO',
                mediaUrls: [uploadResult.fileUrl],
                authorName: user?.name || 'Resident',
                authorAvatar: user?.profilePhoto,
                musicName: selectedMusic.name,
                musicId: selectedMusic.id,
                hashtags: hashtagArray,
                commentsEnabled,
                visibility: selectedVisibilities[0],
                visibilities: selectedVisibilities,
                tags: taggedUsers
            });

            setUploadProgress(1);
            Alert.alert('Success', 'Your Flare has been published!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error: any) {
            console.error('Publish error:', error);
            const msg = error.message || 'Unknown error';
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
                {/* Video Preview / Selector */}
                <TouchableOpacity style={styles.videoContainer} onPress={pickVideo}>
                    {video ? (
                        <View style={styles.videoPreview}>
                            <Image source={{ uri: video.uri }} style={styles.previewThumb} />
                            {isUploading ? (
                                <View style={styles.uploadProgressOverlay}>
                                    <CircularProgress progress={uploadProgress} size={100} strokeWidth={10} color="#fff" />
                                    <Text style={styles.uploadProgressText}>
                                        {uploadProgress < 0.2 ? 'Optimizing Video...' : 'Uploading to Community...'}
                                    </Text>
                                </View>
                            ) : (
                                <View style={styles.changeOverlay}>
                                    <Ionicons name="camera" size={24} color="#fff" />
                                    <Text style={styles.changeText}>Change Video</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <View style={styles.uploadCircle}>
                                <Ionicons name="videocam" size={40} color="#6366f1" />
                            </View>
                            <Text style={styles.uploadTitle}>Select Short Video</Text>
                            <Text style={styles.uploadSubtitle}>MP4 or MOV, max 60 seconds</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Visibility Section - Direct Checkboxes */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="share-social-outline" size={20} color="#6366f1" />
                        <Text style={styles.sectionTitle}>Share with Your Spaces</Text>
                    </View>
                    <View style={styles.visibilityGrid}>
                        {VISIBILITY_OPTIONS.map(opt => (
                            <TouchableOpacity 
                                key={opt.id} 
                                style={[styles.visibilityOption, selectedVisibilities.includes(opt.id) && styles.visibilityOptionActive]}
                                onPress={() => toggleVisibility(opt.id)}
                            >
                                <View style={styles.optIconContainer}>
                                    <Ionicons name={opt.icon as any} size={22} color={selectedVisibilities.includes(opt.id) ? '#6366f1' : '#64748b'} />
                                </View>
                                <View style={styles.optInfo}>
                                    <Text style={[styles.optName, selectedVisibilities.includes(opt.id) && { color: '#6366f1' }]}>{opt.name}</Text>
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
                        <Ionicons name="musical-notes" size={20} color="#6366f1" />
                        <Text style={styles.sectionTitle}>Background Music</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.musicList}>
                        {TRENDING_MUSIC.map(track => (
                            <TouchableOpacity 
                                key={track.id} 
                                style={[styles.musicCard, selectedMusic.id === track.id && styles.activeMusicCard]}
                                onPress={() => setSelectedMusic(track)}
                            >
                                <View style={styles.musicIcon}>
                                    <MaterialCommunityIcons name="music" size={20} color={selectedMusic.id === track.id ? "#fff" : "#6366f1"} />
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
                            trackColor={{ false: '#f1f5f9', true: '#6366f1' }}
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

                <View style={{ height: 50 }} />
            </ScrollView>

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
    publishBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    disabledBtn: { opacity: 0.5 },
    publishText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    scrollContent: { padding: 20 },
    visibilityGrid: { gap: 10, marginBottom: 10 },
    
    videoContainer: { 
        width: '100%', 
        height: 240, 
        backgroundColor: '#f8fafc', 
        borderRadius: 24, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#f1f5f9',
        marginBottom: 25
    },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    uploadCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f5f3ff', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    uploadTitle: { color: '#1e293b', fontSize: 18, fontWeight: '800', marginBottom: 5 },
    uploadSubtitle: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
    
    videoPreview: { flex: 1 },
    previewThumb: { width: '100%', height: '100%', opacity: 0.8 },
    changeOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    changeText: { color: '#fff', fontWeight: '800', marginTop: 8 },
    uploadProgressOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: 'rgba(0,0,0,0.5)' 
    },
    uploadProgressText: { 
        color: '#fff', 
        fontWeight: '900', 
        marginTop: 15, 
        fontSize: 16 
    },

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
        color: '#6366f1', 
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
    activeMusicCard: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
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
    settingRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 18 
    },
    settingInfo: { flex: 1 },
    settingTitle: { color: '#1e293b', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    settingDesc: { color: '#94a3b8', fontSize: 13, fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginHorizontal: 18 },

    visibilityOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    visibilityOptionActive: { backgroundColor: '#f5f3ff', borderColor: '#6366f1' },
    optIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    optInfo: { flex: 1, marginLeft: 16 },
    optName: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    optDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
});
