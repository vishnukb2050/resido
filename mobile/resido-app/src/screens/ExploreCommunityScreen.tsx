import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    Image, SafeAreaView, Dimensions, StatusBar
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ExploreCommunityScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Back Button */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroContent}>
                        <Text style={styles.heroTitle}>Your Community,{'\n'}Stronger Together</Text>
                        <Text style={styles.heroSubtitle}>
                            Stay informed, connect with neighbors and help build a safer, cleaner and happier place to live.
                        </Text>
                    </View>
                    <Image 
                        source={{ uri: 'https://img.freepik.com/free-vector/diverse-neighborhood-people-collection_23-2148604727.jpg?w=800' }} 
                        style={styles.heroImage} 
                        resizeMode="contain"
                    />
                    {/* Illustration Floating Icons (Simplified representation) */}
                    <View style={styles.floatingIcons}>
                        <View style={[styles.floatIcon, { top: 0, right: 20 }]}><Ionicons name="megaphone" size={16} color="#fff" /></View>
                        <View style={[styles.floatIcon, { top: 20, right: 80 }]}><Ionicons name="chatbubbles" size={16} color="#fff" /></View>
                        <View style={[styles.floatIcon, { top: 60, right: 10 }]}><Ionicons name="build" size={16} color="#fff" /></View>
                        <View style={[styles.floatIcon, { top: 100, right: 50 }]}><Ionicons name="calendar" size={16} color="#fff" /></View>
                    </View>
                </View>

                {/* Why Join Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Why Join Your Community?</Text>
                    <View style={styles.whyJoinGrid}>
                        <WhyJoinCard 
                            icon="shield-checkmark" 
                            title="Stay Informed" 
                            desc="Get real-time updates, notices and announcements from your community." 
                        />
                        <WhyJoinCard 
                            icon="people" 
                            title="Connect Easily" 
                            desc="Communicate with neighbors, committees and management." 
                        />
                        <WhyJoinCard 
                            icon="build" 
                            title="Report & Resolve" 
                            desc="Raise complaints and maintenance requests quickly and easily." 
                            iconType="MaterialCommunityIcons"
                            iconName="wrench"
                        />
                    </View>
                </View>

                {/* Community Features Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Community Features</Text>
                    <View style={styles.featuresList}>
                        <FeatureItem 
                            icon="megaphone" 
                            title="Notice Board" 
                            desc="Important updates and announcements from management and committees." 
                            color="#1d4ed8"
                        />
                        <FeatureItem 
                            icon="id-card" 
                            title="Gate Pass" 
                            desc="Request, approve and manage gate passes for visitors and deliveries." 
                            color="#3b82f6"
                        />
                        <FeatureItem 
                            icon="chatbubbles" 
                            title="Complaints" 
                            desc="Report issues and track the status until it's resolved." 
                            color="#f59e0b"
                        />
                        <FeatureItem 
                            icon="build" 
                            title="Maintenance" 
                            desc="Raise maintenance requests and get timely updates from the team." 
                            color="#3b82f6"
                        />
                        <FeatureItem 
                            icon="people" 
                            title="Contacts" 
                            desc="Quick access to important contacts in your community." 
                            color="#1d4ed8"
                        />
                        <FeatureItem 
                            icon="calendar" 
                            title="Events" 
                            desc="Discover and participate in community events and activities." 
                            color="#10b981"
                        />
                    </View>
                </View>

                {/* Better Living Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitleCenter}>Be a Part of a Better Living</Text>
                    <View style={styles.betterLivingGrid}>
                        <LivingItem icon="shield-checkmark" label="Safer Communities" />
                        <LivingItem icon="people" label="Stronger Connections" />
                        <LivingItem icon="home" label="Better Living" />
                        <LivingItem icon="happy" label="Happier Together" />
                    </View>
                </View>

                {/* Footer Action */}
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={styles.createBtn}
                        onPress={() => router.push('/create-community')}
                    >
                        <Ionicons name="people" size={24} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.createBtnText}>Create Community</Text>
                    </TouchableOpacity>
                    <Text style={styles.footerSub}>Take the first step to build a connected and thriving community.</Text>
                    <View style={styles.lockRow}>
                        <Ionicons name="lock-closed" size={12} color="#64748b" />
                        <Text style={styles.lockText}>Only residents and authorized members can join or create a community.</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const WhyJoinCard = ({ icon, title, desc, iconType, iconName }: any) => (
    <View style={styles.whyJoinCard}>
        <View style={styles.whyIconBox}>
            {iconType === 'MaterialCommunityIcons' ? (
                <MaterialCommunityIcons name={iconName} size={24} color="#fff" />
            ) : (
                <Ionicons name={icon} size={24} color="#fff" />
            )}
        </View>
        <Text style={styles.whyTitle}>{title}</Text>
        <Text style={styles.whyDesc}>{desc}</Text>
    </View>
);

const FeatureItem = ({ icon, title, desc, color }: any) => (
    <TouchableOpacity style={styles.featureItem}>
        <View style={[styles.featureIconBox, { backgroundColor: color }]}>
            <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDesc}>{desc}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#64748b" />
    </TouchableOpacity>
);

const LivingItem = ({ icon, label }: any) => (
    <View style={styles.livingItem}>
        <View style={styles.livingIconBox}>
            <Ionicons name={icon} size={24} color="#fff" />
        </View>
        <Text style={styles.livingLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 20, marginTop: 10 },
    
    heroSection: { padding: 24, flexDirection: 'row', alignItems: 'center', minHeight: 220 },
    heroContent: { flex: 1.2, zIndex: 10 },
    heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', lineHeight: 34 },
    heroSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 12, lineHeight: 22 },
    heroImage: { flex: 1, height: 180, marginLeft: -20 },
    
    floatingIcons: { position: 'absolute', right: 0, top: 20, width: 150, height: 150 },
    floatIcon: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

    section: { paddingHorizontal: 20, marginTop: 32 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 20 },
    sectionTitleCenter: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 24, textAlign: 'center' },
    
    whyJoinGrid: { flexDirection: 'row', gap: 12 },
    whyJoinCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    whyIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1d4ed8', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    whyTitle: { fontSize: 15, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 8 },
    whyDesc: { fontSize: 11, color: '#94a3b8', textAlign: 'center', lineHeight: 16 },

    featuresList: { gap: 16 },
    featureItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    featureIconBox: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    featureContent: { flex: 1, marginLeft: 16 },
    featureTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    featureDesc: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 18 },

    betterLivingGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    livingItem: { alignItems: 'center', width: (width - 80) / 4 },
    livingIconBox: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    livingLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', textAlign: 'center' },

    footer: { padding: 24, marginTop: 40, alignItems: 'center' },
    createBtn: { width: '100%', height: 64, borderRadius: 20, backgroundColor: '#1d4ed8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    createBtnText: { color: '#fff', fontSize: 18, fontWeight: '900' },
    footerSub: { fontSize: 12, color: '#64748b', marginTop: 16, fontWeight: '600' },
    lockRow: { flexDirection: 'row', alignItems: 'center', marginTop: 24, gap: 6 },
    lockText: { fontSize: 10, color: '#475569', fontWeight: '500' }
});
