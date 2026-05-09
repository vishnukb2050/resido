import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';
import { Modal, FlatList, Pressable } from 'react-native';

const { width } = Dimensions.get('window');

export default function DefaultDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const [isSelectModalVisible, setIsSelectModalVisible] = React.useState(false);

    const isGuest = !user;

    if (isGuest) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.guestContent}>
                <View style={styles.guestHero}>
                    <Image source={require('../../../assets/resido_logo.jpg')} style={{ width: 150, height: 150, marginBottom: 20, borderRadius: 32 }} />
                    <Text style={styles.brandTitle}>Resido</Text>
                    <Text style={styles.heroSub}>Smart Living for Modern Communities</Text>
                    <Text style={styles.heroDesc}>Manage apartments, connect with residents, and access local services—all in one app.</Text>
                </View>

                <View style={styles.actionSection}>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/otp-login')}>
                        <Text style={styles.primaryBtnText}>Get Started with OTP</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.brandInfo}>
                            <View style={styles.logoBox}>
                                <Image source={require('../../../assets/resido_logo.jpg')} style={styles.logoMini} />
                            </View>
                            <View>
                                <Text style={styles.brandTitleText}>Resido</Text>
                                <Text style={styles.brandTaglineText}>Your Community Starts Here</Text>
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.iconBtn}>
                                <Ionicons name="notifications" size={24} color="#6366f1" />
                                <View style={styles.notifBadge} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.profileBtn}>
                                <Image source={{ uri: 'https://i.pravatar.cc/100?u=resido' }} style={styles.profileImg} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Search Bar */}
                    <View style={styles.searchSection}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={20} color="#94a3b8" />
                            <TextInput 
                                style={styles.searchInput} 
                                placeholder="Search users by name, flat, role..."
                                placeholderTextColor="#94a3b8"
                            />
                            <TouchableOpacity>
                                <Ionicons name="options-outline" size={20} color="#1e293b" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Dynamic View based on Workspace */}
                    {!activeWorkspace ? (
                        <>
                            {/* Personal Space & Community Selection - Light Background */}
                            <View style={styles.selectionArea}>
                                <TouchableOpacity style={styles.personalSpaceCard} onPress={() => setIsSelectModalVisible(true)}>
                                    <View style={styles.psIconBox}>
                                        <MaterialCommunityIcons name="office-building" size={28} color="#6366f1" />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 15 }}>
                                        <Text style={styles.psTitle}>Personal Space</Text>
                                        <Text style={styles.psSub}>
                                            {workspaces.length > 0 ? `Switch between ${workspaces.length} communities` : 'Your personal dashboard'}
                                        </Text>
                                    </View>
                                    <View style={styles.psArrowBox}>
                                        <Ionicons name={workspaces.length > 1 ? "chevron-down" : "chevron-forward"} size={20} color="#1e293b" />
                                    </View>
                                </TouchableOpacity>

                                {/* Notification Stats - Smaller Icons */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.notifScroll}>
                                    <NotifCard 
                                        icon="clipboard-list-outline" 
                                        count={2} 
                                        title="Active Requests" 
                                        linkText="View details" 
                                        color="#6366f1"
                                        bg="#e0e7ff"
                                    />
                                    <NotifCard 
                                        icon="calendar-clock" 
                                        count={1} 
                                        title="Upcoming Event" 
                                        linkText="Today, 7:00 PM" 
                                        color="#10b981"
                                        bg="#d1fae5"
                                    />
                                    <NotifCard 
                                        icon="bullhorn-outline" 
                                        count={3} 
                                        title="New Notices" 
                                        linkText="View all" 
                                        color="#f59e0b"
                                        bg="#fef3c7"
                                    />
                                </ScrollView>
                            </View>

                            {/* Social Stats */}
                            <View style={styles.socialRow}>
                                <TouchableOpacity style={styles.socialCard}>
                                    <Ionicons name="people" size={22} color="#6366f1" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.socialCount}>123</Text>
                                        <Text style={styles.socialLabel}>Followers</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.socialCard}>
                                    <Ionicons name="people-outline" size={22} color="#6366f1" />
                                    <View style={{ marginLeft: 12 }}>
                                        <Text style={styles.socialCount}>22</Text>
                                        <Text style={styles.socialLabel}>Following</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={14} color="#cbd5e1" style={{ marginLeft: 'auto' }} />
                                </TouchableOpacity>
                            </View>

                            {/* Quick Access */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Quick Access</Text>
                            </View>
                            
                            <View style={styles.featuresGrid}>
                                <GridFeatureCard icon="briefcase" title="Business" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/business-profile')} />
                                <GridFeatureCard icon="construct" title="Services" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/service-search')} />
                                <GridFeatureCard icon="document-text" title="Notes" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/notes')} />
                                <GridFeatureCard icon="calendar" title="Calendar" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/calendar')} />
                            </View>

                            {/* All Features - Grid Layout */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>All Features</Text>
                            </View>

                            <View style={styles.featuresGrid}>
                                <GridFeatureCard icon="people" title="Contacts" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/contacts')} />
                                <GridFeatureCard icon="scan" title="Scanner" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/scanner')} />
                                <GridFeatureCard icon="folder" title="Documents" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/documents')} />
                                <GridFeatureCard icon="chatbubble-ellipses" title="Chat" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/chat-list')} />
                                <GridFeatureCard icon="newspaper" title="Thread" color="#1e293b" bg="#f1f5f9" onPress={() => router.push('/thread')} />
                                <GridFeatureCard icon="play-circle" title="Flares" color="#ef4444" bg="#fef2f2" onPress={() => router.push('/flares')} />
                                <GridFeatureCard icon="settings" title="Settings" color="#64748b" bg="#f8fafc" onPress={() => router.push('/settings')} />
                                <GridFeatureCard icon="help-circle" title="Support" color="#0ea5e9" bg="#f0f9ff" onPress={() => router.push('/support')} />
                            </View>
                        </>
                    ) : (
                        <>
                            {/* Community Dashboard View */}
                            <View style={styles.communityMainCard}>
                                {/* Community Header */}
                                <View style={styles.cmHeader}>
                                    <View style={styles.cmLogoBox}>
                                        <Image source={require('../../../assets/greenwoods_logo.jpg')} style={styles.cmLogo} />
                                    </View>
                                    <TouchableOpacity style={styles.cmNameBox} onPress={() => router.push('/workspace-select')}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={styles.cmName}>{(activeWorkspace as any).tenantName}</Text>
                                            <Ionicons name="chevron-down" size={16} color="#1e293b" style={{ marginLeft: 5 }} />
                                        </View>
                                        <Text style={styles.cmSubRole}>{(activeWorkspace as any).role}</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Stats Grid 4x1 Small */}
                                <View style={styles.statsGridSmall}>
                                    <SmallStatItem icon="people" count="128" label="Families" color="#10b981" bg="#ecfdf5" />
                                    <SmallStatItem icon="business" count="4" label="Blocks" color="#3b82f6" bg="#eff6ff" />
                                    <SmallStatItem icon="megaphone" count="5" label="Notices" color="#f59e0b" bg="#fffbeb" />
                                    <SmallStatItem icon="calendar" count="3" label="Events" color="#8b5cf6" bg="#f5f3ff" />
                                </View>

                                {/* Quick Action Buttons */}
                                <View style={styles.cmActions}>
                                    <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/complaints')}>
                                        <View style={[styles.actionIconBox, { backgroundColor: '#f5f3ff' }]}>
                                            <MaterialCommunityIcons name="hand-pointing-up" size={32} color="#6366f1" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.actionTitle}>Raise Request</Text>
                                            <Text style={styles.actionSub}>Submit a request</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                                    </TouchableOpacity>

                                    <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/calendar')}>
                                        <View style={[styles.actionIconBox, { backgroundColor: '#f0f9ff' }]}>
                                            <MaterialCommunityIcons name="calendar-month" size={32} color="#0ea5e9" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.actionTitle}>View Calendar</Text>
                                            <Text style={styles.actionSub}>Check upcoming events</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#0ea5e9" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Quick Access Horizontal */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Quick Access</Text>
                                <TouchableOpacity onPress={() => router.push('/all-features')}>
                                    <Text style={styles.viewAllText}>View All</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qaHorizontalScroll}>
                                <QACardCircular icon="construct" title="Services" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/service-search')} />
                                <QACardCircular icon="calendar" title="Calendar" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/calendar')} />
                                <QACardCircular icon="document-text" title="Documents" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/documents')} />
                                <QACardCircular icon="briefcase" title="Job Profile" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/business-profile')} />
                                <QACardCircular icon="people" title="Community" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/workspace-select')} />
                            </ScrollView>

                            {/* Community Services Grid 4x2 */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Community Services</Text>
                                <TouchableOpacity>
                                    <Text style={styles.viewAllText}>View All <Ionicons name="chevron-forward" size={12} /></Text>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.communityServicesGrid}>
                                <ServiceGridItem icon="megaphone-outline" title="Noticeboard" sub="Latest notices & announcements" color="#10b981" />
                                <ServiceGridItem icon="id-card-outline" title="Gate Pass" sub="Apply & manage gate passes" color="#3b82f6" />
                                <ServiceGridItem icon="chatbubbles-outline" title="Complaints" sub="Raise complaints & track status" color="#f59e0b" />
                                <ServiceGridItem icon="build-outline" title="Maintenance" sub="Report maintenance issues" color="#8b5cf6" />
                                <ServiceGridItem icon="cash-outline" title="Bills" sub="View & pay your bills" color="#10b981" />
                                <ServiceGridItem icon="images-outline" title="Gallery" sub="Community photos & memories" color="#ec4899" />
                                <ServiceGridItem icon="call-outline" title="Directory" sub="Contact residents & management" color="#6366f1" />
                                <ServiceGridItem icon="calendar-outline" title="Events" sub="Upcoming events & activities" color="#f59e0b" />
                            </View>

                            {/* Features List */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Features</Text>
                            </View>
                            <View style={styles.featuresGrid}>
                                <GridFeatureCard icon="people" title="Contacts" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/contacts')} />
                                <GridFeatureCard icon="scan" title="Scanner" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/scanner')} />
                                <GridFeatureCard icon="folder" title="Documents" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/documents')} />
                                <GridFeatureCard icon="chatbubble-ellipses" title="Chat" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/chat-list')} />
                                <GridFeatureCard icon="newspaper" title="Thread" color="#1e293b" bg="#f1f5f9" onPress={() => router.push('/thread')} />
                                <GridFeatureCard icon="play-circle" title="Flares" color="#ef4444" bg="#fef2f2" onPress={() => router.push('/flares')} />
                                <GridFeatureCard icon="settings" title="Settings" color="#64748b" bg="#f8fafc" onPress={() => router.push('/settings')} />
                                <GridFeatureCard icon="help-circle" title="Support" color="#0ea5e9" bg="#f0f9ff" onPress={() => router.push('/support')} />
                            </View>
                        </>
                    )}

                    {/* Community Selection Modal (Dropdown) */}
                    <Modal
                        visible={isSelectModalVisible}
                        transparent={true}
                        animationType="fade"
                        onRequestClose={() => setIsSelectModalVisible(false)}
                    >
                        <Pressable 
                            style={styles.modalOverlay} 
                            onPress={() => setIsSelectModalVisible(false)}
                        >
                            <View style={styles.dropdownContainer}>
                                <View style={styles.dropdownHeader}>
                                    <Text style={styles.dropdownTitle}>Select Community</Text>
                                    <TouchableOpacity onPress={() => {
                                        setIsSelectModalVisible(false);
                                        router.push('/create-community');
                                    }}>
                                        <Ionicons name="add-circle" size={24} color="#6366f1" />
                                    </TouchableOpacity>
                                </View>
                                
                                <FlatList
                                    data={workspaces}
                                    keyExtractor={item => item.tenantId}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity 
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setActiveWorkspace(item, '');
                                                setIsSelectModalVisible(false);
                                            }}
                                        >
                                            <View style={styles.dropdownItemIcon}>
                                                <MaterialCommunityIcons name="office-building" size={24} color="#6366f1" />
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.dropdownItemName}>{item.tenantName}</Text>
                                                <Text style={styles.dropdownItemRole}>{item.role}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                                        </TouchableOpacity>
                                    )}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                />
                            </View>
                        </Pressable>
                    </Modal>
                </View>
            </ScrollView>

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

