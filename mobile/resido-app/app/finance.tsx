import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, TextInput, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../src/components/BottomNav';

const { width } = Dimensions.get('window');

export default function FinanceScreen() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Purple Header Section */}
                <View style={styles.purpleHeader}>
                    <View style={styles.topBar}>
                        <TouchableOpacity style={styles.locationContainer}>
                            <Text style={styles.timeText}>4 mins</Text>
                            <View style={styles.addressRow}>
                                <Text style={styles.toHomeText}>To Home:</Text>
                                <Text style={styles.addressText} numberOfLines={1}>Art1, flat F, Second Floor...</Text>
                                <Ionicons name="chevron-down" size={16} color="#fff" />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.profileBtn}>
                            <Ionicons name="person-circle" size={40} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Main Category Horizontal Menu */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mainCategoryScroll}>
                        <MainCategoryItem icon="cash-outline" title="Loans" active />
                        <MainCategoryItem icon="shield-checkmark-outline" title="Insurance" />
                        <MainCategoryItem icon="receipt-outline" title="Bills" />
                        <MainCategoryItem icon="trending-up-outline" title="Invest" />
                        <MainCategoryItem icon="wallet-outline" title="Wallet" />
                    </ScrollView>
                </View>

                {/* Content Section with Rounded Top */}
                <View style={styles.contentWrapper}>
                    {/* Search Bar Section */}
                    <View style={styles.searchSection}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color="#6366f1" />
                            <TextInput 
                                placeholder="Search for 'Personal Loans'..." 
                                style={styles.searchInput}
                                placeholderTextColor="#94a3b8"
                            />
                            <View style={styles.searchRightIcons}>
                                <Ionicons name="qr-code-outline" size={20} color="#6366f1" />
                                <View style={styles.searchDivider} />
                                <Ionicons name="document-text-outline" size={20} color="#6366f1" />
                            </View>
                        </View>
                        <TouchableOpacity style={styles.bookmarkBtn}>
                            <Ionicons name="bookmark" size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Sub Category Horizontal Tabs */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subCategoryScroll}>
                        <SubCategoryItem title="All" active />
                        <SubCategoryItem title="Recent" />
                        <SubCategoryItem title="Popular" />
                        <SubCategoryItem title="Hot Deals" />
                        <SubCategoryItem title="New" />
                        <SubCategoryItem title="Offers" />
                    </ScrollView>

                    {/* Banner Section */}
                    <View style={styles.bannerContainer}>
                        <Text style={styles.bannerBadge}>GIFT MAA - </Text>
                        <Text style={styles.bannerTitle}>SMART FINANCE</Text>
                        <View style={styles.bannerContent}>
                            <View style={styles.bannerTextCol}>
                                <Text style={styles.bannerMainText}>EXCLUSIVE</Text>
                                <Text style={styles.bannerSubText}>FINANCIAL PICKS</Text>
                            </View>
                            <MaterialCommunityIcons name="finance" size={80} color="#6366f1" style={styles.bannerIcon} />
                        </View>
                    </View>

                    {/* Product Grid Section */}
                    <View style={styles.productGrid}>
                        <ProductCard title="Personal Loans" color="#eef2ff" textColor="#4338ca" icon="cash" />
                        <ProductCard title="Health Insurance" color="#f0fdf4" textColor="#15803d" icon="heart-pulse" />
                        <ProductCard title="Home Loans" color="#fff7ed" textColor="#c2410c" icon="home" />
                        <ProductCard title="Credit Cards" color="#fef2f2" textColor="#b91c1c" icon="card" />
                        <ProductCard title="Investment Plans" color="#f5f3ff" textColor="#6d28d9" icon="chart-line" />
                        <ProductCard title="Mutual Funds" color="#ecfdf5" textColor="#047857" icon="trending-up" />
                        <ProductCard title="Tax Filing" color="#eff6ff" textColor="#1d4ed8" icon="file-document" />
                        <ProductCard title="Fixed Deposits" color="#fffbeb" textColor="#b45309" icon="lock" />
                    </View>

                    {/* Offer Bar */}
                    <View style={styles.offerBar}>
                        <Text style={styles.offerText}>Extra 10% OFF on first investment above ₹5000</Text>
                        <Text style={styles.offerCode}>Code: INVEST10</Text>
                    </View>

                    <View style={styles.deliveryInfo}>
                        <Ionicons name="flash" size={16} color="#10b981" />
                        <Text style={styles.deliveryText}>FREE CONSULTATION on orders above ₹199</Text>
                    </View>
                </View>
                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav />
        </SafeAreaView>
    );
}

