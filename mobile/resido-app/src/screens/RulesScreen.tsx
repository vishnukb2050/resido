import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

const AUDIENCE_OPTIONS = [
    { key: 'MEMBERS',   label: 'Members',   icon: 'people-circle-outline',   color: '#3b82f6' },
    { key: 'RESIDENTS', label: 'Residents',  icon: 'home-outline',            color: '#10b981' },
    { key: 'STAFF',     label: 'Staff',      icon: 'shield-checkmark-outline', color: '#f59e0b' },
];

export default function RulesScreen() {
    const router = useRouter();
    const { activeWorkspace } = useAuthStore();
    const [rules, setRules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    
    const isAdmin = activeWorkspace?.role === 'APARTMENT_ADMIN';

    const [newRule, setNewRule] = useState({ title: '', description: '', category: 'General' });
    const [audience, setAudience] = useState<Record<string, boolean>>({
        MEMBERS: true, RESIDENTS: true, STAFF: false,
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        try {
            const memberId = activeWorkspace?.memberId || '';
            const { data } = await communityApi.getRules(memberId);
            setRules(data || []);
        } catch (e) {
            console.error('Fetch rules failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!newRule.title || !newRule.description) {
            Alert.alert('Required', 'Please fill in all rule details');
            return;
        }
        const selectedAudiences = Object.entries(audience).filter(([, v]) => v).map(([k]) => k);
        if (selectedAudiences.length === 0) {
            Alert.alert('Required', 'Please select at least one audience');
            return;
        }

        try {
            await communityApi.createRule({
                ...newRule,
                audience: selectedAudiences
            });
            setShowAdd(false);
            setNewRule({ title: '', description: '', category: 'General' });
            setAudience({ MEMBERS: true, RESIDENTS: true, STAFF: false });
            fetchRules();
            Alert.alert('Success', 'Community rule added!');
        } catch (e) {
            Alert.alert('Error', 'Failed to add rule');
        }
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
                    renderItem={({ item }: any) => {
                        const getCategoryIcon = (cat: string) => {
                            const c = cat.toLowerCase();
                            if (c.includes('pet')) return 'paw';
                            if (c.includes('park')) return 'car';
                            if (c.includes('trash') || c.includes('waste')) return 'trash';
                            if (c.includes('noise') || c.includes('quiet')) return 'volume-mute';
                            if (c.includes('pool') || c.includes('swim')) return 'water';
                            if (c.includes('party') || c.includes('event')) return 'people';
                            return 'document-text';
                        };

                        return (
                            <View style={styles.ruleCard}>
                                <View style={styles.ruleHeader}>
                                    <View style={styles.categoryBadge}>
                                        <Ionicons name={getCategoryIcon(item.category) as any} size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                                        <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                                    </View>
                                    <Ionicons name="bookmark" size={20} color="rgba(245, 158, 11, 0.3)" />
                                </View>
                                <Text style={styles.ruleTitle}>{item.title}</Text>
                                <Text style={styles.ruleDesc}>{item.description}</Text>

                                {item.audience && item.audience.length > 0 && (
                                    <View style={styles.audienceTags}>
                                        {item.audience.map((a: string) => (
                                            <View key={a} style={styles.audienceTag}>
                                                <Text style={styles.audienceTagText}>{a}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="book-outline" size={64} color="rgba(255,255,255,0.05)" />
                            <Text style={styles.emptyTitle}>No Rules Defined</Text>
                            <Text style={styles.emptySub}>Community guidelines will be listed here.</Text>
                        </View>
                    }
                />
            )}

            <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Community Rule</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }} keyboardShouldPersistTaps="handled">
                            <TextInput
                                style={styles.input}
                                placeholder="Rule Title"
                                placeholderTextColor="#64748b"
                                value={newRule.title}
                                onChangeText={(t) => setNewRule({...newRule, title: t})}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Category (e.g. Pets, Parking)"
                                placeholderTextColor="#64748b"
                                value={newRule.category}
                                onChangeText={(t) => setNewRule({...newRule, category: t})}
                            />
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Rule Description"
                                placeholderTextColor="#64748b"
                                multiline
                                value={newRule.description}
                                onChangeText={(t) => setNewRule({...newRule, description: t})}
                            />

                            <Text style={styles.fieldLabel}>Share With</Text>
                            <Text style={styles.fieldHint}>Select who can view this rule</Text>
                            {AUDIENCE_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[styles.audienceRow, audience[opt.key] && { borderColor: opt.color, backgroundColor: `${opt.color}15` }]}
                                    onPress={() => setAudience(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                >
                                    <View style={[styles.audienceIconBox, { backgroundColor: `${opt.color}20` }]}>
                                        <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                                    </View>
                                    <Text style={[styles.audienceLabel, audience[opt.key] && { color: '#fff' }]}>{opt.label}</Text>
                                    <View style={[styles.checkBox, audience[opt.key] && { backgroundColor: opt.color, borderColor: opt.color }]}>
                                        {audience[opt.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                                <Text style={styles.submitText}>Add Rule</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    addBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
    listContent: { padding: 20 },
    ruleCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    ruleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    categoryBadge: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
    categoryText: { color: '#f59e0b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
    ruleTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
    ruleDesc: { fontSize: 14, color: '#94a3b8', lineHeight: 22 },
    emptyState: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 10 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600', marginBottom: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 15, marginTop: 15 },
    cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
    cancelText: { color: '#64748b', fontWeight: '700' },
    submitBtn: { flex: 2, backgroundColor: '#f59e0b', borderRadius: 16, padding: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '900' },

    // Audience selection within modal
    fieldLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
    fieldHint: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 10, marginTop: -6 },
    audienceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    audienceIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    audienceLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#94a3b8' },
    checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

    // Tags inside card
    audienceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    audienceTag: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
    audienceTagText: { fontSize: 10, color: '#f59e0b', fontWeight: '800', textTransform: 'uppercase' },
});

