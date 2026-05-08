import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { communityApi } from '../services/api';
import BottomNav from '../components/BottomNav';

const EVENT_TYPES = {
    PERSONAL: { color: '#10b981', label: 'Personal' },
    GROUP: { color: '#3b82f6', label: 'Group' },
    COMMUNITY: { color: '#f59e0b', label: 'Community' },
    REMINDER: { color: '#8b5cf6', label: 'All-day / Reminder' },
};

export default function CalendarScreen() {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const startOfMonth = selectedDate.startOf('month');
    const endOfMonth = selectedDate.endOf('month');
    const startDay = startOfMonth.day();
    const daysInMonth = selectedDate.daysInMonth();

    // Generate days grid
    const days = [];
    for (let i = 0; i < startDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(startOfMonth.date(i));

    useEffect(() => {
        fetchEvents();
    }, [selectedDate]);

    const fetchEvents = async () => {
        try {
            // Mocking events for now as per mockup
            const mockEvents = [
                { id: '1', title: 'Grocery Shopping', type: 'PERSONAL', time: '10:30 AM - 11:30 AM', location: 'Home', date: selectedDate.format('YYYY-MM-DD') },
                { id: '2', title: 'Team Stand-up Meeting', type: 'GROUP', time: '1:00 PM - 1:30 PM', location: 'Google Meet', date: selectedDate.format('YYYY-MM-DD') },
                { id: '3', title: 'Community Clean-up Drive', type: 'COMMUNITY', time: '4:00 PM - 6:00 PM', location: 'Central Park', date: selectedDate.format('YYYY-MM-DD') },
            ];
            setEvents(mockEvents);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
            <View style={styles.header}>
                <TouchableOpacity><Ionicons name="arrow-back" size={24} color="#1e293b" /></TouchableOpacity>
                <View style={styles.monthSelector}>
                    <Text style={styles.monthText}>{selectedDate.format('MMMM YYYY')}</Text>
                    <Ionicons name="chevron-down" size={20} color="#1e293b" />
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity><Ionicons name="calendar-outline" size={24} color="#1e293b" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
                </View>
            </View>

            <View style={styles.viewSelector}>
                <View style={styles.viewRow}>
                    <TouchableOpacity style={styles.viewBtn}><Text style={styles.viewBtnText}>Day</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.viewBtn}><Text style={styles.viewBtnText}>Week</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.viewBtn, styles.viewBtnActive]}><Text style={[styles.viewBtnText, styles.viewBtnTextActive]}>Month</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.viewBtn}><Text style={styles.viewBtnText}>Year</Text></TouchableOpacity>
                </View>
            </View>

            <View style={styles.calendarContainer}>
                {/* Weekdays */}
                <View style={styles.weekDaysRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <Text key={i} style={styles.weekDayText}>{d}</Text>
                    ))}
                </View>

                {/* Days Grid */}
                <View style={styles.daysGrid}>
                    {days.map((day, i) => (
                        <TouchableOpacity 
                            key={i} 
                            style={[
                                styles.dayCell, 
                                day && day.isSame(dayjs(), 'day') && styles.todayCell,
                                day && day.isSame(selectedDate, 'day') && styles.selectedDayCell
                            ]}
                            onPress={() => day && setSelectedDate(day)}
                        >
                            {day && (
                                <>
                                    <Text style={[
                                        styles.dayText,
                                        day.isSame(selectedDate, 'day') && styles.selectedDayText
                                    ]}>{day.date()}</Text>
                                    <View style={styles.dotsRow}>
                                        {i % 5 === 0 && <View style={[styles.dot, { backgroundColor: '#10b981' }]} />}
                                        {i % 7 === 0 && <View style={[styles.dot, { backgroundColor: '#3b82f6' }]} />}
                                        {i % 3 === 0 && <View style={[styles.dot, { backgroundColor: '#f59e0b' }]} />}
                                    </View>
                                </>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <LegendItem color="#10b981" label="Personal" />
                <LegendItem color="#3b82f6" label="Group" />
                <LegendItem color="#f59e0b" label="Community" />
                <LegendItem color="#8b5cf6" label="All-day / Reminder" />
            </View>

            {/* Events List */}
            <View style={styles.eventsHeader}>
                <Text style={styles.eventsTitle}>Events on {selectedDate.format('MMMM D, YYYY')}</Text>
                <Text style={styles.eventCount}>{events.length} Events</Text>
            </View>

            <FlatList
                data={events}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.eventsList}
                renderItem={({ item }) => (
                    <View style={styles.eventCard}>
                        <View style={[styles.eventBorder, { backgroundColor: EVENT_TYPES[item.type as keyof typeof EVENT_TYPES].color }]} />
                        <View style={[styles.eventIconBox, { backgroundColor: `${EVENT_TYPES[item.type as keyof typeof EVENT_TYPES].color}15` }]}>
                            <Ionicons 
                                name={item.type === 'COMMUNITY' ? 'business-outline' : item.type === 'GROUP' ? 'people-outline' : 'person-outline'} 
                                size={20} 
                                color={EVENT_TYPES[item.type as keyof typeof EVENT_TYPES].color} 
                            />
                        </View>
                        <View style={styles.eventInfo}>
                            <Text style={styles.eventTitle}>{item.title}</Text>
                            <Text style={styles.eventType}>{EVENT_TYPES[item.type as keyof typeof EVENT_TYPES].label}</Text>
                            <View style={styles.eventMeta}>
                                <Ionicons name="time-outline" size={14} color="#64748b" />
                                <Text style={styles.metaText}>{item.time}</Text>
                            </View>
                            <View style={styles.eventMeta}>
                                <Ionicons name="location-outline" size={14} color="#64748b" />
                                <Text style={styles.metaText}>{item.location}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.moreBtn}>
                            <Ionicons name="ellipsis-vertical" size={20} color="#64748b" />
                        </TouchableOpacity>
                    </View>
                )}
                ListFooterComponent={() => (
                    <TouchableOpacity style={styles.viewFullDay}>
                        <Text style={styles.viewFullDayText}>View full day</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                    </TouchableOpacity>
                )}
            />

            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>
            <BottomNav />
        </SafeAreaView>
    );
}

function LegendItem({ color, label }: any) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
    monthSelector: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    monthText: { fontSize: 22, fontWeight: '900', color: '#1e293b' },
    headerIcons: { flexDirection: 'row', gap: 20 },
    viewSelector: { paddingHorizontal: 20, marginBottom: 20 },
    viewRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
    viewBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
    viewBtnActive: { backgroundColor: '#6366f1' },
    viewBtnText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    viewBtnTextActive: { color: '#fff' },
    calendarContainer: { paddingHorizontal: 20, marginBottom: 20 },
    weekDaysRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    weekDayText: { width: '14.28%', textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
    selectedDayCell: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    todayCell: {},
    dayText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
    selectedDayText: { color: '#6366f1' },
    dotsRow: { flexDirection: 'row', gap: 3, marginTop: 4, height: 4 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, paddingHorizontal: 20, marginBottom: 25, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
    eventsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 15 },
    eventsTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    eventCount: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
    eventsList: { paddingHorizontal: 20, paddingBottom: 100 },
    eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', position: 'relative', overflow: 'hidden' },
    eventBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    eventIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eventInfo: { flex: 1, marginLeft: 16 },
    eventTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    eventType: { fontSize: 11, color: '#64748b', marginTop: 2, fontWeight: '600' },
    eventMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    metaText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    moreBtn: { padding: 4 },
    viewFullDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
    viewFullDayText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
    fab: { position: 'absolute', bottom: 30, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
});
