import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    Image, SafeAreaView, ActivityIndicator, RefreshControl,
    Dimensions, StatusBar, Modal, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { businessApi } from '../services/api';

const { width } = Dimensions.get('window');

export default function ManageBusinessScreen() {
    const router = useRouter();
    const [profiles, setProfiles] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [qrVisible, setQrVisible] = useState(false);
    const [selectedQrProfile, setSelectedQrProfile] = useState<any>(null);

    useEffect(() => {
        fetchProfiles();
    }, []);

    const fetchProfiles = async () => {
        try {
            const { data } = await businessApi.getMyProfiles();
            setProfiles(data || []);
        } catch (error) {
            console.error('Failed to fetch business profiles:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchProfiles();
    };

    const handleDeleteProfile = (profile: any) => {
        Alert.alert(
            'Delete Business Profile',
            `Are you sure you want to permanently delete "${profile.businessName}"? This will also remove all its slots and bookings. This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await businessApi.deleteProfile(profile.id);
                            setProfiles(prev => prev.filter((p: any) => p.id !== profile.id));
                            Alert.alert('Deleted', 'Business profile removed successfully.');
                        } catch (error: any) {
                            console.error('Failed to delete business profile:', error);
                            const msg = error?.response?.data?.message || 'Failed to delete business profile.';
                            Alert.alert('Error', msg);
                        }
                    }
                }
            ]
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="storefront-outline" size={80} color="#8b5cf6" />
            </View>
            <Text style={styles.emptyTitle}>Grow Your Business</Text>
            <Text style={styles.emptySubtitle}>
                Create a professional business profile to get discovered by residents in your community.
            </Text>
            
            <View style={styles.benefits}>
                <BenefitItem icon="eye" text="Get discovered by neighbors" />
                <BenefitItem icon="calendar" text="Manage bookings & inquiries" />
                <BenefitItem icon="star" text="Build trust with reviews" />
            </View>

            <TouchableOpacity 
                style={styles.createBtn}
                onPress={() => router.push('/business-profile')}
            >
                <Text style={styles.createBtnText}>Create Business Profile</Text>
                <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
            </TouchableOpacity>
        </View>
    );

    const BenefitItem = ({ icon, text }: any) => (
        <View style={styles.benefitItem}>
            <View style={styles.benefitIcon}>
                <Ionicons name={icon} size={16} color="#8b5cf6" />
            </View>
            <Text style={styles.benefitText}>{text}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8b5cf6" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Business</Text>
                <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => router.push('/business-profile')}
                >
                    <Ionicons name="add" size={24} color="#8b5cf6" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
            >
                {profiles.length === 0 ? renderEmptyState() : (
                    <>
                        <Text style={styles.sectionTitle}>Your Businesses ({profiles.length})</Text>
                        {profiles.map((profile) => (
                            <TouchableOpacity 
                                key={profile.id} 
                                style={styles.profileCard}
                                onPress={() => router.push({ pathname: '/business-detail', params: { id: profile.id } })}
                            >
                                <View style={styles.profileInfo}>
                                    <View style={styles.logoContainer}>
                                        {profile.logo ? (
                                            <Image source={{ uri: profile.logo }} style={styles.logo} />
                                        ) : (
                                            <View style={styles.logoPlaceholder}>
                                                <Ionicons name="business" size={24} color="#8b5cf6" />
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.textDetails}>
                                        <Text style={styles.businessName}>{profile.businessName}</Text>
                                        <Text style={styles.categoryText}>{profile.category}</Text>
                                        <View style={styles.statusBadge}>
                                            <View style={[styles.statusDot, { backgroundColor: profile.isActive ? '#10b981' : '#ef4444' }]} />
                                            <Text style={styles.statusText}>{profile.isActive ? 'Active' : 'Inactive'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.editBtn}
                                        onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id } })}
                                    >
                                        <Feather name="edit-3" size={20} color="#8b5cf6" />
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.deleteBtn}
                                        onPress={() => handleDeleteProfile(profile)}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.quickActionsContainer}>
                                    <TouchableOpacity 
                                        style={styles.quickActionBtn}
                                        onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id, initialStep: 2 } })}
                                    >
                                        <Ionicons name="images-outline" size={16} color="#a78bfa" />
                                        <Text style={styles.quickActionText}>Gallery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.quickActionBtn}
                                        onPress={() => {
                                            setSelectedQrProfile(profile);
                                            setQrVisible(true);
                                        }}
                                    >
                                        <Ionicons name="qr-code-outline" size={16} color="#fbbf24" />
                                        <Text style={styles.quickActionText}>QR Code</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity 
                                    style={styles.manageSlotsBtn}
                                    onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id, manageSlots: 'true' } })}
                                >
                                    <Ionicons name="time" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                                    <Text style={styles.manageSlotsBtnText}>Manage Booking Slots</Text>
                                </TouchableOpacity>
                                
                                <View style={styles.statsRow}>
                                    <View style={styles.statBox}>
                                        <Text style={styles.statValue}>{profile.services?.length || 0}</Text>
                                        <Text style={styles.statLabel}>Services</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Text style={styles.statValue}>0</Text>
                                        <Text style={styles.statLabel}>Views</Text>
                                    </View>
                                    <View style={styles.statDivider} />
                                    <View style={styles.statBox}>
                                        <Text style={styles.statValue}>0</Text>
                                        <Text style={styles.statLabel}>Leads</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                        
                        <TouchableOpacity 
                            style={styles.addAnotherCard}
                            onPress={() => router.push('/business-profile')}
                        >
                            <View style={styles.addIconBox}>
                                <Ionicons name="add" size={24} color="#8b5cf6" />
                            </View>
                            <Text style={styles.addText}>Add Another Business</Text>
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* Modal for QR Code Display */}
            {selectedQrProfile && (
                <Modal
                    visible={qrVisible}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setQrVisible(false)}
                >
                    <View style={styles.qrBackdrop}>
                        <View style={styles.qrCard}>
                            <View style={styles.qrHeader}>
                                <Text style={styles.qrTitle}>Business QR Code</Text>
                                <TouchableOpacity onPress={() => setQrVisible(false)} style={styles.qrCloseBtn}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            
                            <Text style={styles.qrSubtitle}>
                                Customers can scan this QR code using their Resido app to instantly view your profile and book services!
                            </Text>

                            <View style={styles.qrWrapper}>
                                <Image
                                    source={{ 
                                        uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=25-99-235&data=resido://business-detail?id=${selectedQrProfile.id}` 
                                    }}
                                    style={styles.qrImage}
                                />
                            </View>

                            <Text style={styles.qrBizName}>{selectedQrProfile.businessName}</Text>
                            <Text style={styles.qrBizCat}>{selectedQrProfile.category}</Text>
                            
                            <TouchableOpacity style={styles.qrDoneBtn} onPress={() => setQrVisible(false)}>
                                <Text style={styles.qrDoneBtnText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    loadingContainer: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#9A8EBA', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },

    // Empty State
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyIconBox: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(37, 99, 235, 0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    emptyTitle: { fontSize: 28, fontWeight: '900', color: '#2D2445', marginBottom: 12 },
    emptySubtitle: { fontSize: 16, color: '#9A8EBA', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, marginBottom: 40 },
    benefits: { width: '100%', gap: 16, marginBottom: 40 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#ffffff', padding: 16, borderRadius: 16 },
    benefitIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    benefitText: { fontSize: 15, color: '#7A6B9C', fontWeight: '600' },
    createBtn: { width: '100%', height: 60, borderRadius: 20, backgroundColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    createBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '800' },

    // List State
    profileCard: { backgroundColor: '#F4EEFC', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#C4B5DC' },
    profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    logoContainer: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#F4EEFC', overflow: 'hidden' },
    logo: { width: '100%', height: '100%' },
    logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    textDetails: { flex: 1, marginLeft: 16 },
    businessName: { fontSize: 18, fontWeight: '800', color: '#2D2445' },
    categoryText: { fontSize: 14, color: '#9A8EBA', marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, color: '#9A8EBA', fontWeight: '600' },
    editBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    deleteBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    
    quickActionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#EFE9F8',
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        paddingVertical: 10,
        gap: 6,
    },
    quickActionText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#7A6B9C',
    },
    
    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 16 },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800', color: '#2D2445' },
    statLabel: { fontSize: 11, color: '#7A6B9C', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    statDivider: { width: 1, height: '100%', backgroundColor: '#F4EEFC' },

    manageSlotsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingVertical: 12,
        marginBottom: 10,
        shadowColor: '#1d4ed8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    manageSlotsBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#2D2445',
        letterSpacing: 0.3,
    },

    manageBookingsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#8b5cf6',
        borderRadius: 12,
        paddingVertical: 10,
        marginBottom: 16,
    },
    manageBookingsBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#ffffff',
    },

    addAnotherCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 24, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(37, 99, 235, 0.3)', marginTop: 8 },
    addIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    addText: { fontSize: 16, fontWeight: '700', color: '#8b5cf6' },

    // QR Code Modal Styling
    qrBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    qrCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '90%', maxWidth: 360, alignItems: 'center', borderStyle: 'solid', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
    qrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
    qrTitle: { fontSize: 18, fontWeight: '900', color: '#2D2445' },
    qrCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    qrSubtitle: { fontSize: 13, color: '#9A8EBA', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    qrWrapper: { backgroundColor: '#ffffff', padding: 12, borderRadius: 16, marginBottom: 20 },
    qrImage: { width: 200, height: 200 },
    qrBizName: { fontSize: 20, fontWeight: '900', color: '#2D2445', textAlign: 'center', marginBottom: 4 },
    qrBizCat: { fontSize: 14, color: '#a084ca', fontWeight: '800', textAlign: 'center', marginBottom: 24 },
    qrDoneBtn: { width: '100%', height: 50, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
    qrDoneBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' }
});
