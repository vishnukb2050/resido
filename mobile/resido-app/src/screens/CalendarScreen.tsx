import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, StatusBar, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const CALENDAR_DATES = [
    // Previous month dates
    { date: 26, dots: [], otherMonth: true }, { date: 27, dots: [], otherMonth: true }, { date: 28, dots: [], otherMonth: true }, { date: 29, dots: [], otherMonth: true }, { date: 30, dots: [], otherMonth: true },
    // Current month dates
    { date: 1, dots: ['blue'], count: 1 }, { date: 2, dots: ['blue'], count: 1 },
    { date: 3, dots: ['green'], count: 1 }, { date: 4, dots: [] }, { date: 5, dots: ['orange'], count: 1 }, { date: 6, dots: ['blue'], count: 1 }, { date: 7, dots: ['green', 'orange', 'blue'], count: 3, active: true }, { date: 8, dots: ['blue'], count: 1 }, { date: 9, dots: [] },
    { date: 10, dots: ['orange'], count: 1 }, { date: 11, dots: [] }, { date: 12, dots: ['green'], count: 1 }, { date: 13, dots: ['blue'], count: 1 }, { date: 14, dots: ['orange', 'blue'], count: 2 }, { date: 15, dots: ['green'], count: 1 }, { date: 16, dots: [] },
    { date: 17, dots: ['green'], count: 1 }, { date: 18, dots: ['blue'], count: 1 }, { date: 19, dots: [] }, { date: 20, dots: ['orange'], count: 1 }, { date: 21, dots: ['blue', 'green'], count: 2 }, { date: 22, dots: [] }, { date: 23, dots: ['blue'], count: 1 },
    { date: 24, dots: ['green'], count: 1 }, { date: 25, dots: ['blue'], count: 1, label: 'Meeting' }, { date: 26, dots: [] }, { date: 27, dots: ['orange'], count: 1 }, { date: 28, dots: ['blue'], count: 1 }, { date: 29, dots: [] }, { date: 30, dots: [] },
    { date: 31, dots: ['blue'], count: 1 },
];

const EVENTS = [
    {
        id: '1',
        title: 'Grocery Shopping',
        time: '10:30 AM — 11:30 AM',
        location: 'Home',
        type: 'Personal',
        color: '#10b981',
        icon: 'basket-outline'
    },
    {
        id: '2',
        title: 'Team Stand-up Meeting',
        time: '1:00 PM — 1:30 PM',
        location: 'Google Meet',
        type: 'Group',
        color: '#3b82f6',
        icon: 'videocam-outline'
    },
    {
        id: '3',
        title: 'Community Clean-up Drive',
        time: '4:00 PM — 6:00 PM',
        location: 'Central Park',
        type: 'Community',
        color: '#f59e0b',
        icon: 'leaf-outline'
    }
];

