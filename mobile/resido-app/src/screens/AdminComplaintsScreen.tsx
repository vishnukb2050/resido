import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    SafeAreaView, ActivityIndicator, Alert, Modal, ScrollView, TextInput,
    Image
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthStore } from '../store/authStore';
import { communityApi, authApi } from '../services/api';

const CATEGORIES = [
    'Plumbing', 'Electrical', 'Handyman', 'Lift', 'Kitchen', 
    'Water', 'Electricity', 'Common Space', 'Amenities', 'Others'
];

const PRIORITIES = ['URGENT', 'HIGH', 'MEDIUM'];

export default function AdminComplaintsScreen() {
    const router = useRouter();
    const { user, activeWorkspace } = useAuthStore();
    
    const [complaints, setComplaints] = useState<any[]>([]);
    const [staff, setStaff] = useState<any[]>([]);
    const [residents, setResidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Modal Control States
    const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
    const [showAssign, setShowAssign] = useState(false);
    const [showStatus, setShowStatus] = useState(false);
    const [showCreate, setShowCreate] = useState(false);

    // Progress Update Form States
    const [progressMessage, setProgressMessage] = useState('');
    const [progressStatus, setProgressStatus] = useState('IN_PROGRESS');
    const [progressPhotos, setProgressPhotos] = useState<any[]>([]);
    const [uploadingProgress, setUploadingProgress] = useState(false);
    const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);

    // Form Creation States
    const [createForm, setCreateForm] = useState({
        category: 'Plumbing',
        priority: 'MEDIUM',
        description: '',
    });
    const [selectedResident, setSelectedResident] = useState<any>(null);
    const [searchResident, setSearchResident] = useState('');
    const [selectedStaffToAssign, setSelectedStaffToAssign] = useState<any>(null);
    
    // Dropdown Display States
    const [showCategories, setShowCategories] = useState(false);
    const [showResidentDropdown, setShowResidentDropdown] = useState(false);
    const [showStaffDropdown, setShowStaffDropdown] = useState(false);

    const isStaff = ['CLEANING_STAFF', 'SECURITY_STAFF', 'SERVICE_STAFF', 'MAINTENANCE_STAFF'].includes(activeWorkspace?.role || '');
    const isAdmin = ['APARTMENT_ADMIN', 'CARETAKER', 'ADMIN_STAFF'].includes(activeWorkspace?.role || '');

    useEffect(() => {
        fetchComplaints();
        fetchMembers();
    }, []);

    const fetchComplaints = async () => {
        try {
            setLoading(true);
            const params = isStaff ? { staffId: user?.id } : {};
            const res = await communityApi.getComplaintsAdmin(params);
            setComplaints(res.data);
        } catch (e) {
            console.error('Fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMembers = async () => {
        try {
            const res = await communityApi.getMembers();
            // Filter Staff
            const staffList = res.data.filter((m: any) => 
                ['CLEANING_STAFF', 'SECURITY_STAFF', 'SERVICE_STAFF', 'MAINTENANCE_STAFF', 'CARETAKER', 'STAFF'].includes(m.role)
            );
            setStaff(staffList);

            // Filter Residents
            const residentList = res.data.filter((m: any) => m.role === 'RESIDENT');
            setResidents(residentList);
        } catch (e) {
            console.error('Fetch staff failed', e);
        }
    };

    const handleAssign = async (staffId: string) => {
        try {
            await communityApi.assignComplaint(selectedComplaint.id, staffId);
            Alert.alert('Success', 'Complaint assigned successfully');
            setShowAssign(false);
            fetchComplaints();
        } catch (e) {
            Alert.alert('Error', 'Failed to assign complaint');
        }
    };

    const pickProgressPhoto = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
            });
            if (!result.canceled) {
                setProgressPhotos(prev => [...prev, result.assets[0]]);
            }
        } catch (err) {
            console.error('Pick progress photo error', err);
        }
    };

    const handleAddProgress = async () => {
        if (!progressMessage) {
            Alert.alert('Error', 'Please enter a progress note');
            return;
        }

        try {
            setUploadingProgress(true);
            const uploadedUrls: string[] = [];

            for (const file of progressPhotos) {
                if (file.uri.startsWith('http')) {
                    uploadedUrls.push(file.uri);
                    continue;
                }
                const { data: { uploadUrl } } = await authApi.getPresignedUrl(
                    file.name,
                    file.mimeType || 'image/jpeg',
                    'complaints'
                );

                const response = await fetch(file.uri);
                const blob = await response.blob();
                await fetch(uploadUrl, { 
                    method: 'PUT', 
                    body: blob, 
                    headers: { 'Content-Type': file.mimeType || 'image/jpeg' } 
                });
                
                const fileUrl = uploadUrl.split('?')[0];
                uploadedUrls.push(fileUrl);
            }

            await communityApi.addComplaintProgress(selectedComplaint.id, {
                message: progressMessage,
                photos: uploadedUrls,
                status: progressStatus,
                updatedBy: `${activeWorkspace?.role.replace('_STAFF', '')} (${user?.name})`
            });

            Alert.alert('Success', 'Progress update logged successfully!');
            setShowStatus(false);
            setProgressMessage('');
            setProgressPhotos([]);
            fetchComplaints();
        } catch (error) {
            console.error('Failed to log progress', error);
            Alert.alert('Error', 'Failed to save progress update. Please try again.');
        } finally {
            setUploadingProgress(false);
        }
    };

    // Raise Request on Behalf of Resident
    const handleRaiseRequest = async () => {
        if (!selectedResident) {
            Alert.alert('Error', 'Please select a resident');
            return;
        }
        if (!createForm.description) {
            Alert.alert('Error', 'Please enter request description');
            return;
        }

        setSubmitting(true);
        try {
            // 1. Create Ticket
            const res = await communityApi.createComplaint({
                ...createForm,
                title: `${createForm.category} Issue`,
                memberId: selectedResident.id,
                tenantId: activeWorkspace?.tenantId,
            });

            const complaintId = res.data.id;

            // 2. Assign immediately if selected
            if (selectedStaffToAssign && complaintId) {
                await communityApi.assignComplaint(complaintId, selectedStaffToAssign.id);
            }

            Alert.alert('Success', 'Request created and assigned successfully!');
            setShowCreate(false);
            resetCreateForm();
            fetchComplaints();
        } catch (e) {
            console.error('Failed to create ticket', e);
            Alert.alert('Error', 'Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    const resetCreateForm = () => {
        setCreateForm({
            category: 'Plumbing',
            priority: 'MEDIUM',
            description: '',
        });
        setSelectedResident(null);
        setSearchResident('');
        setSelectedStaffToAssign(null);
        setShowResidentDropdown(false);
        setShowStaffDropdown(false);
    };

    // Search Filtering
    const filteredResidents = residents.filter(r => 
        r.name.toLowerCase().includes(searchResident.toLowerCase()) ||
        r.phone.includes(searchResident)
    );

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isStaff ? 'My Tasks' : 'Requests & Complaints'}</Text>
                
                {isAdmin ? (
                    <TouchableOpacity style={styles.addHeaderBtn} onPress={() => setShowCreate(true)}>
                        <Ionicons name="add" size={24} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 44 }} />
                )}
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#6366f1" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={complaints}
                    keyExtractor={(item: any) => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isExpanded = expandedComplaintId === item.id;
                        return (
                            <TouchableOpacity 
                                style={styles.card}
                                onPress={() => setExpandedComplaintId(isExpanded ? null : item.id)}
                                activeOpacity={0.9}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={styles.categoryText}>{item.category || 'General'}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.description}>{item.description}</Text>
                                
                                {/* Resident Info Box */}
                                <View style={styles.metaRow}>
                                    <Ionicons name="person-outline" size={13} color="#94a3b8" />
                                    <Text style={styles.metaText}>Raised by: {item.member?.name || 'Resident'} | {item.member?.phone || ''}</Text>
                                </View>

                                {/* Staff Assigned Info Box */}
                                {item.assignedTo && (
                                    <View style={[styles.metaRow, styles.assignedBox]}>
                                        <Ionicons name="construct-outline" size={13} color="#10b981" />
                                        <Text style={[styles.metaText, { color: '#10b981', fontWeight: '800' }]}>
                                            Assigned To: {item.assignedTo.name} ({item.assignedTo.role.replace('_STAFF', '')})
                                        </Text>
                                    </View>
                                )}

                                {isExpanded && (
                                    <View style={styles.expandedSection}>
                                        {/* Original request photos */}
                                        {item.mediaUrls && item.mediaUrls.length > 0 && (
                                            <View style={styles.sectionGroup}>
                                                <Text style={styles.sectionTitle}>Attached Photos</Text>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
                                                    {item.mediaUrls.map((url: string, idx: number) => (
                                                        <Image key={idx} source={{ uri: url }} style={styles.complaintImage} />
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}

                                        {/* Progress updates timeline */}
                                        <Text style={styles.sectionTitle}>Progress Timeline</Text>
                                        {(!item.progressNotes || (Array.isArray(item.progressNotes) ? item.progressNotes.length : JSON.parse(item.progressNotes || '[]').length) === 0) ? (
                                            <Text style={styles.noProgressText}>No progress updates logged yet.</Text>
                                        ) : (
                                            <View style={styles.timelineContainer}>
                                                {(Array.isArray(item.progressNotes) ? item.progressNotes : JSON.parse(item.progressNotes || '[]')).map((note: any, idx: number) => {
                                                    const progressList = Array.isArray(item.progressNotes) ? item.progressNotes : JSON.parse(item.progressNotes || '[]');
                                                    return (
                                                        <View key={note.id || idx} style={styles.timelineItem}>
                                                            <View style={styles.timelineLineWrapper}>
                                                                <View style={styles.timelineDot} />
                                                                {idx !== progressList.length - 1 && (
                                                                    <View style={styles.timelineLine} />
                                                                )}
                                                            </View>
                                                            <View style={styles.timelineContent}>
                                                                <View style={styles.timelineHeader}>
                                                                    <Text style={styles.timelineUpdater}>{note.updatedBy}</Text>
                                                                    <Text style={styles.timelineDate}>{new Date(note.createdAt).toLocaleDateString()}</Text>
                                                                </View>
                                                                <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusColor(note.status) + '15' }]}>
                                                                    <Text style={[styles.statusTextSmall, { color: getStatusColor(note.status) }]}>{note.status}</Text>
                                                                </View>
                                                                <Text style={styles.timelineMessage}>{note.message}</Text>
                                                                {note.photos && note.photos.length > 0 && (
                                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 8 }}>
                                                                        {note.photos.map((photoUrl: string, pIdx: number) => (
                                                                            <Image key={pIdx} source={{ uri: photoUrl }} style={styles.timelineImage} />
                                                                        ))}
                                                                    </ScrollView>
                                                                )}
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        )}
                                    </View>
                                )}

                                <View style={styles.actionRow}>
                                    {isAdmin && (
                                        <TouchableOpacity 
                                            style={styles.actionBtn}
                                            onPress={(e) => { 
                                                e.stopPropagation();
                                                setSelectedComplaint(item); 
                                                setShowAssign(true); 
                                            }}
                                        >
                                            <Ionicons name="person-add" size={18} color="#fff" />
                                            <Text style={styles.actionBtnText}>Assign Staff</Text>
                                        </TouchableOpacity>
                                    )}
                                    {(isAdmin || isStaff) && (
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.05)' }]}
                                            onPress={(e) => { 
                                                e.stopPropagation();
                                                setSelectedComplaint(item); 
                                                setProgressStatus(item.status);
                                                setShowStatus(true); 
                                            }}
                                        >
                                            <Ionicons name="create-outline" size={18} color="#fff" />
                                            <Text style={styles.actionBtnText}>Update Progress</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
            )}

            {/* Raise & Assign Modal */}
            <Modal visible={showCreate} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <Text style={styles.modalLargeTitle}>Raise & Assign Request</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                            
                            {/* 1. Resident Selection Selector */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>For Resident</Text>
                                {selectedResident ? (
                                    <View style={styles.selectedResidentItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.residentItemName}>{selectedResident.name}</Text>
                                            <Text style={styles.residentItemPhone}>{selectedResident.phone}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedResident(null)}>
                                            <Ionicons name="close-circle" size={22} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View>
                                        <TextInput
                                            style={styles.searchBar}
                                            placeholder="Search by resident name or phone..."
                                            placeholderTextColor="#64748b"
                                            value={searchResident}
                                            onChangeText={(t) => {
                                                setSearchResident(t);
                                                setShowResidentDropdown(true);
                                            }}
                                            onFocus={() => setShowResidentDropdown(true)}
                                        />
                                        {showResidentDropdown && searchResident.length > 0 && (
                                            <View style={styles.searchDropdown}>
                                                {filteredResidents.slice(0, 5).map(res => (
                                                    <TouchableOpacity 
                                                        key={res.id} 
                                                        style={styles.dropdownOption}
                                                        onPress={() => {
                                                            setSelectedResident(res);
                                                            setShowResidentDropdown(false);
                                                        }}
                                                    >
                                                        <Text style={styles.dropdownOptionName}>{res.name}</Text>
                                                        <Text style={styles.dropdownOptionPhone}>{res.phone}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* 2. Category Selector */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Category</Text>
                                <TouchableOpacity 
                                    style={styles.modalSelector} 
                                    onPress={() => setShowCategories(!showCategories)}
                                >
                                    <Text style={styles.modalSelectorText}>{createForm.category}</Text>
                                    <Ionicons name="chevron-down" size={20} color="#6366f1" />
                                </TouchableOpacity>
                                
                                {showCategories && (
                                    <View style={styles.modalSelectorDropdown}>
                                        {CATEGORIES.map(cat => (
                                            <TouchableOpacity 
                                                key={cat} 
                                                style={styles.modalSelectorItem}
                                                onPress={() => {
                                                    setCreateForm({...createForm, category: cat});
                                                    setShowCategories(false);
                                                }}
                                            >
                                                <Text style={styles.modalSelectorItemText}>{cat}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* 3. Priority Row */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Priority</Text>
                                <View style={styles.prioritySelectorRow}>
                                    {PRIORITIES.map(p => (
                                        <TouchableOpacity 
                                            key={p} 
                                            style={[styles.prioritySelectorBtn, createForm.priority === p && styles.prioritySelectorBtnActive]}
                                            onPress={() => setCreateForm({...createForm, priority: p})}
                                        >
                                            <Text style={[styles.prioritySelectorText, createForm.priority === p && styles.prioritySelectorTextActive]}>{p}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* 4. Description Text Input */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Issue Description</Text>
                                <TextInput
                                    style={styles.modalTextArea}
                                    placeholder="Write complaint details..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    numberOfLines={3}
                                    value={createForm.description}
                                    onChangeText={(t) => setCreateForm({...createForm, description: t})}
                                />
                            </View>

                            {/* 5. Direct Staff Assignment Selector */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Assign Staff Immediately (Optional)</Text>
                                {selectedStaffToAssign ? (
                                    <View style={styles.selectedStaffItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.staffItemName}>{selectedStaffToAssign.name}</Text>
                                            <Text style={styles.staffItemRoleBadge}>{selectedStaffToAssign.role.replace('_STAFF', '')}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => setSelectedStaffToAssign(null)}>
                                            <Ionicons name="close-circle" size={22} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity 
                                        style={styles.modalSelector} 
                                        onPress={() => setShowStaffDropdown(!showStaffDropdown)}
                                    >
                                        <Text style={[styles.modalSelectorText, { color: '#64748b' }]}>Choose Staff Member...</Text>
                                        <Ionicons name="person" size={18} color="#94a3b8" />
                                    </TouchableOpacity>
                                )}

                                {showStaffDropdown && (
                                    <View style={styles.staffDropdownContainer}>
                                        {staff.map(s => (
                                            <TouchableOpacity 
                                                key={s.id} 
                                                style={styles.staffDropdownOption}
                                                onPress={() => {
                                                    setSelectedStaffToAssign(s);
                                                    setShowStaffDropdown(false);
                                                }}
                                            >
                                                <View>
                                                    <Text style={styles.staffOptionName}>{s.name}</Text>
                                                    <Text style={styles.staffOptionRole}>{s.role.replace('_STAFF', '')}</Text>
                                                </View>
                                                <Ionicons name="chevron-forward" size={16} color="#6366f1" />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </ScrollView>

                        {/* Dispatch Actions */}
                        <View style={styles.modalActionsRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowCreate(false); resetCreateForm(); }}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleRaiseRequest} disabled={submitting}>
                                {submitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Raise & Dispatch</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Assign Staff Modal */}
            <Modal visible={showAssign} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Assign to Staff</Text>
                        <ScrollView style={{ maxHeight: 400 }}>
                            {staff.map((s: any) => (
                                <TouchableOpacity key={s.id} style={styles.staffItem} onPress={() => handleAssign(s.id)}>
                                    <View>
                                        <Text style={styles.staffName}>{s.name}</Text>
                                        <Text style={styles.staffRole}>{s.role}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#6366f1" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAssign(false)}>
                            <Text style={styles.closeBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Update Progress Modal */}
            <Modal visible={showStatus} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContentLarge}>
                        <Text style={styles.modalLargeTitle}>Update Progress</Text>
                        
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                            {/* 1. Status selector */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Select Status</Text>
                                <View style={styles.prioritySelectorRow}>
                                    {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(status => (
                                        <TouchableOpacity 
                                            key={status} 
                                            style={[styles.prioritySelectorBtn, progressStatus === status && styles.prioritySelectorBtnActive]}
                                            onPress={() => setProgressStatus(status)}
                                        >
                                            <Text style={[styles.prioritySelectorText, progressStatus === status && styles.prioritySelectorTextActive]}>
                                                {status}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* 2. Progress note message */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Progress Note / Update Message</Text>
                                <TextInput
                                    style={styles.modalTextArea}
                                    placeholder="Describe the work done or current status update..."
                                    placeholderTextColor="#64748b"
                                    multiline
                                    numberOfLines={3}
                                    value={progressMessage}
                                    onChangeText={setProgressMessage}
                                />
                            </View>

                            {/* 3. Photo Picker */}
                            <View style={styles.formGroup}>
                                <Text style={styles.modalLabel}>Attach Progress Photos</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 5 }}>
                                    {progressPhotos.map((photo, index) => (
                                        <View key={index} style={{ width: 80, height: 80, borderRadius: 12, overflow: 'hidden', position: 'relative' }}>
                                            <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} />
                                            <TouchableOpacity 
                                                style={{ position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, padding: 2 }}
                                                onPress={() => setProgressPhotos(prev => prev.filter((_, idx) => idx !== index))}
                                            >
                                                <Ionicons name="close" size={14} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                    
                                    <TouchableOpacity 
                                        style={{ width: 80, height: 80, borderRadius: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(99, 102, 241, 0.05)' }} 
                                        onPress={pickProgressPhoto}
                                    >
                                        <Ionicons name="camera-outline" size={24} color="#6366f1" />
                                        <Text style={{ fontSize: 10, color: '#6366f1', fontWeight: '800', marginTop: 4 }}>Add Photo</Text>
                                    </TouchableOpacity>
                                </ScrollView>
                            </View>
                        </ScrollView>

                        {/* Actions */}
                        <View style={styles.modalActionsRow}>
                            <TouchableOpacity 
                                style={styles.modalCancelBtn} 
                                onPress={() => { 
                                    setShowStatus(false); 
                                    setProgressMessage(''); 
                                    setProgressPhotos([]); 
                                }}
                            >
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalSubmitBtn, { backgroundColor: '#10b981' }]} 
                                onPress={handleAddProgress} 
                                disabled={uploadingProgress}
                            >
                                {uploadingProgress ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.modalSubmitText}>Save Update</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const getStatusColor = (status: string) => {
    switch (status) {
        case 'RESOLVED': return '#10b981';
        case 'IN_PROGRESS': return '#3b82f6';
        case 'OPEN': return '#f59e0b';
        default: return '#64748b';
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#23272a' },
    
    // Header Styling
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20 },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },
    addHeaderBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },

    listContent: { padding: 20, paddingBottom: 100 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    categoryText: { fontSize: 11, fontWeight: '800', color: '#6366f1', textTransform: 'uppercase' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 10, fontWeight: '900' },
    description: { fontSize: 15, color: '#e2e8f0', fontWeight: '500', lineHeight: 22, marginBottom: 15 },
    
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    metaText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    assignedBox: { backgroundColor: 'rgba(16,185,129,0.06)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.1)' },

    actionRow: { flexDirection: 'row', gap: 10, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366f1', paddingVertical: 12, borderRadius: 12 },
    actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    
    // Large Modal Styling
    modalContentLarge: { backgroundColor: '#1e293b', borderRadius: 32, padding: 24, maxHeight: '85%' },
    modalLargeTitle: { fontSize: 18, fontWeight: '900', color: '#fff', marginBottom: 20, textAlign: 'center' },
    
    formGroup: { marginBottom: 20 },
    modalLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '800', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 0.5 },
    
    searchBar: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: 14, fontSize: 14, fontWeight: '600' },
    searchDropdown: { backgroundColor: '#23272a', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 6, padding: 6 },
    dropdownOption: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    dropdownOptionName: { fontSize: 14, color: '#fff', fontWeight: '700' },
    dropdownOptionPhone: { fontSize: 11, color: '#64748b', marginTop: 2 },
    
    selectedResidentItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.08)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)', padding: 14, borderRadius: 14 },
    residentItemName: { fontSize: 14, color: '#fff', fontWeight: '800' },
    residentItemPhone: { fontSize: 11, color: '#94a3b8', marginTop: 2 },

    modalSelector: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalSelectorText: { color: '#fff', fontSize: 14, fontWeight: '700' },
    modalSelectorDropdown: { backgroundColor: '#23272a', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 6, padding: 6, maxHeight: 150 },
    modalSelectorItem: { padding: 12 },
    modalSelectorItemText: { color: '#fff', fontSize: 14, fontWeight: '600' },

    prioritySelectorRow: { flexDirection: 'row', gap: 8 },
    prioritySelectorBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' },
    prioritySelectorBtnActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    prioritySelectorText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
    prioritySelectorTextActive: { color: '#fff' },

    modalTextArea: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', color: '#fff', padding: 14, fontSize: 14, fontWeight: '600', height: 80, textAlignVertical: 'top' },

    selectedStaffItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16,185,129,0.08)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.15)', padding: 14, borderRadius: 14 },
    staffItemName: { fontSize: 14, color: '#fff', fontWeight: '800' },
    staffItemRoleBadge: { fontSize: 10, color: '#10b981', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },

    staffDropdownContainer: { backgroundColor: '#23272a', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginTop: 6, padding: 6, maxHeight: 150 },
    staffDropdownOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
    staffOptionName: { fontSize: 14, color: '#fff', fontWeight: '700' },
    staffOptionRole: { fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },

    modalActionsRow: { flexDirection: 'row', gap: 12, marginTop: 10 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    modalCancelText: { color: '#94a3b8', fontSize: 14, fontWeight: '800' },
    modalSubmitBtn: { flex: 2, paddingVertical: 16, borderRadius: 16, backgroundColor: '#6366f1', alignItems: 'center' },
    modalSubmitText: { color: '#fff', fontSize: 14, fontWeight: '900' },

    // Standard Modals Styling
    modalContent: { backgroundColor: '#1e293b', borderRadius: 28, padding: 24 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 20, textAlign: 'center' },
    staffItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 10 },
    staffName: { fontSize: 15, fontWeight: '800', color: '#fff' },
    staffRole: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },
    statusItem: { padding: 18, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, marginBottom: 10, alignItems: 'center' },
    statusItemText: { color: '#fff', fontWeight: '800', fontSize: 14 },
    closeBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
    closeBtnText: { color: '#94a3b8', fontWeight: '700' },

    // Expanded Section & Timeline Styling
    expandedSection: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    sectionGroup: { marginBottom: 15 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 10, letterSpacing: 0.5 },
    complaintImage: { width: 100, height: 100, borderRadius: 12, marginRight: 8 },
    noProgressText: { fontSize: 13, color: '#64748b', fontStyle: 'italic', marginBottom: 10, marginLeft: 4 },
    
    timelineContainer: { paddingLeft: 10, marginVertical: 10 },
    timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    timelineLineWrapper: { alignItems: 'center', width: 16 },
    timelineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 6 },
    timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(99, 102, 241, 0.15)', marginTop: 4, marginBottom: -10 },
    
    timelineContent: { flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    timelineUpdater: { fontSize: 13, fontWeight: '700', color: '#fff' },
    timelineDate: { fontSize: 11, color: '#64748b', fontWeight: '500' },
    timelineMessage: { fontSize: 13, color: '#cbd5e1', lineHeight: 18, marginTop: 4 },
    timelineImage: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
    
    statusBadgeSmall: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
    statusTextSmall: { fontSize: 9, fontWeight: '800' }
});
