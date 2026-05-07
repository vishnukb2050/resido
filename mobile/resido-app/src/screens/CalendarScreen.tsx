import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, FlatList, TouchableOpacity, StyleSheet,
    Modal, TextInput, ScrollView, Alert, ActivityIndicator, Switch, Dimensions, SafeAreaView
} from 'react-native';
import { communityApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import { Ionicons } from '@expo/vector-icons';

dayjs.extend(isSameOrBefore);
dayjs.extend(isSameOrAfter);

const { width } = Dimensions.get('window');

const VIEW_MODES = ['Day', 'Week', 'Month', 'Year'];
const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
    const [viewMode, setViewMode] = useState('Month');
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [showCreate, setShowCreate] = useState(false);
    
    // Create Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [eventDate, setEventDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [eventTime, setEventTime] = useState(dayjs().format('HH:mm'));
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
            const start = dayjs(`${eventDate} ${eventTime}`);
            await communityApi.createEvent({
                title,
                description: desc,
                startDate: start.toDate(),
                endDate: start.add(1, 'hour').toDate(),
                visibility,
                hasAlert,
                alertTime: hasAlert ? start.subtract(30, 'minute').toDate() : null,
                memberId: user.id
            });
            setShowCreate(false);
            setTitle(''); setDesc(''); setVisibility('COMMUNITY'); setHasAlert(false);
            loadEvents();
        } catch (e) {
            Alert.alert('Error', 'Failed to create event');
        } finally {
            setSubmitting(false);
        }
    };

    const navigateDate = (direction: 'prev' | 'next') => {
        const unit = viewMode.toLowerCase() as any;
        if (direction === 'prev') setSelectedDate(selectedDate.subtract(1, unit));
        else setSelectedDate(selectedDate.add(1, unit));
    };

    const monthData = useMemo(() => {
        const startOfMonth = selectedDate.startOf('month');
        const endOfMonth = selectedDate.endOf('month');
        const startDay = startOfMonth.day();
        const daysInMonth = selectedDate.daysInMonth();
        
        const data = [];
        for (let i = 0; i < startDay; i++) data.push({ day: null });
        for (let i = 1; i <= daysInMonth; i++) {
            const date = startOfMonth.date(i);
            const dayEvents = events.filter(e => dayjs(e.startDate).isSame(date, 'day'));
            data.push({ day: i, date, events: dayEvents });
        }
        return data;
    }, [selectedDate, events]);

    const weekData = useMemo(() => {
        const startOfWeek = selectedDate.startOf('week');
        const data = [];
        for (let i = 0; i < 7; i++) {
            const date = startOfWeek.add(i, 'day');
            const dayEvents = events.filter(e => dayjs(e.startDate).isSame(date, 'day'));
            data.push({ date, events: dayEvents });
        }
        return data;
    }, [selectedDate, events]);

    const renderMonthView = () => (
        <View style={styles.viewContainer}>
            <View style={styles.weekHeader}>
                {DAYS_OF_WEEK.map(d => <Text key={d} style={styles.weekDayLabel}>{d}</Text>)}
            </View>
            <View style={styles.monthGrid}>
                {monthData.map((item, index) => (
                    <TouchableOpacity 
                        key={index} 
                        style={[styles.monthDay, item.date?.isSame(dayjs(), 'day') && styles.today]}
                        onPress={() => item.date && setSelectedDate(item.date)}
                    >
                        <Text style={[styles.dayText, item.date?.isSame(selectedDate, 'day') && styles.selectedDayText]}>
                            {item.day}
                        </Text>
                        {(item.events?.length ?? 0) > 0 && <View style={styles.eventDot} />}
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={events.filter(e => dayjs(e.startDate).isSame(selectedDate, 'month'))}
                renderItem={({ item }) => <EventCard item={item} />}
                ListHeaderComponent={<Text style={styles.subHeader}>Events in {selectedDate.format('MMMM')}</Text>}
                contentContainerStyle={{ padding: 20 }}
            />
        </View>
    );

    const renderWeekView = () => (
        <View style={styles.viewContainer}>
            <View style={styles.weekStrip}>
                {weekData.map((item, i) => (
                    <TouchableOpacity 
                        key={i} 
                        style={[styles.weekDayBtn, item.date.isSame(selectedDate, 'day') && styles.weekDayBtnActive]}
                        onPress={() => setSelectedDate(item.date)}
                    >
                        <Text style={styles.weekDayName}>{DAYS_OF_WEEK[i]}</Text>
                        <Text style={[styles.weekDayNum, item.date.isSame(selectedDate, 'day') && styles.weekDayNumActive]}>
                            {item.date.date()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
            <FlatList
                data={events.filter(e => dayjs(e.startDate).isSame(selectedDate, 'day'))}
                renderItem={({ item }) => <EventCard item={item} />}
                ListEmptyComponent={<Text style={styles.empty}>No events for this day</Text>}
                contentContainerStyle={{ padding: 20 }}
            />
        </View>
    );

    const renderDayView = () => {
        const dayEvents = events.filter(e => dayjs(e.startDate).isSame(selectedDate, 'day'));
        return (
            <ScrollView style={styles.viewContainer}>
                <View style={styles.dayTimeline}>
                    {Array.from({ length: 24 }).map((_, i) => (
                        <View key={i} style={styles.hourRow}>
                            <Text style={styles.hourLabel}>{dayjs().hour(i).format('HH:00')}</Text>
                            <View style={styles.hourLine}>
                                {dayEvents.filter(e => dayjs(e.startDate).hour() === i).map(e => (
                                    <View key={e.id} style={styles.timelineEvent}>
                                        <Text style={styles.timelineEventText}>{e.title}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>
        );
    };

    const renderYearView = () => (
        <ScrollView style={styles.viewContainer}>
            <View style={styles.yearGrid}>
                {Array.from({ length: 12 }).map((_, i) => {
                    const month = selectedDate.month(i);
                    const monthEvents = events.filter(e => dayjs(e.startDate).isSame(month, 'month'));
                    return (
                        <TouchableOpacity 
                            key={i} 
                            style={styles.yearMonthBox}
                            onPress={() => { setViewMode('Month'); setSelectedDate(month); }}
                        >
                            <Text style={styles.yearMonthName}>{month.format('MMM')}</Text>
                            <Text style={styles.yearEventCount}>{monthEvents.length} Events</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </ScrollView>
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.topHeader}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigateDate('prev')}>
                        <Ionicons name="chevron-back" size={24} color="#6366f1" />
                    </TouchableOpacity>
                    <View style={styles.dateDisplay}>
                        <Text style={styles.headerDate}>{selectedDate.format(viewMode === 'Year' ? 'YYYY' : 'MMMM YYYY')}</Text>
                        <Text style={styles.headerSub}>{viewMode} View</Text>
                    </View>
                    <TouchableOpacity onPress={() => navigateDate('next')}>
                        <Ionicons name="chevron-forward" size={24} color="#6366f1" />
                    </TouchableOpacity>
                </View>

                <View style={styles.viewSelector}>
                    {VIEW_MODES.map(m => (
                        <TouchableOpacity 
                            key={m} 
                            style={[styles.viewTab, viewMode === m && styles.viewTabActive]}
                            onPress={() => setViewMode(m)}
                        >
                            <Text style={[styles.viewTabText, viewMode === m && styles.viewTabTextActive]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1 }}>
                {viewMode === 'Month' && renderMonthView()}
                {viewMode === 'Week' && renderWeekView()}
                {viewMode === 'Day' && renderDayView()}
                {viewMode === 'Year' && renderYearView()}
            </View>

            {/* FAB */}
            <TouchableOpacity style={styles.fab} onPress={() => setShowCreate(true)}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            {/* Create Modal */}
            <Modal visible={showCreate} animationType="slide">
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Schedule Event</Text>
                        <TouchableOpacity onPress={() => setShowCreate(false)}>
                            <Ionicons name="close" size={28} color="#1e293b" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form}>
                        <Text style={styles.label}>Event Title</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What is happening?" placeholderTextColor="#94a3b8" />

                        <View style={styles.dateTimeRow}>
                            <View style={{ flex: 1, marginRight: 10 }}>
                                <Text style={styles.label}>Date</Text>
                                <TextInput style={styles.input} value={eventDate} onChangeText={setEventDate} placeholder="YYYY-MM-DD" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Time</Text>
                                <TextInput style={styles.input} value={eventTime} onChangeText={setEventTime} placeholder="HH:mm" />
                            </View>
                        </View>

                        <Text style={styles.label}>Description</Text>
                        <TextInput style={[styles.input, { height: 80 }]} value={desc} onChangeText={setDesc} placeholder="Additional details..." multiline placeholderTextColor="#94a3b8" />

                        <Text style={styles.label}>Visibility</Text>
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
                                <Text style={styles.label}>Set Alert</Text>
                                <Text style={styles.subLabel}>Get notified before the event starts</Text>
                            </View>
                            <Switch value={hasAlert} onValueChange={setHasAlert} trackColor={{ true: '#6366f1' }} />
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={submitting}>
                            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Schedule Event</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

function EventCard({ item }: { item: any }) {
    return (
        <View style={styles.eventCard}>
            <View style={[styles.cardAccent, { backgroundColor: item.visibility === 'COMMUNITY' ? '#6366f1' : '#10b981' }]} />
            <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{item.title}</Text>
                <View style={styles.eventMeta}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.eventSub}>{dayjs(item.startDate).format('MMM DD, HH:mm')}</Text>
                    <View style={styles.dot} />
                    <Text style={styles.eventVis}>{item.visibility}</Text>
                </View>
            </View>
            {item.hasAlert && <Ionicons name="notifications" size={20} color="#ef4444" />}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    topHeader: { backgroundColor: '#fff', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingTop: 20 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 },
    dateDisplay: { alignItems: 'center' },
    headerDate: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    headerSub: { fontSize: 12, color: '#6366f1', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    
    viewSelector: { flexDirection: 'row', paddingHorizontal: 20, gap: 10 },
    viewTab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
    viewTabActive: { backgroundColor: '#6366f1' },
    viewTabText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    viewTabTextActive: { color: '#fff' },

    viewContainer: { flex: 1 },
    weekHeader: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 15 },
    weekDayLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: '#94a3b8' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
    monthDay: { width: (width - 20) / 7, height: 60, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
    today: { backgroundColor: '#eff6ff', borderRadius: 12 },
    dayText: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    selectedDayText: { color: '#6366f1', fontWeight: '800' },
    eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#6366f1', marginTop: 4 },

    weekStrip: { flexDirection: 'row', padding: 20, gap: 10 },
    weekDayBtn: { flex: 1, alignItems: 'center', paddingVertical: 15, borderRadius: 16, backgroundColor: '#f8fafc' },
    weekDayBtnActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#3b82f6' },
    weekDayName: { fontSize: 12, color: '#94a3b8', marginBottom: 5 },
    weekDayNum: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
    weekDayNumActive: { color: '#3b82f6' },

    dayTimeline: { padding: 20 },
    hourRow: { flexDirection: 'row', height: 80 },
    hourLabel: { width: 60, fontSize: 12, color: '#94a3b8', paddingTop: 4 },
    hourLine: { flex: 1, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
    timelineEvent: { backgroundColor: '#6366f1', borderRadius: 8, padding: 8, marginBottom: 5 },
    timelineEventText: { color: '#fff', fontSize: 12, fontWeight: '600' },

    yearGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 20, gap: 15 },
    yearMonthBox: { width: (width - 60) / 2, backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, alignItems: 'center' },
    yearMonthName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    yearEventCount: { fontSize: 12, color: '#6366f1', marginTop: 5 },

    fab: { position: 'absolute', bottom: 30, right: 30, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    
    eventCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    cardAccent: { width: 5, height: '100%', borderRadius: 3, marginRight: 15 },
    eventInfo: { flex: 1 },
    eventTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 6 },
    eventMeta: { flexDirection: 'row', alignItems: 'center' },
    eventSub: { fontSize: 12, color: '#64748b', marginLeft: 4 },
    dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#cbd5e1', marginHorizontal: 8 },
    eventVis: { fontSize: 12, color: '#6366f1', fontWeight: '600' },

    modalContainer: { flex: 1, backgroundColor: '#fff' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    form: { padding: 20 },
    label: { fontSize: 14, fontWeight: '800', color: '#1e293b', marginBottom: 8, marginTop: 10 },
    subLabel: { fontSize: 12, color: '#64748b' },
    input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, color: '#1e293b', fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 5 },
    dateTimeRow: { flexDirection: 'row', marginTop: 10 },
    visibilityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
    visibilityBtn: { width: '48%', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
    visibilityBtnActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
    visIcon: { fontSize: 24, marginBottom: 5 },
    visLabel: { fontSize: 13, color: '#64748b', fontWeight: '700' },
    visLabelActive: { color: '#3b82f6' },
    alertRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, marginVertical: 30 },
    submitBtn: { backgroundColor: '#6366f1', borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 40 },
    submitText: { color: '#fff', fontSize: 18, fontWeight: '800' },
    subHeader: { fontSize: 15, fontWeight: '800', color: '#1e293b', marginBottom: 15, marginTop: 10 },
    empty: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
});
