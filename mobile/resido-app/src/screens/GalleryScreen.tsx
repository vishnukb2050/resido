import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

export default function GalleryScreen() {
    const { activeWorkspace } = useAuthStore();
    const [photos, setPhotos] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        communityApi.getGallery().then(r => setPhotos(r.data)).finally(() => setLoading(false));
    }, [activeWorkspace]);

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Gallery</Text>
                <Text style={styles.subTitle}>{activeWorkspace?.tenantName}</Text>
            </View>
            <FlatList
                data={photos}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={{ padding: 10 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <Image source={{ uri: item.mediaUrls[0] }} style={styles.image} />
                        <View style={styles.info}>
                            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                            <Text style={styles.category}>{item.category}</Text>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No photos in this community gallery</Text>}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    subTitle: { fontSize: 13, color: '#6366f1', fontWeight: '600', marginTop: 2 },
    card: { width: (width - 40) / 2, margin: 5, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 2 },
    image: { width: '100%', height: 120, backgroundColor: '#f1f5f9' },
    info: { padding: 10 },
    cardTitle: { fontSize: 12, fontWeight: '700', color: '#1e293b' },
    category: { fontSize: 10, color: '#64748b', marginTop: 2 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, width: width - 20 },
});
