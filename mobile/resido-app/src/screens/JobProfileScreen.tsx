import React, { useState, useEffect } from 'react';
import { 
    View, Text, TouchableOpacity, StyleSheet, Alert, 
    ActivityIndicator, ScrollView, TextInput, SafeAreaView,
    Switch, Image, Dimensions
} from 'react-native';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const CATEGORY_SUGGESTIONS = [
    { id: '1', name: 'Plumber', icon: 'wrench' },
    { id: '2', name: 'Electrician', icon: 'flash' },
    { id: '3', name: 'Carpenter', icon: 'hammer' },
    { id: '4', name: 'Cleaner', icon: 'broom' },
    { id: '5', name: 'Painter', icon: 'format-paint' },
];

export default function JobProfileScreen() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        fullName: user?.name || '',
        tagline: '',
        experience: '5 Years',
        category: '',
        description: '',
        notes: '',
        serviceAreaType: 'Pincode',
        pincodes: '',
        contactNumber: user?.phone || '',
        officeNumber: '',
        hideMobile: false,
        allowChat: true,
    });

    useEffect(() => {
        fetchJobProfile();
    }, []);

    const fetchJobProfile = async () => {
        try {
            const { data } = await api.get('/profile/job');
            if (data) {
                setFormData(prev => ({ ...prev, ...data }));
            }
        } catch (error) {
            // Might be 404
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (publish = true) => {
        setSaving(true);
        try {
            await api.post('/profile/job', { ...formData, published: publish });
            Alert.alert('Success', publish ? 'Job Profile published!' : 'Draft saved!');
            router.back();
        } catch (error) {
            Alert.alert('Error', 'Failed to save job profile');
        } finally {
            setSaving(false);
        }
    };

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const Label = ({ text, required }: { text: string, required?: boolean }) => (
        <Text style={styles.label}>{text}{required && <Text style={{ color: '#ef4444' }}> *</Text>}</Text>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color="#1e293b" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Job Profile</Text>
                </View>
                <TouchableOpacity>
                    <Text style={styles.previewBtn}>Preview</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {/* Basic Information */}
                <View style={styles.section}>
                    <SectionHeader title="Basic Information" />
                    
                    <View style={styles.field}>
                        <Label text="Full Name" required />
                        <TextInput 
                            style={styles.input} 
                            value={formData.fullName} 
                            onChangeText={(t) => setFormData({...formData, fullName: t})} 
                            placeholder="e.g. Ramesh Kumar"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <View style={styles.field}>
                        <Label text="Tagline / Expertise" />
                        <TextInput 
                            style={styles.input} 
                            value={formData.tagline} 
                            onChangeText={(t) => setFormData({...formData, tagline: t})} 
                            placeholder="e.g. 5 years experience in residential wiring"
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Label text="Experience" />
                            <TouchableOpacity style={styles.selectInput}>
                                <Text style={styles.selectText}>{formData.experience}</Text>
                                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Label text="Job / Service Category" required />
                            <TouchableOpacity style={styles.selectInput}>
                                <Text style={styles.selectText}>{formData.category || 'Type to search category'}</Text>
                                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Suggestions Box (Simulated as per image) */}
                    {!formData.category && (
                        <View style={styles.suggestionsBox}>
                            <Text style={styles.suggestionTitle}>Popular Suggestions</Text>
                            {CATEGORY_SUGGESTIONS.map(item => (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={styles.suggestionItem}
                                    onPress={() => setFormData({...formData, category: item.name})}
                                >
                                    <MaterialCommunityIcons name={item.icon as any} size={20} color="#6366f1" />
                                    <Text style={styles.suggestionText}>{item.name}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity>
                                <Text style={styles.viewAllText}>View all categories</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                {/* About Your Services */}
                <View style={styles.section}>
                    <SectionHeader title="About Your Services" />
                    
                    <View style={styles.field}>
                        <Label text="Service Description" required />
                        <View style={styles.textAreaContainer}>
                            <TextInput 
                                style={styles.textArea} 
                                value={formData.description} 
                                onChangeText={(t) => setFormData({...formData, description: t})} 
                                placeholder="Describe the services you offer..."
                                multiline
                                maxLength={1000}
                                placeholderTextColor="#94a3b8"
                            />
                            <Text style={styles.charCount}>{formData.description.length}/1000</Text>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Label text="Notes (Optional)" />
                        <View style={styles.textAreaContainer}>
                            <TextInput 
                                style={[styles.textArea, { height: 80 }]} 
                                value={formData.notes} 
                                onChangeText={(t) => setFormData({...formData, notes: t})} 
                                placeholder="Any additional notes..."
                                multiline
                                maxLength={500}
                                placeholderTextColor="#94a3b8"
                            />
                            <Text style={styles.charCount}>{formData.notes.length}/500</Text>
                        </View>
                    </View>
                </SectionHeader>

                {/* Service Area */}
                <View style={styles.section}>
                    <SectionHeader title="Service Area" />
                    <Label text="Add Service Area By" required />
                    
                    <View style={styles.areaOptions}>
                        {['Pincode', 'City', 'District', 'State'].map(type => (
                            <TouchableOpacity 
                                key={type} 
                                style={[styles.areaBtn, formData.serviceAreaType === type && styles.areaBtnActive]}
                                onPress={() => setFormData({...formData, serviceAreaType: type})}
                            >
                                <View style={[styles.radio, formData.serviceAreaType === type && styles.radioActive]}>
                                    {formData.serviceAreaType === type && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[styles.areaBtnText, formData.serviceAreaType === type && styles.areaBtnTextActive]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.field}>
                        <Label text="Enter Pincodes" required />
                        <TextInput 
                            style={styles.input} 
                            value={formData.pincodes} 
                            onChangeText={(t) => setFormData({...formData, pincodes: t})} 
                            placeholder="e.g. 560001, 560002, 560003"
                            placeholderTextColor="#94a3b8"
                        />
                        <View style={styles.hintRow}>
                            <Text style={styles.fieldHint}>Enter multiple pincodes separated by comma</Text>
                            <TouchableOpacity><Text style={styles.addMoreText}>+ Add More</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Media */}
                <View style={styles.section}>
                    <SectionHeader title="Media" />
                    <Text style={styles.fieldHint}>Add photos, videos of your work, tools, office, etc.</Text>
                    
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.mediaBox}>
                            <Ionicons name="image-outline" size={24} color="#6366f1" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.mediaTitle}>Add Photos</Text>
                                <Text style={styles.mediaSub}>JPG, PNG (Max 10 MB)</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mediaBox}>
                            <Ionicons name="videocam-outline" size={24} color="#6366f1" />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.mediaTitle}>Add Videos</Text>
                                <Text style={styles.mediaSub}>MP4, MOV (Max 50 MB)</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.addedMediaText}>Added Media (0)</Text>
                    <Text style={[styles.fieldHint, { marginTop: 4 }]}>No media added yet</Text>
                </View>

                {/* Contact & Visibility */}
                <View style={styles.section}>
                    <SectionHeader title="Contact & Visibility" />
                    
                    <View style={styles.row}>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Label text="Contact Number" />
                            <View style={styles.phoneInput}>
                                <TouchableOpacity style={styles.countryCode}>
                                    <Text style={styles.countryText}>+91</Text>
                                    <Ionicons name="chevron-down" size={12} color="#94a3b8" />
                                </TouchableOpacity>
                                <TextInput 
                                    style={styles.phoneField} 
                                    value={formData.contactNumber} 
                                    placeholder="Enter mobile number"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Label text="Office / Landline Number (Optional)" />
                            <View style={styles.phoneInput}>
                                <TouchableOpacity style={styles.countryCode}>
                                    <Text style={styles.countryText}>+91</Text>
                                    <Ionicons name="chevron-down" size={12} color="#94a3b8" />
                                </TouchableOpacity>
                                <TextInput 
                                    style={styles.phoneField} 
                                    value={formData.officeNumber} 
                                    placeholder="Enter office number"
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.checkboxRow} 
                        onPress={() => setFormData({...formData, hideMobile: !formData.hideMobile})}
                    >
                        <View style={[styles.checkbox, formData.hideMobile && styles.checkboxActive]}>
                            {formData.hideMobile && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.checkboxLabel}>Hide my mobile number</Text>
                            <Text style={styles.fieldHint}>Your number will be hidden from others</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6366f1" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.toggleLabel}>Chat Option</Text>
                                <Text style={styles.fieldHint}>Allow users to chat with you</Text>
                            </View>
                        </View>
                        <Switch 
                            value={formData.allowChat} 
                            onValueChange={(v) => setFormData({...formData, allowChat: v})}
                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Additional Details */}
                <View style={styles.section}>
                    <SectionHeader title="Additional Details (Optional)" />
                    {[
                        { icon: 'cash-outline', label: 'Pricing', desc: 'Add your service pricing or starting price' },
                        { icon: 'time-outline', label: 'Working Hours', desc: 'Add your working hours' },
                        { icon: 'language-outline', label: 'Languages Known', desc: 'Add languages you can communicate in' },
                        { icon: 'star-outline', label: 'Highlights', desc: 'Add your key achievements or specialities' },
                    ].map((item, idx) => (
                        <TouchableOpacity key={idx} style={styles.detailRow}>
                            <Ionicons name={item.icon as any} size={20} color="#6366f1" />
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>{item.label}</Text>
                                <Text style={styles.detailDesc}>{item.desc}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Footer Buttons */}
                <View style={styles.footerBtns}>
                    <TouchableOpacity style={styles.draftBtn} onPress={() => handleSave(false)}>
                        <Text style={styles.draftBtnText}>Save as Draft</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.publishBtn} onPress={() => handleSave(true)}>
                        <Text style={styles.publishBtnText}>Publish Job Profile</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.termsText}>By publishing, you agree to our <Text style={styles.link}>Terms & Conditions</Text> and <Text style={styles.link}>Privacy Policy</Text></Text>

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    previewBtn: { fontSize: 15, color: '#6366f1', fontWeight: '800' },

    container: { flex: 1 },
    section: { padding: 20, borderBottomWidth: 8, borderBottomColor: '#f8fafc' },
    sectionHeader: { fontSize: 16, fontWeight: '900', color: '#1e293b', marginBottom: 20 },
    
    field: { marginBottom: 20 },
    label: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginBottom: 10 },
    input: { backgroundColor: '#fff', borderRadius: 12, padding: 14, color: '#1e293b', fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0' },
    row: { flexDirection: 'row', gap: 15 },
    
    selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
    selectText: { fontSize: 14, color: '#1e293b', fontWeight: '500' },
    
    suggestionsBox: { backgroundColor: '#fff', borderRadius: 16, padding: 15, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 5 },
    suggestionTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 15, textTransform: 'uppercase' },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 12 },
    suggestionText: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
    viewAllText: { fontSize: 13, color: '#6366f1', fontWeight: '800', marginTop: 5 },

    textAreaContainer: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    textArea: { height: 120, padding: 14, textAlignVertical: 'top', color: '#1e293b', fontSize: 15 },
    charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#94a3b8', padding: 8, fontWeight: '600' },

    areaOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    areaBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e2e8f0', minWidth: (width - 60) / 4 },
    areaBtnActive: { borderColor: '#6366f1', backgroundColor: '#f5f3ff' },
    areaBtnText: { fontSize: 13, color: '#64748b', fontWeight: '600' },
    areaBtnTextActive: { color: '#6366f1' },
    radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8, alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: '#6366f1' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366f1' },

    hintRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    fieldHint: { fontSize: 11, color: '#94a3b8', fontWeight: '500' },
    addMoreText: { fontSize: 12, color: '#6366f1', fontWeight: '800' },

    mediaBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, padding: 15, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1' },
    mediaTitle: { fontSize: 13, fontWeight: '800', color: '#6366f1' },
    mediaSub: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    addedMediaText: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 20 },

    phoneInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    countryCode: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: '#f1f5f9', height: '100%', gap: 4 },
    countryText: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
    phoneField: { flex: 1, padding: 14, color: '#1e293b', fontSize: 15 },

    checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    checkboxLabel: { fontSize: 13, fontWeight: '800', color: '#1e293b' },

    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 15, borderRadius: 16, marginTop: 25 },
    toggleInfo: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    toggleLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b' },

    detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    detailContent: { flex: 1, marginLeft: 15 },
    detailLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    detailDesc: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },

    footerBtns: { flexDirection: 'row', padding: 20, gap: 15 },
    draftBtn: { flex: 1, backgroundColor: '#f5f3ff', padding: 16, borderRadius: 14, alignItems: 'center' },
    draftBtnText: { color: '#6366f1', fontWeight: '800', fontSize: 15 },
    publishBtn: { flex: 1.5, backgroundColor: '#6366f1', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
    publishBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    termsText: { textAlign: 'center', fontSize: 11, color: '#94a3b8', paddingHorizontal: 40, lineHeight: 16 },
    link: { color: '#6366f1', fontWeight: '700' },
});
