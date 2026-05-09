import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Dimensions, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width, height } = Dimensions.get('window');

const DUMMY_FLARES = [
    { id: '1', title: 'Sunset at Club House', author: 'Rahul', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', likes: 124, comments: 12 },
    { id: '2', title: 'New Gym Equipment', author: 'Admin', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', likes: 89, comments: 5 },
    { id: '3', title: 'Community Garden Bloom', author: 'Sneha', videoUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', likes: 210, comments: 45 },
];

export default function FlaresScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <FlatList
                data={DUMMY_FLARES}
                keyExtractor={(item) => item.id}
                pagingEnabled
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <View style={styles.flareContainer}>
                        {/* Placeholder for Video Player */}
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="play" size={80} color="rgba(255,255,255,0.3)" />
                            <Text style={styles.placeholderText}>Short Video Flare</Text>
                        </View>

                        <View style={styles.overlay}>
                            <View style={styles.bottomInfo}>
                                <Text style={styles.author}>@{item.author}</Text>
                                <Text style={styles.title}>{item.title}</Text>
                            </View>

                            <View style={styles.sideActions}>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="heart" size={32} color="#fff" />
                                    <Text style={styles.actionText}>{item.likes}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="chatbubble-ellipses" size={30} color="#fff" />
                                    <Text style={styles.actionText}>{item.comments}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionBtn}>
                                    <Ionicons name="share-social" size={30} color="#fff" />
                                    <Text style={styles.actionText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
            />
            
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.addBtn}>
                <Ionicons name="camera" size={28} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Flares" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    flareContainer: { width, height: height },
    videoPlaceholder: { flex: 1, backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: 'rgba(255,255,255,0.5)', marginTop: 20, fontSize: 16, fontWeight: '600' },
    overlay: { position: 'absolute', bottom: 110, left: 0, right: 0, padding: 20, flexDirection: 'row', alignItems: 'flex-end' },
    bottomInfo: { flex: 1 },
    author: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 8 },
    title: { color: '#fff', fontSize: 14, lineHeight: 20 },
    sideActions: { alignItems: 'center', gap: 20, marginLeft: 10 },
    actionBtn: { alignItems: 'center' },
    actionText: { color: '#fff', fontSize: 12, fontWeight: '700', marginTop: 4 },
    backBtn: { position: 'absolute', top: 80, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { position: 'absolute', right: 20, bottom: 250, width: 60, height: 60, borderRadius: 30, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
});
