import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput, Modal, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { threadApi } from '../../services/api';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../BottomNav';
import { getThemeColors } from '../../utils/theme';

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    safeArea: { flex: 1 },
    container: { flex: 1 },
    content: { paddingBottom: 120 },
    psWrapper: { flex: 1 },
    
    // Premium Header
    psHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
    psBrandInfo: { flexDirection: 'row', alignItems: 'center' },
    psLogoBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psWorkspaceImg: { width: '100%', height: '100%', borderRadius: 12 },
    psBrandTitleText: { fontSize: 24, fontWeight: '900', color: '#fff' },
    psBrandTaglineText: { fontSize: 10, color: '#94a3b8', fontWeight: '800', letterSpacing: 1 },
    
    psHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    psIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    psNotifBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#0f172a' },
    psNotifCount: { color: '#fff', fontSize: 8, fontWeight: '900' },
    psProfileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psProfileImg: { width: '100%', height: '100%' },

    // Workspace Bubbles (Matching Image)
    psWorkspaceSection: { marginBottom: 20 },
    psWorkspaceScroll: { paddingHorizontal: 20, gap: 15 },
    wsBubble: { alignItems: 'center', width: 70 },
    wsBubbleActive: { width: 85 },
    wsBubbleImgBox: { width: 60, height: 60, borderRadius: 30, padding: 2, backgroundColor: '#E8E2F2', borderWidth: 2, borderColor: 'transparent' },
    wsBubbleImgBoxActive: { width: 75, height: 75, borderRadius: 37.5, borderColor: '#A084CA' },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 40 },
    wsBubbleLabel: { color: '#7A6B9C', fontSize: 10, fontWeight: '800', marginTop: 8 },
    wsBubbleLabelActive: { color: '#A084CA', fontSize: 11, fontWeight: '900' },

    // Search Section
    psSearchSection: { paddingHorizontal: 20, marginBottom: 20, flexDirection: 'row', gap: 10 },
    psSearchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8E2F2', borderRadius: 16, paddingHorizontal: 15, height: 48, borderWidth: 1, borderColor: 'rgba(91, 75, 138, 0.1)' },
    psSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#2D2445', fontWeight: '600' },
    psSearchIconsRight: { paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: 'rgba(91, 75, 138, 0.1)' },
    psBookmarkBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E8E2F2', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(91, 75, 138, 0.1)' },

    // Community Body
    communityBody: { paddingHorizontal: 20 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
    dbIconItem: { width: '18%', alignItems: 'center' },
    dbIconBox: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1, borderColor: 'rgba(91, 75, 138, 0.1)' },
    dbIconLabel: { color: '#2D2445', fontSize: 9, fontWeight: '800', textAlign: 'center' },

    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, backgroundColor: '#E8E2F2', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(91, 75, 138, 0.1)' },
    statBox: { alignItems: 'center', flex: 1 },
    statBoxCount: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    statBoxLabel: { fontSize: 9, color: '#7A6B9C', fontWeight: '700', marginTop: 2 },

    sectionContainer: { marginBottom: 25 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#2D2445', marginBottom: 15 },
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    featureCard: { width: '48%', height: 100, borderRadius: 20, padding: 15, justifyContent: 'space-between' },
    fCardHeader: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    fCardTitle: { color: '#fff', fontSize: 13, fontWeight: '800' },

    announcementCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8E2F2', padding: 18, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(91, 75, 138, 0.1)' },
    annIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(91, 75, 138, 0.1)', alignItems: 'center', justifyContent: 'center' },
    annTitle: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    annSub: { fontSize: 12, color: '#7A6B9C', marginTop: 4 },

    // My Space Body
    mySpaceBody: { paddingHorizontal: 20 },
    psStoriesSection: { marginBottom: 25 },
    psStoriesScroll: { gap: 15 },
    psStoryItem: { alignItems: 'center', width: 70 },
    psStoryCircle: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, borderColor: '#A084CA', padding: 2 },
    psStoryCircleActive: { borderColor: '#A084CA' },
    psStoryImg: { width: '100%', height: '100%', borderRadius: 30 },
    psStoryAddBadge: { position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: '#A084CA', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
    psStoryLabel: { color: '#2D2445', fontSize: 11, fontWeight: '700', marginTop: 6 },

    psQuickAccessBar: { marginBottom: 30 },
    psQuickAccessScroll: { gap: 15 },
    psQuickAccessItem: { alignItems: 'center', width: 70 },
    psQuickAccessIconBox: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1 },
    psQuickAccessLabel: { color: '#2D2445', fontSize: 11, fontWeight: '800', textAlign: 'center' },

    psBusinessBanner: { backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1 },
    psBannerContent: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    psBannerIconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    psBannerTextCol: { marginLeft: 15, flex: 1 },
    psBannerTitle: { fontSize: 16, fontWeight: '900', color: '#fff' },
    psBannerSub: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    psBannerBtn: { paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
    psBannerBtnText: { fontWeight: '900', fontSize: 14 },

    guestContent: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center' },
    guestHero: { alignItems: 'center', marginBottom: 40 },
    brandTitle: { fontSize: 36, fontWeight: '900', color: '#A084CA', marginBottom: 10 },
    heroSub: { fontSize: 22, fontWeight: '800', color: '#2D2445', textAlign: 'center', marginBottom: 15 },
    heroDesc: { fontSize: 15, color: '#7A6B9C', textAlign: 'center', lineHeight: 24 },
    actionSection: { width: '100%' },
    primaryBtn: { backgroundColor: '#A084CA', paddingVertical: 18, borderRadius: 18, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
});