function MainCategoryItem({ icon, title, active }: any) {
    return (
        <TouchableOpacity style={[styles.mainCatItem, active && styles.mainCatItemActive]}>
            <View style={[styles.mainCatIconBox, active && styles.mainCatIconBoxActive]}>
                <Ionicons name={icon} size={28} color={active ? '#6366f1' : '#fff'} />
            </View>
            <Text style={[styles.mainCatTitle, active && styles.mainCatTitleActive]}>{title}</Text>
        </TouchableOpacity>
    );
}

function SubCategoryItem({ title, active }: any) {
    return (
        <TouchableOpacity style={[styles.subCatItem, active && styles.subCatItemActive]}>
            <Text style={[styles.subCatTitle, active && styles.subCatTitleActive]}>{title}</Text>
        </TouchableOpacity>
    );
}

function ProductCard({ title, color, textColor, icon }: any) {
    return (
        <TouchableOpacity style={[styles.productCard, { backgroundColor: color }]}>
            <Text style={[styles.productTitle, { color: textColor }]}>{title}</Text>
            <MaterialCommunityIcons name={icon} size={40} color={textColor} style={styles.productIcon} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#4c1d95' },
    container: { flex: 1, backgroundColor: '#6366f1' },
    purpleHeader: { backgroundColor: '#4c1d95', paddingBottom: 20 },
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, marginBottom: 20 },
    locationContainer: { flex: 1 },
    timeText: { fontSize: 24, fontWeight: '900', color: '#fff' },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    toHomeText: { fontSize: 13, fontWeight: '700', color: '#cbd5e1' },
    addressText: { fontSize: 13, fontWeight: '600', color: '#fff', marginHorizontal: 5, flex: 1 },
    profileBtn: { marginLeft: 15 },
    mainCategoryScroll: { paddingLeft: 20, paddingTop: 10 },
    mainCatItem: { alignItems: 'center', marginRight: 25, width: 80 },
    mainCatItemActive: { },
    mainCatIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    mainCatIconBoxActive: { backgroundColor: '#fff' },
    mainCatTitle: { fontSize: 12, fontWeight: '700', color: '#cbd5e1' },
    mainCatTitleActive: { color: '#fff' },
    contentWrapper: { backgroundColor: '#6366f1', borderTopLeftRadius: 30, borderTopRightRadius: 30, flex: 1, paddingTop: 20 },
    searchSection: { flexDirection: 'row', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
    searchBar: { flex: 1, height: 54, backgroundColor: '#fff', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
    searchInput: { flex: 1, marginLeft: 10, fontSize: 15, color: '#1e293b', fontWeight: '600' },
    searchRightIcons: { flexDirection: 'row', alignItems: 'center' },
    searchDivider: { width: 1, height: 20, backgroundColor: '#e2e8f0', marginHorizontal: 10 },
    bookmarkBtn: { width: 54, height: 54, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
    subCategoryScroll: { paddingLeft: 20, marginBottom: 20 },
    subCatItem: { marginRight: 20, paddingBottom: 5 },
    subCatItemActive: { borderBottomWidth: 3, borderBottomColor: '#fff' },
    subCatTitle: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
    subCatTitleActive: { color: '#fff' },
    bannerContainer: { marginHorizontal: 20, backgroundColor: '#beff00', borderRadius: 24, padding: 20, marginBottom: 20 },
    bannerBadge: { fontSize: 14, fontWeight: '800', color: '#4c1d95' },
    bannerTitle: { fontSize: 32, fontWeight: '900', color: '#4c1d95', marginTop: -5 },
    bannerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15 },
    bannerTextCol: { },
    bannerMainText: { fontSize: 22, fontWeight: '900', color: '#4c1d95' },
    bannerSubText: { fontSize: 18, fontWeight: '800', color: '#4c1d95' },
    bannerIcon: { position: 'absolute', right: -10, bottom: -10, opacity: 0.8 },
    productGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 15, justifyContent: 'space-between' },
    productCard: { width: (width - 50) / 2, height: 180, borderRadius: 24, padding: 15, marginBottom: 20, justifyContent: 'space-between' },
    productTitle: { fontSize: 16, fontWeight: '900', width: '80%' },
    productIcon: { alignSelf: 'flex-end' },
    offerBar: { alignItems: 'center', paddingVertical: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', marginTop: 10 },
    offerText: { fontSize: 13, fontWeight: '700', color: '#fff' },
    offerCode: { fontSize: 14, fontWeight: '900', color: '#fff', marginTop: 5 },
    deliveryInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ecfdf5', paddingVertical: 8, marginHorizontal: 20, borderRadius: 10, marginTop: 10 },
    deliveryText: { fontSize: 12, fontWeight: '800', color: '#059669', marginLeft: 5, textTransform: 'uppercase' },
});
