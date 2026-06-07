import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, SectionList, ActivityIndicator, RefreshControl, Alert, Linking, StatusBar, Dimensions, Modal, TextInput, Image, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { businessApi, authApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';

const { width } = Dimensions.get('window');

// Per-profile per-day booking number → "0001"
const formatToken = (n?: number | null): string | null => {
    if (n === null || n === undefined || Number.isNaN(Number(n))) return null;
    return String(n).padStart(4, '0');
};

type TabKey = 'ACTIVE' | 'CANCELLED' | 'DETAILS';

type BookingCardProps = {
    booking: any;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onCall: (phone: string) => void;
    onCancel: (bookingId: string) => void;
    onOpenUpdate: (booking: any) => void;
    onDeleteUpdate: (bookingId: string, updateId: string) => void;
};

const BookingCard = React.memo(function BookingCard({
    booking,
    isExpanded,
    onToggleExpand,
    onCall,
    onCancel,
    onOpenUpdate,
    onDeleteUpdate,
}: BookingCardProps) {
    const token = formatToken(booking.tokenNumber);
    const updates: any[] = Array.isArray(booking.updates) ? booking.updates : [];
    const isConfirmed = booking.status === 'CONFIRMED';

    return (
        <View style={styles.bookingCard}>
            <View style={styles.cardHeader}>
                <View style={styles.slotBadge}>
                    <Ionicons name="bookmark-outline" size={14} color="#c084fc" style={{ marginRight: 6 }} />
                    <Text style={styles.slotNameText}>{booking.slot?.name || 'Service Slot'}</Text>
                </View>
                <View style={styles.guestBadge}>
                    <Ionicons name="people-outline" size={14} color="#64748b" style={{ marginRight: 4 }} />
                    <Text style={styles.guestText}>{booking.persons} {booking.persons === 1 ? 'Guest' : 'Guests'}</Text>
                </View>
            </View>

            {token && isConfirmed ? (
                <View style={styles.tokenStrip}>
                    <View style={styles.tokenChip}>
                        <Ionicons name="pricetag" size={14} color="#8b5cf6" style={{ marginRight: 6 }} />
                        <Text style={styles.tokenLabel}>Token</Text>
                        <Text style={styles.tokenValue}>#{token}</Text>
                    </View>
                </View>
            ) : null}

            <View style={styles.customerBox}>
                <Text style={styles.customerLabel}>Customer Details</Text>
                <Text style={styles.customerName}>{booking.userName || 'Resident'}</Text>
                {booking.userPhone ? (
                    <TouchableOpacity style={styles.phoneLink} onPress={() => onCall(booking.userPhone)}>
                        <Ionicons name="call-outline" size={14} color="#a084ca" style={{ marginRight: 4 }} />
                        <Text style={styles.phoneLinkText}>{booking.userPhone}</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.noPhoneText}>No phone number provided</Text>
                )}
            </View>

            <View style={styles.dateTimeGrid}>
                <View style={styles.dateTimeCol}>
                    <Text style={styles.gridLabel}>Date</Text>
                    <Text style={styles.gridValue}>
                        {new Date(booking.bookingDate).toLocaleDateString(undefined, {
                            weekday: 'short', month: 'short', day: 'numeric',
                        })}
                    </Text>
                </View>
                <View style={styles.dateTimeCol}>
                    <Text style={styles.gridLabel}>Time Window</Text>
                    <Text style={styles.gridValue}>{booking.timeSlot}</Text>
                </View>
            </View>

            {booking.notes ? (
                <View style={styles.notesBox}>
                    <Text style={styles.notesLabel}>Notes from Customer</Text>
                    <Text style={styles.notesText}>{booking.notes}</Text>
                </View>
            ) : null}

            {isConfirmed ? (
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.postUpdateBtn} onPress={() => onOpenUpdate(booking)}>
                        <Ionicons name="megaphone-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.postUpdateBtnText}>Post Update</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => onCancel(booking.id)}>
                        <Ionicons name="close-circle-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.cancelledBadge}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                    <Text style={styles.cancelledText}>Cancelled Reservation</Text>
                </View>
            )}

            {isConfirmed ? (
                <TouchableOpacity
                    style={styles.updatesToggle}
                    onPress={() => onToggleExpand(booking.id)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#8b5cf6"
                        style={{ marginRight: 6 }}
                    />
                    <Text style={styles.updatesToggleText}>
                        {updates.length > 0
                            ? `${isExpanded ? 'Hide' : 'View'} updates posted (${updates.length})`
                            : `${isExpanded ? 'Hide' : 'View'} updates posted`}
                    </Text>
                </TouchableOpacity>
            ) : null}

            {isConfirmed && isExpanded ? (
                <View style={styles.updatesBox}>
                    {updates.length === 0 ? (
                        <Text style={styles.updatesEmpty}>
                            No updates yet. Tap "Post Update" to share a status or photo with the customer.
                        </Text>
                    ) : (
                        updates.map((u) => {
                            const photo = resolveMediaUrl(u.photoUrl);
                            return (
                                <View key={u.id} style={styles.updateRow}>
                                    <View style={styles.updateHeader}>
                                        <Ionicons name="megaphone-outline" size={14} color="#8b5cf6" />
                                        <Text style={styles.updateAuthor}>You</Text>
                                        <Text style={styles.updateTime}>
                                            {new Date(u.createdAt).toLocaleString(undefined, {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => onDeleteUpdate(booking.id, u.id)}
                                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            style={{ marginLeft: 8 }}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                    {u.message ? <Text style={styles.updateMessage}>{u.message}</Text> : null}
                                    {photo ? (
                                        <Image source={{ uri: photo }} style={styles.updatePhoto} resizeMode="cover" />
                                    ) : null}
                                </View>
                            );
                        })
                    )}
                </View>
            ) : null}
        </View>
    );
});

export default function ManageBusinessBookingsScreen() {
    const router = useRouter();
    const { profileId } = useLocalSearchParams();

    const [bookings, setBookings] = useState<any[]>([]);
    const [profileName, setProfileName] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<TabKey>('ACTIVE');
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    // Post-update modal
    const [updateBooking, setUpdateBooking] = useState<any | null>(null);
    const [updateMessage, setUpdateMessage] = useState('');
    const [updatePhoto, setUpdatePhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [posting, setPosting] = useState(false);

    // Date filters state
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    useEffect(() => {
        if (profileId) {
            fetchData();
        }
    }, [profileId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const profileRes = await businessApi.getProfile(profileId as string);
            if (profileRes?.data) {
                setProfileName(profileRes.data.businessName);
            }
            const bookingsRes = await businessApi.getProfileBookings(profileId as string);
            setBookings(bookingsRes?.data || []);
        } catch (error) {
            console.error('Failed to fetch bookings:', error);
            Alert.alert('Error', 'Failed to retrieve bookings for this business profile.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleCallCustomer = (phone: string) => {
        if (!phone) {
            Alert.alert('Not Available', 'This customer did not provide a phone number.');
            return;
        }
        Linking.openURL(`tel:${phone}`).catch((err) => {
            console.error('Failed to open dialer:', err);
            Alert.alert('Error', 'Failed to open dialer on this device.');
        });
    };

    const handleCancelBooking = (bookingId: string) => {
        Alert.alert(
            'Cancel Booking',
            'Are you sure you want to cancel this customer reservation?',
            [
                { text: 'Keep Reservation', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await businessApi.cancelBooking(bookingId);
                            Alert.alert('Success', 'Booking cancelled successfully.');
                            await fetchData();
                        } catch (error: any) {
                            console.error('Failed to cancel booking:', error);
                            const msg = error.response?.data?.message || 'Failed to cancel reservation.';
                            Alert.alert('Error', msg);
                        } finally {
                            setLoading(false);
                        }
                    },
                },
            ],
        );
    };

    const toggleExpand = (id: string) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const openUpdateModal = (booking: any) => {
        setUpdateBooking(booking);
        setUpdateMessage('');
        setUpdatePhoto(null);
    };

    const closeUpdateModal = () => {
        if (posting) return;
        setUpdateBooking(null);
        setUpdateMessage('');
        setUpdatePhoto(null);
    };

    const pickUpdatePhoto = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission needed', 'Allow photo access to attach an image.');
                return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 0.7,
            });
            if (!result.canceled && result.assets && result.assets[0]) {
                setUpdatePhoto(result.assets[0]);
            }
        } catch (err) {
            console.error('Failed to pick image:', err);
            Alert.alert('Error', 'Could not open the photo library.');
        }
    };

    const uploadPhoto = async (asset: ImagePicker.ImagePickerAsset): Promise<string> => {
        const fileName = (asset.fileName as string) || `booking_update_${Date.now()}.jpg`;
        const contentType = (asset as any).mimeType || 'image/jpeg';
        const { data } = await authApi.getPresignedUrl(fileName, contentType, 'business-bookings');
        const fileRes = await fetch(asset.uri);
        const blob = await fileRes.blob();
        const putRes = await fetch(data.uploadUrl, {
            method: 'PUT',
            body: blob,
            headers: { 'Content-Type': contentType },
        });
        if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
        return data.fileUrl || data.key || data.uploadUrl.split('?')[0];
    };

    const submitUpdate = async () => {
        if (!updateBooking) return;
        const trimmed = updateMessage.trim();
        if (!trimmed && !updatePhoto) {
            Alert.alert('Nothing to post', 'Add a short message or attach a photo before posting.');
            return;
        }
        try {
            setPosting(true);
            let photoUrl: string | undefined;
            if (updatePhoto) {
                photoUrl = await uploadPhoto(updatePhoto);
            }
            await businessApi.addBookingUpdate(updateBooking.id, {
                message: trimmed || undefined,
                photoUrl,
            });
            // Reset modal state then refresh in the background
            setUpdateBooking(null);
            setUpdateMessage('');
            setUpdatePhoto(null);
            await fetchData();
            setExpandedIds((prev) => new Set(prev).add(updateBooking.id));
        } catch (err: any) {
            console.error('Failed to post update:', err);
            const msg = err?.response?.data?.message || err?.message || 'Failed to post the update.';
            Alert.alert('Could not post update', msg);
        } finally {
            setPosting(false);
        }
    };

    const handleDeleteUpdate = (bookingId: string, updateId: string) => {
        Alert.alert(
            'Delete update?',
            'The customer will no longer see this update.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await businessApi.deleteBookingUpdate(bookingId, updateId);
                            await fetchData();
                        } catch (err: any) {
                            console.error('Failed to delete update:', err);
                            const msg = err?.response?.data?.message || 'Failed to delete update.';
                            Alert.alert('Error', msg);
                        }
                    },
                },
            ],
        );
    };

    const filteredBookings = bookings.filter((b) => {
        if (activeTab === 'CANCELLED') {
            if (b.status !== 'CANCELLED') return false;
        } else {
            // ACTIVE and DETAILS both show confirmed bookings; DETAILS is just a
            // chronological roster view for the owner.
            if (b.status !== 'CONFIRMED') return false;
        }

        if (b.bookingDate) {
            const bDate = dayjs(b.bookingDate);
            if (startDate) {
                const start = dayjs(startDate).startOf('day');
                if (bDate.isBefore(start)) return false;
            }
            if (endDate) {
                const end = dayjs(endDate).endOf('day');
                if (bDate.isAfter(end)) return false;
            }
        }
        return true;
    });

    // Group bookings by date for the "Details" view so the owner can scan
    // the day's customers + token order at a glance.
    const detailsByDay = (() => {
        const map = new Map<string, any[]>();
        filteredBookings.forEach((b) => {
            const key = b.bookingDate || 'No date';
            const list = map.get(key) || [];
            list.push(b);
            map.set(key, list);
        });
        const days = Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
        days.forEach(([, list]) => {
            list.sort((a, b) => {
                const ta = a.tokenNumber ?? Number.MAX_SAFE_INTEGER;
                const tb = b.tokenNumber ?? Number.MAX_SAFE_INTEGER;
                return ta - tb;
            });
        });
        return days;
    })();

    if (loading && !refreshing) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#c084fc" />
                <Text style={styles.loadingText}>Loading Bookings...</Text>
            </View>
        );
    }

    const renderBookingCard = ({ item: booking }: { item: any }) => (
        <BookingCard
            booking={booking}
            isExpanded={expandedIds.has(booking.id)}
            onToggleExpand={toggleExpand}
            onCall={handleCallCustomer}
            onCancel={handleCancelBooking}
            onOpenUpdate={openUpdateModal}
            onDeleteUpdate={handleDeleteUpdate}
        />
    );

    const emptyList = (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons
                    name={
                        activeTab === 'DETAILS'
                            ? 'ticket-confirmation-outline'
                            : activeTab === 'ACTIVE'
                            ? 'calendar-blank'
                            : 'calendar-remove'
                    }
                    size={64}
                    color="#9A8EBA"
                />
            </View>
            <Text style={styles.emptyTitle}>
                {activeTab === 'DETAILS'
                    ? 'No Booking Details Yet'
                    : activeTab === 'ACTIVE'
                    ? 'No Active Reservations'
                    : 'No Cancelled Bookings'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {activeTab === 'DETAILS'
                    ? 'Confirmed customer bookings (with their token number, time and contact) will appear here organised by day.'
                    : activeTab === 'ACTIVE'
                    ? 'When customers book your services or slots, they will appear here instantly.'
                    : 'Bookings that are cancelled by you or your customers will be shown in this list.'}
            </Text>
        </View>
    );

    const listPerfProps = {
        removeClippedSubviews: true as const,
        initialNumToRender: 10,
        maxToRenderPerBatch: 10,
        windowSize: 11,
        extraData: expandedIds,
        contentContainerStyle: styles.scrollContent,
        refreshControl: (
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c084fc" />
        ),
        showsVerticalScrollIndicator: false,
        ListEmptyComponent: emptyList,
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>Manage Bookings</Text>
                    {profileName ? (
                        <Text style={styles.headerSubtitle} numberOfLines={1}>{profileName}</Text>
                    ) : null}
                </View>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'ACTIVE' && styles.activeTab]}
                    onPress={() => setActiveTab('ACTIVE')}
                >
                    <Ionicons name="calendar-outline" size={16} color={activeTab === 'ACTIVE' ? '#fff' : '#9A8EBA'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.activeTabText]}>Active</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'DETAILS' && styles.activeTab]}
                    onPress={() => setActiveTab('DETAILS')}
                >
                    <Ionicons name="list-outline" size={16} color={activeTab === 'DETAILS' ? '#fff' : '#9A8EBA'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'DETAILS' && styles.activeTabText]}>Booking Details</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'CANCELLED' && styles.activeTab]}
                    onPress={() => setActiveTab('CANCELLED')}
                >
                    <Ionicons name="close-circle-outline" size={16} color={activeTab === 'CANCELLED' ? '#fff' : '#9A8EBA'} style={{ marginRight: 6 }} />
                    <Text style={[styles.tabText, activeTab === 'CANCELLED' && styles.activeTabText]}>Cancelled</Text>
                </TouchableOpacity>
            </View>

            {/* Date range filter strip */}
            <View style={styles.filterDatesContainer}>
                <View style={styles.filterDatesRow}>
                    <TouchableOpacity style={styles.filterDateBtn} onPress={() => setShowStartPicker(true)}>
                        <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
                        <Text style={styles.filterDateText}>
                            {startDate ? dayjs(startDate).format('YYYY-MM-DD') : 'Start Date'}
                        </Text>
                        {startDate && (
                            <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setStartDate(null);
                                }}
                                style={{ marginLeft: 6 }}
                            >
                                <Ionicons name="close" size={14} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.filterDateBtn} onPress={() => setShowEndPicker(true)}>
                        <Ionicons name="calendar-outline" size={14} color="#8b5cf6" />
                        <Text style={styles.filterDateText}>
                            {endDate ? dayjs(endDate).format('YYYY-MM-DD') : 'End Date'}
                        </Text>
                        {endDate && (
                            <TouchableOpacity 
                                onPress={(e) => {
                                    e.stopPropagation();
                                    setEndDate(null);
                                }}
                                style={{ marginLeft: 6 }}
                            >
                                <Ionicons name="close" size={14} color="#ef4444" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Date Pickers Modals */}
            {showStartPicker && (
                <DateTimePicker
                    value={startDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        setShowStartPicker(false);
                        if (selectedDate) setStartDate(selectedDate);
                    }}
                />
            )}

            {showEndPicker && (
                <DateTimePicker
                    value={endDate || new Date()}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                        setShowEndPicker(false);
                        if (selectedDate) setEndDate(selectedDate);
                    }}
                />
            )}

            {activeTab === 'DETAILS' ? (
                <SectionList
                    sections={detailsByDay.map(([day, list]) => ({ day, data: list }))}
                    keyExtractor={(item: any) => String(item.id)}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c084fc" />
                    }
                    renderSectionHeader={({ section }: any) => (
                        <View style={styles.daySectionHeader}>
                            <Ionicons name="calendar" size={14} color="#5b21b6" style={{ marginRight: 6 }} />
                            <Text style={styles.daySectionTitle}>
                                {(() => {
                                    try {
                                        return new Date(section.day).toLocaleDateString(undefined, {
                                            weekday: 'long', month: 'short', day: 'numeric',
                                        });
                                    } catch {
                                        return section.day;
                                    }
                                })()}
                            </Text>
                            <Text style={styles.daySectionCount}>{section.data.length} booking{section.data.length === 1 ? '' : 's'}</Text>
                        </View>
                    )}
                    renderItem={renderBookingCard}
                    extraData={expandedIds}
                    ListEmptyComponent={emptyList}
                    removeClippedSubviews
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                />
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item: any) => String(item.id)}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c084fc" />
                    }
                    renderItem={renderBookingCard}
                    extraData={expandedIds}
                    ListEmptyComponent={emptyList}
                    removeClippedSubviews
                    initialNumToRender={10}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                />
            )}

            {/* ── Post-update modal ─────────────────────────────────────────── */}
            <Modal
                visible={!!updateBooking}
                animationType="slide"
                transparent
                onRequestClose={closeUpdateModal}
            >
                <Pressable style={styles.modalOverlay} onPress={closeUpdateModal}>
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        style={{ width: '100%', alignItems: 'center' }}
                    >
                        <Pressable
                            style={styles.modalCard}
                            // Block touches inside the card from dismissing the modal.
                            onPress={() => { /* swallow */ }}
                        >
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Post Update</Text>
                                <TouchableOpacity onPress={closeUpdateModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="close" size={24} color="#64748b" />
                                </TouchableOpacity>
                            </View>

                            {updateBooking ? (
                                <Text style={styles.modalSubtitle}>
                                    {updateBooking.userName || 'Customer'} • Token #{formatToken(updateBooking.tokenNumber) || '—'} •{' '}
                                    {updateBooking.bookingDate}
                                </Text>
                            ) : null}

                            <Text style={styles.modalLabel}>Message</Text>
                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. Your order is being prepared, arriving in 10 minutes…"
                                placeholderTextColor="#9A8EBA"
                                value={updateMessage}
                                onChangeText={setUpdateMessage}
                                multiline
                                maxLength={500}
                            />

                            <Text style={styles.modalLabel}>Photo (optional)</Text>
                            {updatePhoto ? (
                                <View style={styles.photoPreviewBox}>
                                    <Image source={{ uri: updatePhoto.uri }} style={styles.photoPreview} />
                                    <TouchableOpacity
                                        style={styles.photoRemoveBtn}
                                        onPress={() => setUpdatePhoto(null)}
                                    >
                                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                        <Text style={styles.photoRemoveText}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.pickPhotoBtn} onPress={pickUpdatePhoto}>
                                    <Ionicons name="image-outline" size={16} color="#8b5cf6" style={{ marginRight: 6 }} />
                                    <Text style={styles.pickPhotoText}>Attach a photo</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[styles.modalSubmitBtn, posting && { opacity: 0.7 }]}
                                onPress={submitUpdate}
                                disabled={posting}
                            >
                                {posting ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <>
                                        <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
                                        <Text style={styles.modalSubmitText}>Post to Customer</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </Pressable>
                    </KeyboardAvoidingView>
                </Pressable>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    loadingContainer: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#9A8EBA', fontSize: 15, marginTop: 12, fontWeight: '600' },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EFE9F8',
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4EEFC',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitleBox: { flex: 1, alignItems: 'center', marginHorizontal: 12 },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    headerSubtitle: { fontSize: 13, color: '#9A8EBA', marginTop: 2, fontWeight: '700' },

    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#ffffff',
        margin: 16,
        borderRadius: 14,
        padding: 4,
        borderWidth: 1,
        borderColor: '#D4C9E8',
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
    },
    activeTab: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 12, fontWeight: '700', color: '#9A8EBA' },
    activeTabText: { color: '#fff' },

    scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, marginTop: 60 },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#ffffff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445', marginBottom: 8 },
    emptySubtitle: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', lineHeight: 22 },

    bookingCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#D4C9E8',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EFE9F8',
        paddingBottom: 12,
        marginBottom: 12,
    },
    slotBadge: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
    slotNameText: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    guestBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4EEFC',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    guestText: { fontSize: 12, color: '#7A6B9C', fontWeight: '800' },

    tokenStrip: {
        marginBottom: 12,
        backgroundColor: '#F4EEFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#D4C9E8',
    },
    tokenChip: { flexDirection: 'row', alignItems: 'center' },
    tokenLabel: { fontSize: 11, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginRight: 8 },
    tokenValue: { fontSize: 22, color: '#5b21b6', fontWeight: '900', letterSpacing: 1 },

    customerBox: { marginBottom: 16 },
    customerLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    customerName: { fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 4 },
    phoneLink: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
    phoneLinkText: { fontSize: 13, color: '#c084fc', fontWeight: '700', textDecorationLine: 'underline' },
    noPhoneText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

    dateTimeGrid: { flexDirection: 'row', gap: 16, marginBottom: 16 },
    dateTimeCol: { flex: 1 },
    gridLabel: { fontSize: 10, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginBottom: 2 },
    gridValue: { fontSize: 13, color: '#2D2445', fontWeight: '700' },

    notesBox: {
        backgroundColor: '#F8F5FF',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EFE9F8',
        marginBottom: 16,
    },
    notesLabel: { fontSize: 10, color: '#8b5cf6', fontWeight: '800', textTransform: 'uppercase', marginBottom: 4 },
    notesText: { fontSize: 12, color: '#7A6B9C', lineHeight: 16 },

    actionRow: {
        flexDirection: 'row',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: '#EFE9F8',
        paddingTop: 12,
    },
    postUpdateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8b5cf6',
        paddingVertical: 10,
        borderRadius: 10,
    },
    postUpdateBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
    cancelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 14,
        backgroundColor: 'rgba(239,68,68,0.08)',
        borderRadius: 10,
    },
    cancelBtnText: { color: '#ef4444', fontSize: 13, fontWeight: '800' },

    cancelledBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 10,
        paddingVertical: 8,
        marginTop: 4,
    },
    cancelledText: { color: '#ef4444', fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },

    updatesToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        marginTop: 12,
        borderRadius: 10,
        backgroundColor: '#F8F5FF',
    },
    updatesToggleText: { color: '#8b5cf6', fontSize: 12, fontWeight: '800' },

    updatesBox: { marginTop: 12, gap: 10 },
    updatesEmpty: { fontSize: 12, color: '#7A6B9C', textAlign: 'center', paddingVertical: 8 },
    updateRow: {
        backgroundColor: '#F8F5FF',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1,
        borderColor: '#EFE9F8',
    },
    updateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
    updateAuthor: { fontSize: 12, fontWeight: '800', color: '#2D2445' },
    updateTime: { fontSize: 10, fontWeight: '700', color: '#9A8EBA', marginLeft: 'auto' },
    updateMessage: { fontSize: 13, color: '#2D2445', lineHeight: 18 },
    updatePhoto: { width: '100%', height: 180, borderRadius: 10, marginTop: 8, backgroundColor: '#EFE9F8' },

    daySection: { marginBottom: 8 },
    daySectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 4,
    },
    daySectionTitle: { fontSize: 14, fontWeight: '900', color: '#2D2445' },
    daySectionCount: { fontSize: 11, color: '#7A6B9C', marginLeft: 'auto', fontWeight: '700' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(45, 36, 69, 0.45)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingBottom: 28,
    },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    modalSubtitle: { fontSize: 12, color: '#7A6B9C', fontWeight: '600', marginBottom: 16 },
    modalLabel: { fontSize: 11, color: '#7A6B9C', fontWeight: '800', textTransform: 'uppercase', marginBottom: 6, marginTop: 8 },
    modalInput: {
        borderWidth: 1,
        borderColor: '#D4C9E8',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        minHeight: 90,
        textAlignVertical: 'top',
        color: '#2D2445',
        fontSize: 14,
        backgroundColor: '#F8F5FF',
    },
    pickPhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#D4C9E8',
        borderStyle: 'dashed',
        borderRadius: 12,
        paddingVertical: 12,
        backgroundColor: '#F8F5FF',
    },
    pickPhotoText: { color: '#8b5cf6', fontSize: 13, fontWeight: '800' },
    photoPreviewBox: { position: 'relative' },
    photoPreview: { width: '100%', height: 180, borderRadius: 12, backgroundColor: '#EFE9F8' },
    photoRemoveBtn: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EFE9F8',
    },
    photoRemoveText: { color: '#ef4444', fontSize: 12, fontWeight: '800', marginLeft: 4 },
    modalSubmitBtn: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8b5cf6',
        paddingVertical: 14,
        borderRadius: 14,
    },
    modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '800' },
    filterDatesContainer: { paddingHorizontal: 16, marginBottom: 8 },
    filterDatesRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
    filterDateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#C4B5DC', borderRadius: 10, paddingVertical: 10, gap: 6 },
    filterDateText: { fontSize: 12, fontWeight: '700', color: '#7A6B9C' },
});
