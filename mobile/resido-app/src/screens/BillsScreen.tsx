import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, StatusBar, Image, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import BottomNav from '../components/BottomNav';
import { mySpaceApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

type BillItem = {
    id: string;
    kind: 'EXPENSE' | 'INCOME';
    label: string;
    amount: number;
    date: string;
    description?: string | null;
    fileUrl: string;
    raw: any;
};

function isImageUrl(url: string) {
    const lower = url.toLowerCase();
    return /\.(jpe?g|png|gif|webp|bmp)(\?|$)/i.test(lower) || lower.includes('image/');
}

type BillRowProps = {
    bill: BillItem;
    onOpenFile: (url: string) => void;
    onEdit: (bill: BillItem) => void;
};

const BillRow = React.memo(function BillRow({ bill, onOpenFile, onEdit }: BillRowProps) {
    const previewUrl = resolveMediaUrl(bill.fileUrl) || bill.fileUrl;
    const showImage = isImageUrl(previewUrl);
    return (
        <View style={styles.billCard}>
            <TouchableOpacity
                style={styles.previewBox}
                onPress={() => onOpenFile(bill.fileUrl)}
                activeOpacity={0.85}
            >
                {showImage ? (
                    <Image source={{ uri: previewUrl }} style={styles.previewImage} resizeMode="cover" />
                ) : (
                    <View style={styles.previewDoc}>
                        <MaterialCommunityIcons name="file-pdf-box" size={36} color="#ef4444" />
                        <Text style={styles.previewDocText}>PDF / Doc</Text>
                    </View>
                )}
                <View style={styles.openBadge}>
                    <Ionicons name="open-outline" size={14} color="#fff" />
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.billInfo}
                onPress={() => onEdit(bill)}
                activeOpacity={0.85}
            >
                <View style={styles.billTitleRow}>
                    <Text style={styles.billLabel} numberOfLines={1}>{bill.label}</Text>
                    <View
                        style={[
                            styles.kindBadge,
                            { backgroundColor: bill.kind === 'INCOME' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.12)' },
                        ]}
                    >
                        <Text
                            style={[
                                styles.kindBadgeText,
                                { color: bill.kind === 'INCOME' ? '#10b981' : '#ef4444' },
                            ]}
                        >
                            {bill.kind === 'INCOME' ? 'INCOME' : 'EXPENSE'}
                        </Text>
                    </View>
                </View>
                {bill.description ? (
                    <Text style={styles.billDesc} numberOfLines={2}>{bill.description}</Text>
                ) : null}
                <Text
                    style={[
                        styles.billAmount,
                        { color: bill.kind === 'INCOME' ? '#10b981' : '#ef4444' },
                    ]}
                >
                    {bill.kind === 'INCOME' ? '+' : '-'} ₹ {bill.amount.toLocaleString()}
                </Text>
                <Text style={styles.billDate}>{new Date(bill.date).toLocaleDateString()}</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEdit(bill)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons name="create-outline" size={20} color="#8b5cf6" />
            </TouchableOpacity>
        </View>
    );
});

