import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Reusable bottom-sheet action menu used for the 3-dot menus on notes,
 * folders and documents. Designed to replace `Alert.alert` action sheets
 * with a list of color-coded options (Share, Delete, Cancel).
 */

export type ActionMenuItem = {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    /** 'default' = neutral, 'primary' = brand purple, 'destructive' = red. */
    variant?: 'default' | 'primary' | 'destructive';
    onPress: () => void;
    subtitle?: string;
};

interface Props {
    visible: boolean;
    title?: string;
    subtitle?: string;
    items: ActionMenuItem[];
    onClose: () => void;
}

const VARIANT_COLORS = {
    default: { icon: '#7A6B9C', text: '#2D2445', bg: '#F4EEFC' },
    primary: { icon: '#8b5cf6', text: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
    destructive: { icon: '#ef4444', text: '#ef4444', bg: '#FEE2E2' },
};

export default function ActionMenu({ visible, title, subtitle, items, onClose }: Props) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <Pressable style={styles.backdrop} onPress={onClose}>
                {/* Stop the inner press from bubbling up to the backdrop dismiss. */}
                <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
                    <View style={styles.handle} />

                    {title ? (
                        <View style={styles.header}>
                            <Text style={styles.title} numberOfLines={1}>{title}</Text>
                            {subtitle ? (
                                <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
                            ) : null}
                        </View>
                    ) : null}

                    <View style={styles.itemsList}>
                        {items.map((it, idx) => {
                            const c = VARIANT_COLORS[it.variant || 'default'];
                            const isLast = idx === items.length - 1;
                            return (
                                <TouchableOpacity
                                    key={it.key}
                                    style={[styles.item, !isLast && styles.itemDivider]}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        onClose();
                                        // Defer the action so the modal fully dismisses before
                                        // routing or running a long-running task that may
                                        // mount another modal underneath.
                                        setTimeout(() => it.onPress(), 80);
                                    }}
                                >
                                    <View style={[styles.itemIcon, { backgroundColor: c.bg }]}>
                                        <Ionicons name={it.icon} size={20} color={c.icon} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.itemLabel, { color: c.text }]}>
                                            {it.label}
                                        </Text>
                                        {it.subtitle ? (
                                            <Text style={styles.itemSubtitle}>{it.subtitle}</Text>
                                        ) : null}
                                    </View>
                                    <Ionicons name="chevron-forward" size={16} color="#C4B5DC" />
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 24,
    },
    handle: {
        width: 44, height: 4, borderRadius: 2,
        backgroundColor: '#D4C9E8',
        alignSelf: 'center',
        marginBottom: 12,
    },
    header: { paddingHorizontal: 8, paddingBottom: 12 },
    title: { fontSize: 16, fontWeight: '900', color: '#2D2445' },
    subtitle: { fontSize: 12, color: '#7A6B9C', fontWeight: '600', marginTop: 4 },

    itemsList: {
        backgroundColor: '#fff',
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#EFE9F8',
        overflow: 'hidden',
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    itemDivider: {
        borderBottomWidth: 1,
        borderBottomColor: '#F4EEFC',
    },
    itemIcon: {
        width: 38, height: 38, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    itemLabel: { fontSize: 15, fontWeight: '800' },
    itemSubtitle: { fontSize: 11, color: '#9A8EBA', fontWeight: '600', marginTop: 2 },

    cancelBtn: {
        marginTop: 10, paddingVertical: 14,
        backgroundColor: '#F4EEFC',
        borderRadius: 18,
        alignItems: 'center',
    },
    cancelText: { fontSize: 15, fontWeight: '800', color: '#7A6B9C' },
});
