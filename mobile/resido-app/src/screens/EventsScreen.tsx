import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../store/authStore';
import { communityApi, authApi, chatApi } from '../services/api';
import { getThemeColors } from '../utils/theme';

type ViewMode = 'day' | 'week' | 'month';

const AUDIENCE_OPTIONS = [
    { key: 'MEMBERS',   label: 'Members',   icon: 'people-circle-outline',   color: '#3b82f6' },
    { key: 'RESIDENTS', label: 'Residents',  icon: 'home-outline',            color: '#10b981' },
    { key: 'STAFF',     label: 'Staff',      icon: 'shield-checkmark-outline', color: '#f59e0b' },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINS  = ['00', '15', '30', '45'];

// ── Helpers ────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
    return d.toISOString().split('T')[0];
}

function getWeekRange(date: Date): { start: Date; end: Date } {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun
    const diff = d.getDate() - day;
    const start = new Date(d.setDate(diff));
    const end   = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
}

function getMonthRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end   = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return { start, end };
}

function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
}

function formatTime(h: string, m: string) {
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function eventTime(date: string) {
    const d = new Date(date);
    return formatTime(
        String(d.getHours()).padStart(2, '0'),
        String(d.getMinutes()).padStart(2, '0')
    );
}

// ── Component ──────────────────────────────────────────────────────────────

export default function EventsScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const isAdmin = !activeWorkspace || activeWorkspace?.role === 'APARTMENT_ADMIN';

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(toDateStr(today));
    const [viewMode, setViewMode]         = useState<ViewMode>('day');
    const [events, setEvents]             = useState<any[]>([]);
    const [markedDates, setMarkedDates]   = useState<any>({});
    const [loading, setLoading]           = useState(true);
    const [showAdd, setShowAdd]           = useState(false);
    const [saving, setSaving]             = useState(false);
    const [deleting, setDeleting]         = useState<string | null>(null);

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
        MEMBERS: false, RESIDENTS: false, STAFF: false,
    });
    const [timePickerFor, setTimePickerFor] = useState<'start' | 'end' | null>(null);

    // Sharing states for Personal Space (My Space)
    const [conversationsList, setConversationsList] = useState<any[]>([]);
    const [followingList, setFollowingList] = useState<any[]>([]);
    const [selectedConvs, setSelectedConvs] = useState<Record<string, boolean>>({});
    const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});

    // Backend already filters by role + audience; we only need to scope My Space
    // events to ones the user created or was directly invited to.
    const filteredEvents = React.useMemo(() => {
        if (!activeWorkspace) {
            return events.filter((e: any) => {
                const isCreator = e.createdBy === user?.id;
                const isShared = e.sharedWithIds && e.sharedWithIds.includes(user?.id || '');
                return isCreator || isShared;
            });
        }
        return events;
    }, [events, activeWorkspace, user?.id]);

    // ── WeekDays Resolver ──────────────────────────────────────────────────
    const weekDays = React.useMemo(() => {
        const current = new Date(selectedDate);
        const { start } = getWeekRange(current);
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [selectedDate]);

    // ── Fetch ──────────────────────────────────────────────────────────────

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        try {
            const memberId = activeWorkspace?.memberId || user?.id || '';
            const { data: fetched } = await communityApi.getEvents(memberId);
            const list: any[] = fetched || [];
            setEvents(list);

            const marks: any = {};
            list.forEach((ev: any) => {
                const d = toDateStr(new Date(ev.startDate));
                marks[d] = { marked: true, dotColor: theme.primary };
            });
            marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: theme.primary };
            setMarkedDates(marks);
        } catch (e) {
            console.error('Fetch events failed', e);
        } finally {
            setLoading(false);
        }
    }, [activeWorkspace?.memberId, user?.id, theme.primary, selectedDate]);

    useEffect(() => { fetchEvents(); }, [fetchEvents]);

    // Refresh on screen focus so audience changes from admin are reflected
    // immediately when residents/staff open the calendar.
    useFocusEffect(
        useCallback(() => {
            fetchEvents();
        }, [fetchEvents]),
    );

    useEffect(() => {
        if (!activeWorkspace && showAdd) {
            loadSharingData();
        }
    }, [activeWorkspace, showAdd]);

    const loadSharingData = async () => {
        try {
            const [convsRes, followRes] = await Promise.all([
                chatApi.getConversations(),
                authApi.getFollowing()
            ]);
            setConversationsList(convsRes?.data || []);
            setFollowingList(followRes?.data || []);
        } catch (error) {
            console.error('Failed to load MySpace sharing data:', error);
        }
    };

    // ── Calendar day press ─────────────────────────────────────────────────

    const handleDayPress = (day: any) => {
        const newDate = day.dateString;
        setSelectedDate(newDate);
        setViewMode('day');
        const marks = { ...markedDates };
        Object.keys(marks).forEach(k => {
            if (marks[k].selected) {
                marks[k] = { ...marks[k] };
                delete marks[k].selected;
                delete marks[k].selectedColor;
            }
        });
        marks[newDate] = { ...marks[newDate], selected: true, selectedColor: theme.primary };
        setMarkedDates(marks);
    };

    // ── Filter events by view ──────────────────────────────────────────────

    const visibleEvents = (() => {
        const base = new Date(selectedDate);
        if (viewMode === 'day') {
            return filteredEvents.filter(e => isSameDay(new Date(e.startDate), base));
        }
        if (viewMode === 'week') {
            const { start, end } = getWeekRange(base);
            return filteredEvents.filter(e => {
                const d = new Date(e.startDate);
                return d >= start && d <= new Date(end.setHours(23, 59, 59));
            });
        }
        // month
        const { start, end } = getMonthRange(base);
        return filteredEvents.filter(e => {
            const d = new Date(e.startDate);
            return d >= start && d <= new Date(end.setHours(23, 59, 59));
        });
    })();

    // ── Create ─────────────────────────────────────────────────────────────

    const handleCreate = async () => {
        if (!form.title.trim()) { Alert.alert('Required', 'Please enter an event title'); return; }
        
        const startDate = new Date(`${selectedDate}T${form.startHour}:${form.startMin}:00`);
        const endDate   = new Date(`${selectedDate}T${form.endHour}:${form.endMin}:00`);
        if (endDate <= startDate) { Alert.alert('Invalid Time', 'End time must be after start time'); return; }

        setSaving(true);
        try {
            const memberId = activeWorkspace?.memberId || user?.id || '';
            
            if (!activeWorkspace) {
                // My Space private or shared event
                const sharedWithIds = [
                    ...Object.entries(selectedConvs).filter(([, v]) => v).map(([k]) => k),
                    ...Object.entries(selectedUsers).filter(([, v]) => v).map(([k]) => k)
                ];

                await communityApi.createEvent({
                    title:       form.title.trim(),
                    description: form.description.trim(),
                    location:    form.location.trim(),
                    startDate:   startDate.toISOString(),
                    endDate:     endDate.toISOString(),
                    memberId,
                    audience:    [],
                    visibility:  sharedWithIds.length > 0 ? 'GROUPS' : 'PRIVATE',
                    sharedWithIds,
                });
            } else {
                const selectedAudiences = Object.entries(audience).filter(([, v]) => v).map(([k]) => k);
                if (selectedAudiences.length === 0) { Alert.alert('Required', 'Select at least one audience'); return; }

                await communityApi.createEvent({
                    title:       form.title.trim(),
                    description: form.description.trim(),
                    location:    form.location.trim(),
                    startDate:   startDate.toISOString(),
                    endDate:     endDate.toISOString(),
                    memberId,
                    audience:    selectedAudiences,
                    visibility:  'COMMUNITY',
                });
            }

            setShowAdd(false);
            setForm({ title: '', description: '', location: '', startHour: '10', startMin: '00', endHour: '11', endMin: '00' });
            setAudience({ MEMBERS: false, RESIDENTS: false, STAFF: false });
            setSelectedConvs({});
            setSelectedUsers({});
            fetchEvents();
            Alert.alert('✅ Event Created', 'Event added to your calendar successfully.');
        } catch { Alert.alert('Error', 'Failed to create event. Please try again.'); }
        finally { setSaving(false); }
    };

    // ── Delete ─────────────────────────────────────────────────────────────

    const handleDelete = (eventId: string, title: string) => {
        Alert.alert(
            'Delete Event',
            `Remove "${title}" from the calendar?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete', style: 'destructive',
                    onPress: async () => {
                        setDeleting(eventId);
                        try {
                            await communityApi.deleteEvent(eventId);
                            fetchEvents();
                        } catch { Alert.alert('Error', 'Could not delete event.'); }
                        finally { setDeleting(null); }
                    }
                }
            ]
        );
    };

    // ── View label ─────────────────────────────────────────────────────────

    const viewLabel = (() => {
        const d = new Date(selectedDate);
        if (viewMode === 'day') return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        if (viewMode === 'week') {
            const { start, end } = getWeekRange(d);
            return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        }
        return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    })();

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>
                        {activeWorkspace ? 'Community Calendar' : 'My Calendar'}
                    </Text>
                    <Text style={styles.headerSub}>
                        {activeWorkspace
                            ? (isAdmin ? 'Create & manage events' : 'View community events')
                            : 'Your personal events & reminders'}
                    </Text>
                </View>
                {isAdmin && (
                    <TouchableOpacity style={styles.createBtn} onPress={() => setShowAdd(true)}>
                        <Ionicons name="add" size={22} color="#fff" />
                    </TouchableOpacity>
                )}
                {!isAdmin && <View style={{ width: 44 }} />}
            </View>

            <FlatList
                data={loading ? [] : visibleEvents}
                keyExtractor={(item: any) => String(item.id)}
                renderItem={({ item }: { item: any }) => (
                    <View style={{ paddingHorizontal: 20 }}>
                        <EventCard
                            event={item}
                            isAdmin={isAdmin}
                            deleting={deleting === item.id}
                            onDelete={() => handleDelete(item.id, item.title)}
                            viewMode={viewMode}
                        />
                    </View>
                )}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
                ListHeaderComponent={
                    <View>
                {/* Calendar */}
                {viewMode === 'month' && (
                    <Calendar
                        theme={{
                            backgroundColor:            theme.background,
                            calendarBackground:         theme.background,
                            textSectionTitleColor:      '#94a3b8',
                            selectedDayBackgroundColor: theme.primary,
                            selectedDayTextColor:       '#ffffff',
                            todayTextColor:             theme.primary,
                                // Off-white background requires dark date numbers.
                                dayTextColor:               '#2D2445',
                                textDisabledColor:          'rgba(45, 36, 69, 0.35)',
                            dotColor:                   theme.primary,
                                monthTextColor:             '#2D2445',
                            arrowColor:                 theme.primary,
                        }}
                        markedDates={markedDates}
                        onDayPress={handleDayPress}
                        style={styles.calendar}
                    />
                )}

                {viewMode === 'week' && (
                    <View style={styles.weekCalendar}>
                        {weekDays.map(d => {
                            const dateStr = toDateStr(d);
                            const isSelected = dateStr === selectedDate;
                            const isTodayDate = dateStr === toDateStr(new Date());
                            const hasEvent = filteredEvents.some(e => toDateStr(new Date(e.startDate)) === dateStr);
                            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
                            const dayNum = d.getDate();
                            
                            return (
                                <TouchableOpacity
                                    key={dateStr}
                                    style={[
                                        styles.weekDayBtn,
                                        isSelected && [styles.weekDayBtnSelected, { backgroundColor: theme.primary }],
                                        isTodayDate && !isSelected && styles.weekDayBtnToday
                                    ]}
                                    onPress={() => {
                                        setSelectedDate(dateStr);
                                        const marks = { ...markedDates };
                                        Object.keys(marks).forEach(k => {
                                            if (marks[k].selected) {
                                                marks[k] = { ...marks[k] };
                                                delete marks[k].selected;
                                                delete marks[k].selectedColor;
                                            }
                                        });
                                        marks[dateStr] = { ...marks[dateStr], selected: true, selectedColor: theme.primary };
                                        setMarkedDates(marks);
                                    }}
                                >
                                    <Text style={[styles.weekDayName, isSelected && styles.weekDayNameSelected]}>
                                        {dayName}
                                    </Text>
                                    <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumSelected]}>
                                        {dayNum}
                                    </Text>
                                    {hasEvent && (
                                        <View style={[styles.weekDayDot, isSelected && styles.weekDayDotSelected, { backgroundColor: theme.primary }]} />
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {viewMode === 'day' && (
                    <View style={styles.daySelectorHeader}>
                        <TouchableOpacity
                            style={styles.dayArrowBtn}
                            onPress={() => {
                                const prev = new Date(selectedDate);
                                prev.setDate(prev.getDate() - 1);
                                const prevStr = toDateStr(prev);
                                setSelectedDate(prevStr);
                                const marks = { ...markedDates };
                                Object.keys(marks).forEach(k => {
                                    if (marks[k].selected) {
                                        marks[k] = { ...marks[k] };
                                        delete marks[k].selected;
                                        delete marks[k].selectedColor;
                                    }
                                });
                                marks[prevStr] = { ...marks[prevStr], selected: true, selectedColor: theme.primary };
                                setMarkedDates(marks);
                            }}
                        >
                            <Ionicons name="chevron-back" size={24} color="#fff" />
                        </TouchableOpacity>
                        
                        <View style={styles.daySelectorLabelContainer}>
                            <Text style={styles.daySelectorTitle}>
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' })}
                            </Text>
                            <Text style={styles.daySelectorSubtitle}>
                                {new Date(selectedDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={styles.dayArrowBtn}
                            onPress={() => {
                                const next = new Date(selectedDate);
                                next.setDate(next.getDate() + 1);
                                const nextStr = toDateStr(next);
                                setSelectedDate(nextStr);
                                const marks = { ...markedDates };
                                Object.keys(marks).forEach(k => {
                                    if (marks[k].selected) {
                                        marks[k] = { ...marks[k] };
                                        delete marks[k].selected;
                                        delete marks[k].selectedColor;
                                    }
                                });
                                marks[nextStr] = { ...marks[nextStr], selected: true, selectedColor: theme.primary };
                                setMarkedDates(marks);
                            }}
                        >
                            <Ionicons name="chevron-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* View Mode Tabs */}
                <View style={styles.viewTabs}>
                    {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                        <TouchableOpacity
                            key={mode}
                            style={[styles.viewTab, viewMode === mode && styles.viewTabActive]}
                            onPress={() => setViewMode(mode)}
                        >
                            <Text style={[styles.viewTabText, viewMode === mode && styles.viewTabTextActive]}>
                                {mode.charAt(0).toUpperCase() + mode.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Events List Header */}
                <View style={[styles.eventsSection, { paddingBottom: 0 }]}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={styles.dateChip}>
                            <Ionicons name="calendar" size={14} color="#3b82f6" />
                            <Text style={styles.dateChipText}>{viewLabel}</Text>
                        </View>
                        <Text style={styles.eventCountText}>
                            {visibleEvents.length} event{visibleEvents.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>
                    </View>
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color="#3b82f6" style={{ marginTop: 30 }} />
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBox}>
                                <Ionicons name="calendar-outline" size={36} color="#475569" />
                            </View>
                            <Text style={styles.emptyTitle}>
                                No events {viewMode === 'day' ? 'today' : `this ${viewMode}`}
                            </Text>
                            <Text style={styles.emptyText}>
                                {isAdmin
                                    ? 'Tap + to create a new event'
                                    : `No events scheduled for this ${viewMode}`}
                            </Text>
                            {isAdmin && (
                                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
                                    <Ionicons name="add-circle" size={16} color="#fff" />
                                    <Text style={styles.emptyAddBtnText}>Create Event</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                }
                contentContainerStyle={{ paddingBottom: 20 }}
            />

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
                            <Text style={styles.fieldLabel}>Event Title *</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Annual General Meeting"
                                placeholderTextColor="#475569"
                                value={form.title}
                                onChangeText={t => setForm({ ...form, title: t })}
                            />

                            <Text style={styles.fieldLabel}>Location</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Community Hall, Block A"
                                placeholderTextColor="#475569"
                                value={form.location}
                                onChangeText={t => setForm({ ...form, location: t })}
                            />

                            <View style={styles.timeRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.fieldLabel}>Start Time</Text>
                                    <TouchableOpacity style={styles.timePicker} onPress={() => setTimePickerFor('start')}>
                                        <Ionicons name="time-outline" size={16} color="#3b82f6" />
                                        <Text style={styles.timePickerText}>{formatTime(form.startHour, form.startMin)}</Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.fieldLabel}>End Time</Text>
                                    <TouchableOpacity style={styles.timePicker} onPress={() => setTimePickerFor('end')}>
                                        <Ionicons name="time-outline" size={16} color="#3b82f6" />
                                        <Text style={styles.timePickerText}>{formatTime(form.endHour, form.endMin)}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <Text style={styles.fieldLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Add event details, agenda, or notes..."
                                placeholderTextColor="#475569"
                                multiline
                                value={form.description}
                                onChangeText={t => setForm({ ...form, description: t })}
                            />

                            {!activeWorkspace ? (
                                <>
                                    <Text style={styles.fieldLabel}>Share with Chat Groups</Text>
                                    <Text style={styles.fieldHint}>Select conversations to share this event with</Text>
                                    {conversationsList.length === 0 ? (
                                        <Text style={styles.noSharingText}>No active conversations found</Text>
                                    ) : (
                                        conversationsList.map(conv => {
                                            const isSelected = !!selectedConvs[conv.id];
                                            return (
                                                <TouchableOpacity
                                                    key={conv.id}
                                                    style={[styles.audienceRow, isSelected && { borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.08)' }]}
                                                    onPress={() => setSelectedConvs(prev => ({ ...prev, [conv.id]: !prev[conv.id] }))}
                                                >
                                                    <View style={[styles.audienceIconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                                                        <Ionicons name="chatbubbles-outline" size={20} color="#8b5cf6" />
                                                    </View>
                                                    <Text style={[styles.audienceLabel, isSelected && { color: '#2D2445' }]} numberOfLines={1}>
                                                        {conv.name || 'Chat Group'}
                                                    </Text>
                                                    <View style={[styles.checkBox, isSelected && { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }]}>
                                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}

                                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Share with Profiles</Text>
                                    <Text style={styles.fieldHint}>Select followed profiles to share this event with</Text>
                                    {followingList.length === 0 ? (
                                        <Text style={styles.noSharingText}>You are not following anyone yet</Text>
                                    ) : (
                                        followingList.map(profile => {
                                            const isSelected = !!selectedUsers[profile.id];
                                            return (
                                                <TouchableOpacity
                                                    key={profile.id}
                                                    style={[styles.audienceRow, isSelected && { borderColor: '#c084fc', backgroundColor: 'rgba(192, 132, 252, 0.08)' }]}
                                                    onPress={() => setSelectedUsers(prev => ({ ...prev, [profile.id]: !prev[profile.id] }))}
                                                >
                                                    <View style={[styles.audienceIconBox, { backgroundColor: 'rgba(192, 132, 252, 0.15)' }]}>
                                                        <Ionicons name="person-outline" size={20} color="#c084fc" />
                                                    </View>
                                                    <Text style={[styles.audienceLabel, isSelected && { color: '#2D2445' }]} numberOfLines={1}>
                                                        {profile.name || profile.profileName || 'Followed User'}
                                                    </Text>
                                                    <View style={[styles.checkBox, isSelected && { backgroundColor: '#c084fc', borderColor: '#c084fc' }]}>
                                                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })
                                    )}
                                </>
                            ) : (
                                <>
                                    <Text style={styles.fieldLabel}>Assign To *</Text>
                                    <Text style={styles.fieldHint}>
                                        Pick at least one role. Only ticked roles will see this
                                        event — others in the community won&apos;t.
                                    </Text>
                                    {AUDIENCE_OPTIONS.map(opt => (
                                        <TouchableOpacity
                                            key={opt.key}
                                            style={[styles.audienceRow, audience[opt.key] && { borderColor: opt.color, backgroundColor: `${opt.color}15` }]}
                                            onPress={() => setAudience(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
                                        >
                                            <View style={[styles.audienceIconBox, { backgroundColor: `${opt.color}20` }]}>
                                                <Ionicons name={opt.icon as any} size={20} color={opt.color} />
                                            </View>
                                            <Text style={[styles.audienceLabel, audience[opt.key] && { color: '#2D2445' }]}>{opt.label}</Text>
                                            <View style={[styles.checkBox, audience[opt.key] && { backgroundColor: opt.color, borderColor: opt.color }]}>
                                                {audience[opt.key] && <Ionicons name="checkmark" size={14} color="#fff" />}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </>
                            )}

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

            {/* Time Picker Sheet */}
            <Modal visible={!!timePickerFor} transparent animationType="slide" onRequestClose={() => setTimePickerFor(null)}>
                <View style={styles.timeSheetOverlay}>
                    <View style={styles.timeSheet}>
                        <Text style={styles.timeSheetTitle}>
                            Select {timePickerFor === 'start' ? 'Start' : 'End'} Time
                        </Text>
                        <View style={styles.timeColumns}>
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

// ── EventCard ──────────────────────────────────────────────────────────────

const EventCard = React.memo(function EventCard({ event, isAdmin, deleting, onDelete, viewMode }: any) {
    const start = eventTime(event.startDate);
    const end   = event.endDate ? eventTime(event.endDate) : null;
    const audiences: string[] = event.audience || [];
    const eventDate = new Date(event.startDate);

    return (
        <View style={styles.eventCard}>
            <View style={styles.eventAccent} />
            <View style={styles.eventContent}>
                <View style={styles.eventTopRow}>
                    <View style={{ flex: 1 }}>
                        {/* Show date label in week/month view */}
                        {viewMode !== 'day' && (
                            <Text style={styles.eventDateLabel}>
                                {eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </Text>
                        )}
                        <Text style={styles.eventTitle}>{event.title}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={styles.eventTimeBadge}>
                            <Ionicons name="time-outline" size={12} color="#3b82f6" />
                            <Text style={styles.eventTimeBadgeText}>{start}</Text>
                        </View>
                        {isAdmin && (
                            <TouchableOpacity
                                onPress={onDelete}
                                disabled={deleting}
                                style={styles.deleteBtn}
                            >
                                {deleting
                                    ? <ActivityIndicator size={14} color="#ef4444" />
                                    : <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                }
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {!!event.description && (
                    <Text style={styles.eventDesc} numberOfLines={2}>{event.description}</Text>
                )}

                <View style={styles.eventMeta}>
                    {!!event.location && (
                        <View style={styles.metaItem}>
                            <Ionicons name="location-outline" size={13} color="#64748b" />
                            <Text style={styles.metaText}>{event.location}</Text>
                        </View>
                    )}
                    {end && (
                        <View style={styles.metaItem}>
                            <Ionicons name="hourglass-outline" size={13} color="#64748b" />
                            <Text style={styles.metaText}>Ends {end}</Text>
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
});

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, gap: 12 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#2D2445' },
    headerSub: { fontSize: 11, color: '#64748b', fontWeight: '600', marginTop: 2 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    createBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },

    calendar: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },

    // View mode tabs
    viewTabs: { flexDirection: 'row', marginHorizontal: 20, marginTop: 16, marginBottom: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    viewTab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    viewTabActive: { backgroundColor: '#8b5cf6' },
    viewTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    viewTabTextActive: { color: '#2D2445', fontWeight: '900' },

    weekCalendar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 20,
        padding: 10,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    weekDayBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 12,
        marginHorizontal: 2,
    },
    weekDayBtnSelected: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    weekDayBtnToday: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    weekDayName: {
        fontSize: 10,
        fontWeight: '700',
        color: '#64748b',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    weekDayNameSelected: {
        color: '#2D2445',
        fontWeight: '900',
    },
    weekDayNum: {
        fontSize: 15,
        fontWeight: '800',
        color: '#2D2445',
    },
    weekDayNumSelected: {
        fontWeight: '900',
    },
    weekDayDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        marginTop: 4,
    },
    weekDayDotSelected: {
        backgroundColor: '#fff',
    },
    daySelectorHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        marginTop: 16,
        marginBottom: 8,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 20,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    dayArrowBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    daySelectorLabelContainer: {
        alignItems: 'center',
    },
    daySelectorTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#2D2445',
    },
    daySelectorSubtitle: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
        marginTop: 2,
    },

    eventsSection: { padding: 20 },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    dateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', flexShrink: 1 },
    dateChipText: { color: '#3b82f6', fontSize: 12, fontWeight: '700' },
    eventCountText: { fontSize: 12, color: '#64748b', fontWeight: '700', marginLeft: 8 },

    // Event card
    eventCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 14 },
    eventAccent: { width: 4, backgroundColor: '#3b82f6' },
    eventContent: { padding: 16, flex: 1 },
    eventTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
    eventDateLabel: { fontSize: 10, color: '#64748b', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    eventTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    eventTimeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(59,130,246,0.1)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    eventTimeBadgeText: { fontSize: 11, color: '#3b82f6', fontWeight: '700' },
    eventDesc: { fontSize: 13, color: '#64748b', marginBottom: 10, lineHeight: 18 },
    eventMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    audienceTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    audienceTag: { backgroundColor: 'rgba(59,130,246,0.1)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
    audienceTagText: { fontSize: 10, color: '#60a5fa', fontWeight: '800', textTransform: 'uppercase' },
    deleteBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(239,68,68,0.08)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.15)' },

    // Empty state
    emptyState: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20 },
    emptyIconBox: { width: 80, height: 80, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445', marginBottom: 8 },
    emptyText: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 20 },
    emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 20 },
    emptyAddBtnText: { color: '#2D2445', fontWeight: '800', fontSize: 14 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '92%' },
    modalHeader: { marginBottom: 24 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445' },
    modalSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 4 },
    modalClose: { position: 'absolute', right: 0, top: 0, padding: 4 },

    fieldLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 16 },
    fieldHint: { fontSize: 11, color: '#64748b', fontWeight: '600', marginBottom: 10, marginTop: -6 },
    noSharingText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '600',
        paddingVertical: 8,
        paddingHorizontal: 12,
        fontStyle: 'italic',
    },
    input: { backgroundColor: '#ffffff', borderRadius: 14, borderWidth: 1, borderColor: '#D4C9E8', color: '#2D2445', padding: 16, fontSize: 15, fontWeight: '600' },
    textArea: { height: 90, textAlignVertical: 'top' },

    timeRow: { flexDirection: 'row', gap: 0 },
    timePicker: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', borderRadius: 14, padding: 14 },
    timePickerText: { color: '#60a5fa', fontWeight: '800', fontSize: 15 },

    audienceRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    audienceIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    audienceLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#94a3b8' },
    checkBox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#3b82f6', borderRadius: 18, padding: 18, marginTop: 24, marginBottom: 8 },
    submitText: { color: '#2D2445', fontWeight: '900', fontSize: 16 },

    // Time sheet
    timeSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    timeSheet: { backgroundColor: '#1e293b', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: 400 },
    timeSheetTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445', textAlign: 'center', marginBottom: 20 },
    timeColumns: { flexDirection: 'row', height: 200 },
    timeCol: { flex: 1 },
    timeColDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 8 },
    timeOption: { padding: 14, borderRadius: 10, marginBottom: 4, alignItems: 'center' },
    timeOptionSelected: { backgroundColor: 'rgba(59,130,246,0.2)', borderWidth: 1, borderColor: '#3b82f6' },
    timeOptionText: { color: '#64748b', fontWeight: '700', fontSize: 15 },
    timeOptionTextSelected: { color: '#2D2445' },
    timeSheetDone: { backgroundColor: '#3b82f6', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 16 },
    timeSheetDoneText: { color: '#2D2445', fontWeight: '900', fontSize: 16 },
});
