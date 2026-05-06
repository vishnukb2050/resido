import React, { useState, useEffect } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Modal, TextInput, ScrollView, Alert, ActivityIndicator, Switch
} from 'react-native';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';

const VISIBILITY_OPTIONS = [
    { label: 'Community', value: 'COMMUNITY', icon: '🏢' },
    { label: 'Contacts', value: 'CONTACTS', icon: '👤' },
    { label: 'Groups', value: 'GROUPS', icon: '👥' },
    { label: 'Private', value: 'PRIVATE', icon: '🔒' },
];

export default function CalendarScreen() {
    const { user, activeWorkspace } = useAuthStore();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    
    // Create Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [visibility, setVisibility] = useState('COMMUNITY');
    const [hasAlert, setHasAlert] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => { loadEvents(); }, [activeWorkspace]);

    const loadEvents = async () => {
        if (!user?.id) return;
        setLoading(true);
        try {
            const res = await communityApi.getEvents(user.id);
            setEvents(res.data);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        if (!title) return Alert.alert('Error', 'Title is required');
        if (!user?.id) return;

        setSubmitting(true);
        try {
            await communityApi.createEvent({
                title,
                description: desc,
                startDate: new Date(), // For demo, use current time
                endDate: new Date(Date.now() + 3600000), // 1 hour later
                visibility,
                hasAlert,
                memberId: user.id
            });
            setShowCreate(false);
            setTitle(''); setDesc(''); setVisibility('COMMUNITY'); setHasAlert(false);
            loadEvents();
        } catch {
            Alert.alert('Error', 'Failed to create event');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Calendar</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setShowCreate(true)}>
                    <Text style={styles.addBtnText}>+ Add Event</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 20, gap: 16 }}
                renderItem={({ item }) => (
                    <View style={styles.eventCard}>
                        <View style={styles.eventDate}>
                            <Text style={styles.month}>{dayjs(item.startDate).format('MMM')}</Text>
                            <Text style={styles.day}>{dayjs(item.startDate).format('DD')}</Text>
                        </View>
                        <View style={styles.eventInfo}>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            <Text style={styles.eventSub}>{dayjs(item.startDate).format('HH:mm')} • {item.visibility}</Text>
                            {item.hasAlert && <Text style={styles.alertBadge}>🔔 Alert Active</Text>}
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.empty}>No events scheduled</Text>}
            />

            {/* Create Event Modal */}
            <Modal visible={showCreate} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Event</Text>
                        <TouchableOpacity onPress={() => setShowCreate(false)}>
                            <Text style={styles.closeBtn}>Close</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        <Text style={styles.label}>Event Title</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Enter title" />

                        <Text style={styles.label}>Description</Text>
                        <TextInput style={[styles.input, { height: 80 }]} value={desc} onChangeText={setDesc} placeholder="Enter description" multiline />

                        <Text style={styles.label}>Who can see this?</Text>
                        <View style={styles.visibilityGrid}>
                            {VISIBILITY_OPTIONS.map((opt) => (
                                <TouchableOpacity 
                                    key={opt.value} 
                                    style={[styles.visibilityBtn, visibility === opt.value && styles.visibilityBtnActive]}
                                    onPress={() => setVisibility(opt.value)}
                                >
                                    <Text style={styles.visIcon}>{opt.icon}</Text>
                                    <Text style={[styles.visLabel, visibility === opt.value && styles.visLabelActive]}>{opt.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.alertRow}>
                            <View>
                                <Text style={styles.label}>Enable Alert</Text>
                                <Text style={styles.subLabel}>Notify me before the event</Text>
                            </View>
                            <Switch value={hasAlert} onValueChange={setHasAlert} trackColor={{ true: '#6366f1' }} />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Create Event</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#fff' },
    title: { fontSize: 24, fontWeight: '800', color: '#1e293b' },
    addBtn: { backgroundColor: '#6366f1', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    addBtnText: { color: '#fff', fontWeight: '700' },
    eventCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
    eventDate: { width: 50, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: '#f1f5f9', marginRight: 16 },
    month: { fontSize: 12, fontWeight: '700', color: '#6366f1', textTransform: 'uppercase' },
    day: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    eventSub: { fontSize: 13, color: '#64748b' },
    alertBadge: { fontSize: 11, color: '#ef4444', fontWeight: '600', marginTop: 6 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40 },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    closeBtn: { color: '#6366f1', fontWeight: '600' },
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
    subLabel: { fontSize: 12, color: '#64748b', marginBottom: 0 },
    input: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', color: '#1e293b' },
    visibilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
    visibilityBtn: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    visibilityBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    visIcon: { fontSize: 20, marginBottom: 4 },
    visLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    visLabelActive: { color: '#3b82f6' },
    alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 32 },
    submitBtn: { backgroundColor: '#6366f1', borderRadius: 14, padding: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