// Helper Components
function NotifCard({ icon, count, title, linkText, color, bg }: any) {
    if (count === 0) return null;
    return (
        <View style={[styles.notifCard, { backgroundColor: '#fff' }]}>
            <View style={[styles.notifIconBox, { backgroundColor: bg }]}>
                <MaterialCommunityIcons name={icon} size={18} color={color} />
            </View>
            <View style={styles.notifContent}>
                <Text style={styles.notifCount}>{count}</Text>
                <Text style={styles.notifTitle}>{title}</Text>
                <TouchableOpacity>
                    <Text style={[styles.notifLink, { color: color }]}>{linkText}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

function QACard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaCardSmall} onPress={onPress}>
            <View style={[styles.qaIconBoxSmall, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <Text style={styles.qaTitleSmall}>{title}</Text>
        </TouchableOpacity>
    );
}

function GridFeatureCard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.gridFeatureCard} onPress={onPress}>
            <View style={[styles.gfIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <Text style={styles.gfTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

function SmallStatItem({ icon, count, label, color, bg }: any) {
    return (
        <View style={styles.smallStatItem}>
            <View style={[styles.smallStatIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={styles.smallStatCount}>{count}</Text>
            <Text style={styles.smallStatLabel}>{label}</Text>
        </View>
    );
}

function StatItem({ icon, count, label, color, bg }: any) {
    return (
        <View style={styles.statItem}>
            <View style={[styles.statIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={20} color={color} />
            </View>
            <View style={{ marginLeft: 12 }}>
                <Text style={styles.statCount}>{count}</Text>
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </View>
    );
}

function ServiceGridItem({ icon, title, sub, color }: any) {
    return (
        <TouchableOpacity style={styles.serviceGridItem}>
            <View style={[styles.serviceIconBox, { backgroundColor: '#f8fafc' }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <Text style={styles.serviceTitle}>{title}</Text>
            <Text style={styles.serviceSub} numberOfLines={2}>{sub}</Text>
            <View style={styles.serviceArrow}>
                <Ionicons name="chevron-forward" size={12} color={color} />
            </View>
        </TouchableOpacity>
    );
}

function FeatureListItem({ icon, title, sub, onPress }: any) {
    return (
        <TouchableOpacity style={styles.featureListItem} onPress={onPress}>
            <View style={styles.featureItemIconBox}>
                <Ionicons name={icon} size={22} color="#6366f1" />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.featureItemTitle}>{title}</Text>
                <Text style={styles.featureItemSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

function QACardCircular({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaCardCircular} onPress={onPress}>
            <View style={[styles.qaIconBoxCircular, { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 }]}>
                <Ionicons name={icon} size={32} color={color} />
            </View>
            <Text style={styles.qaTitleCircular}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fff' },
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    content: { paddingBottom: 120 },
    
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, backgroundColor: '#fff' },
    brandInfo: { flexDirection: 'row', alignItems: 'center' },
    logoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 4 },
    logoMini: { width: 50, height: 50, borderRadius: 12 },
    brandTitleText: { fontSize: 28, fontWeight: '900', color: '#6366f1', marginLeft: 15 },
    brandTaglineText: { fontSize: 13, color: '#94a3b8', fontWeight: '600', marginLeft: 15 },
    
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    iconBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    notifBadge: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
    profileBtn: { width: 48, height: 48, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9' },
    profileImg: { width: '100%', height: '100%' },

    searchSection: { paddingHorizontal: 20, marginBottom: 25 },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 25, paddingHorizontal: 20, height: 54, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },

    selectionArea: { backgroundColor: '#f8fafc', paddingVertical: 20, marginBottom: 25, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#f1f5f9' },
    personalSpaceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 20, padding: 18, borderRadius: 24, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
    psIconBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
    psTitle: { fontSize: 19, fontWeight: '900', color: '#1e293b' },
    psSub: { fontSize: 12, color: '#64748b', fontWeight: '600', marginTop: 2 },
    psArrowBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },

    notifScroll: { paddingLeft: 20, paddingRight: 10 },
    notifCard: { width: 140, padding: 12, borderRadius: 20, marginRight: 12, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    notifIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    notifContent: { flex: 1 },
    notifCount: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    notifTitle: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
    notifLink: { fontSize: 10, fontWeight: '800' },

    socialRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 30 },
    socialCard: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    socialCount: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    socialLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewAllText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },

    quickAccessGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 25 },
    qaCardSmall: { width: (width - 50) / 2, backgroundColor: '#fff', padding: 18, borderRadius: 24, margin: 5, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 5, elevation: 1 },
    qaIconBoxSmall: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    qaTitleSmall: { fontSize: 14, fontWeight: '800', color: '#1e293b', textAlign: 'center' },

    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 30, justifyContent: 'space-between' },
    gridFeatureCard: { width: (width - 60) / 4, alignItems: 'center', marginBottom: 20 },
    gfIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
    gfTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },

    guestContent: { padding: 30, alignItems: 'center', justifyContent: 'center', flex: 1 },
    guestHero: { alignItems: 'center', marginBottom: 30 },
    brandTitle: { fontSize: 32, fontWeight: '900', color: '#6366f1', marginBottom: 8 },
    heroSub: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
    heroDesc: { fontSize: 15, color: '#64748b', lineHeight: 24, textAlign: 'center' },
    actionSection: { width: '100%', paddingHorizontal: 20 },
    primaryBtn: { backgroundColor: '#6366f1', paddingVertical: 18, borderRadius: 18, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 8 },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

    // Community Dashboard Styles
    communityMainCard: { backgroundColor: '#fff', marginHorizontal: 20, padding: 20, borderRadius: 32, marginBottom: 25, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.03, shadowRadius: 20, elevation: 2 },
    cmHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    cmLogoBox: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    cmLogo: { width: 48, height: 48 },
    cmNameBox: { flex: 1, marginLeft: 15 },
    cmName: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    cmSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    cmSubRole: { fontSize: 13, color: '#10b981', fontWeight: '800', marginTop: 2 },
    roleBadgeBox: { alignItems: 'flex-end' },
    roleLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginBottom: 4 },
    roleValueBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, gap: 4 },
    roleValue: { fontSize: 12, fontWeight: '800', color: '#10b981' },

    statsGridSmall: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25, paddingHorizontal: 10 },
    smallStatItem: { width: (width - 80) / 4, alignItems: 'center' },
    smallStatIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    smallStatCount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    smallStatLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700' },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 25 },
    statItem: { width: (width - 92) / 2, backgroundColor: '#f8fafc', padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
    statIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    statCount: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    statLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },

    cmActions: { gap: 12 },
    actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 20 },
    actionIconBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    actionSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

    qaHorizontalScroll: { paddingLeft: 20, paddingRight: 10, marginBottom: 30 },
    qaCardCircular: { alignItems: 'center', marginRight: 20, width: 70 },
    qaIconBoxCircular: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    qaTitleCircular: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },

    communityServicesGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 30 },
    serviceGridItem: { width: (width - 60) / 2, backgroundColor: '#fff', padding: 18, borderRadius: 24, margin: 7, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.02, shadowRadius: 10, elevation: 1 },
    serviceIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    serviceTitle: { fontSize: 14, fontWeight: '900', color: '#1e293b', marginBottom: 4 },
    serviceSub: { fontSize: 10, color: '#94a3b8', fontWeight: '500', lineHeight: 14, marginBottom: 10 },
    serviceArrow: { alignSelf: 'flex-end' },

    featuresListVertical: { paddingHorizontal: 20 },
    featureListItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    featureItemIconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    featureItemTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    featureItemSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },

    // Modal / Dropdown Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    dropdownContainer: { width: width - 40, backgroundColor: '#fff', borderRadius: 32, padding: 20, maxHeight: '70%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 30, elevation: 20 },
    dropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingHorizontal: 5 },
    dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    dropdownItemIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    dropdownItemName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    dropdownItemRole: { fontSize: 11, color: '#10b981', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
});
