import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, 
    Image, SafeAreaView, ActivityIndicator, RefreshControl,
    Dimensions, StatusBar, Modal
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

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <MaterialCommunityIcons name="storefront-outline" size={80} color="#1d4ed8" />
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
                <Ionicons name={icon} size={16} color="#1d4ed8" />
            </View>
            <Text style={styles.benefitText}>{text}</Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1d4ed8" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Manage Business</Text>
                <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => router.push('/business-profile')}
                >
                    <Ionicons name="add" size={24} color="#1d4ed8" />
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
                                                <Ionicons name="business" size={24} color="#1d4ed8" />
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
                                        <Feather name="edit-3" size={20} color="#1d4ed8" />
                                    </TouchableOpacity>
                                </View>
                                
                                <View style={styles.quickActionsContainer}>
                                    <TouchableOpacity 
                                        style={styles.quickActionBtn}
                                        onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id, initialStep: 2 } })}
                                    >
                                        <Ionicons name="images-outline" size={16} color="#3b82f6" />
                                        <Text style={styles.quickActionText}>Gallery</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.quickActionBtn}
                                        onPress={() => router.push({ pathname: '/business-profile', params: { id: profile.id, initialStep: 4 } })}
                                    >
                                        <Ionicons name="calendar-outline" size={16} color="#10b981" />
                                        <Text style={styles.quickActionText}>Slots</Text>
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

                                {profile.slots && profile.slots.length > 0 ? (
                                    <TouchableOpacity 
                                        style={styles.manageBookingsBtn}
                                        onPress={() => router.push({ pathname: '/business-bookings-manage', params: { profileId: profile.id } })}
                                    >
                                        <Ionicons name="calendar" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                                        <Text style={styles.manageBookingsBtnText}>Manage Bookings</Text>
                                    </TouchableOpacity>
                                ) : null}
                                
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
                                <Ionicons name="add" size={24} color="#1d4ed8" />
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
    container: { flex: 1, backgroundColor: '#000000' },
    loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    
    scrollContent: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#94a3b8', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },

    // Empty State
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
    emptyIconBox: { width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(37, 99, 235, 0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
    emptyTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 12 },
    emptySubtitle: { fontSize: 16, color: '#94a3b8', textAlign: 'center', lineHeight: 24, paddingHorizontal: 20, marginBottom: 40 },
    benefits: { width: '100%', gap: 16, marginBottom: 40 },
    benefitItem: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16 },
    benefitIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    benefitText: { fontSize: 15, color: '#cbd5e1', fontWeight: '600' },
    createBtn: { width: '100%', height: 60, borderRadius: 20, backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    createBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    // List State
    profileCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    profileInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    logoContainer: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    logo: { width: '100%', height: '100%' },
    logoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    textDetails: { flex: 1, marginLeft: 16 },
    businessName: { fontSize: 18, fontWeight: '800', color: '#fff' },
    categoryText: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
    editBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    
    quickActionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.03)',
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
        color: '#cbd5e1',
    },
    
    statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', paddingTop: 16 },
    statBox: { flex: 1, alignItems: 'center' },
    statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
    statLabel: { fontSize: 11, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginTop: 4 },
    statDivider: { width: 1, height: '100%', backgroundColor: 'rgba(255,255,255,0.05)' },

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
    addText: { fontSize: 16, fontWeight: '700', color: '#1d4ed8' },

    // QR Code Modal Styling
    qrBackdrop: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    qrCard: { backgroundColor: '#111827', borderRadius: 24, padding: 24, width: '90%', maxWidth: 360, alignItems: 'center', borderStyle: 'solid', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.08)' },
    qrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
    qrTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
    qrCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    qrSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
    qrWrapper: { backgroundColor: '#ffffff', padding: 12, borderRadius: 16, marginBottom: 20 },
    qrImage: { width: 200, height: 200 },
    qrBizName: { fontSize: 20, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginBottom: 4 },
    qrBizCat: { fontSize: 14, color: '#a084ca', fontWeight: '800', textAlign: 'center', marginBottom: 24 },
    qrDoneBtn: { width: '100%', height: 50, borderRadius: 12, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center' },
    qrDoneBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '800' }
});
