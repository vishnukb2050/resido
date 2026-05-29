import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, FlatList, Modal, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { threadApi, authApi, businessApi } from '../services/api';
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
    // Free-form hashtag input. Saved alongside the post and used by the
    // ThreadScreen search to power #hashtag discovery.
    const [hashtags, setHashtags] = useState('');
    const [category, setCategory] = useState('general');
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [selectedVisibilities, setSelectedVisibilities] = useState<string[]>(['PUBLIC']);
    const [loading, setLoading] = useState(false);
    const [showVisibilityModal, setShowVisibilityModal] = useState(false);
    const [showPollBuilder, setShowPollBuilder] = useState(false);
    const [pollQuestion, setPollQuestion] = useState('');
    const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
    const [pollDuration, setPollDuration] = useState(7);
    const [myBusinesses, setMyBusinesses] = useState<any[]>([]);
    const [pinToBusiness, setPinToBusiness] = useState(false);
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
    const [showBusinessPicker, setShowBusinessPicker] = useState(false);

    const router = useRouter();

    useEffect(() => {
        (async () => {
            try {
                const { data } = await businessApi.getMyProfiles();
                const list = Array.isArray(data) ? data : (data?.profiles || []);
                setMyBusinesses(list);
                if (list.length === 1) setSelectedBusinessId(list[0].id);
            } catch (e) {
                // ignore
            }
        })();
    }, []);

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
            const tenantScope = (useAuthStore.getState().activeWorkspace?.tenantId) || `personal_${user?.id || 'anon'}`;
            const uploadedUrls: string[] = [];
            for (const item of mediaList) {
                let finalUri = item.uri;
                if (item.type === 'VIDEO') {
                    try {
                        finalUri = await VideoCompressor.compress(item.uri, { compressionMethod: 'auto' });
                    } catch (e) {
                        console.warn('Video compression failed, using original', e);
                    }
                }
                const result: any = await uploadToR2(finalUri, tenantScope, 'THREAD', item.type);
                if (result?.fileUrl) uploadedUrls.push(result.fileUrl);
            }

            const pinnedBusinessId =
                pinToBusiness && (selectedBusinessId || (myBusinesses.length === 1 ? myBusinesses[0].id : null))
                    ? selectedBusinessId || myBusinesses[0]?.id
                    : null;

            // Pull hashtags out of the free-form input. We accept both
            // `#foo bar baz` and plain `foo bar baz` forms — anything
            // separated by whitespace, commas or # is treated as one tag.
            const hashtagArray: string[] = (hashtags || '')
                .split(/[\s,#]+/)
                .map(t => t.trim().toLowerCase())
                .filter(t => t.length > 0 && t.length <= 50);

            const payload: any = {
                title: title || 'New Post',
                content,
                category,
                mediaUrls: uploadedUrls,
                mediaType: mediaList.length > 0 ? mediaList[0].type : 'IMAGE',
                visibility: selectedVisibilities[0],
                visibilities: selectedVisibilities,
                hashtags: hashtagArray,
                authorName: user?.name || 'Resident',
                authorAvatar: user?.profilePhoto || undefined,
            };
            if (pinnedBusinessId) payload.businessProfileId = pinnedBusinessId;
            if (showPollBuilder && pollQuestion && pollOptions.filter(o => o).length >= 2) {
                payload.poll = {
                    question: pollQuestion,
                    options: pollOptions.filter(o => o),
                    durationDays: pollDuration,
                };
            }

            await threadApi.createThread(payload);
            Alert.alert('Success', 'Thread published!');
            router.replace({ 
                pathname: '/thread', 
                params: { refresh: Date.now().toString() } 
            });
        } catch (error: any) {
            const status = error?.response?.status;
            const serverMsg = error?.response?.data?.message || error?.response?.data?.error;
            const reason = serverMsg || error?.message || 'Unknown error';
            console.error('Publish thread failed:', status, reason, error?.response?.data || '');
            Alert.alert('Publish Failed', `${reason}${status ? ` (HTTP ${status})` : ''}`);
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

                {/* Visibility Section - Public / Contacts / Followers (+ Business if available) */}
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

                {/* Hashtags */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Hashtags</Text>
                    <TextInput
                        style={styles.hashtagInput}
                        placeholder="#community #news #event"
                        placeholderTextColor="#94a3b8"
                        value={hashtags}
                        onChangeText={setHashtags}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <Text style={styles.hashtagHint}>
                        Separate tags with spaces. People can discover this thread by tapping a # tag.
                    </Text>
                </View>

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

            <Modal visible={showBusinessPicker} animationType="slide" transparent>
                <View style={styles.pickerBackdrop}>
                    <View style={styles.pickerSheet}>
                        <View style={styles.pickerHandle} />
                        <Text style={styles.pickerTitle}>Choose business profile</Text>
                        <Text style={styles.pickerSub}>This thread will appear on the selected business profile.</Text>
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
    publishText: { color: '#2D2445', fontWeight: '800', fontSize: 14 },
    
    userSection: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    userAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f1f5f9' },
    userMeta: { marginLeft: 12 },
    userName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    userSubtitle: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    
    section: { paddingHorizontal: 20, marginBottom: 20 },
    hashtagInput: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 14,
        paddingVertical: 12,
        fontSize: 15,
        color: '#1d4ed8',
        fontWeight: '700',
    },
    hashtagHint: { marginTop: 6, fontSize: 11, color: '#94a3b8', fontWeight: '600' },
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
    durationPillTextActive: { color: '#2D2445' },

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
});
