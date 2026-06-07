import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, StatusBar, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { mySpaceApi, authApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

/**
 * Share a note / folder / document by typing a profile name. Unlike the
 * contacts screen (which is limited to followers), this hits the global
 * user-search endpoint and respects each user's `phoneVisibility` rules.
 */
export default function SelectProfilesScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selected, setSelected] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(false);
    const [sharing, setSharing] = useState(false);

    useEffect(() => {
        const q = query.trim();
        if (q.length < 3) {
            setResults([]);
            return;
        }
        let cancelled = false;
        const t = setTimeout(async () => {
            try {
                setLoading(true);
                const { data } = await authApi.searchUsers(q);
                if (!cancelled) setResults(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Profile search failed', err);
                if (!cancelled) setResults([]);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 300);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [query]);

    const toggleSelect = useCallback((user: any) => {
        setSelected((prev) => {
            const next = { ...prev };
            if (next[user.id]) delete next[user.id];
            else next[user.id] = user;
            return next;
        });
    }, []);

    const selectedList = Object.values(selected);

    const renderItem = useCallback(({ item }: { item: any }) => (
        <ProfileRow
            user={item}
            isSelected={!!selected[item.id]}
            onPress={toggleSelect}
        />
    ), [selected, toggleSelect]);

    const handleShare = async () => {
        if (selectedList.length === 0) return;

        const shareType = (params.shareType as 'NOTE' | 'DOC') || 'NOTE';
        const itemId = params.itemId as string;
        const isFolder = params.isFolder === 'true';

        if (!itemId) {
            Alert.alert('Error', 'Nothing to share.');
            return;
        }

        try {
            setSharing(true);
            for (const u of selectedList as any[]) {
                await mySpaceApi.shareItem({
                    type: shareType,
                    itemId,
                    targetType: 'CONTACT',
                    targetId: u.id,
                    isFolder,
                });
            }
            Alert.alert('Success', `Shared with ${selectedList.length} ${selectedList.length === 1 ? 'profile' : 'profiles'}.`);
            router.back();
        } catch (err: any) {
            console.error('Profile share failed', err);
            const msg = err?.response?.data?.message || 'Sharing failed';
            Alert.alert('Error', msg);
        } finally {
            setSharing(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} disabled={sharing}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Share by Profile Name</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.searchSection}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#64748b" />
                    <TextInput
                        placeholder="Type a profile name (min 3 chars)"
                        style={styles.searchInput}
                        placeholderTextColor="#94a3b8"
                        value={query}
                        onChangeText={setQuery}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <Ionicons name="close-circle" size={18} color="#94a3b8" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <FlatList
                data={loading ? [] : results}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderItem}
                extraData={selected}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 160 }}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews
                initialNumToRender={12}
                maxToRenderPerBatch={12}
                windowSize={11}
                ListEmptyComponent={loading ? (
                    <ActivityIndicator color="#8b5cf6" style={{ marginTop: 24 }} />
                ) : query.trim().length < 3 ? (
                    <Text style={styles.emptyText}>Search for users by their profile name.</Text>
                ) : (
                    <Text style={styles.emptyText}>No matching profiles found.</Text>
                )}
            />

            {selectedList.length > 0 && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.shareBtn, sharing && { opacity: 0.6 }]}
                        onPress={handleShare}
                        disabled={sharing}
                    >
                        {sharing ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.shareBtnText}>Share with {selectedList.length} {selectedList.length === 1 ? 'profile' : 'profiles'}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </SafeAreaView>
    );
}

const ProfileRow = React.memo(({ user, isSelected, onPress }: any) => {
    const photo = resolveMediaUrl(user.profilePhoto) || `https://i.pravatar.cc/100?u=${user.id}`;
    return (
        <TouchableOpacity style={styles.row} onPress={() => onPress(user)}>
            <Image source={{ uri: photo }} style={styles.avatar} />
            <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.name} numberOfLines={1}>
                    {user.name || user.profileName || user.phone || 'Unknown'}
                </Text>
                {user.profileName && (
                    <Text style={styles.handle}>@{user.profileName}</Text>
                )}
            </View>
            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: {
        padding: 20, paddingTop: 20,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },

    searchSection: { paddingHorizontal: 20, paddingBottom: 12 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F4EEFC', borderRadius: 16,
        paddingHorizontal: 16, height: 50,
        borderWidth: 1, borderColor: '#C4B5DC', gap: 8,
    },
    searchInput: { flex: 1, color: '#2D2445', fontSize: 15 },

    row: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, marginBottom: 14,
    },
    avatar: { width: 44, height: 44, borderRadius: 22 },
    name: { fontSize: 15, fontWeight: '700', color: '#2D2445' },
    handle: { fontSize: 12, color: '#7A6B9C', marginTop: 2 },
    checkbox: {
        width: 22, height: 22, borderRadius: 6,
        borderWidth: 2, borderColor: '#C4B5DC',
        alignItems: 'center', justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },

    emptyText: { textAlign: 'center', color: '#9A8EBA', marginTop: 36, fontSize: 14, fontWeight: '600' },

    footer: {
        position: 'absolute', bottom: 0, width: '100%',
        padding: 20, paddingBottom: 30, backgroundColor: '#F8F5FF',
        borderTopWidth: 1, borderTopColor: '#EFE9F8',
    },
    shareBtn: {
        backgroundColor: '#8b5cf6', height: 52, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center',
    },
    shareBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 15 },
});
