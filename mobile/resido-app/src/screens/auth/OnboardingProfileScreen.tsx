import React, { useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
    Image as RNImage,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';

/**
 * Mandatory profile-setup screen shown immediately after OTP verification when
 * the user has not yet picked a display name + username + visibility. The
 * username (profileName) is globally unique so other people can search for it
 * — we surface conflict errors inline so the user can pick another one.
 *
 * Routing rules:
 *   - OtpLoginScreen sends fresh accounts here instead of `/` or
 *     `/workspace-select`.
 *   - HomeScreen also redirects already-authenticated users here if their
 *     profile is still missing the basics (covers app restarts and old
 *     accounts that never completed onboarding).
 *   - On save we route to `/workspace-select` if the user has more than one
 *     community, otherwise to `/` (MySpace / community dashboard).
 */

type Visibility = 'GLOBAL' | 'CONTACTS' | 'COMMUNITY' | 'FOLLOWERS';

const VISIBILITY_OPTIONS: Array<{ value: Visibility; label: string; desc: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { value: 'GLOBAL',    label: 'Global',         desc: 'Anyone can view and follow your profile freely',            icon: 'globe-outline' },
    { value: 'CONTACTS',  label: 'Contacts only',  desc: 'Only your synced contacts can view and follow you',         icon: 'people-outline' },
    { value: 'COMMUNITY', label: 'My communities', desc: 'Only members of your communities can view and follow you',  icon: 'home-outline' },
    { value: 'FOLLOWERS', label: 'Followers only', desc: 'Only the people who already follow you can see details',    icon: 'lock-closed-outline' },
];

const USERNAME_REGEX = /^[a-z0-9._]{3,24}$/;

export default function OnboardingProfileScreen() {
    const router = useRouter();
    const { user, workspaces, updateUser } = useAuthStore();

    const [name, setName] = useState<string>(user?.name || '');
    const [username, setUsername] = useState<string>(user?.profileName || '');
    const [visibility, setVisibility] = useState<Visibility>(((user as any)?.profileVisibility as Visibility) || 'GLOBAL');
    const [saving, setSaving] = useState(false);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    // If somehow we land here without a logged-in user, bounce back to login.
    useEffect(() => {
        if (!user) router.replace('/otp-login');
    }, [user]);

    // Lower-case + strip whitespace as the user types so the field can never
    // hold a value the server would reject for formatting.
    const handleUsernameChange = (raw: string) => {
        const cleaned = raw.trim().toLowerCase().replace(/\s+/g, '');
        setUsername(cleaned);
        setUsernameError(null);
    };

    const usernameValid = useMemo(() => USERNAME_REGEX.test(username), [username]);
    const nameValid = name.trim().length >= 2;
    const canSubmit = nameValid && usernameValid && !saving;

    const handleSave = async () => {
        if (!nameValid) {
            Alert.alert('Add your name', 'Please enter your full name so others can recognise you.');
            return;
        }
        if (!usernameValid) {
            setUsernameError('Use 3-24 characters: a-z, 0-9, dot or underscore.');
            return;
        }
        setSaving(true);
        try {
            const { data: updated } = await authApi.updateProfile({
                name: name.trim(),
                profileName: username,
                profileVisibility: visibility,
            });
            updateUser({
                ...(updated || {}),
                name: name.trim(),
                profileName: username,
                profileVisibility: visibility,
            });
            // Pick the same landing logic the OTP screen uses: workspace
            // chooser only when the user belongs to more than one community.
            if ((workspaces?.length || 0) > 1) {
                router.replace('/workspace-select');
            } else {
                router.replace('/');
            }
        } catch (err: any) {
            const status = err?.response?.status;
            const message: string | undefined = err?.response?.data?.message || err?.message;
            const looksLikeConflict =
                status === 409 ||
                /unique|already (taken|in use|exists)|p2002/i.test(message || '');
            if (looksLikeConflict) {
                setUsernameError('That username is already taken. Try another one.');
            } else {
                Alert.alert('Could not save profile', message || 'Please try again in a moment.');
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <RNImage source={require('../../../assets/resido_logo.jpg')} style={styles.logo} />
                    <Text style={styles.title}>Set up your profile</Text>
                    <Text style={styles.subtitle}>
                        Pick a name, a unique username and who can see your profile. You can change these later from Edit Profile.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.label}>Full name</Text>
                    <View style={styles.inputWrap}>
                        <Ionicons name="person-outline" size={18} color="#7A6B9C" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Your name"
                            placeholderTextColor="#9A8EBA"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            returnKeyType="next"
                        />
                    </View>

                    <Text style={[styles.label, { marginTop: 18 }]}>Username</Text>
                    <View style={[styles.inputWrap, usernameError ? styles.inputWrapError : null]}>
                        <Text style={styles.inputPrefix}>@</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="yourname"
                            placeholderTextColor="#9A8EBA"
                            value={username}
                            onChangeText={handleUsernameChange}
                            autoCapitalize="none"
                            autoCorrect={false}
                            returnKeyType="done"
                        />
                    </View>
                    <Text style={[styles.helper, usernameError ? styles.helperError : null]}>
                        {usernameError
                            ? usernameError
                            : 'Lowercase letters, numbers, dot or underscore. People will find you by this handle.'}
                    </Text>

                    <Text style={[styles.label, { marginTop: 24 }]}>Who can see your profile?</Text>
                    {VISIBILITY_OPTIONS.map(option => {
                        const isSelected = visibility === option.value;
                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[styles.option, isSelected && styles.optionSelected]}
                                onPress={() => setVisibility(option.value)}
                                activeOpacity={0.85}
                            >
                                <View style={[styles.optionIcon, isSelected && styles.optionIconSelected]}>
                                    <Ionicons
                                        name={option.icon}
                                        size={18}
                                        color={isSelected ? '#ffffff' : '#8b5cf6'}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.optionDesc}>{option.desc}</Text>
                                </View>
                                {isSelected ? (
                                    <Ionicons name="checkmark-circle" size={20} color="#8b5cf6" />
                                ) : (
                                    <Ionicons name="ellipse-outline" size={20} color="#D4C9E8" />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
                    onPress={handleSave}
                    disabled={!canSubmit}
                    activeOpacity={0.9}
                >
                    {saving ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.submitText}>Continue</Text>
                    )}
                </TouchableOpacity>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    scroll: { padding: 20, paddingTop: 60, paddingBottom: 60 },
    header: { alignItems: 'center', marginBottom: 28 },
    logo: { width: 64, height: 64, borderRadius: 16, marginBottom: 16 },
    title: { fontSize: 22, fontWeight: '900', color: '#2D2445', marginBottom: 8 },
    subtitle: { fontSize: 13, color: '#7A6B9C', textAlign: 'center', lineHeight: 18, paddingHorizontal: 8 },

    card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#E2D9F2' },

    label: { fontSize: 13, fontWeight: '800', color: '#2D2445', marginBottom: 8 },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F4EEFC',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2D9F2',
        paddingHorizontal: 12,
        height: 48,
    },
    inputWrapError: { borderColor: '#ef4444', backgroundColor: '#FEF2F2' },
    inputIcon: { marginRight: 8 },
    inputPrefix: { color: '#8b5cf6', fontWeight: '900', fontSize: 16, marginRight: 4 },
    input: { flex: 1, fontSize: 15, color: '#2D2445', fontWeight: '600', paddingVertical: 0 },

    helper: { marginTop: 6, fontSize: 11, color: '#7A6B9C', fontWeight: '600' },
    helperError: { color: '#ef4444' },

    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: '#E2D9F2',
        borderRadius: 14,
        padding: 12,
        marginTop: 10,
        backgroundColor: '#FAFAFF',
    },
    optionSelected: { borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0.06)' },
    optionIcon: {
        width: 36, height: 36, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(139,92,246,0.12)',
    },
    optionIconSelected: { backgroundColor: '#8b5cf6' },
    optionLabel: { fontSize: 14, fontWeight: '800', color: '#2D2445' },
    optionLabelSelected: { color: '#8b5cf6' },
    optionDesc: { fontSize: 11, color: '#7A6B9C', marginTop: 2, fontWeight: '600' },

    submitBtn: {
        marginTop: 22,
        backgroundColor: '#8b5cf6',
        borderRadius: 14,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitBtnDisabled: { opacity: 0.5 },
    submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