export default function BillsScreen() {
    const router = useRouter();
    const [bills, setBills] = useState<BillItem[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        useCallback(() => {
            loadBills();
        }, []),
    );

    const loadBills = async () => {
        try {
            setLoading(true);
            const { data } = await mySpaceApi.getFinanceReport({ period: 'ALL' });
            const items: BillItem[] = [];

            for (const exp of data?.expenses || []) {
                if (exp.billUrl) {
                    items.push({
                        id: exp.id,
                        kind: 'EXPENSE',
                        label: exp.category || 'Expense',
                        amount: Number(exp.amount) || 0,
                        date: exp.date,
                        description: exp.description,
                        fileUrl: exp.billUrl,
                        raw: exp,
                    });
                }
            }
            for (const inc of data?.incomes || []) {
                if (inc.receiptUrl) {
                    items.push({
                        id: inc.id,
                        kind: 'INCOME',
                        label: inc.source || 'Income',
                        amount: Number(inc.amount) || 0,
                        date: inc.date,
                        description: inc.description,
                        fileUrl: inc.receiptUrl,
                        raw: inc,
                    });
                }
            }

            items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setBills(items);
        } catch (error) {
            console.error('Failed to load bills', error);
        } finally {
            setLoading(false);
        }
    };

    const openBillFile = useCallback(async (url: string) => {
        const resolved = resolveMediaUrl(url) || url;
        try {
            const supported = await Linking.canOpenURL(resolved);
            if (supported) {
                await Linking.openURL(resolved);
            } else {
                Alert.alert('Cannot open', 'This bill file could not be opened on your device.');
            }
        } catch {
            Alert.alert('Error', 'Failed to open the bill file.');
        }
    }, []);

    const openEdit = useCallback((bill: BillItem) => {
        const payload = encodeURIComponent(JSON.stringify(bill.raw));
        if (bill.kind === 'INCOME') {
            router.push({ pathname: '/add-income', params: { id: bill.id, data: payload } });
        } else {
            router.push({ pathname: '/add-expense', params: { id: bill.id, data: payload } });
        }
    }, [router]);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#2D2445" />
                    </TouchableOpacity>
                    <View style={styles.logoBox}>
                        <MaterialCommunityIcons name="file-document-outline" size={24} color="#8b5cf6" />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.headerTitle}>My Bills</Text>
                        <Text style={styles.headerSub}>Receipts & bills from your expenses & income</Text>
                    </View>
                </View>
            </View>

            <FlatList
                data={loading ? [] : bills}
                keyExtractor={(bill) => `${bill.kind}-${bill.id}`}
                renderItem={({ item }) => (
                    <BillRow bill={item} onOpenFile={openBillFile} onEdit={openEdit} />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    !loading && bills.length > 0 ? (
                        <Text style={styles.countLabel}>{bills.length} uploaded bill{bills.length === 1 ? '' : 's'}</Text>
                    ) : null
                }
                ListEmptyComponent={
                    loading ? (
                        <ActivityIndicator color="#8b5cf6" style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.emptyWrap}>
                            <View style={styles.emptyIcon}>
                                <MaterialCommunityIcons name="file-upload-outline" size={44} color="#8b5cf6" />
                            </View>
                            <Text style={styles.emptyTitle}>No bills uploaded yet</Text>
                            <Text style={styles.emptySub}>
                                Attach a bill when you add an expense, or a receipt when you add income — they will show up here.
                            </Text>
                            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/add-expense')}>
                                <Text style={styles.emptyBtnText}>Add expense with bill</Text>
                            </TouchableOpacity>
                        </View>
                    )
                }
                removeClippedSubviews
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={11}
            />

            <BottomNav activeTab="Home" />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    header: { padding: 20, paddingTop: 30, backgroundColor: '#F8F5FF' },
    headerTop: { flexDirection: 'row', alignItems: 'center' },
    backBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center', marginRight: 8,
    },
    logoBox: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: '#C4B5DC',
    },
    headerTitle: { fontSize: 22, fontWeight: '900', color: '#2D2445' },
    headerSub: { fontSize: 12, color: '#9A8EBA', marginTop: 2 },

    listContent: { paddingBottom: 100 },
    countLabel: { fontSize: 13, color: '#7A6B9C', fontWeight: '700', marginBottom: 14, paddingHorizontal: 20, marginTop: 8 },

    billCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#ffffff', padding: 12, borderRadius: 20,
        marginBottom: 12, marginHorizontal: 20, borderWidth: 1, borderColor: '#D4C9E8',
    },
    previewBox: {
        width: 72, height: 72, borderRadius: 14, overflow: 'hidden',
        backgroundColor: '#F4EEFC',
    },
    previewImage: { width: '100%', height: '100%' },
    previewDoc: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    previewDocText: { fontSize: 10, color: '#7A6B9C', fontWeight: '700', marginTop: 4 },
    openBadge: {
        position: 'absolute', bottom: 4, right: 4,
        width: 24, height: 24, borderRadius: 12,
        backgroundColor: 'rgba(45, 36, 69, 0.65)',
        alignItems: 'center', justifyContent: 'center',
    },
    billInfo: { flex: 1, marginLeft: 14, paddingRight: 4 },
    billTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    billLabel: { fontSize: 15, fontWeight: '800', color: '#2D2445', flex: 1 },
    kindBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    kindBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
    billDesc: { fontSize: 12, color: '#7A6B9C', marginTop: 4, lineHeight: 17 },
    billAmount: { fontSize: 16, fontWeight: '900', marginTop: 6 },
    billDate: { fontSize: 11, color: '#9A8EBA', marginTop: 4, fontWeight: '600' },
    editBtn: {
        width: 36, height: 36, borderRadius: 12,
        backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center', marginTop: 4,
    },

    emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 48 },
    emptyIcon: {
        width: 88, height: 88, borderRadius: 28,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: { fontSize: 17, fontWeight: '800', color: '#2D2445', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#7A6B9C', textAlign: 'center', lineHeight: 21, marginTop: 10 },
    emptyBtn: {
        marginTop: 24, backgroundColor: '#8b5cf6',
        paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14,
    },
    emptyBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