export default function DefaultDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    const [isSelectModalVisible, setIsSelectModalVisible] = React.useState(false);
    const [activeCategory, setActiveCategory] = React.useState('Electronics');
    const [contactFlares, setContactFlares] = React.useState<any[]>([]);
    const [loadingFlares, setLoadingFlares] = React.useState(false);
    const [touchStartX, setTouchStartX] = React.useState(0);

    React.useEffect(() => {
        if (!activeWorkspace && user) {
            fetchContactFlares();
        }
    }, [activeWorkspace, user]);

    const fetchContactFlares = async () => {
        try {
            setLoadingFlares(true);
            const { data } = await threadApi.getFlares();
            // In a real app, filter by contacts. Here we show all recent flares in My Space mock.
            setContactFlares(data || []);
        } catch (error) {
            console.error('Failed to fetch contact flares:', error);
        } finally {
            setLoadingFlares(false);
        }
    };

    const isGuest = !user;
    
    // Premium My Space Theme (White & Dark Lavender)
    const isMySpace = !activeWorkspace;
    const mySpaceBg = '#F5F5F7';
    const mySpaceText = '#2D2445';
    const mySpaceSubText = '#7A6B9C';
    const darkLavender = '#A084CA';
    const lightLavender = '#E8E2F2';

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
        <SafeAreaView 
            style={[styles.safeArea, { backgroundColor: '#F5F5F7' }]}
            onTouchStart={e => setTouchStartX(e.nativeEvent.pageX)}
            onTouchEnd={e => {
                const touchEndX = e.nativeEvent.pageX;
                const dx = touchStartX - touchEndX;
                if (dx > 80) { // Swiped left -> Go to Community
                    if (!activeWorkspace && workspaces.length > 0) {
                        setActiveWorkspace(workspaces[0], '');
                    }
                } else if (dx < -80) { // Swiped right -> Go to My Space
                    if (activeWorkspace) {
                        setActiveWorkspace(null as any, '');
                    }
                }
            }}
        >
            <ScrollView style={[styles.container, { backgroundColor: '#F5F5F7' }]} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <View style={styles.psWrapper}>
                        {/* Premium Header */}
                        <View style={[styles.psHeader, { backgroundColor: '#F5F5F7' }]}>
                            <View style={styles.psBrandInfo}>
                                <View style={[styles.psLogoBox, { backgroundColor: lightLavender, borderColor: 'rgba(91, 75, 138, 0.2)' }]}>
                                    <Image 
                                        source={activeWorkspace ? require('../../../assets/greenwoods_logo.jpg') : require('../../../assets/resido_logo.jpg')} 
                                        style={styles.psWorkspaceImg} 
                                    />
                                </View>
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={[styles.psBrandTitleText, { color: mySpaceText }]}>
                                        {activeWorkspace ? (activeWorkspace as any).tenantName : "Resido"}
                                    </Text>
                                    <Text style={[styles.psBrandTaglineText, { color: mySpaceSubText }]}>
                                        {activeWorkspace ? (activeWorkspace as any).role : "PERSONAL SPACE"}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.psHeaderActions}>
                                <TouchableOpacity style={[styles.psIconBtn, { backgroundColor: lightLavender }]}>
                                    <Ionicons name="notifications" size={22} color={darkLavender} />
                                    <View style={styles.psNotifBadge}>
                                        <Text style={styles.psNotifCount}>3</Text>
                                    </View>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.psProfileBtn, { borderColor: 'rgba(91, 75, 138, 0.2)' }]} onPress={() => router.push('/profile')}>
                                    <Image source={{ uri: user?.profilePhoto || "https://i.pravatar.cc/100?u=resido" }} style={styles.psProfileImg} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Premium Workspace Switcher (Bubbles) */}
                        <View style={styles.psWorkspaceSection}>
                            <ScrollView 
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                contentContainerStyle={styles.psWorkspaceScroll}
                            >
                                <WorkspaceBubble 
                                    label="My Space" 
                                    isActive={!activeWorkspace} 
                                    onPress={() => setActiveWorkspace(null as any, '')} 
                                    image={user?.profilePhoto || "https://i.pravatar.cc/100?u=resido"}
                                />
                                {workspaces.map((ws: any) => (
                                    <WorkspaceBubble 
                                        key={ws.tenantId} 
                                        label={ws.tenantName} 
                                        isActive={activeWorkspace?.tenantId === ws.tenantId} 
                                        onPress={() => setActiveWorkspace(ws, '')} 
                                        image="https://cdn-icons-png.flaticon.com/512/9374/9374944.png"
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Search Bar (Floating Style) */}
                        <View style={styles.psSearchSection}>
                            <View style={[styles.psSearchBar, { backgroundColor: isMySpace ? lightLavender : theme.surface }]}>
                                <Ionicons name="search" size={20} color={isMySpace ? darkLavender : "#94a3b8"} />
                                <TextInput 
                                    placeholder="Search for 'Coconut Water'..." 
                                    style={[styles.psSearchInput, { color: isMySpace ? mySpaceText : '#fff' }]}
                                    placeholderTextColor={isMySpace ? mySpaceSubText : "#64748b"}
                                />
                                <View style={styles.psSearchIconsRight}>
                                    <Ionicons name="clipboard-outline" size={20} color={isMySpace ? darkLavender : "#94a3b8"} />
                                </View>
                            </View>
                            <TouchableOpacity style={[styles.psBookmarkBtn, { backgroundColor: isMySpace ? darkLavender : theme.primary }]}>
                                <Ionicons name="bookmark-outline" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Dashboard Body */}
                        {activeWorkspace ? (
                            <View style={styles.communityBody}>
                                <View style={styles.gridContainer}>
                                    <DashboardIcon icon="newspaper" label="Feed" color={darkLavender} bg="#E8E2F2" onPress={() => router.push('/thread')} />
                                    <DashboardIcon icon="calendar" label="Events" color={darkLavender} bg="#E8E2F2" onPress={() => router.push('/calendar')} />
                                    <DashboardIcon icon="megaphone" label="Requests" color={darkLavender} bg="#E8E2F2" onPress={() => router.push('/complaints')} />
                                </View>

                                {/* Small Stats Section */}
                                <View style={styles.statsRow}>
                                    {activeWorkspace.role !== 'RESIDENT' && (
                                        <StatBox count="128" label="Families" icon="people" color={theme.accent} />
                                    )}
                                    <StatBox count="24" label="Staff" icon="person-circle" color={theme.accent} />
                                    <StatBox count="56" label="Visitors" icon="walk" color={theme.accent} />
                                </View>

                                {/* Featured Sections */}
                                <View style={styles.sectionContainer}>
                                    <Text style={styles.sectionTitle}>Community Services</Text>
                                    <View style={styles.featureGrid}>
                                        <FeatureCard icon="people" title="Directory" color="#fff" bg="#38a169" onPress={() => router.push('/members')} />
                                        <FeatureCard icon="id-card" title="Staff" color="#fff" bg="#3182ce" onPress={() => router.push('/staff')} />
                                        <FeatureCard icon="chatbubble" title="Req & Complaints" color="#fff" bg="#744210" onPress={() => router.push('/complaints')} />
                                        
                                        {/* Additional icons for Resident if needed */}
                                        {activeWorkspace.role === 'RESIDENT' && (
                                            <>
                                                <FeatureCard icon="id-card" title="Gate Pass" color="#fff" bg="#3b82f6" onPress={() => router.push('/gatepass')} />
                                                <FeatureCard icon="document-text" title="Rules & Regs" color="#fff" bg="#8b5cf6" onPress={() => router.push('/rules')} />
                                                <FeatureCard icon="notifications" title="Announcements" color="#fff" bg="#f43f5e" onPress={() => router.push('/notices')} />
                                            </>
                                        )}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            /* My Space View (Flares + Quick Access) */
                            <View style={styles.mySpaceBody}>
                                <View style={styles.psStoriesSection}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psStoriesScroll}>
                                        {/* My Flare */}
                                        <TouchableOpacity style={styles.psStoryItem} onPress={() => router.push('/create-flare')}>
                                            <View style={[styles.psStoryCircle, { borderColor: darkLavender }]}>
                                                <Image source={{ uri: user?.profilePhoto || "https://i.pravatar.cc/100?u=me" }} style={styles.psStoryImg} />
                                                <View style={[styles.psStoryAddBadge, { backgroundColor: darkLavender }]}><Ionicons name="add" size={12} color="#fff" /></View>
                                            </View>
                                            <Text style={[styles.psStoryLabel, { color: mySpaceText }]}>My Space</Text>
                                        </TouchableOpacity>
                                        {/* Demo Flares */}
                                        <StoryItem name="Greenwoods" image="https://i.pravatar.cc/100?u=g" hasStory={true} />
                                        <StoryItem name="Alex" image="https://i.pravatar.cc/100?u=a" hasStory={true} />
                                    </ScrollView>
                                </View>

                                <View style={styles.psQuickAccessBar}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psQuickAccessScroll}>
                                        <QuickAccessItem icon="add-circle" label="Create Community" color={darkLavender} onPress={() => router.push('/create-community')} />
                                        <QuickAccessItem icon="business" label="Business" color={darkLavender} onPress={() => router.push('/business-profiles')} />
                                        <QuickAccessItem icon="wallet" label="Finance" color={darkLavender} onPress={() => router.push('/finance')} />
                                        <QuickAccessItem icon="grid" label="Services" color={darkLavender} onPress={() => router.push('/service-search')} />
                                        <QuickAccessItem icon="document-text" label="Notes" color={darkLavender} onPress={() => router.push('/notes')} />
                                        <QuickAccessItem icon="folder" label="Docs" color={darkLavender} onPress={() => router.push('/documents')} />
                                    </ScrollView>
                                </View>

                                {/* Community Creation Banner */}
                                <View style={[styles.psBusinessBanner, { backgroundColor: darkLavender, borderColor: 'transparent' }]}>
                                    <View style={styles.psBannerContent}>
                                        <View style={[styles.psBannerIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Ionicons name="people" size={26} color="#fff" /></View>
                                        <View style={styles.psBannerTextCol}>
                                            <Text style={[styles.psBannerTitle, { color: '#fff' }]}>Create Your Community</Text>
                                            <Text style={[styles.psBannerSub, { color: 'rgba(255,255,255,0.7)' }]}>Set up a new space for your apartment or area</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={[styles.psBannerBtn, { backgroundColor: '#fff' }]} onPress={() => router.push('/create-community')}>
                                        <Text style={[styles.psBannerBtnText, { color: darkLavender }]}>Create Community</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Business Banner */}
                                <View style={[styles.psBusinessBanner, { backgroundColor: '#4A3B70', borderColor: 'transparent' }]}>
                                    <View style={styles.psBannerContent}>
                                        <View style={[styles.psBannerIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Ionicons name="business" size={26} color="#fff" /></View>
                                        <View style={styles.psBannerTextCol}>
                                            <Text style={[styles.psBannerTitle, { color: '#fff' }]}>Manage Your Business</Text>
                                            <Text style={[styles.psBannerSub, { color: 'rgba(255,255,255,0.7)' }]}>Create and grow your business profile</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={[styles.psBannerBtn, { backgroundColor: '#fff' }]} onPress={() => router.push('/business-profiles')}>
                                        <Text style={[styles.psBannerBtnText, { color: '#4A3B70' }]}>Manage Business</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

// Custom Sub-components for Premium UI
function WorkspaceBubble({ label, isActive, onPress, image }: any) {
    return (
        <TouchableOpacity 
            style={[styles.wsBubble, isActive && styles.wsBubbleActive]} 
            onPress={onPress}
        >
            <View style={[styles.wsBubbleImgBox, isActive && styles.wsBubbleImgBoxActive]}>
                <Image source={{ uri: image }} style={styles.wsBubbleImg} />
            </View>
            <Text style={[styles.wsBubbleLabel, isActive && styles.wsBubbleLabelActive]} numberOfLines={1}>{label}</Text>
        </TouchableOpacity>
    );
}

function DashboardIcon({ icon, label, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={styles.dbIconItem} onPress={onPress}>
            <View style={[styles.dbIconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={28} color={color} />
            </View>
            <Text style={styles.dbIconLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function StatBox({ count, label, icon, color }: any) {
    return (
        <View style={styles.statBox}>
            <Ionicons name={icon as any} size={20} color={color || "#fff"} style={{ marginBottom: 4, opacity: 0.7 }} />
            <Text style={styles.statBoxCount}>{count}</Text>
            <Text style={styles.statBoxLabel}>{label}</Text>
        </View>
    );
}

function FeatureCard({ icon, title, color, bg, onPress }: any) {
    return (
        <TouchableOpacity style={[styles.featureCard, { backgroundColor: bg }]} onPress={onPress}>
            <View style={styles.fCardHeader}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.fCardTitle}>{title}</Text>
        </TouchableOpacity>
    );
}

function QuickAccessItem({ icon, label, color, onPress }: any) {
    return (
        <TouchableOpacity style={styles.psQuickAccessItem} onPress={onPress}>
            <View style={[styles.psQuickAccessIconBox, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.psQuickAccessLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function StoryItem({ name, image, hasStory, onPress }: any) {
    return (
        <TouchableOpacity style={styles.psStoryItem} onPress={onPress}>
            <View style={[styles.psStoryCircle, hasStory && styles.psStoryCircleActive]}>
                <Image source={{ uri: image }} style={styles.psStoryImg} />
            </View>
            <Text style={styles.psStoryLabel} numberOfLines={1}>{name}</Text>
        </TouchableOpacity>
    );
}
