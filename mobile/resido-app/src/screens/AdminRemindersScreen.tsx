import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, TextInput, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { communityRemindersApi, communityApi } from '../services/api';
import { storageApi } from '../services/storage';
import { useAuthStore } from '../store/authStore';
import { resolveMediaUrl } from '../utils/mediaUrl';

/** Render an image at its natural aspect ratio. */
function ReminderImage({ uri, style }: { uri: string; style?: any }) {
    const [aspect, setAspect] = useState<number>(16 / 9);
    useEffect(() => {
        if (!uri) return;
        Image.getSize(uri, (w, h) => { if (w && h) setAspect(w / h); }, () => {});
    }, [uri]);
    return (
        <Image
            source={{ uri }}
            style={[{ width: '100%', aspectRatio: aspect, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)' }, style]}
            resizeMode="contain"
        />
    );
}

const DAYS_OF_WEEK = [
    { label: 'Sun', value: 0 },
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 }
];

export default function AdminRemindersScreen() {
    const router = useRouter();
    const { activeWorkspace, user } = useAuthStore();
    
    const [loading, setLoading] = useState(false);
    const [reminders, setReminders] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'CREATE' | 'QUEUE'>('CREATE');

    // Dynamic Options lists from database
    const [allMembers, setAllMembers] = useState<any[]>([]);
    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string>('');

    // Form states
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [category, setCategory] = useState('MAINTENANCE'); // MAINTENANCE, DUTY_ROSTER, EVENT, GENERAL
    const [targetType, setTargetType] = useState('ALL'); // ALL, SPECIFIC_UNITS, STAFF_ROLE, SPECIFIC_MEMBERS

    // Targeted selections
    const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

    // Scheduling & Recurrence
    const [recurrence, setRecurrence] = useState<'ONCE' | 'WEEKLY' | 'MONTHLY'>('ONCE');
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
    const [dateOfMonth, setDateOfMonth] = useState<string>('');

    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduledDateTime, setScheduledDateTime] = useState(''); // e.g. 2026-05-20 10:00

    const STAFF_ROLES = [
        { label: 'Security Staff', value: 'SECURITY_STAFF' },
        { label: 'Maintenance Staff', value: 'MAINTENANCE_STAFF' },
        { label: 'Cleaning Staff', value: 'CLEANING_STAFF' },
        { label: 'Caretaker', value: 'CARETAKER' },
        { label: 'Admin Staff', value: 'ADMIN_STAFF' }
    ];

    const loadData = async () => {
        setLoading(true);
        try {
            // Load Reminders
            const remindersRes = await communityRemindersApi.getReminders();
            setReminders(remindersRes.data || []);

            // Load Members for targeted individual routing
            const membersRes = await communityApi.getMembers();
            setAllMembers(membersRes.data || []);

            // Load Blocks to query targeted addresses
            const blocksRes = await communityApi.getBlocks();
            const blocksData = blocksRes.data || [];
            setBlocks(blocksData);

            if (blocksData.length > 0) {
                setSelectedBlockId(blocksData[0].id);
                loadUnitsForBlock(blocksData[0].id);
            }
        } catch (e) {
            console.error('Failed to query targeted configurations', e);
        } finally {
            setLoading(false);
        }
    };

    const loadUnitsForBlock = async (blockId: string) => {
        try {
            const unitsRes = await communityApi.getUnits(blockId);
            setUnits(unitsRes.data || []);
        } catch (e) {
            console.error('Failed to load units for block', blockId, e);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (selectedBlockId) {
            loadUnitsForBlock(selectedBlockId);
        }
    }, [selectedBlockId]);

    const handleCreateReminder = async () => {
        if (!title.trim() || !message.trim()) {
            Alert.alert('Error', 'Please fill in the reminder title and message.');
            return;
        }

        if (targetType === 'SPECIFIC_UNITS' && selectedUnits.length === 0) {
            Alert.alert('Error', 'Please select at least one unit/address.');
            return;
        }

        if (targetType === 'STAFF_ROLE' && selectedRoles.length === 0) {
            Alert.alert('Error', 'Please select at least one staff role.');
            return;
        }

        if (targetType === 'SPECIFIC_MEMBERS' && selectedMembers.length === 0) {
            Alert.alert('Error', 'Please select at least one individual recipient.');
            return;
        }

        let recurrenceDetailVal: number | null = null;
        
        if (recurrence === 'WEEKLY') {
            if (selectedDayOfWeek === null) {
                Alert.alert('Error', 'Please select a day of the week for weekly reminder.');
                return;
            }
            recurrenceDetailVal = selectedDayOfWeek;
        } else if (recurrence === 'MONTHLY') {
            const parsedDate = parseInt(dateOfMonth, 10);
            if (isNaN(parsedDate) || parsedDate < 1 || parsedDate > 31) {
                Alert.alert('Error', 'Please enter a valid calendar date of the month (1 to 31).');
                return;
            }
            recurrenceDetailVal = parsedDate;
        }

        let scheduledAtDate: Date | null = null;
        if (isScheduled && recurrence === 'ONCE') {
            if (!scheduledDateTime.trim()) {
                Alert.alert('Error', 'Please specify a scheduled date and time.');
                return;
            }
            scheduledAtDate = new Date(scheduledDateTime.replace(' ', 'T') + ':00');
            if (isNaN(scheduledAtDate.getTime())) {
                Alert.alert('Error', 'Invalid schedule date format. Please use YYYY-MM-DD HH:MM format.');
                return;
            }
            if (scheduledAtDate <= new Date()) {
                Alert.alert('Error', 'Scheduled time must be in the future.');
                return;
            }
        }

        setSaving(true);
        try {
            // Resolve image URL:
            //   - new picker selection → upload and replace
            //   - editing + existingImageUrl kept → undefined (don't touch field)
            //   - editing + existingImageUrl cleared → null (remove image)
            //   - create with no image → undefined
            let imageUrl: string | null | undefined = undefined;
            if (imageUri) {
                setUploadingImage(true);
                try {
                    const uploaded = await storageApi.uploadFile(
                        imageUri,
                        `reminder_${user?.id || 'unknown'}_${Date.now()}.jpg`,
                        'image/jpeg',
                        'reminders',
                        activeWorkspace?.tenantId,
                    );
                    if (uploaded) imageUrl = uploaded as string;
                } finally {
                    setUploadingImage(false);
                }
            } else if (editingId && !existingImageUrl) {
                imageUrl = null;
            }

            if (editingId) {
                const payload: any = {
                    title,
                    message,
                    category,
                    targetType,
                    targetRoles: selectedRoles,
                    targetUnits: selectedUnits,
                    targetMembers: selectedMembers,
                    recurrence,
                    recurrenceDetail: recurrenceDetailVal,
                    scheduledAt: scheduledAtDate ? scheduledAtDate.toISOString() : null,
                };
                if (imageUrl !== undefined) payload.imageUrl = imageUrl;
                await communityRemindersApi.updateReminder(editingId, payload);
                Alert.alert('Updated', 'Reminder configuration updated.');
            } else {
                await communityRemindersApi.createReminder({
                    title,
                    message,
                    imageUrl,
                    category,
                    targetType,
                    targetRoles: selectedRoles,
                    targetUnits: selectedUnits,
                    targetMembers: selectedMembers,
                    recurrence,
                    recurrenceDetail: recurrenceDetailVal,
                    scheduledAt: scheduledAtDate ? scheduledAtDate.toISOString() : null,
                });
                Alert.alert(
                    'Success',
                    recurrence !== 'ONCE'
                        ? `Recurring ${recurrence.toLowerCase()} reminder schedule added successfully!`
                        : (isScheduled ? 'Scheduled reminder added successfully!' : 'Reminder triggered and dispatched instantly!'),
                );
            }

            // Reset form
            resetForm();

            // Reload & switch tab
            loadData();
            setActiveTab('QUEUE');
        } catch (e) {
            Alert.alert('Error', editingId ? 'Failed to update reminder.' : 'Failed to register reminder schedule.');
        } finally {
            setSaving(false);
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setExistingImageUrl(null);
        setTitle('');
        setMessage('');
        setImageUri(null);
        setSelectedUnits([]);
        setSelectedRoles([]);
        setSelectedMembers([]);
        setIsScheduled(false);
        setScheduledDateTime('');
        setRecurrence('ONCE');
        setSelectedDayOfWeek(null);
        setDateOfMonth('');
        setCategory('MAINTENANCE');
        setTargetType('ALL');
    };

    const handleEditReminder = (rem: any) => {
        setEditingId(rem.id);
        setTitle(rem.title || '');
        setMessage(rem.message || '');
        setCategory(rem.category || 'MAINTENANCE');
        setTargetType(rem.targetType || 'ALL');
        setSelectedUnits(rem.targetUnits || []);
        setSelectedRoles(rem.targetRoles || []);
        setSelectedMembers(rem.targetMembers || []);
        setRecurrence((rem.recurrence as any) || 'ONCE');
        setSelectedDayOfWeek(
            rem.recurrence === 'WEEKLY' && typeof rem.recurrenceDetail === 'number'
                ? rem.recurrenceDetail
                : null,
        );
        setDateOfMonth(
            rem.recurrence === 'MONTHLY' && typeof rem.recurrenceDetail === 'number'
                ? String(rem.recurrenceDetail)
                : '',
        );
        if (rem.scheduledAt && rem.recurrence === 'ONCE') {
            setIsScheduled(true);
            const d = new Date(rem.scheduledAt);
            const pad = (n: number) => String(n).padStart(2, '0');
            setScheduledDateTime(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`);
        } else {
            setIsScheduled(false);
            setScheduledDateTime('');
        }
        setExistingImageUrl(rem.imageUrl || null);
        setImageUri(null);
        setActiveTab('CREATE');
    };

    const handleTriggerInstantly = async (reminderId: string) => {
        Alert.alert(
            'Confirm Send',
            'Are you sure you want to dispatch this scheduled reminder immediately?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Send Now',
                    onPress: async () => {
                        try {
                            await communityRemindersApi.triggerReminder(reminderId);
                            Alert.alert('Success', 'Reminder dispatched successfully!');
                            loadData();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to dispatch reminder.');
                        }
                    }
                }
            ]
        );
    };

    const handleDeleteReminder = (reminderId: string) => {
        Alert.alert(
            'Cancel Reminder',
            'Are you sure you want to cancel and delete this reminder configuration?',
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel Reminder',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await communityRemindersApi.deleteReminder(reminderId);
                            loadData();
                        } catch (e) {
                            Alert.alert('Error', 'Failed to cancel reminder.');
                        }
                    }
                }
            ]
        );
    };

    // Filter checklists
    const toggleUnitSelection = (unitId: string) => {
        setSelectedUnits(prev => 
            prev.includes(unitId) ? prev.filter(id => id !== unitId) : [...prev, unitId]
        );
    };

    const toggleRoleSelection = (role: string) => {
        setSelectedRoles(prev => 
            prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
        );
    };

    const toggleMemberSelection = (memberId: string) => {
        setSelectedMembers(prev => 
            prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
        );
    };

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission denied', 'Allow gallery access to attach an image.');
            return;
        }
        // No cropping — attach the full image at its natural aspect ratio.
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 0.9,
        });
        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const getRecurrenceLabel = (rem: any) => {
        if (rem.recurrence === 'ONCE') {
            return rem.scheduledAt ? 'Scheduled Alert' : 'Instant Alert';
        }
        if (rem.recurrence === 'WEEKLY' && typeof rem.recurrenceDetail === 'number') {
            const dayLabel = DAYS_OF_WEEK.find(d => d.value === rem.recurrenceDetail)?.label || '';
            return `Weekly on ${dayLabel}s`;
        }
        if (rem.recurrence === 'MONTHLY' && typeof rem.recurrenceDetail === 'number') {
            return `Monthly on the ${rem.recurrenceDetail}th`;
        }
        return rem.recurrence;
    };

    // Metrics calculations
    const scheduledReminders = reminders.filter(r => r.status === 'PENDING' || r.recurrence !== 'ONCE');
    const sentRemindersCount = reminders.filter(r => r.status === 'SENT' || r.sentAt !== null).length;
    const successRate = reminders.length > 0 
        ? Math.round((reminders.filter(r => r.status === 'SENT' || r.sentAt !== null).length / reminders.length) * 100) 
        : 100;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>People Management</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#fff" />
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    
                    {/* Module Title */}
                    <View style={styles.titleRow}>
                        <Ionicons name="alarm" size={24} color="#d97706" />
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.titleText}>Reminders & Alerts</Text>
                            <Text style={styles.workspaceText}>{activeWorkspace?.tenantName || 'My Township'}</Text>
                        </View>
                    </View>

                    {/* Stats Metrics Cards */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricItem}>
                            <Text style={styles.metricVal}>{scheduledReminders.length}</Text>
                            <Text style={styles.metricLabel}>Active Rules</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricVal, { color: '#10b981' }]}>{sentRemindersCount}</Text>
                            <Text style={styles.metricLabel}>Dispatched</Text>
                        </View>
                        <View style={styles.verticalDivider} />
                        <View style={styles.metricItem}>
                            <Text style={[styles.metricVal, { color: '#f59e0b' }]}>{successRate}%</Text>
                            <Text style={styles.metricLabel}>Delivery Success</Text>
                        </View>
                    </View>

                    {/* Navigation Tabs */}
                    <View style={styles.tabRow}>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'CREATE' && styles.tabActive]}
                            onPress={() => setActiveTab('CREATE')}
                        >
                            <Text style={[styles.tabText, activeTab === 'CREATE' && styles.tabTextActive]}>
                                Create Reminder
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={[styles.tabBtn, activeTab === 'QUEUE' && styles.tabActive]}
                            onPress={() => setActiveTab('QUEUE')}
                        >
                            <Text style={[styles.tabText, activeTab === 'QUEUE' && styles.tabTextActive]}>
                                Reminder Register ({reminders.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'CREATE' ? (
                        <View style={styles.formContainer}>

                            {editingId ? (
                                <View style={styles.editingBanner}>
                                    <Ionicons name="create-outline" size={16} color="#3b82f6" />
                                    <Text style={styles.editingBannerText}>
                                        Editing reminder — changes save instantly to all future dispatches.
                                    </Text>
                                </View>
                            ) : null}

                            {/* Title */}
                            <Text style={styles.inputLabel}>Reminder Title *</Text>
                            <TextInput
                                style={styles.textInput}
                                placeholder="e.g. Action Required: Pay Maintenance Bill"
                                placeholderTextColor="#64748b"
                                value={title}
                                onChangeText={setTitle}
                            />

                            {/* Message / Body */}
                            <Text style={styles.inputLabel}>Message details *</Text>
                            <TextInput
                                style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]}
                                placeholder="Write the detailed reminder instructions for your community here..."
                                placeholderTextColor="#64748b"
                                value={message}
                                onChangeText={setMessage}
                                multiline
                            />

                            {/* Image attachment */}
                            <Text style={styles.inputLabel}>Attach Image (optional)</Text>
                            {imageUri || existingImageUrl ? (
                                <View style={styles.imagePreviewWrap}>
                                    <ReminderImage uri={imageUri || (resolveMediaUrl(existingImageUrl) as string)} />
                                    <View style={styles.imagePreviewActions}>
                                        <TouchableOpacity style={styles.imagePreviewBtn} onPress={handlePickImage}>
                                            <Ionicons name="image-outline" size={14} color="#fff" />
                                            <Text style={styles.imagePreviewBtnText}>Change</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.imagePreviewBtn}
                                            onPress={() => { setImageUri(null); setExistingImageUrl(null); }}
                                        >
                                            <Ionicons name="trash-outline" size={14} color="#fff" />
                                            <Text style={styles.imagePreviewBtnText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity style={styles.imagePickBtn} onPress={handlePickImage}>
                                    <Ionicons name="image-outline" size={18} color="#fbbf24" />
                                    <Text style={styles.imagePickBtnText}>Pick a photo</Text>
                                </TouchableOpacity>
                            )}

                            {/* Category Selector */}
                            <Text style={styles.inputLabel}>Category</Text>
                            <View style={styles.selectorGrid}>
                                {['MAINTENANCE', 'DUTY_ROSTER', 'EVENT', 'GENERAL'].map(cat => (
                                    <TouchableOpacity 
                                        key={cat} 
                                        style={[styles.selectorBtn, category === cat && styles.selectorActive]}
                                        onPress={() => setCategory(cat)}
                                    >
                                        <Text style={[styles.selectorBtnText, category === cat && styles.selectorTextActive]}>
                                            {cat.replace('_', ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Targeted Recipient filter */}
                            <Text style={styles.inputLabel}>Target Recipients</Text>
                            <View style={styles.selectorGrid}>
                                {[
                                    { label: 'Everyone', value: 'ALL' },
                                    { label: 'Specific Units', value: 'SPECIFIC_UNITS' },
                                    { label: 'Staff Roles', value: 'STAFF_ROLE' },
                                    { label: 'Specific Staff', value: 'SPECIFIC_MEMBERS' }
                                ].map(target => (
                                    <TouchableOpacity 
                                        key={target.value} 
                                        style={[styles.selectorBtn, targetType === target.value && styles.selectorActive, { width: '48%' }]}
                                        onPress={() => setTargetType(target.value)}
                                    >
                                        <Text style={[styles.selectorBtnText, targetType === target.value && styles.selectorTextActive]}>
                                            {target.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* SPECIFIC UNITS checklists */}
                            {targetType === 'SPECIFIC_UNITS' && (
                                <View style={styles.subSelectionCard}>
                                    <Text style={styles.subTitle}>Select Target Addresses</Text>
                                    
                                    {/* Block Selector */}
                                    <Text style={styles.subLabel}>Choose Block</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                        {blocks.map(b => (
                                            <TouchableOpacity 
                                                key={b.id}
                                                style={[styles.smallTab, selectedBlockId === b.id && styles.smallTabActive]}
                                                onPress={() => setSelectedBlockId(b.id)}
                                            >
                                                <Text style={[styles.smallTabText, selectedBlockId === b.id && styles.smallTabTextActive]}>
                                                    {b.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    {/* Units checkboxes */}
                                    <Text style={styles.subLabel}>Select Unit Numbers ({selectedUnits.length} selected)</Text>
                                    <View style={styles.checkboxGrid}>
                                        {units.length === 0 ? (
                                            <Text style={styles.emptySubText}>No units registered in this block.</Text>
                                        ) : (
                                            units.map(u => {
                                                const isSelected = selectedUnits.includes(u.id);
                                                return (
                                                    <TouchableOpacity 
                                                        key={u.id}
                                                        style={[styles.checkboxItem, isSelected && styles.checkboxActive]}
                                                        onPress={() => toggleUnitSelection(u.id)}
                                                    >
                                                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={16} color={isSelected ? "#fff" : "#94a3b8"} />
                                                        <Text style={[styles.checkboxText, isSelected && styles.checkboxTextActive]}>{u.unitNumber}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )}
                                    </View>
                                </View>
                            )}

                            {/* STAFF ROLES checklists */}
                            {targetType === 'STAFF_ROLE' && (
                                <View style={styles.subSelectionCard}>
                                    <Text style={styles.subTitle}>Select Staff Roles</Text>
                                    <View style={{ gap: 10 }}>
                                        {STAFF_ROLES.map(r => {
                                            const isSelected = selectedRoles.includes(r.value);
                                            return (
                                                <TouchableOpacity 
                                                    key={r.value}
                                                    style={[styles.roleSelectRow, isSelected && styles.roleSelectRowActive]}
                                                    onPress={() => toggleRoleSelection(r.value)}
                                                >
                                                    <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={20} color={isSelected ? "#fff" : "#94a3b8"} />
                                                    <Text style={[styles.roleSelectText, isSelected && styles.roleSelectTextActive]}>{r.label}</Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>
                            )}

                            {/* SPECIFIC MEMBERS / STAFFS checklists */}
                            {targetType === 'SPECIFIC_MEMBERS' && (
                                <View style={styles.subSelectionCard}>
                                    <Text style={styles.subTitle}>Select Individual staff or Residents</Text>
                                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                                        {allMembers.length === 0 ? (
                                            <Text style={styles.emptySubText}>No members registered in community.</Text>
                                        ) : (
                                            allMembers.map(m => {
                                                const isSelected = selectedMembers.includes(m.id);
                                                return (
                                                    <TouchableOpacity 
                                                        key={m.id}
                                                        style={[styles.roleSelectRow, isSelected && styles.roleSelectRowActive, { paddingVertical: 8 }]}
                                                        onPress={() => toggleMemberSelection(m.id)}
                                                    >
                                                        <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={18} color={isSelected ? "#fff" : "#94a3b8"} />
                                                        <View style={{ marginLeft: 8 }}>
                                                            <Text style={[styles.roleSelectText, isSelected && styles.roleSelectTextActive, { fontSize: 13 }]}>{m.name}</Text>
                                                            <Text style={{ color: '#94a3b8', fontSize: 10 }}>{m.role} • {m.phone}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })
                                        )}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Recurrence Toggles */}
                            <Text style={styles.inputLabel}>Recurrence Pattern</Text>
                            <View style={styles.selectorGrid}>
                                {[
                                    { label: 'One-Time', value: 'ONCE' },
                                    { label: 'Weekly', value: 'WEEKLY' },
                                    { label: 'Monthly', value: 'MONTHLY' }
                                ].map(pattern => (
                                    <TouchableOpacity 
                                        key={pattern.value} 
                                        style={[styles.selectorBtn, recurrence === pattern.value && styles.selectorActive, { flex: 1 }]}
                                        onPress={() => setRecurrence(pattern.value as any)}
                                    >
                                        <Text style={[styles.selectorBtnText, recurrence === pattern.value && styles.selectorTextActive]}>
                                            {pattern.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Recurrence Specific Detail Selectors */}
                            {recurrence === 'WEEKLY' && (
                                <View style={styles.subSelectionCard}>
                                    <Text style={styles.subTitle}>Select Weekly Day</Text>
                                    <View style={styles.selectorGrid}>
                                        {DAYS_OF_WEEK.map(day => (
                                            <TouchableOpacity
                                                key={day.value}
                                                style={[styles.selectorBtn, selectedDayOfWeek === day.value && styles.selectorActive, { paddingHorizontal: 12 }]}
                                                onPress={() => setSelectedDayOfWeek(day.value)}
                                            >
                                                <Text style={[styles.selectorBtnText, selectedDayOfWeek === day.value && styles.selectorTextActive]}>
                                                    {day.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {recurrence === 'MONTHLY' && (
                                <View style={styles.subSelectionCard}>
                                    <Text style={styles.subTitle}>Specify Day of Month (1 - 31)</Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="e.g. 1 or 15"
                                        placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={dateOfMonth}
                                        onChangeText={setDateOfMonth}
                                    />
                                    <Text style={styles.infoHint}>Reminder will run automatically on this date each month at 09:00 AM.</Text>
                                </View>
                            )}

                            {/* Schedule Config (Only visible for one-time alerts) */}
                            {recurrence === 'ONCE' && (
                                <>
                                    <View style={styles.scheduleRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.scheduleTitle}>Schedule for later</Text>
                                            <Text style={styles.scheduleDesc}>Auto-send reminder at a designated future time</Text>
                                        </View>
                                        <Switch
                                            value={isScheduled}
                                            onValueChange={setIsScheduled}
                                            trackColor={{ false: '#2d3748', true: '#d97706' }}
                                            thumbColor={isScheduled ? '#fff' : '#cbd5e1'}
                                        />
                                    </View>

                                    {isScheduled && (
                                        <View style={{ marginTop: 10 }}>
                                            <Text style={styles.inputLabel}>Scheduled Time (YYYY-MM-DD HH:MM) *</Text>
                                            <TextInput
                                                style={styles.textInput}
                                                placeholder="e.g. 2026-05-20 14:30"
                                                placeholderTextColor="#64748b"
                                                value={scheduledDateTime}
                                                onChangeText={setScheduledDateTime}
                                            />
                                            <Text style={styles.infoHint}>Ensure time is formatted exactly as shown (24-hour style).</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            <TouchableOpacity 
                                style={[styles.submitBtn, { backgroundColor: '#6366f1' }]}
                                onPress={handleCreateReminder}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitBtnText}>
                                        {uploadingImage
                                            ? 'Uploading image…'
                                            : editingId
                                                ? 'Save Changes'
                                                : recurrence !== 'ONCE'
                                                    ? `Schedule Recurring ${recurrence.toLowerCase()} Alert`
                                                    : (isScheduled ? 'Schedule Reminder Job' : 'Send Reminder Instantly')}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {editingId ? (
                                <TouchableOpacity
                                    style={[styles.submitBtn, { backgroundColor: 'rgba(255,255,255,0.06)', marginTop: 10 }]}
                                    onPress={resetForm}
                                    disabled={saving}
                                >
                                    <Text style={[styles.submitBtnText, { color: '#cbd5e1' }]}>Cancel Edit</Text>
                                </TouchableOpacity>
                            ) : null}

                        </View>
                    ) : (
                        <View style={styles.listContainer}>
                            <Text style={styles.sectionTitle}>Active Reminders Registry ({reminders.length})</Text>
                            {reminders.length === 0 ? (
                                <View style={styles.emptyCard}>
                                    <Ionicons name="notifications-off-outline" size={40} color="#cbd5e1" />
                                    <Text style={styles.emptyText}>No registered reminders found in history.</Text>
                                </View>
                            ) : (
                                reminders.map(rem => (
                                    <View key={rem.id} style={styles.reminderCard}>
                                        <View style={styles.cardHeaderRow}>
                                            <View style={{ flex: 1, marginRight: 10 }}>
                                                <Text style={styles.remTitle}>{rem.title}</Text>
                                                <Text style={styles.remCategory}>{rem.category}</Text>
                                            </View>
                                            <View style={[styles.statusBadge, getStatusStyle(rem.status)]}>
                                                <Text style={styles.statusBadgeText}>{rem.status}</Text>
                                            </View>
                                        </View>

                                        <Text style={styles.remMessage}>{rem.message}</Text>

                                        {rem.imageUrl ? (
                                            <ReminderImage uri={resolveMediaUrl(rem.imageUrl) as string} style={{ marginBottom: 12 }} />
                                        ) : null}

                                        {/* Parameter rows */}
                                        <View style={styles.paramsGrid}>
                                            <DetailRow icon="people-outline" label="Target Filter" value={rem.targetType} />
                                            <DetailRow icon="repeat-outline" label="Recurrence" value={getRecurrenceLabel(rem)} />
                                            {rem.scheduledAt && (
                                                <DetailRow 
                                                    icon="time-outline" 
                                                    label="Next Schedule" 
                                                    value={new Date(rem.scheduledAt).toLocaleString()} 
                                                />
                                            )}
                                            {rem.sentAt && (
                                                <DetailRow 
                                                    icon="checkmark-circle-outline" 
                                                    label="Last Sent" 
                                                    value={new Date(rem.sentAt).toLocaleString()} 
                                                />
                                            )}
                                        </View>

                                        {/* Actions */}
                                        <View style={styles.actionsRow}>
                                            {rem.status === 'PENDING' && (
                                                <TouchableOpacity 
                                                    style={[styles.actionBtn, { borderColor: 'rgba(16, 185, 129, 0.4)' }]}
                                                    onPress={() => handleTriggerInstantly(rem.id)}
                                                >
                                                    <Ionicons name="play" size={14} color="#10b981" style={{ marginRight: 6 }} />
                                                    <Text style={[styles.actionBtnText, { color: '#10b981' }]}>Send Now</Text>
                                                </TouchableOpacity>
                                            )}
                                            <TouchableOpacity
                                                style={[styles.actionBtn, { borderColor: 'rgba(59, 130, 246, 0.4)' }]}
                                                onPress={() => handleEditReminder(rem)}
                                            >
                                                <Ionicons name="create-outline" size={14} color="#3b82f6" style={{ marginRight: 6 }} />
                                                <Text style={[styles.actionBtnText, { color: '#3b82f6' }]}>Edit</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={[styles.actionBtn, { borderColor: 'rgba(239, 68, 68, 0.4)' }]}
                                                onPress={() => handleDeleteReminder(rem.id)}
                                            >
                                                <Ionicons name="trash-outline" size={14} color="#ef4444" style={{ marginRight: 6 }} />
                                                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Delete</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>
                    )}

                </ScrollView>
            )}
        </SafeAreaView>
    );
}

function DetailRow({ icon, label, value }: { icon: string, label: string, value: string }) {
    return (
        <View style={styles.detailRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: 110 }}>
                <Ionicons name={icon as any} size={14} color="#cbd5e1" style={{ marginRight: 6 }} />
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <Text style={styles.detailValue} numberOfLines={1}>{value}</Text>
        </View>
    );
}

function getStatusStyle(status: string) {
    if (status === 'SENT') return { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' };
    if (status === 'PENDING') return { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' };
    return { backgroundColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' };
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4C5C68' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    titleText: { color: '#fff', fontSize: 20, fontWeight: '900' },
    workspaceText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 2 },

    metricsRow: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 25 },
    metricItem: { flex: 1, alignItems: 'center' },
    metricVal: { fontSize: 22, fontWeight: '900', color: '#fff' },
    metricLabel: { color: '#cbd5e1', fontSize: 10, fontWeight: '700', marginTop: 4 },
    verticalDivider: { width: 1, height: 35, backgroundColor: 'rgba(255,255,255,0.1)' },

    tabRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
    tabBtn: { flex: 1, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    tabActive: { backgroundColor: '#d97706' },
    tabText: { color: '#cbd5e1', fontSize: 13, fontWeight: '800' },
    tabTextActive: { color: '#fff', fontWeight: '900' },

    formContainer: { backgroundColor: '#2E3A42', borderRadius: 26, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    listContainer: {},

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 15 },
    textInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 16, fontSize: 15, fontWeight: '600', marginBottom: 5 },
    infoHint: { color: '#cbd5e1', fontSize: 10, fontWeight: '600', marginTop: 4, paddingLeft: 4 },

    selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    selectorBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    selectorActive: { backgroundColor: '#d97706', borderColor: '#d97706' },
    selectorBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },
    selectorTextActive: { color: '#fff' },

    subSelectionCard: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginTop: 15, marginBottom: 10 },
    subTitle: { fontSize: 13, fontWeight: '900', color: '#fff', marginBottom: 15 },
    subLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', marginBottom: 10 },
    emptySubText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

    smallTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8 },
    smallTabActive: { backgroundColor: '#d97706' },
    smallTabText: { color: '#cbd5e1', fontSize: 10, fontWeight: '800' },
    smallTabTextActive: { color: '#fff' },

    checkboxGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    checkboxItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.04)', gap: 6 },
    checkboxActive: { backgroundColor: '#d97706' },
    checkboxText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
    checkboxTextActive: { color: '#fff', fontWeight: '900' },

    roleSelectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', gap: 8, marginBottom: 8 },
    roleSelectRowActive: { backgroundColor: '#d97706' },
    roleSelectText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
    roleSelectTextActive: { color: '#fff', fontWeight: '900' },

    scheduleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 20, marginTop: 20 },
    scheduleTitle: { fontSize: 14, fontWeight: '800', color: '#fff' },
    scheduleDesc: { fontSize: 11, color: '#cbd5e1', fontWeight: '600', marginTop: 2 },

    submitBtn: { height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    sectionTitle: { fontSize: 15, fontWeight: '900', color: '#fff', marginBottom: 15 },
    emptyCard: { backgroundColor: '#2E3A42', padding: 30, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyText: { color: '#cbd5e1', fontSize: 13, fontWeight: '700', marginTop: 12, textAlign: 'center' },

    reminderCard: { backgroundColor: '#2E3A42', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', padding: 20, marginBottom: 18 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    remTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
    remCategory: { color: '#94a3b8', fontSize: 11, fontWeight: '700', marginTop: 2 },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
    statusBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    remMessage: { color: '#cbd5e1', fontSize: 13, fontWeight: '600', lineHeight: 18, marginTop: 12, marginBottom: 15 },

    paramsGrid: { gap: 10, marginBottom: 15, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 12 },
    detailRow: { flexDirection: 'row', alignItems: 'center' },
    detailLabel: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
    detailValue: { color: '#fff', fontSize: 12, fontWeight: '700', flex: 1 },

    actionsRow: { flexDirection: 'row', gap: 10, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingTop: 15 },
    actionBtn: { flex: 1, height: 38, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    actionBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '800' },

    imagePickBtn: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251, 191, 36, 0.08)', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.25)' },
    imagePickBtnText: { color: '#fbbf24', fontWeight: '800', fontSize: 13 },
    imagePreviewWrap: { borderRadius: 14, overflow: 'hidden', position: 'relative', backgroundColor: 'rgba(255,255,255,0.04)' },
    imagePreviewActions: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 6 },
    imagePreviewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.65)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    imagePreviewBtnText: { color: '#fff', fontSize: 10, fontWeight: '800' },

    editingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(59, 130, 246, 0.08)', borderColor: 'rgba(59, 130, 246, 0.25)', borderWidth: 1, padding: 12, borderRadius: 14, marginBottom: 8 },
    editingBannerText: { color: '#60a5fa', fontWeight: '700', fontSize: 12, flex: 1 },
});
