import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, SafeAreaView, Dimensions, TextInput, Modal, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { threadApi, authApi } from '../../services/api';
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
    psNotifBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ef4444', minWidth: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000000' },
    psNotifCount: { color: '#fff', fontSize: 8, fontWeight: '900' },
    psProfileBtn: { width: 40, height: 40, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    psProfileImg: { width: '100%', height: '100%' },

    // Workspace Bubbles (Matching Image)
    psWorkspaceSection: { marginBottom: 20 },
    psWorkspaceScroll: { paddingHorizontal: 20, gap: 15 },
    wsBubble: { alignItems: 'center', width: 85, opacity: 0.5 },
    wsBubbleActive: { opacity: 1 },
    wsBubbleImgBox: { width: 45, height: 45, borderRadius: 22.5, padding: 2, backgroundColor: '#1e293b', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    wsBubbleImgBoxActive: { width: 75, height: 75, borderRadius: 37.5, borderColor: '#1d4ed8', borderWidth: 3 },
    wsBubbleImg: { width: '100%', height: '100%', borderRadius: 37.5 },
    wsBubbleLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', marginTop: 8 },
    wsBubbleLabelActive: { color: '#1d4ed8', fontSize: 12, fontWeight: '900' },

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
    dbIconLabel: { color: '#ffffff', fontSize: 9, fontWeight: '800', textAlign: 'center' },

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
    psQuickAccessLabel: { color: '#ffffff', fontSize: 11, fontWeight: '800', textAlign: 'center' },

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

    activitySection: { marginTop: 25, marginBottom: 40 },
    activityHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    activityTitleMain: { fontSize: 18, fontWeight: '900' },
    activitySubMain: { fontSize: 12, marginTop: 2 },
    activityCard: { borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 8, elevation: 1 },
    activityCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    activityAvatar: { width: 38, height: 38, borderRadius: 19 },
    activityAuthorInfo: { flex: 1, marginLeft: 10 },
    activityAuthorRow: { flexDirection: 'row', alignItems: 'center' },
    activityAuthorName: { fontSize: 14, fontWeight: '800' },
    activityMeta: { fontSize: 11, marginTop: 2, fontWeight: '600' },
    activityTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
    activityTypeText: { fontSize: 10, fontWeight: '800' },
    activityVisBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 0.5, marginTop: 4, alignSelf: 'flex-end' },
    activityVisText: { fontSize: 9, fontWeight: '700' },
    activityCardBody: { marginTop: 4 },
    activityTitle: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
    activityContent: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
    activityMediaWrapper: { width: '100%', height: 160, borderRadius: 12, overflow: 'hidden', marginTop: 12, position: 'relative' },
    activityMedia: { width: '100%', height: '100%' },
    playOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.2)', alignItems: 'center', justifyContent: 'center' },
    activityEmptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 20, backgroundColor: 'rgba(91, 75, 138, 0.02)', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(91, 75, 138, 0.2)' },
    activityEmptyText: { fontSize: 15, fontWeight: '800', marginTop: 10 },
    activityEmptySub: { fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 },

    // Role Switcher
    roleSwitcherRow: { marginBottom: 12 },
    rolePill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    rolePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
    rolePillText: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
    rolePillTextActive: { color: '#fff' },
});

