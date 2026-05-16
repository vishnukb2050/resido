import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { useAuthStore } from '../store/authStore';
import { communityApi } from '../services/api';

export default function EventsScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [events, setEvents] = useState<any[]>([]);
    const [markedDates, setMarkedDates] = useState<any>({});
    const [showAdd, setShowAdd] = useState(false);
    
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '' });

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const { data: fetchedEvents } = await communityApi.getEvents(user?.id || '');
            setEvents(fetchedEvents);

            // Mark dates on calendar
            const marks: any = {};
            fetchedEvents.forEach((event: any) => {
                const date = new Date(event.startDate).toISOString().split('T')[0];
                marks[date] = { marked: true, dotColor: '#10b981' };
            });
            
            // Highlight selected date
            marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: '#10b981' };
            setMarkedDates(marks);
        } catch (e) {
            console.error('Fetch events failed', e);
        }
    };

    const handleDayPress = (day: any) => {
        setSelectedDate(day.dateString);
        const marks = { ...markedDates };
        // Reset old selection
        Object.keys(marks).forEach(key => {
            if (marks[key].selected) {
                delete marks[key].selected;
                delete marks[key].selectedColor;
            }
        });
        marks[day.dateString] = { ...marks[day.dateString], selected: true, selectedColor: '#10b981' };
        setMarkedDates(marks);
    };

    const handleCreate = async () => {
        if (!newEvent.title) return;
        try {
            await communityApi.createEvent({
                ...newEvent,
                startDate: new Date(selectedDate).toISOString(),
                endDate: new Date(selectedDate).toISOString(),
                memberId: user?.id,
            });
            setShowAdd(false);
            setNewEvent({ title: '', description: '', location: '' });
            fetchEvents();
            Alert.alert('Success', 'Event added to calendar!');
        } catch (e) {
            Alert.alert('Error', 'Failed to create event');
        }
    };

    const selectedDayEvents = events.filter(e => new Date(e.startDate).toISOString().split('T')[0] === selectedDate);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Calendar</Text>
                <View style={{ width: 44 }} />
            </View>

            <Calendar
                theme={{
                    backgroundColor: '#0f172a',
                    calendarBackground: '#0f172a',
                    textSectionTitleColor: '#94a3b8',
                    selectedDayBackgroundColor: '#10b981',
                    selectedDayTextColor: '#ffffff',
                    todayTextColor: '#10b981',
                    dayTextColor: '#fff',
                    textDisabledColor: 'rgba(255,255,255,0.1)',
                    dotColor: '#10b981',
                    monthTextColor: '#fff',
                    indicatorColor: '#10b981',
                    arrowColor: '#10b981',
                }}
                markedDates={markedDates}
                onDayPress={handleDayPress}
                style={styles.calendar}
            />

            <View style={styles.eventsSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Events on {selectedDate}</Text>
                    {isAdmin && (
                        <TouchableOpacity style={styles.smallAddBtn} onPress={() => setShowAdd(true)}>
                            <Ionicons name="add" size={20} color="#fff" />
                            <Text style={styles.smallAddText}>Create</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView contentContainerStyle={styles.eventList}>
                    {selectedDayEvents.length > 0 ? (
                        selectedDayEvents.map((item: any) => (
                            <View key={item.id} style={styles.eventCard}>
                                <View style={styles.eventAccent} />
                                <View style={styles.eventContent}>
                                    <Text style={styles.eventTitle}>{item.title}</Text>
                                    <Text style={styles.eventDesc}>{item.description}</Text>
                                    <View style={styles.eventLocation}>
                                        <Ionicons name="location" size={14} color="#10b981" />
                                        <Text style={styles.locationText}>{item.location || 'Community Hall'}</Text>
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No events scheduled for this day.</Text>
                        </View>
                    )}
                </ScrollView>
            </View>

            <Modal visible={showAdd} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Event for {selectedDate}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Event Title"
                            placeholderTextColor="#64748b"
                            value={newEvent.title}
                            onChangeText={(t) => setNewEvent({...newEvent, title: t})}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Location"
                            placeholderTextColor="#64748b"
                            value={newEvent.location}
                            onChangeText={(t) => setNewEvent({...newEvent, location: t})}
                        />
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description"
                            placeholderTextColor="#64748b"
                            multiline
                            value={newEvent.description}
                            onChangeText={(t) => setNewEvent({...newEvent, description: t})}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
                                <Text style={styles.submitText}>Add Event</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    calendar: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 10 },
    eventsSection: { flex: 1, padding: 20 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8' },
    smallAddBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10b981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, gap: 5 },
    smallAddText: { color: '#fff', fontWeight: '800', fontSize: 12 },
    eventList: { gap: 12 },
    eventCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    eventAccent: { width: 4, backgroundColor: '#10b981' },
    eventContent: { padding: 15, flex: 1 },
    eventTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 4 },
    eventDesc: { fontSize: 13, color: '#64748b', marginBottom: 8 },
    eventLocation: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    locationText: { fontSize: 12, color: '#10b981', fontWeight: '700' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 18, fontSize: 16, fontWeight: '600', marginBottom: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    modalActions: { flexDirection: 'row', gap: 15 },
    cancelBtn: { flex: 1, padding: 18, alignItems: 'center' },
    cancelText: { color: '#64748b', fontWeight: '700' },
    submitBtn: { flex: 2, backgroundColor: '#10b981', borderRadius: 16, padding: 18, alignItems: 'center' },
    submitText: { color: '#fff', fontWeight: '900' }
});
