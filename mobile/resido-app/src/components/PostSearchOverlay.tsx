import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ActivityIndicator,
    FlatList,
    SafeAreaView,
    Image,
    Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { authApi, threadApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

/**
 * Full-screen search overlay used by ThreadScreen + FlaresScreen. It
 * surfaces two kinds of suggestions:
 *
 *   1. **User profiles** — typing matches a user's display name or `@handle`
 *      (case-insensitive contains, server-side). Selecting a user routes
 *      to /user-profile (which already gates on the target's
 *      profileVisibility: GLOBAL users get the full profile + posts;
 *      restricted users get the locked card + a follow-request CTA).
 *
 *   2. **Hashtags** — typing matches existing hashtags on published posts.
 *      `type` controls scope (THREAD or FLARE) so the suggested tags
 *      can never lead to the wrong feed. Selecting one bubbles back via
 *      `onPickHashtag` so the host screen can show the filtered list.
 *
 * Renders into a Modal so it never gets clipped by the parent screen's
 * FlatList — important because the dropdown can grow tall.
 */

export type PostSearchOverlayProps = {
    visible: boolean;
    onClose: () => void;
    type: 'THREAD' | 'FLARE';
    /** Selected hashtag → host shows filtered posts (no `#`). */
    onPickHashtag: (tag: string) => void;
    /** Selected user → host typically routes to /user-profile?id=… */
    onPickUser: (user: { id: string; name?: string; profileName?: string; profilePhoto?: string | null; profileVisibility?: string }) => void;
};

type UserHit = {
    id: string;
    name?: string | null;
    profileName?: string | null;
    profilePhoto?: string | null;
    profileVisibility?: string | null;
};

type TagHit = { tag: string; count: number };

export default function PostSearchOverlay({ visible, onClose, type, onPickHashtag, onPickUser }: PostSearchOverlayProps) {
    const [query, setQuery] = useState('');
    const [users, setUsers] = useState<UserHit[]>([]);
    const [tags, setTags] = useState<TagHit[]>([]);
    const [loading, setLoading] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const trimmed = query.trim();
    const isHashtagMode = useMemo(() => trimmed.startsWith('#'), [trimmed]);
    const hashtagQuery = useMemo(
        () => (isHashtagMode ? trimmed.replace(/^#+/, '') : trimmed),
        [isHashtagMode, trimmed],
    );

    useEffect(() => {
        if (visible) {
            // Autofocus shortly after the modal animates in so the keyboard
            // actually pops up on Android.
            const t = setTimeout(() => inputRef.current?.focus(), 200);
            return () => clearTimeout(t);
        }
        // Reset when closing so the next open starts fresh.
        setQuery('');
        setUsers([]);
        setTags([]);
    }, [visible]);

    useEffect(() => {
        if (!visible) return;
        const raw = trimmed;
        if (raw.length < 1) {
            setUsers([]);
            setTags([]);
            return;
        }
        let cancelled = false;
        setLoading(true);
        const debounce = setTimeout(async () => {
            try {
                // Run both lookups in parallel. We skip the user lookup
                // when the query is clearly a hashtag (starts with #).
                const tagPromise = threadApi.suggestHashtags(hashtagQuery, type).catch(() => ({ data: [] as TagHit[] }));
                const userPromise = isHashtagMode
                    ? Promise.resolve({ data: [] as UserHit[] })
                    : authApi.searchUsersPublic(raw.replace(/^@/, ''), 10).catch(() => ({ data: [] as UserHit[] }));

                const [tagRes, userRes] = await Promise.all([tagPromise, userPromise]);
                if (cancelled) return;
                setTags(Array.isArray(tagRes?.data) ? tagRes.data : []);
                setUsers(Array.isArray(userRes?.data) ? userRes.data : []);
            } catch {
                if (!cancelled) {
                    setTags([]);
                    setUsers([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }, 260);
        return () => {
            cancelled = true;
            clearTimeout(debounce);
        };
    }, [visible, trimmed, hashtagQuery, isHashtagMode, type]);

    const handlePickHashtag = (tag: string) => {
        Keyboard.dismiss();
        onPickHashtag(tag);
        onClose();
    };

    const handlePickUser = (u: UserHit) => {
        Keyboard.dismiss();
        onPickUser({
            id: u.id,
            name: u.name || undefined,
            profileName: u.profileName || undefined,
            profilePhoto: u.profilePhoto || undefined,
            profileVisibility: u.profileVisibility || 'GLOBAL',
        });
        onClose();
    };

    // Show ONLY hashtags when the user explicitly prefixed with `#`. Show
    // both sections otherwise so a search like "raj" can surface both a
    // user named Raj and a #raj hashtag.
    const showUsers = !isHashtagMode && users.length > 0;
    const showTags = tags.length > 0;
    const noResults = !loading && trimmed.length > 0 && !showUsers && !showTags;

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
                        <Ionicons name="arrow-back" size={22} color="#1e293b" />
                    </TouchableOpacity>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#7A6B9C" />
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholder={type === 'FLARE' ? 'Search profiles or #hashtags' : 'Search profiles or #hashtags'}
                            placeholderTextColor="#9A8EBA"
                            value={query}
                            onChangeText={setQuery}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="search"
                        />
                        {query.length > 0 && (
                            <TouchableOpacity onPress={() => setQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#9A8EBA" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {loading && trimmed.length > 0 ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator color="#8b5cf6" />
                    </View>
                ) : null}

                {trimmed.length === 0 ? (
                    <View style={styles.hintBox}>
                        <Ionicons name="search-circle-outline" size={56} color="#D4C9E8" />
                        <Text style={styles.hintTitle}>Find {type === 'FLARE' ? 'flares' : 'threads'}</Text>
                        <Text style={styles.hintBody}>
                            Type a name to open a profile, or {`#`}tag to see all public {type === 'FLARE' ? 'flares' : 'threads'} with that hashtag.
                        </Text>
                    </View>
                ) : noResults ? (
                    <View style={styles.hintBox}>
                        <Ionicons name="alert-circle-outline" size={40} color="#D4C9E8" />
                        <Text style={styles.hintTitle}>No matches</Text>
                        <Text style={styles.hintBody}>
                            We couldn't find any profile or hashtag matching “{trimmed}”.
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        keyboardShouldPersistTaps="handled"
                        data={[]}
                        keyExtractor={() => 'x'}
                        renderItem={() => null}
                        ListHeaderComponent={
                            <View>
                                {showUsers && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionLabel}>Profiles</Text>
                                        {users.map(u => (
                                            <TouchableOpacity
                                                key={u.id}
                                                style={styles.row}
                                                onPress={() => handlePickUser(u)}
                                            >
                                                {u.profilePhoto ? (
                                                    <Image
                                                        source={{ uri: resolveMediaUrl(u.profilePhoto) || u.profilePhoto }}
                                                        style={styles.avatar}
                                                    />
                                                ) : (
                                                    <View style={[styles.avatar, styles.avatarFallback]}>
                                                        <Ionicons name="person" size={18} color="#8b5cf6" />
                                                    </View>
                                                )}
                                                <View style={{ flex: 1 }}>
                                                    <View style={styles.nameLine}>
                                                        <Text style={styles.userName} numberOfLines={1}>{u.name || u.profileName || 'Resido user'}</Text>
                                                        {u.profileName ? (
                                                            <Text style={styles.userHandle} numberOfLines={1}>
                                                                @{u.profileName}
                                                            </Text>
                                                        ) : null}
                                                    </View>
                                                    <Text style={styles.userMeta}>
                                                        {(u.profileVisibility || 'GLOBAL') === 'GLOBAL'
                                                            ? 'View profile'
                                                            : 'Private profile · follow to view'}
                                                    </Text>
                                                </View>
                                                {(u.profileVisibility || 'GLOBAL') !== 'GLOBAL' && (
                                                    <Ionicons name="lock-closed" size={14} color="#8b5cf6" />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {showTags && (
                                    <View style={styles.section}>
                                        <Text style={styles.sectionLabel}>Hashtags · {type === 'FLARE' ? 'flares' : 'threads'} only</Text>
                                        {tags.map(t => (
                                            <TouchableOpacity
                                                key={t.tag}
                                                style={styles.row}
                                                onPress={() => handlePickHashtag(t.tag)}
                                            >
                                                <View style={[styles.avatar, styles.tagIcon]}>
                                                    <Text style={styles.tagSymbol}>#</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.userName} numberOfLines={1}>#{t.tag}</Text>
                                                    <Text style={styles.userMeta}>
                                                        {t.count} {t.count === 1 ? 'post' : 'posts'}
                                                    </Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color="#D4C9E8" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        }
                    />
                )}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1ECFA',
    },
    iconBtn: { padding: 6 },
    searchBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#F4EEFC',
        borderRadius: 14,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: '#E2D9F2',
    },
    input: { flex: 1, fontSize: 14, color: '#2D2445', fontWeight: '600' },

    loadingBox: { paddingVertical: 18, alignItems: 'center' },

    hintBox: { padding: 30, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    hintTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginTop: 12 },
    hintBody: { fontSize: 12, color: '#7A6B9C', textAlign: 'center', marginTop: 8, lineHeight: 18, fontWeight: '600' },

    section: { paddingHorizontal: 16, paddingVertical: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '900', color: '#7A6B9C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        borderRadius: 12,
        backgroundColor: '#FAFAFF',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F1ECFA',
    },
    avatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    avatarFallback: {},
    tagIcon: { backgroundColor: 'rgba(139,92,246,0.12)' },
    tagSymbol: { color: '#8b5cf6', fontSize: 18, fontWeight: '900' },

    nameLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
    userName: { fontSize: 14, fontWeight: '800', color: '#2D2445', flexShrink: 1 },
    userHandle: { fontSize: 12, fontWeight: '700', color: '#8b5cf6' },
    userMeta: { fontSize: 11, fontWeight: '700', color: '#7A6B9C', marginTop: 2 },
});
