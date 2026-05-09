import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, FlatList, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { threadApi, residentApi } from '../services/api';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

const CATEGORIES = ['General', 'Event', 'Alert', 'Marketplace', 'Social', 'Maintenance'];

export default function CreateThreadScreen() {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('General');
    const [media, setMedia] = useState<any | null>(null);
    const [tags, setTags] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showTagModal, setShowTagModal] = useState(false);
    
    const router = useRouter();

    const pickMedia = async (type: 'image' | 'video') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: type === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setMedia({ uri: result.assets[0].uri, type: type.toUpperCase() });
        }
    };

    const searchUsers = async (query: string) => {
        setUserSearch(query);
        if (query.length < 2) return;
        try {
            // Using residentApi to search community members
            const { data } = await residentApi.getMembers(); 
            setSearchResults(data.filter((m: any) => m.name.toLowerCase().includes(query.toLowerCase())));
        } catch (error) {
            console.error(error);
        }
    };

    const toggleTag = (user: any) => {
        if (tags.find(t => t.id === user.id)) {
            setTags(tags.filter(t => t.id !== user.id));
        } else {
            setTags([...tags, user]);
        }
    };

    const handlePublish = async () => {
        if (!title || !content) return Alert.alert('Error', 'Title and content are required');

        setLoading(true);
        try {
            const payload = {
                title,
                content,
                category,
                mediaUrls: media ? [media.uri] : [],
                mediaType: media?.type || 'IMAGE',
                tags: tags.map(t => t.id)
            };

            await threadApi.createThread(payload);
            Alert.alert('Success', 'Thread post published!');
            router.back();
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to publish thread');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="close" size={24} color="#1e293b" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Post</Text>
                <TouchableOpacity style={styles.publishBtn} onPress={handlePublish} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.publishText}>Publish</Text>}
                </TouchableOpacity>
            </View>

            <View style={styles.form}>
                <View style={styles.mediaOptions}>
                    <TouchableOpacity style={styles.mediaBtn} onPress={() => pickMedia('image')}>
                        <Ionicons name="image-outline" size={20} color="#6366f1" />
                        <Text style={styles.mediaBtnText}>Add Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.mediaBtn} onPress={() => pickMedia('video')}>
                        <Ionicons name="videocam-outline" size={20} color="#6366f1" />
                        <Text style={styles.mediaBtnText}>Add Video</Text>
                    </TouchableOpacity>
                </View>

                {media && (
                    <View style={styles.mediaPreview}>
                        <Image source={{ uri: media.uri }} style={styles.previewImage} />
                        <TouchableOpacity style={styles.removeMedia} onPress={() => setMedia(null)}>
                            <Ionicons name="close-circle" size={24} color="#ef4444" />
                        </TouchableOpacity>
                        {media.type === 'VIDEO' && (
                            <View style={styles.playOverlay}>
                                <Ionicons name="play" size={30} color="#fff" />
                            </View>
                        )}
                    </View>
                )}

                <TextInput 
                    style={styles.titleInput} 
                    placeholder="Post Title" 
                    value={title}
                    onChangeText={setTitle}
                    placeholderTextColor="#94a3b8"
                />

                <View style={styles.tagSection}>
                    <TouchableOpacity style={styles.tagBtn} onPress={() => setShowTagModal(true)}>
                        <Ionicons name="person-add-outline" size={18} color="#6366f1" />
                        <Text style={styles.tagBtnText}>Tag People ({tags.length})</Text>
                    </TouchableOpacity>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagScroll}>
                        {tags.map(t => (
                            <View key={t.id} style={styles.tagBadge}>
                                <Text style={styles.tagBadgeText}>@{t.name}</Text>
                                <TouchableOpacity onPress={() => toggleTag(t)}>
                                    <Ionicons name="close-circle" size={14} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <TextInput 
                    style={styles.contentInput} 
                    placeholder="Write your content here..." 
                    value={content}
                    onChangeText={setContent}
                    multiline
                    textAlignVertical="top"
                    placeholderTextColor="#94a3b8"
                />
            </View>

            <Modal visible={showTagModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Tag Members</Text>
                            <TouchableOpacity onPress={() => setShowTagModal(false)}>
                                <Text style={styles.doneBtn}>Done</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput 
                            style={styles.searchInput} 
                            placeholder="Search members..." 
                            value={userSearch}
                            onChangeText={searchUsers}
                        />
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.userItem} onPress={() => toggleTag(item)}>
                                    <Text style={styles.userName}>{item.name}</Text>
                                    {tags.find(t => t.id === item.id) && (
                                        <Ionicons name="checkmark-circle" size={20} color="#6366f1" />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    publishBtn: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
    publishText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    form: { padding: 20 },
    mediaOptions: { flexDirection: 'row', marginBottom: 20 },
    mediaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', padding: 12, borderRadius: 12, marginRight: 10 },
    mediaBtnText: { marginLeft: 6, color: '#6366f1', fontWeight: '700', fontSize: 13 },
    mediaPreview: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', marginBottom: 20, position: 'relative' },
    previewImage: { width: '100%', height: '100%' },
    removeMedia: { position: 'absolute', top: 10, right: 10 },
    playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
    titleInput: { fontSize: 24, fontWeight: '800', color: '#1e293b', marginBottom: 15 },
    tagSection: { marginBottom: 20 },
    tagBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    tagBtnText: { marginLeft: 6, color: '#6366f1', fontWeight: '700' },
    tagScroll: { flexDirection: 'row' },
    tagBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginRight: 8 },
    tagBadgeText: { fontSize: 12, color: '#475569', fontWeight: '700', marginRight: 4 },
    contentInput: { fontSize: 16, color: '#475569', minHeight: 300 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, height: '70%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    doneBtn: { color: '#6366f1', fontWeight: '800', fontSize: 16 },
    searchInput: { backgroundColor: '#f1f5f9', borderRadius: 15, padding: 15, marginBottom: 20 },
    userItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    userName: { fontSize: 16, color: '#1e293b', fontWeight: '600' },
});
