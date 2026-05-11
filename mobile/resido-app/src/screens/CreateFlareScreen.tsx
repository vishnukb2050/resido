import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, TextInput, 
    ScrollView, Switch, Image, Alert, ActivityIndicator,
    KeyboardAvoidingView, Platform, Dimensions 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { threadApi } from '../services/api';
import { uploadToR2 } from '../services/storage';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const TRENDING_MUSIC = [
    { id: '1', name: 'Summer Vibes', artist: 'Lofi Girl' },
    { id: '2', name: 'Deep Focus', artist: 'Ambient Echo' },
    { id: '3', name: 'Energetic Beat', artist: 'Flash' },
    { id: '4', name: 'Sunset Glow', artist: 'Retro Wave' },
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
    const [taggingSearch, setTaggingSearch] = useState('');
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

        try {
            setIsUploading(true);
            
            // 1. Upload Video to R2
            const uploadResult = await uploadToR2(
                video.uri, 
                activeWorkspace?.tenantId || 'global',
                'FLARE',
                'VIDEO'
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
                tags: taggedUsers
            });

            Alert.alert('Success', 'Your Flare has been published!', [
                { text: 'OK', onPress: () => router.back() }
            ]);
        } catch (error) {
            console.error('Publish error:', error);
            Alert.alert('Error', 'Failed to publish Flare. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Flare</Text>
                <TouchableOpacity 
                    onPress={handlePublish}
                    disabled={isUploading}
                    style={[styles.publishBtn, isUploading && styles.disabledBtn]}
                >
                    {isUploading ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.publishText}>Publish</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {/* Video Preview / Selector */}
                <TouchableOpacity style={styles.videoContainer} onPress={pickVideo}>
                    {video ? (
                        <View style={styles.videoPreview}>
                            <Image source={{ uri: video.uri }} style={styles.previewThumb} />
                            <View style={styles.changeOverlay}>
                                <Ionicons name="camera" size={24} color="#fff" />
                                <Text style={styles.changeText}>Change Video</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <View style={styles.uploadCircle}>
                                <Ionicons name="videocam" size={40} color="#5856d6" />
                            </View>
                            <Text style={styles.uploadTitle}>Select Short Video</Text>
                            <Text style={styles.uploadSubtitle}>MP4 or MOV, max 60 seconds</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {/* Caption Input */}
                <View style={styles.inputSection}>
                    <Text style={styles.label}>Caption</Text>
                    <TextInput
                        style={styles.captionInput}
                        placeholder="What's happening in your community?"
                        placeholderTextColor="rgba(255,255,255,0.3)"
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
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        value={hashtags}
                        onChangeText={setHashtags}
                    />
                </View>

                {/* Music Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="musical-notes" size={20} color="#5856d6" />
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
                                    <MaterialCommunityIcons name="music" size={20} color={selectedMusic.id === track.id ? "#fff" : "#5856d6"} />
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
                            trackColor={{ false: '#3a3a3c', true: '#34c759' }}
                            thumbColor="#fff"
                        />
                    </View>

                    <View style={styles.divider} />

                    <TouchableOpacity style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingTitle}>Tag People</Text>
                            <Text style={styles.settingDesc}>Mention neighbors in this video</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 50 }} />
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingTop: Platform.OS === 'ios' ? 10 : 40,
        paddingBottom: 15,
        backgroundColor: '#1c1c1e'
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    publishBtn: { backgroundColor: '#5856d6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    disabledBtn: { opacity: 0.5 },
    publishText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    scrollContent: { padding: 20 },
    videoContainer: { 
        width: '100%', 
        height: 240, 
        backgroundColor: '#1c1c1e', 
        borderRadius: 24, 
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 25
    },
    placeholderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    uploadCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(88, 86, 214, 0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    uploadTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 5 },
    uploadSubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
    
    videoPreview: { flex: 1 },
    previewThumb: { width: '100%', height: '100%', opacity: 0.7 },
    changeOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    changeText: { color: '#fff', fontWeight: '700', marginTop: 8 },

    inputSection: { marginBottom: 25 },
    label: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 },
    captionInput: { 
        backgroundColor: '#1c1c1e', 
        borderRadius: 16, 
        padding: 15, 
        color: '#fff', 
        fontSize: 16, 
        minHeight: 100, 
        textAlignVertical: 'top' 
    },
    tagInput: { 
        backgroundColor: '#1c1c1e', 
        borderRadius: 16, 
        padding: 15, 
        color: '#5856d6', 
        fontSize: 16,
        fontWeight: '600'
    },

    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15, marginLeft: 5 },
    sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
    musicList: { flexDirection: 'row' },
    musicCard: { 
        width: 130, 
        backgroundColor: '#1c1c1e', 
        borderRadius: 20, 
        padding: 15, 
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)'
    },
    activeMusicCard: { backgroundColor: '#5856d6', borderColor: '#5856d6' },
    musicIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    musicName: { color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 4 },
    artistName: { color: 'rgba(255,255,255,0.5)', fontSize: 12 },
    activeMusicText: { color: '#fff' },
    activeArtistText: { color: 'rgba(255,255,255,0.8)' },

    settingsContainer: { 
        backgroundColor: '#1c1c1e', 
        borderRadius: 24, 
        padding: 5,
        marginBottom: 30
    },
    settingRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 18 
    },
    settingInfo: { flex: 1 },
    settingTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 4 },
    settingDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 18 },
});
