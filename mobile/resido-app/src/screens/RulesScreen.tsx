import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert, ScrollView, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';
import { storageApi } from '../services/storage';
import { resolveMediaUrl } from '../utils/mediaUrl';

const AUDIENCE_OPTIONS = [
    { key: 'MEMBERS',   label: 'Members',   icon: 'people-circle-outline',    color: '#a78bfa' },
    { key: 'RESIDENTS', label: 'Residents', icon: 'home-outline',             color: '#10b981' },
    { key: 'STAFF',     label: 'Staff',     icon: 'shield-checkmark-outline', color: '#f59e0b' },
];

export default function RulesScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    const isAdmin = activeWorkspace?.role === 'APARTMENT_ADMIN';

    const [editingId, setEditingId] = useState<string | null>(null);
    const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | null>(null);
    const [newRule, setNewRule] = useState({ title: '', description: '', category: 'General' });
    const [audience, setAudience] = useState<Record<string, boolean>>({
        MEMBERS: false, RESIDENTS: false, STAFF: false,
    });

    const fetchRules = useCallback(async (silent = false) => {
        try {
            if (!silent) setLoading(true);
            const memberId = activeWorkspace?.memberId || '';
            const { data } = await communityApi.getRules(memberId);
            setRules(data || []);
        } catch (e) {
            console.error('Fetch rules failed', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [activeWorkspace?.memberId]);

    useFocusEffect(
        useCallback(() => {
            fetchRules();
        }, [fetchRules]),
    );

    const onRefresh = () => {
        setRefreshing(true);
        fetchRules(true);
    };

    const handlePickPhoto = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Please allow gallery access to attach a photo.');
            return;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.7,
        });
        if (!result.canceled) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setExistingPhotoUrl(null);
        setNewRule({ title: '', description: '', category: 'General' });
        setAudience({ MEMBERS: false, RESIDENTS: false, STAFF: false });
        setPhotoUri(null);
    };

    const openEdit = (rule: any) => {
        setEditingId(rule.id);
        setNewRule({
            title: rule.title || '',
            description: rule.description || '',
            category: rule.category || 'General',
        });
        const aud: Record<string, boolean> = { MEMBERS: false, RESIDENTS: false, STAFF: false };
        (rule.audience || []).forEach((a: string) => { aud[a] = true; });
        setAudience(aud);
        setExistingPhotoUrl(rule.photoUrl || null);
        setPhotoUri(null);
        setShowAdd(true);
    };

    const handleSubmit = async () => {
        if (!activeWorkspace?.tenantId) {
            Alert.alert(
                'Community required',
                'Open your community workspace from the top switcher, then create a rule.',
            );
            return;
        }
        if (!newRule.title.trim() || !newRule.description.trim()) {
            Alert.alert('Required', 'Please enter a title and description.');
            return;
        }
        const selected = Object.entries(audience).filter(([, v]) => v).map(([k]) => k);
        if (selected.length === 0) {
            Alert.alert('Required', 'Select at least one role to share this rule with.');
            return;
        }

        setSubmitting(true);
        try {
            // photoUrl resolution:
            //   - new image picked → upload and use uploaded URL
            //   - editing & existingPhotoUrl cleared → null (remove image)
            //   - editing & existingPhotoUrl kept → leave unchanged (undefined)
            //   - create without image → undefined (no field sent)
            let photoUrl: string | null | undefined = undefined;
            if (photoUri) {
                const uploaded = await storageApi.uploadFile(
                    photoUri,
                    `rule_${user?.id || 'unknown'}_${Date.now()}.jpg`,
                    'image/jpeg',
                    'rules',
                    activeWorkspace?.tenantId,
                );
                if (uploaded) photoUrl = uploaded as string;
            } else if (editingId && !existingPhotoUrl) {
                photoUrl = null;
            }

            if (editingId) {
                const payload: any = {
                    title: newRule.title.trim(),
                    description: newRule.description.trim(),
                    category: newRule.category.trim() || 'General',
                    audience: selected,
                };
                if (photoUrl !== undefined) payload.photoUrl = photoUrl;
                await communityApi.updateRule(editingId, payload);
            } else {
                await communityApi.createRule({
                    title: newRule.title.trim(),
                    description: newRule.description.trim(),
                    category: newRule.category.trim() || 'General',
                    photoUrl,
                    audience: selected,
                });
            }

            setShowAdd(false);
            const wasEditing = !!editingId;
            resetForm();
            fetchRules(true);
            Alert.alert(
                wasEditing ? 'Updated' : 'Added',
                wasEditing
                    ? 'Rule has been updated.'
                    : 'Rule has been shared with the selected roles.',
            );
        } catch (e: any) {
            const status = e?.response?.status;
            const serverMsg =
                e?.response?.data?.message ||
                (Array.isArray(e?.response?.data?.message)
                    ? e.response.data.message.join(', ')
                    : null) ||
                e?.response?.data?.error;
            const reason = serverMsg || e?.message || 'Failed to save rule.';
            Alert.alert('Save failed', `${reason}${status ? ` (HTTP ${status})` : ''}`);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = (rule: any) => {
        Alert.alert(
            'Delete rule',
            `Remove "${rule.title}" permanently?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive', onPress: async () => {
                        try {
                            await communityApi.deleteRule(rule.id);
                            fetchRules(true);
                        } catch (e: any) {
                            Alert.alert('Error', e?.response?.data?.message || 'Failed to delete rule.');
                        }
                    },
                },
            ],
        );
    };

    const getCategoryIcon = (cat?: string) => {
        const c = (cat || '').toLowerCase();
        if (c.includes('pet')) return 'paw';
        if (c.includes('park')) return 'car';
        if (c.includes('trash') || c.includes('waste')) return 'trash';
        if (c.includes('noise') || c.includes('quiet')) return 'volume-mute';
        if (c.includes('pool') || c.includes('swim')) return 'water';
        if (c.includes('party') || c.includes('event')) return 'people';
        if (c.includes('safety') || c.includes('secur')) return 'shield-checkmark';
        return 'document-text';
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rules & Regulations</Text>
                {isAdmin ? (
                    <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : <View style={{ width: 44 }} />}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={rules}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl tintColor="#f59e0b" refreshing={refreshing} onRefresh={onRefresh} />
                    }
                    renderItem={({ item }: any) => {
                        const photo = resolveMediaUrl(item.photoUrl);
                        return (
                            <View style={styles.ruleCard}>
                                {photo ? (
                                    <Image source={{ uri: photo }} style={styles.ruleImage} resizeMode="cover" />
                                ) : null}

                                <View style={styles.ruleHeader}>
                                    <View style={styles.categoryBadge}>
                                        <Ionicons name={getCategoryIcon(item.category) as any} size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                                        <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                                    </View>
                                    {isAdmin ? (
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity
                                                style={styles.cardActionBtn}
                                                onPress={() => openEdit(item)}
                                                hitSlop={8}
                                            >
                                                <Ionicons name="create-outline" size={16} color="#a78bfa" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.cardActionBtn}
                                                onPress={() => handleDelete(item)}
                                                hitSlop={8}
                                            >
                                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <Ionicons name="bookmark" size={20} color="rgba(245, 158, 11, 0.3)" />
                                    )}
                                </View>

                                <Text style={styles.ruleTitle}>{item.title}</Text>
                                <Text style={styles.ruleDesc}>{item.description}</Text>

                                {item.audience && item.audience.length > 0 ? (
                                    <View style={styles.audienceTags}>
                                        {item.audience.map((a: string) => {
                                            const opt = AUDIENCE_OPTIONS.find((o) => o.key === a);
                                            const color = opt?.color || '#f59e0b';
                                            return (
                                                <View
                                                    key={a}
                                                    style={[
                                                        styles.audienceTag,
                                                        { backgroundColor: `${color}15`, borderColor: `${color}40` },
                                                    ]}
                                                >
                                                    <Ionicons name={(opt?.icon || 'people') as any} size={10} color={color} />
                                                    <Text style={[styles.audienceTagText, { color }]}>{a}</Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                ) : null}
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="book-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Rules Defined</Text>
                            <Text style={styles.emptySub}>
                                {isAdmin
                                    ? 'Tap the + button to share a rule with members, residents, or staff.'
                                    : 'Community guidelines will appear here once your admin adds them.'}
                            </Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => { setShowAdd(false); resetForm(); }}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingId ? 'Edit Rule' : 'New Community Rule'}</Text>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={{ maxHeight: 520 }}
                            keyboardShouldPersistTaps="handled"
                        >
                            <TextInput
                                style={styles.input}
                                placeholder="Rule Title"
                                placeholderTextColor="#64748b"
                                value={newRule.title}
                                onChangeText={(t) => setNewRule({ ...newRule, title: t })}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Category (e.g. Pets, Parking, Safety)"
                                placeholderTextColor="#64748b"
                                value={newRule.category}
                                onChangeText={(t) => setNewRule({ ...newRule, category: t })}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Rule Description"
                                placeholderTextColor="#64748b"
                                multiline
                                value={newRule.description}
                                onChangeText={(t) => setNewRule({ ...newRule, description: t })}
                            />

                            <Text style={styles.fieldLabel}>Photo (optional)</Text>
                            <Text style={styles.fieldHint}>Add an image to make the rule easier to understand.</Text>

                            {photoUri || existingPhotoUrl ? (
                                <View style={styles.previewWrap}>
                                    <Image
                                        source={{ uri: photoUri || (resolveMediaUrl(existingPhotoUrl) as string) }}
                                        style={styles.preview}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.previewActions}>
                                        <TouchableOpacity
                                            style={styles.previewActionBtn}
                                            onPress={handlePickPhoto}
                                        >
                                            <Ionicons name="image-outline" size={14} color="#fff" />
                                            <Text style={styles.previewActionText}>Change</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.previewActionBtn}
                                            onPress={() => { setPhotoUri(null); setExistingPhotoUrl(null); }}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#fff" />
                                            <Text style={styles.previewActionText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.photoBtn} onPress={handlePickPhoto}>
                                    <Ionicons name="image-outline" size={18} color="#f59e0b" />
                                    <Text style={styles.photoBtnText}>Pick a photo</Text>
                                </TouchableOpacity>
                            )}

                            <Text style={styles.fieldLabel}>Share With *</Text>
                            <Text style={styles.fieldHint}>
                                Pick at least one role. Only ticked roles will see this rule —
                                others in the community won&apos;t.
                            </Text>
                            {AUDIENCE_OPTIONS.map((opt) => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.audienceRow,
                                        audience[opt.key] && { borderColor: opt.color, backgroundColor: `${opt.color}15` },
                                    ]}
                                    onPress={() => setAudience((prev) => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                >
                                    <View style={[styles.audienceIconBox, { backgroundColor: `${opt.color}20` }]}>
                                        <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                                    </View>
                                    <Text style={[styles.audienceLabel, audience[opt.key] && { color: '#2D2445' }]}>
                                        {opt.label}
                                    </Text>
                                    <View
                                        style={[
                                            styles.checkBox,
                                            audience[opt.key] && { backgroundColor: opt.color, borderColor: opt.color },
                                        ]}
                                    >
                                        {audience[opt.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setShowAdd(false); resetForm(); }}
                                disabled={submitting}
                            >
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, { opacity: submitting ? 0.6 : 1 }]}
                                onPress={handleSubmit}
                                disabled={submitting}
                            >
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitText}>{editingId ? 'Save Changes' : 'Add Rule'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    ruleCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#D4C9E8', overflow: 'hidden' },
    ruleImage: { width: '100%', height: 160, borderRadius: 16, marginBottom: 14, backgroundColor: '#ffffff' },
    ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    categoryBadge: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    categoryText: { color: '#f59e0b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    ruleTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445', marginBottom: 8 },
    ruleDesc: { fontSize: 14, color: '#9A8EBA', lineHeight: 22 },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#ffffff', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', color: '#2D2445', padding: 18, fontSize: 16, fontWeight: '600', marginBottom: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 15, marginTop: 15 },
    cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
    cancelText: { color: '#7A6B9C', fontWeight: '700' },
    submitBtn: { flex: 2, backgroundColor: '#f59e0b', borderRadius: 16, padding: 18, alignItems: 'center' },
    submitText: { color: '#2D2445', fontWeight: '900' },

    fieldLabel: { fontSize: 12, color: '#9A8EBA', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
    fieldHint: { fontSize: 11, color: '#7A6B9C', fontWeight: '600', marginBottom: 10 },

    photoBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(245, 158, 11, 0.08)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.25)' },
    photoBtnText: { color: '#f59e0b', fontWeight: '800', fontSize: 13 },
    previewWrap: { borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: '#ffffff' },
    preview: { width: '100%', height: 160 },
    previewActions: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 6 },
    previewActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    previewActionText: { color: '#2D2445', fontSize: 10, fontWeight: '800' },

    cardActions: { flexDirection: 'row', gap: 8 },
    cardActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },

    audienceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    audienceIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    audienceLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#9A8EBA' },
    checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: '#C4B5DC', alignItems: 'center', justifyContent: 'center' },

    audienceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    audienceTag: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
    audienceTagText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
});
