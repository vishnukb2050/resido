import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput, Modal, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';

const { width } = Dimensions.get('window');

export default function DefaultDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const [isSelectModalVisible, setIsSelectModalVisible] = React.useState(false);
    const [activeCategory, setActiveCategory] = React.useState('Electronics');

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
                    {/* Dynamic View based on Workspace */}
                    {!activeWorkspace ? (
                        <View style={styles.psWrapper}>
                            {/* Header */}
                            <View style={styles.psHeader}>
                                <View style={styles.psBrandInfo}>
                                    <View style={styles.psLogoBox}>
                                        <Ionicons name="home" size={28} color="#fff" />
                                    </View>
                                    <View style={{ marginLeft: 15 }}>
                                        <Text style={styles.psBrandTitleText}>Resido</Text>
                                        <Text style={styles.psBrandTaglineText}>Smart living starts here</Text>
                                    </View>
                                </View>
                                <View style={styles.psHeaderActions}>
                                    <TouchableOpacity style={styles.psIconBtn}>
                                        <Ionicons name="notifications" size={24} color="#fff" />
                                        <View style={styles.psNotifBadge}>
                                            <Text style={styles.psNotifCount}>3</Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.psProfileBtn} onPress={() => router.push('/profile')}>
                                        <Image source={{ uri: 'https://i.pravatar.cc/100?u=resido' }} style={styles.psProfileImg} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Workspace Switcher Row (Notched Cards) */}
                            <View style={styles.psWorkspaceSection}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psWorkspaceScroll}>
                                    <WorkspaceCard 
                                        label="My Space" 
                                        isActive={!activeWorkspace} 
                                        onPress={() => setActiveWorkspace(null as any, '')} 
                                        image={user?.profilePhoto || "https://i.pravatar.cc/100?u=resido"}
                                    />
                                    {workspaces.map((ws: any) => (
                                        <WorkspaceCard 
                                            key={ws.tenantId}
                                            label={ws.tenantName} 
                                            icon="business" 
                                            isActive={activeWorkspace?.tenantId === ws.tenantId} 
                                            onPress={() => setActiveWorkspace(ws, '')} 
                                            image="https://cdn-icons-png.flaticon.com/512/3062/3062634.png"
                                        />
                                    ))}
                                    <WorkspaceCard 
                                        label="Artisans" 
                                        icon="brush" 
                                        isActive={false} 
                                        onPress={() => {}} 
                                        image="https://cdn-icons-png.flaticon.com/512/1048/1048953.png"
                                    />
                                </ScrollView>
                            </View>                            
                            
                            {/* Search Bar Section */}
                            <View style={styles.psSearchSection}>
                                <View style={styles.psSearchBar}>
                                    <Ionicons name="search-outline" size={22} color="#94a3b8" />
                                    <TextInput 
                                        style={styles.psSearchInput} 
                                        placeholder="Search for 'Coconut Water'..."
                                        placeholderTextColor="#94a3b8"
                                    />
                                    <View style={styles.psSearchIconsRight}>
                                        <MaterialCommunityIcons name="clipboard-text-outline" size={22} color="#64748b" />
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.psBookmarkBtn}>
                                    <Ionicons name="bookmark-outline" size={22} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            {/* Quick Access Bar (New) */}
                            <View style={styles.psQuickAccessBar}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psQuickAccessScroll}>
                                    <QuickAccessItem icon="business" label="Business" />
                                    <QuickAccessItem icon="wallet" label="Finance" />
                                    <QuickAccessItem icon="grid" label="Services" />
                                    <QuickAccessItem icon="document-text" label="Notes" />
                                    <QuickAccessItem icon="folder" label="Docs" />
                                </ScrollView>
                            </View>

                            {/* Most Searched Services */}
                            <View style={styles.psMostSearchedSection}>
                                <Text style={styles.psSectionTitle}>Most Searched</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psMostSearchedScroll}>
                                    <MostSearchedItem icon="construct-outline" label="Plumber" />
                                    <MostSearchedItem icon="flash-outline" label="Electrician" />
                                    <MostSearchedItem icon="water-outline" label="Cleaning" />
                                    <MostSearchedItem icon="shield-checkmark-outline" label="Security" />
                                </ScrollView>
                            </View>

                            {/* Explore Categories (Larger cards) */}
                            <View style={styles.psExploreSection}>
                                <Text style={styles.psSectionTitle}>Explore Categories</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psExploreScroll}>
                                    <CategoryCard label="Home Maint." image="https://images.unsplash.com/photo-1581578731548-c64695ce6958?auto=format&fit=crop&q=80&w=200" />
                                    <CategoryCard label="Personal Care" image="https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&q=80&w=200" />
                                    <CategoryCard label="Electronics" image="https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&q=80&w=200" />
                                </ScrollView>
                            </View>

                            {/* Stories Section */}
                            <View style={styles.psStoriesSection}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psStoriesScroll}>
                                    <View style={styles.psStoryItem}>
                                        <TouchableOpacity style={[styles.psStoryCircle, { borderColor: '#94a3b8', borderStyle: 'dashed' }]}>
                                            <Ionicons name="add" size={24} color="#94a3b8" />
                                        </TouchableOpacity>
                                        <Text style={styles.psStoryLabel}>My Story</Text>
                                    </View>
                                    <StoryItem name="Rahul" image="https://i.pravatar.cc/100?u=1" hasStory />
                                    <StoryItem name="Anjali" image="https://i.pravatar.cc/100?u=2" hasStory />
                                    <StoryItem name="Karthik" image="https://i.pravatar.cc/100?u=3" hasStory />
                                    <StoryItem name="Sneha" image="https://i.pravatar.cc/100?u=4" hasStory />
                                    <StoryItem name="Vikram" image="https://i.pravatar.cc/100?u=5" hasStory />
                                </ScrollView>
                            </View>

                            {/* Stay Connected Banner */}
                            <View style={styles.psBanner}>
                                <View style={styles.psBannerContent}>
                                    <Image source={{ uri: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=200' }} style={styles.psBannerImage} />
                                    <View style={styles.psBannerTextCol}>
                                        <Text style={styles.psBannerTitle}>Stay Connected</Text>
                                        <Text style={styles.psBannerSub}>Join your community discussions and events</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.psBannerBtn}>
                                    <Text style={styles.psBannerBtnText}>Explore Community</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#1e293b" />
                                </TouchableOpacity>
                            </View>

                            {/* Explore Business Profile Banner */}
                            <View style={styles.psBusinessBanner}>
                                <View style={styles.psBannerContent}>
                                    <View style={[styles.psBannerImage, { backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }]}>
                                        <Ionicons name="business" size={28} color="#4f46e5" />
                                    </View>
                                    <View style={styles.psBannerTextCol}>
                                        <Text style={styles.psBannerTitle}>Grow Your Business</Text>
                                        <Text style={styles.psBannerSub}>Discover local business profiles & services</Text>
                                    </View>
                                </View>
                                <TouchableOpacity style={[styles.psBannerBtn, { backgroundColor: '#fff' }]}>
                                    <Text style={[styles.psBannerBtnText, { color: '#4f46e5' }]}>Explore Business</Text>
                                    <Ionicons name="arrow-forward" size={16} color="#4f46e5" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            {/* Community Dashboard View */}
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
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/calendar')}>
                                        <Ionicons name="calendar" size={24} color="#6366f1" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn}>
                                        <Ionicons name="notifications" size={24} color="#6366f1" />
                                        <View style={styles.notifBadge} />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/profile')}>
                                        <Image source={{ uri: 'https://i.pravatar.cc/100?u=resido' }} style={styles.profileImg} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.communityMainCard}>
                                <TouchableOpacity style={styles.cmHeaderRow} onPress={() => setIsSelectModalVisible(true)}>
                                    <View style={styles.cmLogoBox}>
                                        <Image source={require('../../../assets/greenwoods_logo.jpg')} style={styles.cmLogo} />
                                    </View>
                                    <View style={styles.cmNameBox}>
                                        <Text style={styles.cmName} numberOfLines={1}>{(activeWorkspace as any).tenantName}</Text>
                                        <Text style={styles.cmRoleText}>{(activeWorkspace as any).role}</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                                </TouchableOpacity>

                                {/* Stats Grid - Small 4-Column */}
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
                                            <MaterialCommunityIcons name="hand-pointing-up" size={24} color="#6366f1" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.actionTitle}>Raise Request</Text>
                                            <Text style={styles.actionSub}>Submit a request</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#6366f1" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionRow} onPress={() => router.push('/calendar')}>
                                        <View style={[styles.actionIconBox, { backgroundColor: '#f0f9ff' }]}>
                                            <MaterialCommunityIcons name="calendar-month" size={24} color="#0ea5e9" />
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 12 }}>
                                            <Text style={styles.actionTitle}>View Calendar</Text>
                                            <Text style={styles.actionSub}>Check upcoming events</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={18} color="#0ea5e9" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Quick Access */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Quick Access</Text>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.qaHorizontalScroll}>
                                <QACardCircular icon="construct" title="Services" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/service-search')} />
                                <QACardCircular icon="wallet" title="Finance" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/finance')} />
                                <QACardCircular icon="document-text" title="Documents" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/documents')} />
                                <QACardCircular icon="briefcase" title="Business" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/business-profile')} />
                                <QACardCircular icon="people" title="Community" color="#8b5cf6" bg="#f5f3ff" onPress={() => setIsSelectModalVisible(true)} />
                            </ScrollView>

                            {/* Community Services Grid */}
                            <View style={styles.sectionHeading}>
                                <Text style={styles.sectionTitle}>Community Services</Text>
                            </View>
                            <View style={styles.featuresGrid}>
                                <GridFeatureCard icon="megaphone-outline" title="Noticeboard" color="#10b981" bg="#ecfdf5" onPress={() => router.push('/notices')} />
                                <GridFeatureCard icon="id-card-outline" title="Gate Pass" color="#3b82f6" bg="#eff6ff" onPress={() => router.push('/gate-pass')} />
                                <GridFeatureCard icon="chatbubbles-outline" title="Complaints" color="#f59e0b" bg="#fffbeb" onPress={() => router.push('/complaints')} />
                                <GridFeatureCard icon="build-outline" title="Maintenance" color="#8b5cf6" bg="#f5f3ff" onPress={() => router.push('/maintenance')} />
                            </View>

                            {/* All Features Grid */}
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
                                <GridFeatureCard icon="calendar" title="Calendar" color="#6366f1" bg="#f5f3ff" onPress={() => router.push('/calendar')} />
                                <GridFeatureCard icon="settings" title="Settings" color="#64748b" bg="#f8fafc" onPress={() => router.push('/settings')} />
                                <GridFeatureCard icon="help-circle" title="Support" color="#0ea5e9" bg="#f0f9ff" onPress={() => router.push('/support')} />
                            </View>
                        </>
                    )}

                    {/* Community Selection Modal */}
                    <Modal visible={isSelectModalVisible} transparent={true} animationType="fade" onRequestClose={() => setIsSelectModalVisible(false)}>
                        <Pressable style={styles.modalOverlay} onPress={() => setIsSelectModalVisible(false)}>
                            <View style={styles.dropdownContainer}>
                                <View style={styles.dropdownHeader}>
                                    <Text style={styles.dropdownTitle}>Select Community</Text>
                                    <TouchableOpacity onPress={() => { setIsSelectModalVisible(false); router.push('/create-community'); }}>
                                        <Ionicons name="add-circle" size={24} color="#6366f1" />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={workspaces}
                                    keyExtractor={item => item.tenantId}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity 
                                            style={styles.dropdownItem}
                                            onPress={() => { setActiveWorkspace(item, ''); setIsSelectModalVisible(false); }}
                                        >
                                            <View style={styles.dropdownItemIcon}><MaterialCommunityIcons name="office-building" size={24} color="#6366f1" /></View>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.dropdownItemName}>{item.tenantName}</Text>
                                                <Text style={styles.dropdownItemRole}>{item.role}</Text>
                                            </View>
                                            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
                                        </TouchableOpacity>
                                    )}
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

