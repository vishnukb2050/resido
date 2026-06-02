import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, Dimensions, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { useAuthStore } from '../store/authStore';
import { businessApi, communityApi, unpackBusinessProfileList } from '../services/api';
import { getThemeColors } from '../utils/theme';

const { width } = Dimensions.get('window');

interface ParkingSlot {
    id: string;
    name: string;
    type: 'RESIDENT' | 'GUEST';
    assignedUnitId?: string;
    assignedUnitNumber?: string;
    assignedBlockId?: string;
    assignedBlockName?: string;
    assignedVehicle?: string;
}

interface ParkingBooking {
    id: string;
    slotId: string;
    slotName: string;
    memberId: string;
    residentName: string;
    unitInfo: string;
    vehicleNumber: string;
    startTime: string;
    endTime: string;
    status: 'BOOKED' | 'ACTIVE' | 'FREED';
    markedFreedAt?: string;
    autoFreed?: boolean;
}

export default function ParkingScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);

    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    
    // Core data state from Shadow Profile
    const [profile, setProfile] = useState<any>(null);
    const [slots, setSlots] = useState<ParkingSlot[]>([]);
    const [bookings, setBookings] = useState<ParkingBooking[]>([]);

    // Community Metadata
    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [members, setMembers] = useState<any[]>([]);

    // Tabs control based on role
    // Admin: 'slots' | 'assign' | 'bookings'
    // Resident: 'view' | 'history'
    // Security: 'security_view'
    const userRole = activeWorkspace?.role || 'RESIDENT';
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(userRole);
    const isSecurity = userRole === 'SECURITY_STAFF';
    const isResident = userRole === 'RESIDENT';

    const [adminTab, setAdminTab] = useState<'slots' | 'assign' | 'bookings'>('slots');
    const [residentTab, setResidentTab] = useState<'view' | 'history'>('view');

    // Admin state variables
    const [newSlotName, setNewSlotName] = useState('');
    const [newSlotType, setNewSlotType] = useState<'RESIDENT' | 'GUEST'>('RESIDENT');
    
    const [selectedSlotId, setSelectedSlotId] = useState('');
    const [selectedBlockId, setSelectedBlockId] = useState('');
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const [residentVehicle, setResidentVehicle] = useState('');

    // Resident state variables
    const [bookingGuestSlotId, setBookingGuestSlotId] = useState('');
    const [guestVehicleNumber, setGuestVehicleNumber] = useState('');
    const [bookingStartTime, setBookingStartTime] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Security state variables
    const [searchQuery, setSearchQuery] = useState('');

    // Load initial data
    useEffect(() => {
        if (activeWorkspace?.tenantId) {
            loadInitialData();
        }
    }, [activeWorkspace]);

    // Fetch units when selected block changes
    useEffect(() => {
        if (selectedBlockId) {
            fetchUnits(selectedBlockId);
        } else {
            setUnits([]);
        }
    }, [selectedBlockId]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            await Promise.all([
                fetchParkingProfile(),
                fetchBlocks(),
                fetchMembers()
            ]);
        } catch (error) {
            console.error('Failed to load initial parking data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParkingProfile = async () => {
        try {
            if (!activeWorkspace?.tenantId) return;
            const res = await businessApi.getProfiles({
                tenantId: activeWorkspace.tenantId,
                category: 'Community Parking'
            });
            const { items } = unpackBusinessProfileList(res.data);
            
            if (items && items.length > 0) {
                const p = items[0];
                setProfile(p);
                const wh = p.workingHours || {};
                const loadedSlots = wh.slots || [];
                const loadedBookings = wh.bookings || [];
                setSlots(loadedSlots);
                setBookings(loadedBookings);

                // Run auto free logic on loaded bookings
                await runAutoFree(p, loadedSlots, loadedBookings);
            } else {
                // If not found and role is admin, automatically create it!
                if (isAdmin) {
                    await initializeShadowProfile();
                } else {
                    setProfile(null);
                }
            }
        } catch (err) {
            console.error('Error fetching parking profile:', err);
        }
    };

    const initializeShadowProfile = async () => {
        if (!activeWorkspace) return;
        try {
            const { data: newProfile } = await businessApi.createProfile({
                businessName: activeWorkspace.tenantName + ' Parking',
                category: 'Community Parking',
                businessType: 'INDIVIDUAL',
                about: 'Community Parking slot and booking management for ' + activeWorkspace.tenantName,
                phone: user?.phone || '',
                email: user?.email || '',
                enableBooking: false,
                // Belt-and-suspenders: even though listProfiles now bypasses
                // the visibility filter when tenantId is set, marking the
                // shadow profile as PAN_INDIA keeps it discoverable from any
                // older client that still passes location-less filters.
                serviceAreaType: 'PAN_INDIA',
                workingHours: {
                    slots: [],
                    bookings: []
                }
            });
            setProfile(newProfile);
            setSlots([]);
            setBookings([]);
        } catch (e) {
            console.error('Failed to initialize parking shadow profile:', e);
            Alert.alert('Error', 'Failed to initialize parking slots workspace.');
        }
    };

    const fetchBlocks = async () => {
        try {
            const { data } = await communityApi.getBlocks();
            setBlocks(data || []);
            if (data && data.length > 0) {
                setSelectedBlockId(data[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch blocks:', e);
        }
    };

    const fetchUnits = async (blockId: string) => {
        try {
            const { data } = await communityApi.getUnits(blockId);
            setUnits(data || []);
            if (data && data.length > 0) {
                setSelectedUnitId(data[0].id);
            }
        } catch (e) {
            console.error('Failed to fetch units:', e);
        }
    };

    const fetchMembers = async () => {
        try {
            const { data } = await communityApi.getMembers();
            setMembers(data || []);
        } catch (e) {
            console.error('Failed to fetch members:', e);
        }
    };

    // Auto-free expired bookings
    const runAutoFree = async (currentProfile: any, currentSlots: ParkingSlot[], currentBookings: ParkingBooking[]) => {
        const now = new Date();
        let updated = false;
        const newBookings = currentBookings.map((b: any) => {
            if ((b.status === 'BOOKED' || b.status === 'ACTIVE') && new Date(b.endTime) < now) {
                updated = true;
                return { ...b, status: 'FREED', autoFreed: true };
            }
            return b;
        });

        if (updated) {
            try {
                const updatedWorkingHours = {
                    ...currentProfile.workingHours,
                    bookings: newBookings
                };
                await businessApi.updateProfile(currentProfile.id, {
                    workingHours: updatedWorkingHours
                });
                setBookings(newBookings);
            } catch (err) {
                console.error('Failed to update auto-freed bookings on backend:', err);
            }
        }
    };

    // --- Admin Operations ---

    const handleCreateSlot = async () => {
        if (!newSlotName.trim()) {
            Alert.alert('Validation Error', 'Please enter a slot name.');
            return;
        }
        if (!profile) return;

        // Check duplicate name
        if (slots.some(s => s.name.toLowerCase() === newSlotName.trim().toLowerCase())) {
            Alert.alert('Duplicate Slot', 'A slot with this name already exists.');
            return;
        }

        setActionLoading(true);
        try {
            const newSlot: ParkingSlot = {
                id: 'slot_' + Date.now(),
                name: newSlotName.trim(),
                type: newSlotType
            };
            const updatedSlots = [...slots, newSlot];
            const updatedWorkingHours = {
                ...profile.workingHours,
                slots: updatedSlots
            };
            await businessApi.updateProfile(profile.id, {
                workingHours: updatedWorkingHours
            });
            setSlots(updatedSlots);
            setNewSlotName('');
            Alert.alert('Success', `Parking slot "${newSlot.name}" created.`);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to create parking slot.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteSlot = async (slotId: string, slotName: string) => {
        if (!profile) return;
        Alert.alert(
            'Delete Slot',
            `Are you sure you want to delete slot "${slotName}"? All assignments for this slot will be lost.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const updatedSlots = slots.filter(s => s.id !== slotId);
                            // Also clear active bookings on this slot
                            const updatedBookings = bookings.map(b => 
                                b.slotId === slotId && (b.status === 'BOOKED' || b.status === 'ACTIVE') 
                                    ? { ...b, status: 'FREED' as const } 
                                    : b
                            );
                            const updatedWorkingHours = {
                                ...profile.workingHours,
                                slots: updatedSlots,
                                bookings: updatedBookings
                            };
                            await businessApi.updateProfile(profile.id, {
                                workingHours: updatedWorkingHours
                            });
                            setSlots(updatedSlots);
                            setBookings(updatedBookings);
                        } catch (err) {
                            console.error(err);
                            Alert.alert('Error', 'Failed to delete parking slot.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleAssignResidentSlot = async () => {
        if (!selectedSlotId) {
            Alert.alert('Validation Error', 'Please select a resident slot.');
            return;
        }
        if (!selectedBlockId || !selectedUnitId) {
            Alert.alert('Validation Error', 'Please select a block and unit.');
            return;
        }
        if (!residentVehicle.trim()) {
            Alert.alert('Validation Error', 'Please enter a vehicle registration number.');
            return;
        }
        if (!profile) return;

        setActionLoading(true);
        try {
            const blockName = blocks.find(b => b.id === selectedBlockId)?.name || 'Block';
            const unitNumber = units.find(u => u.id === selectedUnitId)?.number || 'Unit';

            const updatedSlots = slots.map(s => {
                if (s.id === selectedSlotId) {
                    return {
                        ...s,
                        assignedBlockId: selectedBlockId,
                        assignedBlockName: blockName,
                        assignedUnitId: selectedUnitId,
                        assignedUnitNumber: unitNumber,
                        assignedVehicle: residentVehicle.trim().toUpperCase()
                    };
                }
                return s;
            });

            const updatedWorkingHours = {
                ...profile.workingHours,
                slots: updatedSlots
            };

            await businessApi.updateProfile(profile.id, {
                workingHours: updatedWorkingHours
            });
            setSlots(updatedSlots);
            setResidentVehicle('');
            Alert.alert('Success', 'Resident slot assigned successfully.');
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to assign resident parking slot.');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Resident Operations ---

    const myMember = useMemo(() => {
        return members.find(m => m.id === activeWorkspace?.memberId || m.userId === user?.id);
    }, [members, activeWorkspace, user]);

    // The Member -> Unit mapping comes through `family.unit` (Member has no
    // direct unitId/unitNumber column). We prefer matching by stable `id`
    // and fall back to the display unit number for slots that were created
    // before assignedUnitId was being captured.
    const myUnitId = myMember?.family?.unit?.id;
    const myUnitNumber = myMember?.family?.unit?.number;

    const myAssignedSlots = useMemo(() => {
        if (!myUnitId && !myUnitNumber) return [];
        return slots.filter(s => {
            if (s.type !== 'RESIDENT') return false;
            if (myUnitId && s.assignedUnitId === myUnitId) return true;
            if (
                myUnitNumber &&
                s.assignedUnitNumber?.toLowerCase() === myUnitNumber.toLowerCase()
            ) return true;
            return false;
        });
    }, [slots, myUnitId, myUnitNumber]);

    const availableGuestSlots = useMemo(() => {
        // A guest slot is available if there is no overlapping reservation right now
        const now = new Date();
        return slots.filter(s => {
            if (s.type !== 'GUEST') return false;
            // Check if slot has a booking that is currently active
            const hasActiveBooking = bookings.some(b => 
                b.slotId === s.id && 
                (b.status === 'BOOKED' || b.status === 'ACTIVE') &&
                new Date(b.startTime) <= now &&
                new Date(b.endTime) >= now
            );
            return !hasActiveBooking;
        });
    }, [slots, bookings]);

    const handleBookGuestSlot = async () => {
        if (!bookingGuestSlotId) {
            Alert.alert('Validation Error', 'Please select a guest slot.');
            return;
        }
        if (!guestVehicleNumber.trim()) {
            Alert.alert('Validation Error', 'Please enter a vehicle registration number.');
            return;
        }
        if (!profile) return;

        const startTimeStr = bookingStartTime.toISOString();
        const endTime = dayjs(bookingStartTime).add(4, 'hour');
        const endTimeStr = endTime.toISOString();

        // Overlap verification
        const hasOverlap = bookings.some(b => 
            b.slotId === bookingGuestSlotId &&
            (b.status === 'BOOKED' || b.status === 'ACTIVE') &&
            !(dayjs(startTimeStr).isAfter(dayjs(b.endTime)) || endTime.isBefore(dayjs(b.startTime)))
        );

        if (hasOverlap) {
            Alert.alert('Overlap Warning', 'This slot is already booked for the selected 4-hour time window.');
            return;
        }

        setActionLoading(true);
        try {
            const guestSlot = slots.find(s => s.id === bookingGuestSlotId);
            const residentName = myMember?.profileName || myMember?.name || user?.name || 'Resident';
            const unitInfo = myMember?.unitNumber ? `Block ${myMember.unitBlockName || ''} - Unit ${myMember.unitNumber}` : 'N/A';

            const newBooking: ParkingBooking = {
                id: 'bk_' + Date.now(),
                slotId: bookingGuestSlotId,
                slotName: guestSlot?.name || 'Guest Slot',
                memberId: activeWorkspace?.memberId || 'N/A',
                residentName,
                unitInfo,
                vehicleNumber: guestVehicleNumber.trim().toUpperCase(),
                startTime: startTimeStr,
                endTime: endTimeStr,
                status: 'BOOKED'
            };

            const updatedBookings = [newBooking, ...bookings];
            const updatedWorkingHours = {
                ...profile.workingHours,
                bookings: updatedBookings
            };

            await businessApi.updateProfile(profile.id, {
                workingHours: updatedWorkingHours
            });
            setBookings(updatedBookings);
            setGuestVehicleNumber('');
            setBookingGuestSlotId('');
            Alert.alert('Success', `Slot booked successfully for guest from ${dayjs(startTimeStr).format('hh:mm A')} to ${endTime.format('hh:mm A')}.`);
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to book guest parking slot.');
        } finally {
            setActionLoading(false);
        }
    };

    // --- Security Operations ---

    const handleMarkFreed = async (bookingId: string) => {
        if (!profile) return;
        Alert.alert(
            'Mark Freed / Check-out',
            'Are you sure you want to release this guest slot early?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm Check-out',
                    onPress: async () => {
                        setActionLoading(true);
                        try {
                            const updatedBookings = bookings.map(b => 
                                b.id === bookingId 
                                    ? { ...b, status: 'FREED' as const, markedFreedAt: new Date().toISOString() } 
                                    : b
                            );
                            const updatedWorkingHours = {
                                ...profile.workingHours,
                                bookings: updatedBookings
                            };

                            await businessApi.updateProfile(profile.id, {
                                workingHours: updatedWorkingHours
                            });
                            setBookings(updatedBookings);
                            Alert.alert('Success', 'Guest slot released.');
                        } catch (err) {
                            console.error(err);
                            Alert.alert('Error', 'Failed to update slot status.');
                        } finally {
                            setActionLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // Filters for security overview list
    const filteredSlots = useMemo(() => {
        if (!searchQuery.trim()) return slots;
        const q = searchQuery.toLowerCase().trim();
        return slots.filter(s => {
            const matchesName = s.name.toLowerCase().includes(q);
            const matchesVehicle = s.assignedVehicle?.toLowerCase().includes(q);
            const matchesUnit = s.assignedUnitNumber?.toLowerCase().includes(q);
            const matchesBlock = s.assignedBlockName?.toLowerCase().includes(q);
            
            // Overlapping bookings details for Guest Slot search
            const activeBooking = bookings.find(b => b.slotId === s.id && (b.status === 'BOOKED' || b.status === 'ACTIVE'));
            const matchesBookingVehicle = activeBooking?.vehicleNumber?.toLowerCase().includes(q);
            const matchesBookingResident = activeBooking?.residentName?.toLowerCase().includes(q);

            return matchesName || matchesVehicle || matchesUnit || matchesBlock || matchesBookingVehicle || matchesBookingResident;
        });
    }, [slots, bookings, searchQuery]);

    const activeGuestBookingsForSecurity = useMemo(() => {
        const now = new Date();
        return bookings.filter(b => {
            const isPendingOrActive = b.status === 'BOOKED' || b.status === 'ACTIVE';
            return isPendingOrActive && new Date(b.endTime) >= now;
        });
    }, [bookings]);

    const myBookingsList = useMemo(() => {
        return bookings.filter(b => b.memberId === activeWorkspace?.memberId);
    }, [bookings, activeWorkspace]);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={{ marginTop: 12, color: theme.textMuted, fontWeight: '600' }}>Loading Parking Dashboard...</Text>
            </SafeAreaView>
        );
    }

    if (!profile && !isAdmin) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Community Parking</Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
                    <Ionicons name="car-sport" size={60} color={theme.primarySoft} />
                    <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary, marginTop: 20, textAlign: 'center' }}>Parking System Offline</Text>
                    <Text style={{ fontSize: 14, color: theme.textMuted, marginTop: 8, textAlign: 'center', lineHeight: 20 }}>
                        The Community Parking module has not been set up by the Administrator yet. Please contact the administrator.
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.borderSoft }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={theme.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Community Parking</Text>
                <TouchableOpacity onPress={loadInitialData} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color={theme.primary} />
                </TouchableOpacity>
            </View>

            {/* Main Tabs Gated by Role */}
            {isAdmin && (
                <View style={styles.tabRow}>
                    {(['slots', 'assign', 'bookings'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setAdminTab(tab)}
                            style={[styles.tabButton, adminTab === tab && { borderBottomColor: theme.primary }]}
                        >
                            <Text style={[styles.tabText, adminTab === tab ? { color: theme.primary, fontWeight: '700' } : { color: theme.textMuted }]}>
                                {tab === 'slots' ? 'Create Slots' : tab === 'assign' ? 'Assign Resident' : 'Guest Bookings'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {isResident && (
                <View style={styles.tabRow}>
                    {(['view', 'history'] as const).map(tab => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setResidentTab(tab)}
                            style={[styles.tabButton, residentTab === tab && { borderBottomColor: theme.primary }]}
                        >
                            <Text style={[styles.tabText, residentTab === tab ? { color: theme.primary, fontWeight: '700' } : { color: theme.textMuted }]}>
                                {tab === 'view' ? 'My Slots & Booking' : 'Booking History'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                
                {/* 1. ADMIN - CREATE SLOTS TAB */}
                {isAdmin && adminTab === 'slots' && (
                    <View style={styles.section}>
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Create Parking Slot</Text>
                            <TextInput
                                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                                value={newSlotName}
                                onChangeText={setNewSlotName}
                                placeholder="Enter Slot Name (e.g. R-101, Guest-A)"
                                placeholderTextColor={theme.textFaint}
                            />
                            
                            <Text style={[styles.label, { color: theme.textMuted, marginTop: 12 }]}>Slot Type</Text>
                            <View style={styles.typeSelectorRow}>
                                <TouchableOpacity
                                    onPress={() => setNewSlotType('RESIDENT')}
                                    style={[styles.typeButton, newSlotType === 'RESIDENT' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                >
                                    <Text style={[styles.typeButtonText, newSlotType === 'RESIDENT' ? { color: '#fff' } : { color: theme.textPrimary }]}>Resident Slot</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => setNewSlotType('GUEST')}
                                    style={[styles.typeButton, newSlotType === 'GUEST' && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                >
                                    <Text style={[styles.typeButtonText, newSlotType === 'GUEST' ? { color: '#fff' } : { color: theme.textPrimary }]}>Guest Slot</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: theme.primary }]} 
                                onPress={handleCreateSlot}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Create Slot</Text>}
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 24 }]}>Existing Slots ({slots.length})</Text>
                        {slots.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No slots created yet. Use the form above to add slots.</Text>
                        ) : (
                            slots.map(item => (
                                <View key={item.id} style={[styles.slotItemCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
                                    <View style={styles.slotDetails}>
                                        <Text style={[styles.slotName, { color: theme.textPrimary }]}>{item.name}</Text>
                                        <View style={[styles.badge, { backgroundColor: item.type === 'RESIDENT' ? '#eff6ff' : '#f0fdf4' }]}>
                                            <Text style={[styles.badgeText, { color: item.type === 'RESIDENT' ? '#1e40af' : '#166534' }]}>
                                                {item.type}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteSlot(item.id, item.name)} style={styles.deleteBtn}>
                                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* 2. ADMIN - ASSIGN RESIDENT TAB */}
                {isAdmin && adminTab === 'assign' && (
                    <View style={styles.section}>
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Assign Resident Parking</Text>
                            
                            <Text style={[styles.label, { color: theme.textMuted }]}>Select Resident Slot</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectScroll}>
                                {slots.filter(s => s.type === 'RESIDENT').map(s => {
                                    const isAssigned = !!s.assignedUnitNumber;
                                    const isSelected = selectedSlotId === s.id;
                                    return (
                                        <TouchableOpacity
                                            key={s.id}
                                            onPress={() => setSelectedSlotId(s.id)}
                                            style={[
                                                styles.pillOption,
                                                isSelected && { backgroundColor: theme.primary, borderColor: theme.primary },
                                                !isSelected && isAssigned && { backgroundColor: theme.surfaceMuted }
                                            ]}
                                        >
                                            <Text style={[
                                                styles.pillOptionText,
                                                isSelected ? { color: '#fff' } : { color: theme.textPrimary },
                                                !isSelected && isAssigned && { textDecorationLine: 'line-through', color: theme.textMuted }
                                            ]}>
                                                {s.name} {isAssigned && `(Unit ${s.assignedUnitNumber})`}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                                {slots.filter(s => s.type === 'RESIDENT').length === 0 && (
                                    <Text style={{ color: theme.textFaint, fontSize: 12 }}>No Resident Slots. Create some in Slots tab first.</Text>
                                )}
                            </ScrollView>

                            <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>Select Block</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectScroll}>
                                {blocks.map(b => (
                                    <TouchableOpacity
                                        key={b.id}
                                        onPress={() => setSelectedBlockId(b.id)}
                                        style={[styles.pillOption, selectedBlockId === b.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                    >
                                        <Text style={[styles.pillOptionText, selectedBlockId === b.id ? { color: '#fff' } : { color: theme.textPrimary }]}>
                                            {b.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>Select Unit</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectScroll}>
                                {units.map(u => (
                                    <TouchableOpacity
                                        key={u.id}
                                        onPress={() => setSelectedUnitId(u.id)}
                                        style={[styles.pillOption, selectedUnitId === u.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                    >
                                        <Text style={[styles.pillOptionText, selectedUnitId === u.id ? { color: '#fff' } : { color: theme.textPrimary }]}>
                                            Unit {u.number}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {units.length === 0 && (
                                    <Text style={{ color: theme.textFaint, fontSize: 12 }}>Please select a block with units.</Text>
                                )}
                            </ScrollView>

                            <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>Vehicle Number</Text>
                            <TextInput
                                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                                value={residentVehicle}
                                onChangeText={setResidentVehicle}
                                placeholder="Enter vehicle registration number (e.g. KA-01-MJ-1234)"
                                placeholderTextColor={theme.textFaint}
                            />

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: theme.primary, marginTop: 16 }]} 
                                onPress={handleAssignResidentSlot}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Assign Slot</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 3. ADMIN - BOOKINGS TAB */}
                {isAdmin && adminTab === 'bookings' && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Guest Bookings History ({bookings.length})</Text>
                        {bookings.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No bookings found.</Text>
                        ) : (
                            bookings.map(item => (
                                <View key={item.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft, marginBottom: 12 }]}>
                                    <View style={styles.bookingHeader}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>{item.slotName}</Text>
                                        <View style={[styles.badge, { backgroundColor: item.status === 'BOOKED' ? '#fef3c7' : item.status === 'ACTIVE' ? '#dbeafe' : '#f1f5f9' }]}>
                                            <Text style={[styles.badgeText, { color: item.status === 'BOOKED' ? '#d97706' : item.status === 'ACTIVE' ? '#1d4ed8' : '#475569' }]}>
                                                {item.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.bookingText, { color: theme.textMuted, marginTop: 8 }]}>Guest Vehicle: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.vehicleNumber}</Text></Text>
                                    <Text style={[styles.bookingText, { color: theme.textMuted }]}>Resident: {item.residentName} ({item.unitInfo})</Text>
                                    <Text style={[styles.bookingText, { color: theme.textMuted }]}>Duration: {dayjs(item.startTime).format('MMM DD, hh:mm A')} to {dayjs(item.endTime).format('hh:mm A')}</Text>
                                    {item.markedFreedAt && (
                                        <Text style={[styles.bookingText, { color: theme.primarySoft }]}>Freed early at: {dayjs(item.markedFreedAt).format('hh:mm A')}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* 4. RESIDENT - VIEW TAB */}
                {isResident && residentTab === 'view' && (
                    <View style={styles.section}>
                        {/* Resident assigned slot */}
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Assigned Parking</Text>
                        {myAssignedSlots.length === 0 ? (
                            <View style={[styles.infoBanner, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
                                <Ionicons name="information-circle-outline" size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                                <Text style={{ fontSize: 12, color: theme.textPrimary, flex: 1 }}>
                                    No Resident parking slot has been assigned to your unit yet. Please contact the administrator.
                                </Text>
                            </View>
                        ) : (
                            myAssignedSlots.map(s => (
                                <View key={s.id} style={[styles.slotItemCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
                                    <View>
                                        <Text style={[styles.slotName, { color: theme.textPrimary }]}>{s.name}</Text>
                                        <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Vehicle: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{s.assignedVehicle}</Text></Text>
                                    </View>
                                    <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}>
                                        <Text style={[styles.badgeText, { color: '#1d4ed8' }]}>Resident</Text>
                                    </View>
                                </View>
                            ))
                        )}

                        {/* Guest slot booking */}
                        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, marginTop: 24 }]}>
                            <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Book Guest Parking Slot</Text>
                            <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 12 }}>
                                Guests can be registered for a fixed duration of exactly 4 hours.
                            </Text>

                            <Text style={[styles.label, { color: theme.textMuted }]}>Select Available Guest Slot</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalSelectScroll}>
                                {availableGuestSlots.map(s => (
                                    <TouchableOpacity
                                        key={s.id}
                                        onPress={() => setBookingGuestSlotId(s.id)}
                                        style={[styles.pillOption, bookingGuestSlotId === s.id && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                                    >
                                        <Text style={[styles.pillOptionText, bookingGuestSlotId === s.id ? { color: '#fff' } : { color: theme.textPrimary }]}>
                                            {s.name}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                {availableGuestSlots.length === 0 && (
                                    <Text style={{ color: theme.textFaint, fontSize: 12 }}>No available guest slots at this moment.</Text>
                                )}
                            </ScrollView>

                            <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>Guest Vehicle Number</Text>
                            <TextInput
                                style={[styles.input, { borderColor: theme.border, color: theme.textPrimary }]}
                                value={guestVehicleNumber}
                                onChangeText={setGuestVehicleNumber}
                                placeholder="Enter guest vehicle registration number"
                                placeholderTextColor={theme.textFaint}
                            />

                            <Text style={[styles.label, { color: theme.textMuted, marginTop: 16 }]}>Start Time & Date</Text>
                            <TouchableOpacity style={[styles.input, { borderColor: theme.border, justifyContent: 'center' }]} onPress={() => setShowDatePicker(true)}>
                                <Text style={{ color: theme.textPrimary }}>{dayjs(bookingStartTime).format('YYYY-MM-DD hh:mm A')}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={bookingStartTime}
                                    mode="datetime"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) setBookingStartTime(selectedDate);
                                    }}
                                />
                            )}

                            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600', marginTop: 12 }}>
                                End Time (Auto-calculated): {dayjs(bookingStartTime).add(4, 'hour').format('YYYY-MM-DD hh:mm A')}
                            </Text>

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: theme.primary, marginTop: 16 }]} 
                                onPress={handleBookGuestSlot}
                                disabled={actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Book Slot</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* 5. RESIDENT - HISTORY TAB */}
                {isResident && residentTab === 'history' && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>My Guest Bookings History</Text>
                        {myBookingsList.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No bookings found under your unit.</Text>
                        ) : (
                            myBookingsList.map(item => (
                                <View key={item.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft, marginBottom: 12 }]}>
                                    <View style={styles.bookingHeader}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>{item.slotName}</Text>
                                        <View style={[styles.badge, { backgroundColor: item.status === 'BOOKED' ? '#fef3c7' : item.status === 'ACTIVE' ? '#dbeafe' : '#f1f5f9' }]}>
                                            <Text style={[styles.badgeText, { color: item.status === 'BOOKED' ? '#d97706' : item.status === 'ACTIVE' ? '#1d4ed8' : '#475569' }]}>
                                                {item.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.bookingText, { color: theme.textMuted, marginTop: 8 }]}>Guest Vehicle: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.vehicleNumber}</Text></Text>
                                    <Text style={[styles.bookingText, { color: theme.textMuted }]}>Duration: {dayjs(item.startTime).format('MMM DD, hh:mm A')} to {dayjs(item.endTime).format('hh:mm A')}</Text>
                                    {item.markedFreedAt && (
                                        <Text style={[styles.bookingText, { color: theme.primarySoft }]}>Released early at: {dayjs(item.markedFreedAt).format('hh:mm A')}</Text>
                                    )}
                                </View>
                            ))
                        )}
                    </View>
                )}

                {/* 6. SECURITY - SEARCH / MANAGEMENT VIEW */}
                {isSecurity && (
                    <View style={styles.section}>
                        {/* Search input */}
                        <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.borderSoft }]}>
                            <Ionicons name="search" size={20} color={theme.textMuted} />
                            <TextInput
                                style={[styles.searchInput, { color: theme.textPrimary }]}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                placeholder="Search by Slot, Vehicle, Unit, Block, Resident..."
                                placeholderTextColor={theme.textFaint}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close" size={20} color={theme.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Active guest bookings section */}
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary, marginTop: 16 }]}>Active Guest Bookings ({activeGuestBookingsForSecurity.length})</Text>
                        {activeGuestBookingsForSecurity.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.textMuted, marginBottom: 16 }]}>No active guest bookings currently.</Text>
                        ) : (
                            activeGuestBookingsForSecurity.map(item => (
                                <View key={item.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.borderSoft, marginBottom: 12 }]}>
                                    <View style={styles.bookingHeader}>
                                        <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>{item.slotName}</Text>
                                        <TouchableOpacity 
                                            style={[styles.actionBadgeBtn, { backgroundColor: '#fef2f2' }]} 
                                            onPress={() => handleMarkFreed(item.id)}
                                            disabled={actionLoading}
                                        >
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#ef4444' }}>Mark Freed</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <Text style={[styles.bookingText, { color: theme.textMuted, marginTop: 8 }]}>Vehicle Number: <Text style={{ fontWeight: '700', color: theme.textPrimary }}>{item.vehicleNumber}</Text></Text>
                                    <Text style={[styles.bookingText, { color: theme.textMuted }]}>Resident: {item.residentName} ({item.unitInfo})</Text>
                                    <Text style={[styles.bookingText, { color: theme.textMuted }]}>Time: {dayjs(item.startTime).format('hh:mm A')} - {dayjs(item.endTime).format('hh:mm A')}</Text>
                                </View>
                            ))
                        )}

                        {/* All Slots Searchable Grid */}
                        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>All Parking Slots ({filteredSlots.length})</Text>
                        {filteredSlots.length === 0 ? (
                            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No matching parking slots found.</Text>
                        ) : (
                            filteredSlots.map(s => {
                                // Find current active booking for guest slot
                                const now = new Date();
                                const activeBooking = s.type === 'GUEST' ? bookings.find(b => 
                                    b.slotId === s.id && 
                                    (b.status === 'BOOKED' || b.status === 'ACTIVE') &&
                                    new Date(b.endTime) >= now
                                ) : null;

                                return (
                                    <View key={s.id} style={[styles.slotItemCard, { backgroundColor: theme.surface, borderColor: theme.borderSoft, paddingVertical: 14 }]}>
                                        <View style={{ flex: 1 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[styles.slotName, { color: theme.textPrimary, marginRight: 8 }]}>{s.name}</Text>
                                                <View style={[styles.badge, { backgroundColor: s.type === 'RESIDENT' ? '#eff6ff' : '#f0fdf4' }]}>
                                                    <Text style={[styles.badgeText, { color: s.type === 'RESIDENT' ? '#1e40af' : '#166534', fontSize: 9 }]}>
                                                        {s.type}
                                                    </Text>
                                                </View>
                                            </View>
                                            
                                            {s.type === 'RESIDENT' ? (
                                                <View style={{ marginTop: 8 }}>
                                                    {s.assignedUnitNumber ? (
                                                        <>
                                                            <Text style={{ fontSize: 12, color: theme.textMuted }}>Assigned Unit: <Text style={{ color: theme.textPrimary, fontWeight: '600' }}>{s.assignedBlockName} - {s.assignedUnitNumber}</Text></Text>
                                                            <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>Vehicle: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{s.assignedVehicle}</Text></Text>
                                                        </>
                                                    ) : (
                                                        <Text style={{ fontSize: 12, color: theme.textFaint, fontStyle: 'italic' }}>Unassigned</Text>
                                                    )}
                                                </View>
                                            ) : (
                                                <View style={{ marginTop: 8 }}>
                                                    {activeBooking ? (
                                                        <>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444', marginRight: 6 }} />
                                                                <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: '700' }}>OCCUPIED</Text>
                                                            </View>
                                                            <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>Vehicle: <Text style={{ color: theme.textPrimary, fontWeight: '700' }}>{activeBooking.vehicleNumber}</Text></Text>
                                                            <Text style={{ fontSize: 12, color: theme.textMuted }}>Resident: {activeBooking.residentName} ({activeBooking.unitInfo})</Text>
                                                            <Text style={{ fontSize: 12, color: theme.textMuted }}>Until: {dayjs(activeBooking.endTime).format('hh:mm A')}</Text>
                                                        </>
                                                    ) : (
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 6 }} />
                                                            <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '700' }}>AVAILABLE</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'android' ? 40 : 16, backgroundColor: '#fff', borderBottomWidth: 1 },
    headerTitle: { fontSize: 16, fontWeight: '800' },
    backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    refreshBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    tabRow: { flexDirection: 'row', backgroundColor: '#fff' },
    tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontSize: 13, fontWeight: '600' },
    content: { flex: 1 },
    scrollContent: { padding: 20, paddingBottom: 60 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
    card: { padding: 18, borderRadius: 16, borderStyle: 'solid', borderWidth: 1, marginBottom: 16 },
    cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
    input: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 13, backgroundColor: '#fff', marginBottom: 12 },
    typeSelectorRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    typeButton: { flex: 1, height: 44, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
    typeButtonText: { fontSize: 13, fontWeight: '700' },
    submitBtn: { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    slotItemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
    slotDetails: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    slotName: { fontSize: 14, fontWeight: '800' },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '800' },
    deleteBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    emptyText: { fontSize: 13, textAlign: 'center', marginVertical: 30 },
    pillOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#fff', marginRight: 8, height: 36, justifyContent: 'center' },
    pillOptionText: { fontSize: 12, fontWeight: '600' },
    horizontalSelectScroll: { flexDirection: 'row', marginBottom: 16, paddingVertical: 4 },
    bookingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bookingText: { fontSize: 12, marginTop: 4, lineHeight: 16 },
    actionBadgeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    infoBanner: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, height: 48, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 13 },
});
