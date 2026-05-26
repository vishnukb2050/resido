import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView,
    SafeAreaView, StatusBar, ActivityIndicator, Alert, Modal, TextInput, Image, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { communityFinanceApi, communitySplitsApi, communityApi } from '../services/api';
import { resolveMediaUrl } from '../utils/mediaUrl';

type SectionMode = 'maintenance' | 'splits';
type MaintTab = 'pending' | 'due' | 'paid';
type SplitTab = 'pending' | 'due' | 'paid';

export default function AdminMaintenanceScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [sectionMode, setSectionMode] = useState<SectionMode>('maintenance');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    // Maintenance lists
    const [paidList, setPaidList] = useState<any[]>([]);
    const [dueList, setDueList] = useState<any[]>([]);
    const [pendingList, setPendingList] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<MaintTab>('pending');

    // Config & Generation
    const [showConfig, setShowConfig] = useState(false);
    const [showGen, setShowGen] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [billingCycle, setBillingCycle] = useState('MONTHLY');
    const [calculationType, setCalculationType] = useState('FLAT_RATE');
    const [flatRateAmount, setFlatRateAmount] = useState('1000');
    const [ratePerSqFt, setRatePerSqFt] = useState('2');
    const [dueDateDay, setDueDateDay] = useState('10');

    // Bill verification
    const [selectedBill, setSelectedBill] = useState<any | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [adminNote, setAdminNote] = useState('');

    // Splits
    const [splits, setSplits] = useState<any[]>([]);
    const [splitTab, setSplitTab] = useState<SplitTab>('pending');
    const [expandedSplitId, setExpandedSplitId] = useState<string | null>(null);
    const [showCreateSplit, setShowCreateSplit] = useState(false);
    const [creatingSplit, setCreatingSplit] = useState(false);
    const [splitPurpose, setSplitPurpose] = useState('');
    const [splitDescription, setSplitDescription] = useState('');
    const [splitTotalAmount, setSplitTotalAmount] = useState('');
    const [splitTargetType, setSplitTargetType] = useState<'ALL' | 'BLOCKS' | 'UNITS'>('ALL');
    const [blocks, setBlocks] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
    const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
    const [selectedShare, setSelectedShare] = useState<any | null>(null);
    const [shareAdminNote, setShareAdminNote] = useState('');
    const [shareRejectionReason, setShareRejectionReason] = useState('');

    const loadMaintenance = async () => {
        const configRes = await communityFinanceApi.getConfig();
        const config = configRes.data;
        if (config) {
            setBillingCycle(config.billingCycle);
            setCalculationType(config.calculationType);
            setFlatRateAmount(String(config.flatRateAmount));
            setRatePerSqFt(String(config.ratePerSqFt));
            setDueDateDay(String(config.dueDateDay));
        }
        const statusRes = await communityFinanceApi.getStatus(month, year);
        setPaidList(statusRes.data.paid || []);
        setDueList(statusRes.data.due || []);
        setPendingList(statusRes.data.pending || []);
    };

    const loadSplits = async () => {
        const res = await communitySplitsApi.list();
        setSplits(res.data || []);
    };

    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([loadMaintenance(), loadSplits()]);
        } catch (e) {
            console.error('Failed to load community payments', e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([loadMaintenance(), loadSplits()]);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => { loadData(); }, [month, year]);

    useFocusEffect(useCallback(() => { loadData(); }, [month, year]));

    const loadPickerData = async () => {
        try {
            const [bRes, uRes] = await Promise.all([communityApi.getBlocks(), communityApi.getUnits()]);
            setBlocks(bRes.data || []);
            setUnits(uRes.data || []);
        } catch {}
    };

    const handleSaveConfig = async () => {
        try {
            await communityFinanceApi.updateConfig({
                billingCycle, calculationType,
                flatRateAmount: Number(flatRateAmount),
                ratePerSqFt: Number(ratePerSqFt),
                dueDateDay: Number(dueDateDay),
            });
            Alert.alert('Success', 'Billing configuration saved.');
            setShowConfig(false);
            loadMaintenance();
        } catch {
            Alert.alert('Error', 'Failed to save billing configuration.');
        }
    };

    const handleGenerateBills = async () => {
        setGenerating(true);
        try {
            await communityFinanceApi.generateBills(month, year);
            Alert.alert('Success', 'Monthly maintenance bills generated for all units.');
            setShowGen(false);
            loadMaintenance();
        } catch {
            Alert.alert('Error', 'Failed to generate bills.');
        } finally {
            setGenerating(false);
        }
    };

    const handleVerifyBill = async (action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT' && !rejectionReason.trim() && !adminNote.trim()) {
            Alert.alert('Required', 'Please enter a rejection reason or admin note for the resident.');
            return;
        }
        setVerifying(true);
        try {
            await communityFinanceApi.verifyPayment(
                selectedBill.id, action, rejectionReason || undefined, adminNote || undefined,
            );
            Alert.alert('Done', action === 'APPROVE' ? 'Payment approved.' : 'Payment rejected.');
            setSelectedBill(null);
            setRejectionReason('');
            setAdminNote('');
            loadMaintenance();
        } catch {
            Alert.alert('Error', 'Failed to verify payment.');
        } finally {
            setVerifying(false);
        }
    };

    const handleCreateSplit = async () => {
        if (!splitPurpose.trim()) { Alert.alert('Required', 'Enter a purpose for this split.'); return; }
        if (!splitTotalAmount || Number(splitTotalAmount) <= 0) { Alert.alert('Required', 'Enter a valid total amount.'); return; }
        if (splitTargetType === 'BLOCKS' && !selectedBlockIds.length) { Alert.alert('Required', 'Select at least one block.'); return; }
        if (splitTargetType === 'UNITS' && !selectedUnitIds.length) { Alert.alert('Required', 'Select at least one unit.'); return; }

        setCreatingSplit(true);
        try {
            await communitySplitsApi.create({
                purpose: splitPurpose.trim(),
                description: splitDescription.trim() || undefined,
                totalAmount: Number(splitTotalAmount),
                targetType: splitTargetType,
                targetBlocks: splitTargetType === 'BLOCKS' ? selectedBlockIds : undefined,
                targetUnits: splitTargetType === 'UNITS' ? selectedUnitIds : undefined,
            });
            Alert.alert('Created', 'Payment split created and shared with residents.');
            setShowCreateSplit(false);
            setSplitPurpose('');
            setSplitDescription('');
            setSplitTotalAmount('');
            setSplitTargetType('ALL');
            setSelectedBlockIds([]);
            setSelectedUnitIds([]);
            loadSplits();
        } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to create split.');
        } finally {
            setCreatingSplit(false);
        }
    };

    const handleVerifyShare = async (action: 'APPROVE' | 'REJECT') => {
        if (action === 'REJECT' && !shareRejectionReason.trim() && !shareAdminNote.trim()) {
            Alert.alert('Required', 'Please enter a rejection reason or admin note.');
            return;
        }
        setVerifying(true);
        try {
            await communitySplitsApi.verify(
                selectedShare.id, action,
                shareRejectionReason || undefined,
                shareAdminNote || undefined,
            );
            Alert.alert('Done', action === 'APPROVE' ? 'Split payment approved.' : 'Split payment rejected.');
            setSelectedShare(null);
            setShareRejectionReason('');
            setShareAdminNote('');
            loadSplits();
        } catch {
            Alert.alert('Error', 'Failed to verify split payment.');
        } finally {
            setVerifying(false);
        }
    };

    const handleDeleteSplit = (id: string, purpose: string) => {
        Alert.alert('Delete Split', `Remove "${purpose}" and all its shares?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await communitySplitsApi.remove(id);
                        loadSplits();
                    } catch {
                        Alert.alert('Error', 'Failed to delete split.');
                    }
                },
            },
        ]);
    };

    const toggleBlock = (id: string) => {
        setSelectedBlockIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };
    const toggleUnit = (id: string) => {
        setSelectedUnitIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const totalCollected = paidList.reduce((a, c) => a + c.totalAmount, 0);
    const totalOutstanding = dueList.reduce((a, c) => a + c.totalAmount, 0);
    const totalBills = paidList.length + dueList.length + pendingList.length;

    // Flatten all split shares for tab filtering
    const allSplitShares = splits.flatMap(s =>
        (s.shares || []).map((sh: any) => ({ ...sh, splitPurpose: s.purpose, splitId: s.id })),
    );
    const splitPending = allSplitShares.filter(s => s.status === 'PENDING_VERIFICATION');
    const splitDue = allSplitShares.filter(s => s.status === 'UNPAID' || s.status === 'OVERDUE');
    const splitPaid = allSplitShares.filter(s => s.status === 'PAID');

    const renderShareRow = (sh: any, onPress?: () => void) => (
        <TouchableOpacity key={sh.id} style={styles.billItem} onPress={onPress} disabled={!onPress}>
            <View style={styles.billLeft}>
                <Ionicons
                    name={sh.status === 'PAID' ? 'checkmark-circle' : sh.status === 'PENDING_VERIFICATION' ? 'time' : 'alert-circle'}
                    size={22}
                    color={sh.status === 'PAID' ? '#10b981' : sh.status === 'PENDING_VERIFICATION' ? '#f59e0b' : '#ef4444'}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.unitNum}>{sh.unitNumber}</Text>
                    <Text style={styles.residentName}>{sh.residentName}</Text>
                    {sh.splitPurpose ? <Text style={styles.splitPurposeTag}>{sh.splitPurpose}</Text> : null}
                </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.amountText}>₹ {(sh.amountPaid ?? sh.amount).toLocaleString()}</Text>
                {onPress && <Text style={styles.verifyBtnText}>Tap to verify</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Community Payments</Text>
                <TouchableOpacity
                    onPress={() => { if (sectionMode === 'maintenance') setShowConfig(true); else { loadPickerData(); setShowCreateSplit(true); } }}
                    style={styles.backBtn}
                >
                    <Ionicons name={sectionMode === 'maintenance' ? 'settings' : 'add'} size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Section switcher */}
            <View style={styles.sectionRow}>
                {(['maintenance', 'splits'] as SectionMode[]).map(s => (
                    <TouchableOpacity
                        key={s}
                        style={[styles.sectionBtn, sectionMode === s && styles.sectionBtnActive]}
                        onPress={() => setSectionMode(s)}
                    >
                        <Text style={[styles.sectionBtnText, sectionMode === s && styles.sectionBtnTextActive]}>
                            {s === 'maintenance' ? 'Monthly Maintenance' : 'Payment Splits'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>
            ) : (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
                >
                    {sectionMode === 'maintenance' ? (
                        <>
                            <View style={styles.periodCard}>
                                <TouchableOpacity style={styles.periodArrow} onPress={() => {
                                    if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1);
                                }}>
                                    <Ionicons name="chevron-back" size={20} color="#fff" />
                                </TouchableOpacity>
                                <Text style={styles.periodText}>{getMonthName(month)} {year}</Text>
                                <TouchableOpacity style={styles.periodArrow} onPress={() => {
                                    if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1);
                                }}>
                                    <Ionicons name="chevron-forward" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.statsContainer}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Collected</Text>
                                    <Text style={[styles.statVal, { color: '#10b981' }]}>₹ {totalCollected.toLocaleString()}</Text>
                                    <Text style={styles.statSub}>{paidList.length} Units Paid</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Outstanding</Text>
                                    <Text style={[styles.statVal, { color: '#ef4444' }]}>₹ {totalOutstanding.toLocaleString()}</Text>
                                    <Text style={styles.statSub}>{dueList.length} Units Due</Text>
                                </View>
                            </View>

                            {totalBills > 0 && (
                                <View style={styles.progressCard}>
                                    <View style={styles.progressRow}>
                                        <Text style={styles.progressText}>Collection Rate</Text>
                                        <Text style={styles.progressPercent}>{Math.round((paidList.length / totalBills) * 100)}%</Text>
                                    </View>
                                    <View style={styles.progressBg}>
                                        <View style={[styles.progressFill, { width: `${(paidList.length / totalBills) * 100}%` }]} />
                                    </View>
                                </View>
                            )}

                            {totalBills === 0 && (
                                <TouchableOpacity style={styles.runGenBtn} onPress={() => setShowGen(true)}>
                                    <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.runGenText}>Generate Bills for {getMonthName(month)}</Text>
                                </TouchableOpacity>
                            )}

                            <View style={styles.tabRow}>
                                {([
                                    { key: 'pending' as MaintTab, label: `Pending (${pendingList.length})` },
                                    { key: 'due' as MaintTab, label: `Due (${dueList.length})` },
                                    { key: 'paid' as MaintTab, label: `Paid (${paidList.length})` },
                                ]).map(t => (
                                    <TouchableOpacity key={t.key} style={[styles.tabBtn, activeTab === t.key && styles.tabBtnActive]} onPress={() => setActiveTab(t.key)}>
                                        <Text style={[styles.tabBtnText, activeTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {activeTab === 'pending' && (
                                pendingList.length === 0
                                    ? <Text style={styles.emptyText}>No pending payment proofs to verify.</Text>
                                    : pendingList.map(bill => (
                                        <TouchableOpacity key={bill.id} style={styles.billItem} onPress={() => { setSelectedBill(bill); setAdminNote(''); setRejectionReason(''); }}>
                                            <View style={styles.billLeft}>
                                                <Ionicons name="time" size={24} color="#f59e0b" />
                                                <View style={{ marginLeft: 15 }}>
                                                    <Text style={styles.unitNum}>{bill.unitNumber}</Text>
                                                    <Text style={styles.residentName}>{bill.residentName}</Text>
                                                    {bill.amountPaid ? <Text style={styles.amountPaidTag}>Paid ₹{bill.amountPaid.toLocaleString()}</Text> : null}
                                                </View>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[styles.amountText, { color: '#f59e0b' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                                <Text style={styles.verifyBtnText}>Tap to verify</Text>
                                            </View>
                                        </TouchableOpacity>
                                    ))
                            )}

                            {activeTab === 'due' && (
                                dueList.length === 0
                                    ? <Text style={styles.emptyText}>No due bills for this month.</Text>
                                    : dueList.map(bill => (
                                        <View key={bill.id} style={styles.billItem}>
                                            <View style={styles.billLeft}>
                                                <Ionicons name="alert-circle" size={24} color="#ef4444" />
                                                <View style={{ marginLeft: 15 }}>
                                                    <Text style={styles.unitNum}>{bill.unitNumber}</Text>
                                                    <Text style={styles.residentName}>{bill.residentName}</Text>
                                                </View>
                                            </View>
                                            <Text style={[styles.amountText, { color: '#ef4444' }]}>₹ {bill.totalAmount.toLocaleString()}</Text>
                                        </View>
                                    ))
                            )}

                            {activeTab === 'paid' && (
                                paidList.length === 0
                                    ? <Text style={styles.emptyText}>No paid collections this month.</Text>
                                    : paidList.map(bill => (
                                        <View key={bill.id} style={styles.billItem}>
                                            <View style={styles.billLeft}>
                                                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
                                                <View style={{ marginLeft: 15 }}>
                                                    <Text style={styles.unitNum}>{bill.unitNumber}</Text>
                                                    <Text style={styles.residentName}>{bill.residentName}</Text>
                                                    {bill.adminNote ? <Text style={styles.adminNoteTag}>{bill.adminNote}</Text> : null}
                                                </View>
                                            </View>
                                            <Text style={[styles.amountText, { color: '#10b981' }]}>₹ {(bill.amountPaid ?? bill.totalAmount).toLocaleString()}</Text>
                                        </View>
                                    ))
                            )}
                        </>
                    ) : (
                        <>
                            <TouchableOpacity style={styles.runGenBtn} onPress={() => { loadPickerData(); setShowCreateSplit(true); }}>
                                <Ionicons name="add-circle" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.runGenText}>Create New Payment Split</Text>
                            </TouchableOpacity>

                            {splits.length === 0 ? (
                                <Text style={styles.emptyText}>No payment splits yet. Create one to share costs with residents.</Text>
                            ) : splits.map(split => (
                                <View key={split.id} style={styles.splitCard}>
                                    <TouchableOpacity
                                        style={styles.splitHeader}
                                        onPress={() => setExpandedSplitId(expandedSplitId === split.id ? null : split.id)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.splitTitle}>{split.purpose}</Text>
                                            {split.description ? <Text style={styles.splitDesc}>{split.description}</Text> : null}
                                            <Text style={styles.splitMeta}>
                                                ₹{split.totalAmount.toLocaleString()} · {split.paidCount}/{split.totalShares} paid · {split.targetType}
                                            </Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end', gap: 6 }}>
                                            <Ionicons name={expandedSplitId === split.id ? 'chevron-up' : 'chevron-down'} size={18} color="#94a3b8" />
                                            <TouchableOpacity onPress={() => handleDeleteSplit(split.id, split.purpose)}>
                                                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </TouchableOpacity>

                                    {expandedSplitId === split.id && (
                                        <View style={styles.splitShares}>
                                            <View style={styles.tabRow}>
                                                {([
                                                    { key: 'pending' as SplitTab, label: `Pending (${(split.shares || []).filter((s: any) => s.status === 'PENDING_VERIFICATION').length})` },
                                                    { key: 'due' as SplitTab, label: `Due (${(split.shares || []).filter((s: any) => s.status === 'UNPAID').length})` },
                                                    { key: 'paid' as SplitTab, label: `Paid (${(split.shares || []).filter((s: any) => s.status === 'PAID').length})` },
                                                ]).map(t => (
                                                    <TouchableOpacity key={t.key} style={[styles.tabBtn, splitTab === t.key && styles.tabBtnActive]} onPress={() => setSplitTab(t.key)}>
                                                        <Text style={[styles.tabBtnText, splitTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>

                                            {(split.shares || [])
                                                .filter((sh: any) => {
                                                    if (splitTab === 'pending') return sh.status === 'PENDING_VERIFICATION';
                                                    if (splitTab === 'paid') return sh.status === 'PAID';
                                                    return sh.status === 'UNPAID' || sh.status === 'OVERDUE';
                                                })
                                                .map((sh: any) => renderShareRow(
                                                    sh,
                                                    sh.status === 'PENDING_VERIFICATION'
                                                        ? () => { setSelectedShare(sh); setShareAdminNote(''); setShareRejectionReason(''); }
                                                        : undefined,
                                                ))
                                            }
                                        </View>
                                    )}
                                </View>
                            ))}

                            {/* Global split share tabs (all splits combined) */}
                            {splits.length > 0 && (
                                <>
                                    <Text style={styles.globalSplitTitle}>All Split Payments</Text>
                                    <View style={styles.tabRow}>
                                        {([
                                            { key: 'pending' as SplitTab, label: `Pending (${splitPending.length})` },
                                            { key: 'due' as SplitTab, label: `Due (${splitDue.length})` },
                                            { key: 'paid' as SplitTab, label: `Paid (${splitPaid.length})` },
                                        ]).map(t => (
                                            <TouchableOpacity key={t.key} style={[styles.tabBtn, splitTab === t.key && styles.tabBtnActive]} onPress={() => setSplitTab(t.key)}>
                                                <Text style={[styles.tabBtnText, splitTab === t.key && styles.tabBtnTextActive]}>{t.label}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    {(splitTab === 'pending' ? splitPending : splitTab === 'paid' ? splitPaid : splitDue).map(sh =>
                                        renderShareRow(
                                            sh,
                                            sh.status === 'PENDING_VERIFICATION'
                                                ? () => { setSelectedShare(sh); setShareAdminNote(''); setShareRejectionReason(''); }
                                                : undefined,
                                        ),
                                    )}
                                </>
                            )}
                        </>
                    )}
                </ScrollView>
            )}

            {/* Bill Verification Modal */}
            <Modal visible={selectedBill !== null} animationType="slide" transparent onRequestClose={() => setSelectedBill(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Verify Maintenance Payment</Text>
                            <TouchableOpacity onPress={() => setSelectedBill(null)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        {selectedBill && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.verifyDetailBox}>
                                    <Text style={styles.verifyTextLabel}>Unit</Text>
                                    <Text style={styles.verifyTextVal}>{selectedBill.unitNumber}</Text>
                                    {selectedBill.unitResidents?.length > 1 ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Unit Residents ({selectedBill.unitResidents.length})</Text>
                                            {selectedBill.unitResidents.map((r: any) => (
                                                <Text key={r.id} style={styles.unitResidentLine}>
                                                    {r.name} · {r.phone}{r.role ? `  (${r.role})` : ''}
                                                </Text>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Resident</Text>
                                            <Text style={styles.verifyTextVal}>{selectedBill.residentName} · {selectedBill.residentPhone}</Text>
                                        </>
                                    )}
                                    <Text style={styles.verifyTextLabel}>Bill Amount</Text>
                                    <Text style={styles.verifyTextVal}>₹ {selectedBill.totalAmount.toLocaleString()}</Text>
                                    {selectedBill.amountPaid ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Amount Paid (resident)</Text>
                                            <Text style={styles.verifyTextVal}>₹ {selectedBill.amountPaid.toLocaleString()}</Text>
                                        </>
                                    ) : null}
                                    {selectedBill.paymentMethod ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Payment Method</Text>
                                            <Text style={styles.verifyTextVal}>{selectedBill.paymentMethod}</Text>
                                        </>
                                    ) : null}
                                    {selectedBill.description ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Resident Note</Text>
                                            <Text style={styles.verifyTextVal}>{selectedBill.description}</Text>
                                        </>
                                    ) : null}
                                </View>
                                {selectedBill.receiptUrl && (
                                    <>
                                        <Text style={styles.inputLabel}>Receipt</Text>
                                        <Image source={{ uri: resolveMediaUrl(selectedBill.receiptUrl) || selectedBill.receiptUrl }} style={styles.verifyReceiptPreview} />
                                    </>
                                )}
                                <Text style={styles.inputLabel}>Admin Note (visible to resident)</Text>
                                <TextInput style={styles.textInput} placeholder="e.g. Approved — thank you!" placeholderTextColor="#64748b" value={adminNote} onChangeText={setAdminNote} multiline />
                                <Text style={styles.inputLabel}>Rejection Reason (if rejecting)</Text>
                                <TextInput style={styles.textInput} placeholder="Reason shown to resident if rejected..." placeholderTextColor="#64748b" value={rejectionReason} onChangeText={setRejectionReason} multiline />
                                <View style={styles.decisionRow}>
                                    <TouchableOpacity style={[styles.decisionBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleVerifyBill('REJECT')} disabled={verifying}>
                                        <Text style={styles.decisionBtnText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.decisionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleVerifyBill('APPROVE')} disabled={verifying}>
                                        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.decisionBtnText}>Approve</Text>}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Split Share Verification Modal */}
            <Modal visible={selectedShare !== null} animationType="slide" transparent onRequestClose={() => setSelectedShare(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Verify Split Payment</Text>
                            <TouchableOpacity onPress={() => setSelectedShare(null)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        {selectedShare && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <View style={styles.verifyDetailBox}>
                                    <Text style={styles.verifyTextLabel}>Purpose</Text>
                                    <Text style={styles.verifyTextVal}>{selectedShare.splitPurpose || '—'}</Text>
                                    <Text style={styles.verifyTextLabel}>Unit</Text>
                                    <Text style={styles.verifyTextVal}>{selectedShare.unitNumber}</Text>
                                    {selectedShare.unitResidents?.length > 1 ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Unit Residents ({selectedShare.unitResidents.length})</Text>
                                            {selectedShare.unitResidents.map((r: any) => (
                                                <Text key={r.id} style={styles.unitResidentLine}>
                                                    {r.name} · {r.phone}{r.role ? `  (${r.role})` : ''}
                                                </Text>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Resident</Text>
                                            <Text style={styles.verifyTextVal}>{selectedShare.residentName} · {selectedShare.residentPhone}</Text>
                                        </>
                                    )}
                                    <Text style={styles.verifyTextLabel}>Share Amount</Text>
                                    <Text style={styles.verifyTextVal}>₹ {selectedShare.amount.toLocaleString()}</Text>
                                    {selectedShare.amountPaid ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Amount Paid</Text>
                                            <Text style={styles.verifyTextVal}>₹ {selectedShare.amountPaid.toLocaleString()}</Text>
                                        </>
                                    ) : null}
                                    {selectedShare.description ? (
                                        <>
                                            <Text style={styles.verifyTextLabel}>Resident Note</Text>
                                            <Text style={styles.verifyTextVal}>{selectedShare.description}</Text>
                                        </>
                                    ) : null}
                                </View>
                                {selectedShare.receiptUrl && (
                                    <>
                                        <Text style={styles.inputLabel}>Receipt</Text>
                                        <Image source={{ uri: resolveMediaUrl(selectedShare.receiptUrl) || selectedShare.receiptUrl }} style={styles.verifyReceiptPreview} />
                                    </>
                                )}
                                <Text style={styles.inputLabel}>Admin Note (visible to resident)</Text>
                                <TextInput style={styles.textInput} placeholder="Note for resident..." placeholderTextColor="#64748b" value={shareAdminNote} onChangeText={setShareAdminNote} multiline />
                                <Text style={styles.inputLabel}>Rejection Reason</Text>
                                <TextInput style={styles.textInput} placeholder="Reason if rejecting..." placeholderTextColor="#64748b" value={shareRejectionReason} onChangeText={setShareRejectionReason} multiline />
                                <View style={styles.decisionRow}>
                                    <TouchableOpacity style={[styles.decisionBtn, { backgroundColor: '#ef4444' }]} onPress={() => handleVerifyShare('REJECT')} disabled={verifying}>
                                        <Text style={styles.decisionBtnText}>Reject</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.decisionBtn, { backgroundColor: '#10b981' }]} onPress={() => handleVerifyShare('APPROVE')} disabled={verifying}>
                                        {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.decisionBtnText}>Approve</Text>}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Generate Bills Modal */}
            <Modal visible={showGen} animationType="slide" transparent onRequestClose={() => setShowGen(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Generate Monthly Bills</Text>
                            <TouchableOpacity onPress={() => setShowGen(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <Text style={styles.genModalSub}>
                            Generate maintenance bills for all units for {getMonthName(month)} {year}.
                            {calculationType === 'FLAT_RATE' ? ` Flat rate: ₹${flatRateAmount}/unit.` : ` Area rate: ₹${ratePerSqFt}/sq.ft.`}
                        </Text>
                        <TouchableOpacity style={styles.submitBtn} onPress={handleGenerateBills} disabled={generating}>
                            {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Confirm & Generate</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Config Modal */}
            <Modal visible={showConfig} animationType="slide" transparent onRequestClose={() => setShowConfig(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Maintenance Settings</Text>
                            <TouchableOpacity onPress={() => setShowConfig(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Billing Cycle</Text>
                            <View style={styles.methodRow}>
                                {['MONTHLY', 'QUARTERLY', 'ANNUALLY'].map(c => (
                                    <TouchableOpacity key={c} style={[styles.methodBtn, billingCycle === c && styles.methodBtnActive]} onPress={() => setBillingCycle(c)}>
                                        <Text style={[styles.methodBtnText, billingCycle === c && styles.methodBtnTextActive]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.inputLabel}>Calculation Basis</Text>
                            <View style={styles.methodRow}>
                                {[{ key: 'FLAT_RATE', label: 'Flat Rate' }, { key: 'AREA_BASED', label: 'Per Sq.Ft' }].map(c => (
                                    <TouchableOpacity key={c.key} style={[styles.methodBtn, calculationType === c.key && styles.methodBtnActive]} onPress={() => setCalculationType(c.key)}>
                                        <Text style={[styles.methodBtnText, calculationType === c.key && styles.methodBtnTextActive]}>{c.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {calculationType === 'FLAT_RATE' ? (
                                <>
                                    <Text style={styles.inputLabel}>Flat Rate (INR)</Text>
                                    <TextInput style={styles.textInput} keyboardType="numeric" value={flatRateAmount} onChangeText={setFlatRateAmount} placeholderTextColor="#64748b" />
                                </>
                            ) : (
                                <>
                                    <Text style={styles.inputLabel}>Rate Per Sq.Ft (INR)</Text>
                                    <TextInput style={styles.textInput} keyboardType="numeric" value={ratePerSqFt} onChangeText={setRatePerSqFt} placeholderTextColor="#64748b" />
                                </>
                            )}
                            <Text style={styles.inputLabel}>Due Date Day (1–28)</Text>
                            <TextInput style={styles.textInput} keyboardType="numeric" value={dueDateDay} onChangeText={setDueDateDay} placeholderTextColor="#64748b" />
                            <TouchableOpacity style={styles.submitBtn} onPress={handleSaveConfig}>
                                <Text style={styles.submitBtnText}>Save Configuration</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Create Split Modal */}
            <Modal visible={showCreateSplit} animationType="slide" transparent onRequestClose={() => setShowCreateSplit(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Create Payment Split</Text>
                            <TouchableOpacity onPress={() => setShowCreateSplit(false)}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.inputLabel}>Purpose *</Text>
                            <TextInput style={styles.textInput} placeholder="e.g. Roof repair, Festival fund" placeholderTextColor="#64748b" value={splitPurpose} onChangeText={setSplitPurpose} />
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput style={[styles.textInput, { height: 70 }]} placeholder="Optional details..." placeholderTextColor="#64748b" value={splitDescription} onChangeText={setSplitDescription} multiline />
                            <Text style={styles.inputLabel}>Total Amount (INR) *</Text>
                            <TextInput style={styles.textInput} placeholder="e.g. 50000" placeholderTextColor="#64748b" keyboardType="numeric" value={splitTotalAmount} onChangeText={setSplitTotalAmount} />
                            <Text style={styles.inputLabel}>Split Among</Text>
                            <View style={styles.methodRow}>
                                {([
                                    { key: 'ALL' as const, label: 'All Residents' },
                                    { key: 'BLOCKS' as const, label: 'Specific Blocks' },
                                    { key: 'UNITS' as const, label: 'Specific Units' },
                                ]).map(t => (
                                    <TouchableOpacity key={t.key} style={[styles.methodBtn, splitTargetType === t.key && styles.methodBtnActive]} onPress={() => { setSplitTargetType(t.key); if (t.key !== 'BLOCKS') setSelectedBlockIds([]); if (t.key !== 'UNITS') setSelectedUnitIds([]); }}>
                                        <Text style={[styles.methodBtnText, splitTargetType === t.key && styles.methodBtnTextActive]}>{t.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            {splitTargetType === 'BLOCKS' && (
                                <>
                                    <Text style={styles.inputLabel}>Select Blocks</Text>
                                    <View style={styles.chipRow}>
                                        {blocks.map(b => (
                                            <TouchableOpacity key={b.id} style={[styles.chip, selectedBlockIds.includes(b.id) && styles.chipActive]} onPress={() => toggleBlock(b.id)}>
                                                <Text style={[styles.chipText, selectedBlockIds.includes(b.id) && styles.chipTextActive]}>{b.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                            {splitTargetType === 'UNITS' && (
                                <>
                                    <Text style={styles.inputLabel}>Select Units</Text>
                                    <View style={styles.chipRow}>
                                        {units.map(u => (
                                            <TouchableOpacity key={u.id} style={[styles.chip, selectedUnitIds.includes(u.id) && styles.chipActive]} onPress={() => toggleUnit(u.id)}>
                                                <Text style={[styles.chipText, selectedUnitIds.includes(u.id) && styles.chipTextActive]}>
                                                    {u.block?.name ? `${u.block.name}-` : ''}{u.number}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </>
                            )}
                            {splitTargetType === 'ALL' && splitTotalAmount ? (
                                <Text style={styles.splitPreview}>
                                    Each unit pays: ₹ {(Number(splitTotalAmount) / Math.max(units.length, 1)).toFixed(2)} (equal split across {units.length || 'all'} units)
                                </Text>
                            ) : null}
                            <TouchableOpacity style={styles.submitBtn} onPress={handleCreateSplit} disabled={creatingSplit}>
                                {creatingSplit ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Create & Share Split</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function getMonthName(m: number): string {
    return ['January','February','March','April','May','June','July','August','September','October','November','December'][m - 1] || 'N/A';
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#4C5C68' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 40, paddingBottom: 12 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 17, fontWeight: '900', color: '#fff' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },

    sectionRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: '#2E3A42', borderRadius: 14, padding: 4 },
    sectionBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    sectionBtnActive: { backgroundColor: 'rgba(14, 165, 233, 0.25)' },
    sectionBtnText: { color: '#94a3b8', fontSize: 11, fontWeight: '800' },
    sectionBtnTextActive: { color: '#38bdf8' },

    periodCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2E3A42', padding: 16, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    periodArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    periodText: { color: '#fff', fontSize: 16, fontWeight: '800' },

    statsContainer: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 22, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
    statVal: { fontSize: 18, fontWeight: '900', marginTop: 6 },
    statSub: { fontSize: 10, color: '#64748b', fontWeight: '600', marginTop: 4 },
    divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

    progressCard: { backgroundColor: '#2E3A42', padding: 18, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressText: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
    progressPercent: { color: '#10b981', fontSize: 13, fontWeight: '800' },
    progressBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#10b981', borderRadius: 4 },

    runGenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0ea5e9', padding: 16, borderRadius: 18, marginBottom: 20 },
    runGenText: { color: '#fff', fontSize: 13, fontWeight: '800' },

    tabRow: { flexDirection: 'row', backgroundColor: '#2E3A42', padding: 5, borderRadius: 14, marginBottom: 16 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
    tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)' },
    tabBtnText: { color: '#94a3b8', fontSize: 10, fontWeight: '800' },
    tabBtnTextActive: { color: '#fff' },

    emptyText: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', textAlign: 'center', marginVertical: 20 },

    billItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2E3A42', padding: 16, borderRadius: 20, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    billLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    unitNum: { color: '#fff', fontSize: 14, fontWeight: '800' },
    residentName: { color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginTop: 2 },
    amountText: { fontSize: 14, fontWeight: '800', color: '#fff' },
    verifyBtnText: { color: '#0ea5e9', fontSize: 10, fontWeight: '800', marginTop: 4 },
    amountPaidTag: { color: '#38bdf8', fontSize: 10, fontWeight: '700', marginTop: 2 },
    adminNoteTag: { color: '#94a3b8', fontSize: 10, fontStyle: 'italic', marginTop: 2 },
    splitPurposeTag: { color: '#a78bfa', fontSize: 10, fontWeight: '700', marginTop: 2 },

    splitCard: { backgroundColor: '#2E3A42', borderRadius: 22, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    splitHeader: { flexDirection: 'row', padding: 18, alignItems: 'flex-start' },
    splitTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
    splitDesc: { color: '#94a3b8', fontSize: 12, marginTop: 4 },
    splitMeta: { color: '#64748b', fontSize: 11, fontWeight: '700', marginTop: 6 },
    splitShares: { paddingHorizontal: 12, paddingBottom: 12 },
    globalSplitTitle: { color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 12, marginTop: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#2E3A42', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '88%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '900', color: '#fff' },

    inputLabel: { fontSize: 11, fontWeight: '800', color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 12 },
    methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    methodBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    methodBtnActive: { backgroundColor: '#0ea5e9' },
    methodBtnText: { color: '#cbd5e1', fontSize: 11, fontWeight: '700' },
    methodBtnTextActive: { color: '#fff', fontWeight: '800' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    chipActive: { backgroundColor: 'rgba(14, 165, 233, 0.2)', borderColor: '#0ea5e9' },
    chipText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
    chipTextActive: { color: '#38bdf8' },

    textInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', color: '#fff', padding: 14, fontSize: 14, fontWeight: '600', marginBottom: 8 },
    submitBtn: { backgroundColor: '#0ea5e9', height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 20, marginBottom: 10 },
    submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
    genModalSub: { color: '#cbd5e1', fontSize: 13, lineHeight: 20, fontWeight: '600', marginBottom: 20 },
    splitPreview: { color: '#38bdf8', fontSize: 12, fontWeight: '700', marginTop: 8, marginBottom: 4 },

    verifyDetailBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 18, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 16 },
    verifyTextLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
    verifyTextVal: { fontSize: 14, color: '#fff', fontWeight: '700', marginBottom: 12 },
    unitResidentLine: { fontSize: 12, color: '#cbd5e1', fontWeight: '600', marginBottom: 4 },
    verifyReceiptPreview: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16, resizeMode: 'contain' },

    decisionRow: { flexDirection: 'row', gap: 15, marginTop: 20, marginBottom: 10 },
    decisionBtn: { flex: 1, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    decisionBtnText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});