export default function CalendarScreen() {
    const router = useRouter();
    const [view, setView] = useState('Month');

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#1e293b" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <TouchableOpacity style={styles.monthSelector}>
                        <Text style={styles.monthText}>May 2026</Text>
                        <Ionicons name="chevron-down" size={16} color="#1e293b" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                    <Text style={styles.subtitleText}>Month View</Text>
                </View>
                <View style={styles.headerIcons}>
                    <TouchableOpacity><Ionicons name="calendar-outline" size={24} color="#1e293b" /></TouchableOpacity>
                    <TouchableOpacity><Ionicons name="ellipsis-vertical" size={24} color="#1e293b" /></TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* View Toggles */}
                <View style={styles.viewToggleContainer}>
                    {['Day', 'Week', 'Month', 'Year'].map(item => (
                        <TouchableOpacity 
                            key={item} 
                            style={[styles.viewToggleButton, view === item && styles.viewToggleButtonActive]}
                            onPress={() => setView(item)}
                        >
                            <Text style={[styles.viewToggleText, view === item && styles.viewToggleTextActive]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarCard}>
                    <View style={styles.daysHeader}>
                        {DAYS.map(day => <Text key={day} style={styles.dayHeaderText}>{day}</Text>)}
                    </View>
                    <View style={styles.datesGrid}>
                        {CALENDAR_DATES.map((item, index) => (
                            <TouchableOpacity key={index} style={[styles.dateCell, item.active && styles.dateCellActive]}>
                                <Text style={[
                                    styles.dateNumber, 
                                    item.active && styles.dateNumberActive, 
                                    item.otherMonth && { color: '#cbd5e1' }
                                ]}>
                                    {item.date}
                                </Text>
                                <View style={styles.dotsContainer}>
                                    {item.dots.map((color, idx) => (
                                        <View key={idx} style={[styles.dot, { backgroundColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#10b981' : color === 'orange' ? '#f59e0b' : '#8b5cf6' }]} />
                                    ))}
                                </View>
                                {item.label && (
                                    <View style={styles.dateLabel}>
                                        <Text style={styles.dateLabelText}>{item.label}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Legend */}
                <View style={styles.legendContainer}>
                    <LegendItem color="#10b981" label="Personal" />
                    <LegendItem color="#3b82f6" label="Group" />
                    <LegendItem color="#f59e0b" label="Community" />
                    <LegendItem color="#8b5cf6" label="All-day / Reminder" />
                </View>

                {/* Events Section */}
                <View style={styles.eventsSection}>
                    <View style={styles.eventsHeader}>
                        <Text style={styles.eventsTitle}>Events on May 7, 2026</Text>
                        <Text style={styles.eventsCount}>3 Events</Text>
                    </View>

                    {EVENTS.map(event => (
                        <TouchableOpacity key={event.id} style={styles.eventCard}>
                            <View style={[styles.eventIndicator, { backgroundColor: event.color }]} />
                            <View style={styles.eventIconBox}>
                                <Ionicons name={event.icon as any} size={22} color={event.color} />
                            </View>
                            <View style={styles.eventInfo}>
                                <Text style={styles.eventTitleText}>{event.title}</Text>
                                <Text style={styles.eventTypeText}>{event.type}</Text>
                                
                                <View style={styles.eventDetailRow}>
                                    <View style={styles.detailItem}>
                                        <Ionicons name="time-outline" size={14} color="#94a3b8" />
                                        <Text style={styles.detailText}>{event.time}</Text>
                                    </View>
                                </View>
                                <View style={styles.eventDetailRow}>
                                    <View style={styles.detailItem}>
                                        <Ionicons name={event.id === '2' ? "videocam-outline" : "location-outline"} size={14} color="#94a3b8" />
                                        <Text style={styles.detailText}>{event.location}</Text>
                                    </View>
                                </View>
                            </View>
                            <TouchableOpacity><Ionicons name="ellipsis-vertical" size={20} color="#94a3b8" /></TouchableOpacity>
                        </TouchableOpacity>
                    ))}

                    <TouchableOpacity style={styles.viewFullDay}>
                        <Text style={styles.viewFullDayText}>View full day</Text>
                        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                    </TouchableOpacity>
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity style={styles.fab}>
                <Ionicons name="add" size={32} color="#fff" />
            </TouchableOpacity>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

function LegendItem({ color, label }: any) {
    return (
        <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, paddingTop: 65, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitleContainer: { alignItems: 'center' },
    monthSelector: { flexDirection: 'row', alignItems: 'center' },
    monthText: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    subtitleText: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
    headerIcons: { flexDirection: 'row', gap: 15 },
    content: { flex: 1, backgroundColor: '#fcfcfd' },
    
    viewToggleContainer: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, margin: 20, padding: 4 },
    viewToggleButton: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    viewToggleButtonActive: { backgroundColor: '#6366f1' },
    viewToggleText: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    viewToggleTextActive: { color: '#fff' },

    calendarCard: { backgroundColor: '#fff', padding: 15, marginHorizontal: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
    daysHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 15 },
    dayHeaderText: { fontSize: 12, fontWeight: '700', color: '#64748b', width: (width - 70) / 7, textAlign: 'center' },
    datesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dateCell: { width: (width - 70) / 7, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
    dateCellActive: { backgroundColor: '#f5f3ff', borderRadius: 12, borderWidth: 1, borderColor: '#6366f1' },
    dateNumber: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    dateNumberActive: { color: '#6366f1' },
    dotsContainer: { flexDirection: 'row', gap: 2, marginTop: 2 },
    dot: { width: 4, height: 4, borderRadius: 2 },
    dateLabel: { position: 'absolute', bottom: 4, backgroundColor: '#6366f1', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
    dateLabelText: { fontSize: 8, color: '#fff', fontWeight: '800' },

    legendContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, paddingHorizontal: 25, marginTop: 15, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { fontSize: 11, fontWeight: '600', color: '#64748b' },

    eventsSection: { marginTop: 30, paddingHorizontal: 20 },
    eventsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    eventsTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    eventsCount: { fontSize: 12, fontWeight: '700', color: '#6366f1' },
    
    eventCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    eventIndicator: { width: 4, height: '100%', borderRadius: 2, position: 'absolute', left: 0 },
    eventIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    eventInfo: { flex: 1 },
    eventTitleText: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    eventTypeText: { fontSize: 11, color: '#64748b', fontWeight: '700', marginBottom: 8 },
    eventDetailRow: { flexDirection: 'row', gap: 15, marginTop: 2 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

    viewFullDay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15 },
    viewFullDayText: { fontSize: 14, fontWeight: '800', color: '#6366f1' },

    fab: { position: 'absolute', bottom: 100, right: 20, width: 64, height: 64, borderRadius: 32, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 10 },
});
