import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, SafeAreaView, TouchableOpacity,
    Modal, TextInput, Alert, ScrollView, ActivityIndicator, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';
import { getThemeColors } from '../utils/theme';

const AUDIENCE_OPTIONS = [
    { key: 'MEMBERS',   label: 'Members',   icon: 'people-circle-outline',   color: '#3b82f6' },
    { key: 'RESIDENTS', label: 'Residents',  icon: 'home-outline',            color: '#10b981' },
    { key: 'STAFF',     label: 'Staff',      icon: 'shield-checkmark-outline', color: '#f59e0b' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINS  = ['00', '15', '30', '45'];

export default function EventsScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [events, setEvents] = useState<any[]>([]);
    const [markedDates, setMarkedDates] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [saving, setSaving] = useState(false);

    // Create event form state
    const [form, setForm] = useState({
        title: '',
        description: '',
        location: '',
        startHour: '10',
        startMin: '00',
        endHour: '11',
        endMin: '00',
    });
    const [audience, setAudience] = useState<Record<string, boolean>>({
        MEMBERS: true, RESIDENTS: true, STAFF: false,
    });

    // Time picker sheet state
    const [timePickerFor, setTimePickerFor] = useState<'start' | 'end' | null>(null);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        setLoading(true);
        try {
            const { data: fetchedEvents } = await communityApi.getEvents(user?.id || '');
            setEvents(fetchedEvents || []);

            const marks: any = {};
            (fetchedEvents || []).forEach((event: any) => {
                const date = new Date(event.startDate).toISOString().split('T')[0];
                marks[date] = { marked: true, dotColor: '#8b5cf6' };
            });
            marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#8b5cf6' };
            setMarkedDates(marks);
        } catch (e) {
            console.error('Fetch events failed', e);
        } finally {
            setLoading(false);
        }
    };

    const handleDayPress = (day: any) => {
        const newDate = day.dateString;
        setSelectedDate(newDate);
        const marks = { ...markedDates };
        Object.keys(marks).forEach(key => {
            if (marks[key].selected) {
                marks[key] = { ...marks[key] };
                delete marks[key].selected;
                delete marks[key].selectedColor;
            }
        });
        marks[newDate] = { ...marks[newDate], selected: true, selectedColor: '#8b5cf6' };
        setMarkedDates(marks);
    };

    const handleCreate = async () => {
        if (!form.title.trim()) {
            Alert.alert('Required', 'Please enter an event title');
            return;
        }
        const selectedAudiences = Object.entries(audience).filter(([, v]) => v).map(([k]) => k);
        if (selectedAudiences.length === 0) {
            Alert.alert('Required', 'Please select at least one audience');
            return;
        }

        const startDate = new Date(`${selectedDate}T${form.startHour}:${form.startMin}:00`);
        const endDate   = new Date(`${selectedDate}T${form.endHour}:${form.endMin}:00`);
        if (endDate <= startDate) {
            Alert.alert('Invalid Time', 'End time must be after start time');
            return;
        }

        setSaving(true);
        try {
            await communityApi.createEvent({
                title: form.title.trim(),
                description: form.description.trim(),
                location: form.location.trim(),
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                memberId: user?.id,
                audience: selectedAudiences,
            });
            setShowAdd(false);
            setForm({ title: '', description: '', location: '', startHour: '10', startMin: '00', endHour: '11', endMin: '00' });
            setAudience({ MEMBERS: true, RESIDENTS: true, STAFF: false });
            fetchEvents();
            Alert.alert('✅ Event Created', 'Event has been added to the community calendar.');
        } catch (e) {
            Alert.alert('Error', 'Failed to create event. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const selectedDayEvents = events.filter(
        e => new Date(e.startDate).toISOString().split('T')[0] === selectedDate
    );

    const formatTime = (h: string, m: string) => {
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Community Calendar</Text>
                    <Text style={styles.headerSub}>{isAdmin ? 'Create & manage events' : 'View community events'}</Text>
                </View>
                {isAdmin && (
                    <TouchableOpacity style={styles.createBtn} onPress={() => setShowAdd(true)}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                )}
                {!isAdmin && <View style={{ width: 44 }} />}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Calendar */}
                <Calendar
                    theme={{
                        backgroundColor: theme.background,
                        calendarBackground: theme.background,
                        textSectionTitleColor: '#94a3b8',
                        selectedDayBackgroundColor: '#8b5cf6',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#8b5cf6',
                        dayTextColor: '#fff',
                        textDisabledColor: 'rgba(255,255,255,0.15)',
                        dotColor: '#8b5cf6',
                        monthTextColor: '#fff',
                        arrowColor: '#8b5cf6',
                    }}
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    style={styles.calendar}
                />

                {/* Events for selected day */}
                <View style={styles.eventsSection}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.dateChip}>
                            <Ionicons name="calendar" size={14} color="#8b5cf6" />
                            <Text style={styles.dateChipText}>{selectedDate}</Text>
                        </View>
                        <Text style={styles.eventCountText}>
                            {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color="#8b5cf6" style={{ marginTop: 30 }} />
                    ) : selectedDayEvents.length > 0 ? (
                        selectedDayEvents.map((item: any) => (
                            <EventCard key={item.id} event={item} formatTime={formatTime} />
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="calendar-outline" size={36} color="#475569" />
                            </View>
                            <Text style={styles.emptyTitle}>No events today</Text>
                            <Text style={styles.emptyText}>
                                {isAdmin ? 'Tap + to create a new event for this date' : 'No events scheduled for this day'}
                            </Text>
                            {isAdmin && (
                                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
                                    <Ionicons name="add-circle" size={16} color="#fff" />
                                    <Text style={styles.emptyAddBtnText}>Create Event</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Create Event Modal */}
            <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Event</Text>
                            <Text style={styles.modalSubtitle}>📅 {selectedDate}</Text>
                            <TouchableOpacity onPress={() => setShowAdd(false)} style={styles.modalClose}>
                                <Ionicons name="close" size={22} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Title */}
                            <Text style={styles.fieldLabel}>Event Title *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Annual General Meeting"
                                placeholderTextColor="#475569"
                                value={form.title}
                                onChangeText={t => setForm({ ...form, title: t })}
                            />

                            {/* Location */}
                            <Text style={styles.fieldLabel}>Location</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Community Hall, Block A"
                                placeholderTextColor="#475569"
                                value={form.location}
                                onChangeText={t => setForm({ ...form, location: t })}
                            />

                            {/* Time Pickers */}
                            <View style={styles.timeRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Start Time</Text>
                                    <TouchableOpacity
                                        style={styles.timePicker}
                                        onPress={() => setTimePickerFor('start')}
                                    >
                                        <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                                        <Text style={styles.timePickerText}>
                                            {formatTime(form.startHour, form.startMin)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.fieldLabel}>End Time</Text>
                                    <TouchableOpacity
                                        style={styles.timePicker}
                                        onPress={() => setTimePickerFor('end')}
                                    >
                                        <Ionicons name="time-outline" size={16} color="#8b5cf6" />
                                        <Text style={styles.timePickerText}>
                                            {formatTime(form.endHour, form.endMin)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Description */}
                            <Text style={styles.fieldLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Add event details, agenda, or notes..."
                                placeholderTextColor="#475569"
                                multiline
                                value={form.description}
                                onChangeText={t => setForm({ ...form, description: t })}
                            />

                            {/* Audience Selection */}
                            <Text style={styles.fieldLabel}>Assign To</Text>
                            <Text style={styles.fieldHint}>Select who can view this event</Text>
                            {AUDIENCE_OPTIONS.map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.audienceRow,
                                        audience[opt.key] && { borderColor: opt.color, backgroundColor: `${opt.color}15` }
                                    ]}
                                    onPress={() => setAudience(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                >
                                    <View style={[styles.audienceIconBox, { backgroundColor: `${opt.color}20` }]}>
                                        <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                                    </View>
                                    <Text style={[styles.audienceLabel, audience[opt.key] && { color: '#fff' }]}>
                                        {opt.label}
                                    </Text>
                                    <View style={[
                                        styles.checkBox,
                                        audience[opt.key] && { backgroundColor: opt.color, borderColor: opt.color }
                                    ]}>
                                        {audience[opt.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                                    </View>
                                </TouchableOpacity>
                            ))}

                            {/* Submit */}
                            <TouchableOpacity
                                style={[styles.submitBtn, saving && { opacity: 0.7 }]}
                                onPress={handleCreate}
                                disabled={saving}
                            >
                                {saving
                                    ? <ActivityIndicator color="#fff" />
                                    : <>
                                        <Ionicons name="calendar-outline" size={18} color="#fff" />
                                        <Text style={styles.submitText}>Create Event</Text>
                                    </>
                                }
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Inline Time Picker Sheet */}
            <Modal
                visible={!!timePickerFor}
                transparent
                animationType="slide"
                onRequestClose={() => setTimePickerFor(null)}
            >
                <View style={styles.timeSheetOverlay}>
                    <View style={styles.timeSheet}>
                        <Text style={styles.timeSheetTitle}>
                            Select {timePickerFor === 'start' ? 'Start' : 'End'} Time
                        </Text>
                        <View style={styles.timeColumns}>
                            {/* Hour column */}
                            <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
                                {HOURS.map(h => {
                                    const isSelected = timePickerFor === 'start' ? form.startHour === h : form.endHour === h;
                                    return (
                                        <TouchableOpacity
                                            key={h}
                                            style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                                            onPress={() => {
                                                if (timePickerFor === 'start') setForm(f => ({ ...f, startHour: h }));
                                                else setForm(f => ({ ...f, endHour: h }));
                                            }}
                                        >
                                            <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                                                {parseInt(h) % 12 || 12} {parseInt(h) >= 12 ? 'PM' : 'AM'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                            <View style={styles.timeColDivider} />
                            {/* Minute column */}
                            <ScrollView style={styles.timeCol} showsVerticalScrollIndicator={false}>
                                {MINS.map(m => {
                                    const isSelected = timePickerFor === 'start' ? form.startMin === m : form.endMin === m;
                                    return (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.timeOption, isSelected && styles.timeOptionSelected]}
                                            onPress={() => {
                                                if (timePickerFor === 'start') setForm(f => ({ ...f, startMin: m }));
                                                else setForm(f => ({ ...f, endMin: m }));
                                            }}
                                        >
                                            <Text style={[styles.timeOptionText, isSelected && styles.timeOptionTextSelected]}>
                                                :{m}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                        <TouchableOpacity style={styles.timeSheetDone} onPress={() => setTimePickerFor(null)}>
                            <Text style={styles.timeSheetDoneText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function EventCard({ event, formatTime }: any) {
    const startTime = event.startDate
        ? formatTime(
            String(new Date(event.startDate).getHours()).padStart(2, '0'),
            String(new Date(event.startDate).getMinutes()).padStart(2, '0')
          )
        : '';
    const endTime = event.endDate
        ? formatTime(
            String(new Date(event.endDate).getHours()).padStart(2, '0'),
            String(new Date(event.endDate).getMinutes()).padStart(2, '0')
          )
        : '';

    const audiences: string[] = event.audience || [];

    return (
        <View style={styles.eventCard}>
            <View style={styles.eventAccent} />
            <View style={styles.eventContent}>
                <View style={styles.eventTopRow}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <View style={styles.eventTimeBadge}>
                        <Ionicons name="time-outline" size={12} color="#8b5cf6" />
                        <Text style={styles.eventTimeBadgeText}>{startTime}</Text>
                    </View>
                </View>
                {!!event.description && (
                    <Text style={styles.eventDesc}>{event.description}</Text>
                )}
                <View style={styles.eventMeta}>
                    {!!event.location && (
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={13} color="#64748b" />
                            <Text style={styles.metaText}>{event.location}</Text>
                        </View>
                    )}
                    {endTime && (
                        <View style={styles.metaItem}>
                            <Ionicons name="hourglass-outline" size={13} color="#64748b" />
                            <Text style={styles.metaText}>Ends {endTime}</Text>
                        </View>
                    )}
                </View>
                {audiences.length > 0 && (
                    <View style={styles.audienceTags}>
                        {audiences.map(a => (
                            <View key={a} style={styles.audienceTag}>
                                <Text style={styles.audienceTagText}>{a}</Text>
                            </View>
                        ))}
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16, gap: 12 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    headerSub: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    createBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },

    calendar: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },

    eventsSection: { padding: 20 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
    dateChipText: { color: '#8b5cf6', fontSize: 13, fontWeight: '700' },
    eventCountText: { fontSize: 12, color: '#64748b', fontWeight: '700' },

    eventCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 14 },
    eventAccent: { width: 4, backgroundColor: '#8b5cf6' },
    eventContent: { padding: 16, flex: 1 },
    eventTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
    eventTitle: { fontSize: 16, fontWeight: '800', color: '#fff', flex: 1, marginRight: 8 },
    eventTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(139,92,246,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    eventTimeBadgeText: { fontSize: 11, color: '#8b5cf6', fontWeight: '700' },
    eventDesc: { fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 18 },
    eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    audienceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    audienceTag: { backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(139,92,246,0.2)' },
    audienceTagText: { fontSize: 10, color: '#a78bfa', fontWeight: '800', textTransform: 'uppercase' },

    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 8 },
    emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#8b5cf6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
    emptyAddBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '92%' },
    modalHeader: { marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#fff' },
    modalSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 4 },
    modalClose: { position: 'absolute', right: 0, top: 0, padding: 4 },

    fieldLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
    fieldHint: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 10, marginTop: -6 },
    input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: 16, fontSize: 15, fontWeight: '600' },
    textArea: { height: 90, textAlignVertical: 'top' },

    timeRow: { flexDirection: 'row', gap: 0 },
    timePicker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(139,92,246,0.1)', borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)', borderRadius: 14, padding: 14 },
    timePickerText: { color: '#a78bfa', fontWeight: '800', fontSize: 15 },

    audienceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    audienceIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    audienceLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#94a3b8' },
    checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#8b5cf6', borderRadius: 18, padding: 18, marginTop: 24, marginBottom: 8 },
    submitText: { color: '#fff', fontWeight: '900', fontSize: 16 },

    // Time picker sheet
    timeSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    timeSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: 400 },
    timeSheetTitle: { fontSize: 18, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 20 },
    timeColumns: { flexDirection: 'row', height: 200 },
    timeCol: { flex: 1 },
    timeColDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 8 },
    timeOption: { padding: 14, borderRadius: 10, marginBottom: 4, alignItems: 'center' },
    timeOptionSelected: { backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: '#8b5cf6' },
    timeOptionText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
    timeOptionTextSelected: { color: '#fff' },
    timeSheetDone: { backgroundColor: '#8b5cf6', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
    timeSheetDoneText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