export default function DefaultDashboard() {
    const router = useRouter();
    const { user, workspaces, activeWorkspace, setActiveWorkspace, switchRole } = useAuthStore();
    const theme = getThemeColors(activeWorkspace?.tenantId);
    const [touchStartX, setTouchStartX] = React.useState(0);
    const { width: windowWidth } = Dimensions.get('window');
    const workspaceScrollRef = React.useRef<ScrollView>(null);
    const pageScrollRef = React.useRef<ScrollView>(null);
    const [switchingRole, setSwitchingRole] = React.useState(false);

    const [items, setItems] = React.useState<any[]>([]);
    const [loadingActivity, setLoadingActivity] = React.useState(false);

    const timeAgo = (dateStr: string) => {
        const now = new Date();
        const date = new Date(dateStr);
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHrs = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHrs / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHrs < 24) return `${diffHrs}h ago`;
        return `${diffDays}d ago`;
    };

    const fetchRecentActivity = async () => {
        try {
            setLoadingActivity(true);
            
            // 1. Fetch following list
            let following: string[] = [];
            try {
                const { data: followList } = await authApi.getFollowing();
                following = followList || [];
            } catch (err) {
                console.warn('Failed to fetch following users:', err);
            }

            // 2. Fetch following + public threads & flares
            const promises = [
                threadApi.getThreads({ feedType: 'FOLLOWING', followingIds: following }).catch(() => ({ data: [] })),
                threadApi.getThreads({ feedType: 'PUBLIC' }).catch(() => ({ data: [] })),
                threadApi.getFlares({ feedType: 'FOLLOWING', followingIds: following }).catch(() => ({ data: [] })),
                threadApi.getFlares({ feedType: 'PUBLIC' }).catch(() => ({ data: [] }))
            ];

            const [followingThreadsRes, publicThreadsRes, followingFlaresRes, publicFlaresRes] = await Promise.all(promises);

            const allThreads = [...(followingThreadsRes.data || []), ...(publicThreadsRes.data || [])];
            const allFlares = [...(followingFlaresRes.data || []), ...(publicFlaresRes.data || [])];

            const threadsWithType = allThreads.map((t: any) => ({ ...t, itemType: 'THREAD' }));
            const flaresWithType = allFlares.map((f: any) => ({ ...f, itemType: 'FLARE' }));

            const combined = [...threadsWithType, ...flaresWithType];

            // Remove duplicates by ID
            const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());

            // Prioritize: Contacts -> Followers -> Public -> Recent
            unique.sort((a, b) => {
                const getPriority = (item: any) => {
                    if (item.visibility === 'CONTACTS') return 3;
                    if (item.visibility === 'FOLLOWERS') return 2;
                    return 1;
                };

                const priorityA = getPriority(a);
                const priorityB = getPriority(b);

                if (priorityA !== priorityB) {
                    return priorityB - priorityA;
                }
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });

            setItems(unique);
        } catch (e) {
            console.error('Failed to load recent activity:', e);
        } finally {
            setLoadingActivity(false);
        }
    };

    React.useEffect(() => {
        if (user) {
            fetchRecentActivity();
        }
    }, [user]);

    React.useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const res = await authApi.getWorkspaces();
                useAuthStore.getState().setWorkspaces(res.data);
            } catch (e) {
                console.warn('Failed to fetch workspaces on mount:', e);
            }
        };

        if (user) {
            fetchWorkspaces();
        }
    }, [user]);

    // Align ScrollViews if default activeWorkspace is already selected on mount
    React.useEffect(() => {
        if (activeWorkspace && workspaces.length > 0) {
            const idx = workspaces.findIndex(w => w.tenantId === activeWorkspace.tenantId);
            if (idx !== -1) {
                const targetIndex = idx + 1;
                const timer = setTimeout(() => {
                    pageScrollRef.current?.scrollTo({ x: targetIndex * windowWidth, animated: false });
                    workspaceScrollRef.current?.scrollTo({ x: targetIndex * 100, animated: false });
                }, 150);
                return () => clearTimeout(timer);
            }
        }
    }, [activeWorkspace, workspaces]);


    const handleSelectWorkspace = async (ws: any, targetIndex: number) => {
        try {
            if (ws === null) {
                setActiveWorkspace(null as any, '');
                pageScrollRef.current?.scrollTo({ x: 0, animated: true });
                workspaceScrollRef.current?.scrollTo({ x: 0, animated: true });
            } else {
                // When selecting a workspace, default to the first role
                const defaultRole = ws.roles?.[0] || ws.role;

                // Optimistically transition UI instantly
                pageScrollRef.current?.scrollTo({ x: targetIndex * windowWidth, animated: true });
                workspaceScrollRef.current?.scrollTo({ x: targetIndex * 100, animated: true });

                const currentToken = useAuthStore.getState().token || '';
                setActiveWorkspace({ ...ws, role: defaultRole }, currentToken);

                // Run network switch in the background
                const res = await authApi.switchWorkspace(ws.tenantId, defaultRole);
                
                // Silently update once resolved
                setActiveWorkspace({ ...ws, role: defaultRole }, res.data.accessToken);
            }
        } catch (e) {
            console.error('Failed to switch workspace on selection:', e);
        }
    };

    const handleSwitchRole = async (role: string) => {
        if (!activeWorkspace || switchingRole) return;
        const previousRole = activeWorkspace.role;
        const currentToken = useAuthStore.getState().token || '';
        try {
            setSwitchingRole(true);
            // Optimistically update role state
            switchRole(role as any, currentToken);

            const res = await authApi.switchWorkspace(activeWorkspace.tenantId, role);
            switchRole(role as any, res.data.accessToken);
        } catch (e) {
            console.error('Failed to switch role:', e);
            // Revert on failure
            switchRole(previousRole as any, currentToken);
        } finally {
            setSwitchingRole(false);
        }
    };

    const isGuest = !user;
    
    const isMySpace = !activeWorkspace;
    const mySpaceBg = theme.background;
    const mySpaceText = '#ffffff';
    const mySpaceSubText = '#60a5fa';
    const darkLavender = theme.primary;
    const lightLavender = theme.accent;
 
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
        <SafeAreaView style={[styles.safeArea, { backgroundColor: mySpaceBg }]}>
            <ScrollView style={[styles.container, { backgroundColor: mySpaceBg }]} showsVerticalScrollIndicator={false}>
                <View style={styles.content}>
                    <View style={styles.psWrapper}>
                        {/* Premium Header */}
                        <View style={[styles.psHeader, { backgroundColor: mySpaceBg }]}>
                            <View style={styles.psBrandInfo}>
                                <View style={[styles.psLogoBox, { backgroundColor: lightLavender, borderColor: 'rgba(91, 75, 138, 0.2)' }]}>
                                    <Image 
                                        source={(activeWorkspace as any)?.photoUrl ? { uri: (activeWorkspace as any).photoUrl } : (activeWorkspace ? require('../../../assets/greenwoods_logo.jpg') : require('../../../assets/resido_logo.jpg'))} 
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

                        </View>
 
                        {/* Premium Workspace Switcher (Bubbles) */}
                        <View style={styles.psWorkspaceSection}>
                            <ScrollView 
                                ref={workspaceScrollRef}
                                horizontal 
                                showsHorizontalScrollIndicator={false} 
                                contentContainerStyle={styles.psWorkspaceScroll}
                                snapToInterval={100}
                                decelerationRate="fast"
                            >
                                <WorkspaceBubble 
                                    label="My Space" 
                                    isActive={!activeWorkspace} 
                                    onPress={() => handleSelectWorkspace(null, 0)} 
                                    image={user?.profilePhoto || "https://i.pravatar.cc/100?u=resido"}
                                />
                                {workspaces.map((ws: any, idx: number) => (
                                    <WorkspaceBubble 
                                        key={ws.tenantId} 
                                        label={ws.tenantName} 
                                        isActive={activeWorkspace?.tenantId === ws.tenantId} 
                                        onPress={() => handleSelectWorkspace(ws, idx + 1)} 
                                        image={ws.photoUrl || "https://cdn-icons-png.flaticon.com/512/9374/9374944.png"}
                                    />
                                ))}
                            </ScrollView>
                        </View>

                        {/* Role Switcher — shown only when active workspace has multiple roles */}
                        {activeWorkspace && (activeWorkspace.roles?.length ?? 0) > 1 && (
                            <View style={styles.roleSwitcherRow}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}>
                                    {activeWorkspace.roles.map((r) => (
                                        <TouchableOpacity
                                            key={r}
                                            onPress={() => handleSwitchRole(r)}
                                            style={[
                                                styles.rolePill,
                                                activeWorkspace.role === r && styles.rolePillActive
                                            ]}
                                            disabled={switchingRole}
                                        >
                                            <Text style={[
                                                styles.rolePillText,
                                                activeWorkspace.role === r && styles.rolePillTextActive
                                            ]}>
                                                {r.replace(/_/g, ' ')}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Search Bar (Floating Style) */}
                        <View style={styles.psSearchSection}>
                            <View style={[styles.psSearchBar, { backgroundColor: isMySpace ? lightLavender : theme.surface }]}>
                                <Ionicons name="search" size={20} color={isMySpace ? darkLavender : "#94a3b8"} />
                                <TextInput 
                                    placeholder="Search for the services needed" 
                                    style={[styles.psSearchInput, { color: '#ffffff' }]}
                                    placeholderTextColor="rgba(255,255,255,0.6)"
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
                        <ScrollView 
                            ref={pageScrollRef}
                            horizontal 
                            pagingEnabled 
                            scrollEnabled={false}
                            showsHorizontalScrollIndicator={false}
                            style={{ width: windowWidth }}
                        >
                            {/* Page 1: My Space View (Flares + Quick Access) */}
                            <View style={{ width: windowWidth, paddingHorizontal: 20 }}>


                                <View style={styles.psQuickAccessBar}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.psQuickAccessScroll} nestedScrollEnabled={true}>
                                        <QuickAccessItem icon="add-circle-outline" label="Create" color={darkLavender} onPress={() => router.push('/create-community')} />
                                        <QuickAccessItem icon="storefront-outline" label="Business" color={darkLavender} onPress={() => router.push('/business-profiles')} />
                                        <QuickAccessItem icon="wallet-outline" label="Finance" color={darkLavender} onPress={() => router.push('/finance')} />
                                        <QuickAccessItem icon="construct-outline" label="Services" color={darkLavender} onPress={() => router.push('/service-search')} />
                                        <QuickAccessItem icon="journal-outline" label="Notes" color={darkLavender} onPress={() => router.push('/notes')} />
                                        <QuickAccessItem icon="folder-outline" label="Docs" color={darkLavender} onPress={() => router.push('/documents')} />
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
                                <View style={[styles.psBusinessBanner, { backgroundColor: darkLavender, borderColor: 'transparent' }]}>
                                    <View style={styles.psBannerContent}>
                                        <View style={[styles.psBannerIconBox, { backgroundColor: 'rgba(255,255,255,0.2)' }]}><Ionicons name="business" size={26} color="#fff" /></View>
                                        <View style={styles.psBannerTextCol}>
                                            <Text style={[styles.psBannerTitle, { color: '#fff' }]}>Manage Your Business</Text>
                                            <Text style={[styles.psBannerSub, { color: 'rgba(255,255,255,0.7)' }]}>Create and grow your business profile</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={[styles.psBannerBtn, { backgroundColor: '#fff' }]} onPress={() => router.push('/business-profiles')}>
                                        <Text style={[styles.psBannerBtnText, { color: darkLavender }]}>Manage Business</Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Recent Activity Feed */}
                                <View style={styles.activitySection}>
                                    <View style={styles.activityHeader}>
                                        <View>
                                            <Text style={[styles.activityTitleMain, { color: mySpaceText }]}>Recent Feed</Text>
                                            <Text style={[styles.activitySubMain, { color: mySpaceSubText }]}>Updates from your contacts, followers & community</Text>
                                        </View>
                                        {loadingActivity && <ActivityIndicator size="small" color={darkLavender} />}
                                    </View>

                                    {items.length === 0 ? (
                                        <View style={styles.activityEmptyState}>
                                            <Ionicons name="sparkles-outline" size={40} color={mySpaceSubText} style={{ opacity: 0.6 }} />
                                            <Text style={[styles.activityEmptyText, { color: mySpaceText }]}>No recent activity yet</Text>
                                            <Text style={[styles.activityEmptySub, { color: mySpaceSubText }]}>Follow people or sync contacts to see their private/public updates here!</Text>
                                        </View>
                                    ) : (
                                        items.map(item => (
                                            <View key={item.id} style={[styles.activityCard, { backgroundColor: mySpaceBg === '#000000' ? '#111827' : '#ffffff', borderColor: 'rgba(91, 75, 138, 0.1)' }]}>
                                                {/* Header */}
                                                <View style={styles.activityCardHeader}>
                                                    <Image source={{ uri: item.authorAvatar || 'https://i.pravatar.cc/100' }} style={styles.activityAvatar} />
                                                    <View style={styles.activityAuthorInfo}>
                                                        <View style={styles.activityAuthorRow}>
                                                            <Text style={[styles.activityAuthorName, { color: mySpaceText }]}>{item.authorName || 'Anonymous'}</Text>
                                                            {item.isVerified && <MaterialCommunityIcons name="check-decagram" size={14} color="#be185d" style={{ marginLeft: 4 }} />}
                                                        </View>
                                                        <Text style={[styles.activityMeta, { color: mySpaceSubText }]}>
                                                            {item.location || 'Resido'} • {timeAgo(item.createdAt)}
                                                        </Text>
                                                    </View>
                                                    {/* Type specifier & Visibility badge */}
                                                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                                        <View style={[styles.activityTypeBadge, { backgroundColor: item.itemType === 'FLARE' ? '#fdf2f8' : '#f0fdf4', borderColor: item.itemType === 'FLARE' ? '#fbcfe8' : '#bbf7d0' }]}>
                                                            <Text style={[styles.activityTypeText, { color: item.itemType === 'FLARE' ? '#be185d' : '#15803d' }]}>{item.itemType}</Text>
                                                        </View>
                                                        <View style={[
                                                            styles.activityVisBadge,
                                                            { 
                                                                backgroundColor: item.visibility === 'CONTACTS' ? '#fef2f2' : item.visibility === 'FOLLOWERS' ? '#eff6ff' : '#f8fafc',
                                                                borderColor: item.visibility === 'CONTACTS' ? '#fecaca' : item.visibility === 'FOLLOWERS' ? '#bfdbfe' : '#e2e8f0'
                                                            }
                                                        ]}>
                                                            <Ionicons 
                                                                name={item.visibility === 'CONTACTS' ? 'people' : item.visibility === 'FOLLOWERS' ? 'person-add' : 'globe-outline'} 
                                                                size={10} 
                                                                color={item.visibility === 'CONTACTS' ? '#dc2626' : item.visibility === 'FOLLOWERS' ? '#2563eb' : '#64748b'} 
                                                                style={{ marginRight: 3 }}
                                                            />
                                                            <Text style={[
                                                                styles.activityVisText,
                                                                { color: item.visibility === 'CONTACTS' ? '#dc2626' : item.visibility === 'FOLLOWERS' ? '#2563eb' : '#64748b' }
                                                            ]}>
                                                                {item.visibility || 'PUBLIC'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>

                                                {/* Body */}
                                                <TouchableOpacity 
                                                    onPress={() => {
                                                        if (item.itemType === 'FLARE') {
                                                            router.push({ pathname: '/flares', params: { initialId: item.id } });
                                                        } else {
                                                            router.push(`/thread/${item.id}`);
                                                        }
                                                    }}
                                                    style={styles.activityCardBody}
                                                >
                                                    {item.title ? <Text style={[styles.activityTitle, { color: mySpaceText }]}>{item.title}</Text> : null}
                                                    {item.content ? <Text style={[styles.activityContent, { color: mySpaceSubText }]} numberOfLines={3}>{item.content}</Text> : null}
                                                    
                                                    {/* Optional media preview */}
                                                    {item.mediaUrls && item.mediaUrls.length > 0 && (
                                                        <View style={styles.activityMediaWrapper}>
                                                            <Image source={{ uri: item.mediaUrls[0] }} style={styles.activityMedia} />
                                                            {item.itemType === 'FLARE' && (
                                                                <View style={styles.playOverlay}>
                                                                    <Ionicons name="play-circle" size={36} color="#fff" />
                                                                </View>
                                                            )}
                                                        </View>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </View>

                            {/* Pages 2+: Communities */}
                            {workspaces.map((ws: any) => (
                                <View style={{ width: windowWidth, paddingHorizontal: 20 }} key={ws.tenantId}>
                                    <View style={styles.gridContainer}>
                                        <DashboardIcon icon="newspaper" label="Feed" color={darkLavender} bg="#E8E2F2" onPress={() => router.push('/thread')} />
                                        <DashboardIcon icon="calendar" label="Events" color={darkLavender} bg="#E8E2F2" onPress={() => router.push('/events')} />
                                        <DashboardIcon icon="megaphone" label="Requests" color={darkLavender} bg="#E8E2F2" onPress={() => router.push('/complaints')} />
                                    </View>

                                    {/* Featured Sections */}
                                    <View style={styles.sectionContainer}>
                                        <Text style={[styles.sectionTitle, { color: '#fff' }]}>Community Services</Text>
                                        <View style={[styles.gridContainer, { justifyContent: 'flex-start', gap: 12 }]}>
                                            <DashboardIcon icon="people" label="Directory" color="#fff" bg={darkLavender} onPress={() => router.push('/members')} />
                                            <DashboardIcon icon="people" label="Families" color="#fff" bg={darkLavender} onPress={() => router.push('/view-families')} />
                                            <DashboardIcon icon="id-card" label="Staff" color="#fff" bg={darkLavender} onPress={() => router.push('/staff')} />
                                            <DashboardIcon icon="chatbubbles" label="Complaints" color="#fff" bg={darkLavender} onPress={() => router.push('/complaints')} />
                                            <DashboardIcon icon="qr-code" label="Gate Pass" color="#fff" bg={darkLavender} onPress={() => router.push('/gatepass')} />
                                            <DashboardIcon icon="document-text" label="Rules" color="#fff" bg={darkLavender} onPress={() => router.push('/rules')} />
                                            <DashboardIcon icon="megaphone" label="Notices" color="#fff" bg={darkLavender} onPress={() => router.push('/notices')} />
                                            <DashboardIcon icon="tennisball" label="Amenities" color="#fff" bg={darkLavender} onPress={() => router.push('/amenities')} />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
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
        <TouchableOpacity style={[styles.wsBubble, isActive && styles.wsBubbleActive]} onPress={onPress}>
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
            <View style={[styles.fCardHeader, { backgroundColor: 'rgba(91, 75, 138, 0.1)' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.statBoxCount}>{count}</Text>
            <Text style={styles.statBoxLabel}>{label}</Text>
        </View>
    );
}

function QuickAccessItem({ icon, label, color, onPress }: any) {
    return (
        <TouchableOpacity style={styles.psQuickAccessItem} onPress={onPress}>
            <View style={[styles.psQuickAccessIconBox, { backgroundColor: 'rgba(91, 75, 138, 0.05)', borderColor: 'rgba(91, 75, 138, 0.1)' }]}>
                <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.psQuickAccessLabel}>{label}</Text>
        </TouchableOpacity>
    );
}

function StoryItem({ name, image, hasStory }: any) {
    return (
        <TouchableOpacity style={styles.psStoryItem}>
            <View style={[styles.psStoryCircle, hasStory && styles.psStoryCircleActive]}>
                <Image source={{ uri: image }} style={styles.psStoryImg} />
            </View>
            <Text style={styles.psStoryLabel}>{name}</Text>
        </TouchableOpacity>
    );
}