// Sub-components
function QuickAccessItem({ icon, label }: any) {
    return (
        <TouchableOpacity style={styles.psQuickAccessItem}>
            <View style={styles.psQuickAccessIconBox}>
                <Ionicons name={icon} size={24} color="#6366f1" />
            </View>
            <Text style={styles.psQuickAccessLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function MostSearchedItem({ icon, label }: any) {
    return (
        <TouchableOpacity style={styles.psMostSearchedItem}>
            <Ionicons name={icon} size={20} color="#6366f1" />
            <Text style={styles.psMostSearchedLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function CategoryCard({ label, image }: any) {
    return (
        <TouchableOpacity style={styles.psCategoryCard}>
            <Image source={{ uri: image }} style={styles.psCategoryCardImg} />
            <View style={styles.psCategoryCardOverlay}>
                <Text style={styles.psCategoryCardLabel}>{label}</Text>
            </View>
        </TouchableOpacity>
    );
}

function WorkspaceCard({ label, isActive, onPress, image }: any) {
    return (
        <TouchableOpacity 
            style={[styles.psWorkspaceCard, isActive && styles.psWorkspaceCardActive]} 
            onPress={onPress}
        >
            <View style={styles.psWorkspaceIconBox}>
                <Image source={{ uri: image }} style={styles.psWorkspaceImg} />
            </View>
            <Text style={[styles.psWorkspaceLabel, isActive && styles.psWorkspaceLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );
}

function StoryItem({ name, image, hasStory }: any) {
    return (
        <TouchableOpacity style={styles.psStoryItem}>
            <View style={[styles.psStoryCircle, hasStory && styles.psStoryCircleActive]}>
                <Image source={{ uri: image }} style={styles.psStoryImg} />
            </View>
            <Text style={styles.psStoryLabel} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );
}

function GridFeatureCard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.gridFeatureCard} onPress={onPress}>
            <View style={[styles.gfIconBox, { backgroundColor: bg }]}><Ionicons name={icon as any} size={24} color={color} /></View>
            <Text style={styles.gfTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

function SmallStatItem({ icon, count, label, color, bg }: any) {
    return (
        <View style={styles.smallStatItem}>
            <View style={[styles.smallStatIconBox, { backgroundColor: bg }]}><Ionicons name={icon as any} size={22} color={color} /></View>
            <Text style={styles.smallStatCount}>{count}</Text>
            <Text style={styles.smallStatLabel}>{label}</Text>
        </View>
    );
}

function QACardCircular({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.qaCardCircular} onPress={onPress}>
            <View style={styles.qaIconBoxCircular}><Ionicons name={icon as any} size={24} color={color} /></View>
            <Text style={styles.qaTitleCircular}>{title}</Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#1e1b4b' },
    container: { flex: 1, backgroundColor: '#1e1b4b' },
    content: { paddingBottom: 100 },
    
    // Personal Space Wrapper
    psWrapper: { flex: 1 },
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 25 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psBrandTitleText: { fontSize: 22, fontWeight: '900', color: '#fff', marginLeft: 10 },
    psBrandTaglineText: { fontSize: 11, color: 'rgba(255,255,255,0.6)', fontWeight: '600', marginLeft: 10 },
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    psIconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    psNotifBadge: { position: 'absolute', top: -1, right: -1, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1e1b4b' },
    psNotifCount: { color: '#fff', fontSize: 8, fontWeight: '900' },
    psProfileBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psProfileImg: { width: '100%', height: '100%' },

    psWorkspaceSection: { marginBottom: -2, zIndex: 10 },
    psWorkspaceScroll: { paddingHorizontal: 20, alignItems: 'flex-end', paddingBottom: 0 },
    psWorkspaceCard: { width: 70, height: 75, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 6, justifyContent: 'center', alignItems: 'center', marginRight: 8, opacity: 0.8 },
    psWorkspaceCardActive: { width: 90, height: 95, backgroundColor: '#6366f1', borderWidth: 2, borderColor: '#fff', borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, opacity: 1, zIndex: 20 },
    psWorkspaceIconBox: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    psWorkspaceImg: { width: '100%', height: '100%', resizeMode: 'cover', borderRadius: 15 },
    psWorkspaceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '800', textAlign: 'center' },
    psWorkspaceLabelActive: { color: '#fff', fontSize: 10, fontWeight: '900' },

    psSearchSection: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', gap: 8, borderTopWidth: 2, borderTopColor: '#fff' },
    psSearchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 12, height: 44 },
    psSearchInput: { flex: 1, marginLeft: 8, fontSize: 13, color: '#1e293b', fontWeight: '600' },
    psSearchIconsRight: { paddingLeft: 6, borderLeftWidth: 1, borderLeftColor: '#f1f5f9' },
    psBookmarkBtn: { width: 44, height: 44, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },

    psExploreSection: { marginBottom: 15, paddingHorizontal: 20 },
    psSectionTitle: { fontSize: 13, fontWeight: '900', color: '#fff', marginBottom: 8, opacity: 0.9 },
    psExploreScroll: { paddingBottom: 0 },

    psQuickAccessBar: { marginBottom: 15, paddingHorizontal: 20 },
    psQuickAccessScroll: { paddingVertical: 5 },
    psQuickAccessItem: { alignItems: 'center', marginRight: 12, width: 65 },
    psQuickAccessIconBox: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 4 },
    psQuickAccessLabel: { color: '#fff', fontSize: 10, fontWeight: '900', textAlign: 'center' },

    psMostSearchedSection: { marginBottom: 15, paddingHorizontal: 20 },
    psMostSearchedScroll: { paddingBottom: 0 },
    psMostSearchedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10, marginRight: 8 },
    psMostSearchedLabel: { color: '#1e293b', fontSize: 11, fontWeight: '800', marginLeft: 6 },

    psCategoryCard: { width: 120, height: 70, borderRadius: 14, marginRight: 10, overflow: 'hidden' },
    psCategoryCardImg: { width: '100%', height: '100%', position: 'absolute' },
    psCategoryCardOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 8 },
    psCategoryCardLabel: { color: '#fff', fontSize: 12, fontWeight: '900', textAlign: 'center' },

    psStoriesSection: { marginBottom: 15, paddingHorizontal: 20 },
    psStoriesScroll: { paddingVertical: 5 },
    psStoryItem: { alignItems: 'center', marginRight: 15, width: 75 },
    psStoryCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', padding: 2, justifyContent: 'center', alignItems: 'center' },
    psStoryCircleActive: { borderColor: '#6366f1' },
    psStoryImg: { width: '100%', height: '100%', borderRadius: 31 },
    psStoryLabel: { color: '#fff', fontSize: 11, fontWeight: '700', marginTop: 4, textAlign: 'center' },

    psBanner: { marginHorizontal: 20, backgroundColor: '#2e2b85', borderRadius: 20, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    psBannerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    psBannerImage: { width: 50, height: 50, borderRadius: 25 },
    psBannerTextCol: { flex: 1, marginLeft: 12 },
    psBannerTitle: { fontSize: 16, fontWeight: '900', color: '#fff', marginBottom: 2 },
    psBannerSub: { fontSize: 10, color: 'rgba(255,255,255,0.75)', fontWeight: '600', lineHeight: 14 },
    psBannerBtn: { backgroundColor: '#fbb417', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    psBannerBtnText: { color: '#1e293b', fontWeight: '900', fontSize: 13 },

    psBusinessBanner: { marginHorizontal: 20, backgroundColor: '#4f46e5', borderRadius: 20, padding: 12, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    // Existing Community Dashboard Styles
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
    communityMainCard: { backgroundColor: '#f8fafc', padding: 20, paddingHorizontal: 25, marginBottom: 25, borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#f1f5f9' },
    cmHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
    cmLogoBox: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    cmLogo: { width: 44, height: 44, borderRadius: 10 },
    cmNameBox: { flex: 1, marginLeft: 15 },
    cmName: { fontSize: 19, fontWeight: '900', color: '#1e293b' },
    cmRoleText: { fontSize: 12, color: '#10b981', fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
    statsGridSmall: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    smallStatItem: { width: (width - 100) / 4, alignItems: 'center' },
    smallStatIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    smallStatCount: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    smallStatLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
    cmActions: { gap: 12 },
    actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 20 },
    actionIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    actionTitle: { fontSize: 15, fontWeight: '800', color: '#1e293b' },
    actionSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, marginBottom: 30, justifyContent: 'flex-start' },
    gridFeatureCard: { width: (width - 60) / 4, alignItems: 'center', marginBottom: 20 },
    gfIconBox: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9' },
    gfTitle: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
    qaHorizontalScroll: { paddingLeft: 20, marginBottom: 30 },
    qaCardCircular: { alignItems: 'center', marginRight: 20, width: 70 },
    qaIconBoxCircular: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
    qaTitleCircular: { fontSize: 11, fontWeight: '700', color: '#475569', textAlign: 'center' },
    guestContent: { padding: 30, alignItems: 'center', justifyContent: 'center', flex: 1 },
    guestHero: { alignItems: 'center', marginBottom: 30 },
    brandTitle: { fontSize: 32, fontWeight: '900', color: '#6366f1', marginBottom: 8 },
    heroSub: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 12, textAlign: 'center' },
    heroDesc: { fontSize: 15, color: '#64748b', lineHeight: 24, textAlign: 'center' },
    actionSection: { width: '100%', paddingHorizontal: 20 },
    primaryBtn: { backgroundColor: '#6366f1', paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
    dropdownContainer: { width: width - 40, backgroundColor: '#fff', borderRadius: 32, padding: 20, maxHeight: '70%' },
    dropdownHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    dropdownTitle: { fontSize: 18, fontWeight: '900', color: '#1e293b' },
    dropdownItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    dropdownItemIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    dropdownItemName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    dropdownItemRole: { fontSize: 11, color: '#10b981', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
});
