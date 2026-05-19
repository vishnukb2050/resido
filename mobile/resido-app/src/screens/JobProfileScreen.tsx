import React, { useState } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, 
    SafeAreaView, Switch, Image, Dimensions, StatusBar 
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

const CATEGORY_SUGGESTIONS = [
    { name: 'Plumber', icon: 'water' },
    { name: 'Electrician', icon: 'flash' },
    { name: 'Carpenter', icon: 'construct' },
    { name: 'Cleaner', icon: 'leaf' },
    { name: 'Painter', icon: 'brush' },
];

export default function JobProfileScreen() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        fullName: 'Ramesh Kumar',
        category: '',
        experience: '5 Years',
        serviceDesc: '',
        notes: '',
        serviceAreaType: 'Pincode',
        pincodes: '',
        hideMobile: false,
        allowChat: true,
    });

    const [showSuggestions, setShowSuggestions] = useState(false);

    const updateForm = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            
            {/* Header */}
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

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
                {/* Basic Information */}
                <View style={styles.section}>
                    <SectionHeader title="Basic Information" />
                    
                    <View style={styles.field}>
                        <Label text="Full Name" required />
                        <TextInput 
                            style={styles.input}
                            placeholder="e.g. Ramesh Kumar"
                            value={formData.fullName}
                            onChangeText={(v) => updateForm('fullName', v)}
                            placeholderTextColor="#94a3b8"
                        />
                    </View>

                    <View style={styles.field}>
                        <Label text="Tagline / Expertise" />
                        <TextInput 
                            style={styles.input}
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
                            <TouchableOpacity 
                                style={styles.selectInput}
                                onPress={() => setShowSuggestions(!showSuggestions)}
                            >
                                <Text style={[styles.selectText, !formData.category && { color: '#94a3b8' }]}>
                                    {formData.category || 'Type to search category'}
                                </Text>
                                <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {showSuggestions && (
                        <View style={styles.suggestionsBox}>
                            <Text style={styles.suggestionsTitle}>Popular Suggestions</Text>
                            {CATEGORY_SUGGESTIONS.map(cat => (
                                <TouchableOpacity 
                                    key={cat.name} 
                                    style={styles.suggestionItem}
                                    onPress={() => {
                                        updateForm('category', cat.name);
                                        setShowSuggestions(false);
                                    }}
                                >
                                    <View style={styles.sugIconBox}>
                                        <MaterialCommunityIcons name={cat.icon as any} size={20} color="#4c1d95" />
                                    </View>
                                    <Text style={styles.suggestionText}>{cat.name}</Text>
                                </TouchableOpacity>
                            ))}
                            <TouchableOpacity style={styles.viewAllCat}>
                                <Text style={styles.viewAllCatText}>View all categories</Text>
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
                                multiline
                                numberOfLines={4}
                                placeholder="Describe the services you offer..."
                                value={formData.serviceDesc}
                                onChangeText={(v) => updateForm('serviceDesc', v)}
                                placeholderTextColor="#94a3b8"
                            />
                            <Text style={styles.charCount}>{formData.serviceDesc.length}/1000</Text>
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Label text="Notes (Optional)" />
                        <View style={styles.textAreaContainer}>
                            <TextInput 
                                style={[styles.textArea, { height: 80 }]}
                                multiline
                                numberOfLines={2}
                                placeholder="Any additional notes..."
                                value={formData.notes}
                                onChangeText={(v) => updateForm('notes', v)}
                                placeholderTextColor="#94a3b8"
                            />
                            <Text style={styles.charCount}>{formData.notes.length}/500</Text>
                        </View>
                    </View>
                </View>

                {/* Service Area */}
                <View style={styles.section}>
                    <SectionHeader title="Service Area" />
                    <Label text="Add Service Area By" required />
                    
                    <View style={styles.radioRow}>
                        {['Pincode', 'City', 'District', 'State'].map(type => (
                            <TouchableOpacity 
                                key={type} 
                                style={[styles.radioItem, formData.serviceAreaType === type && styles.radioActive]}
                                onPress={() => updateForm('serviceAreaType', type)}
                            >
                                <View style={[styles.radioCircle, formData.serviceAreaType === type && styles.radioCircleActive]}>
                                    {formData.serviceAreaType === type && <View style={styles.radioInner} />}
                                </View>
                                <Text style={[styles.radioLabel, formData.serviceAreaType === type && styles.radioLabelActive]}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.field}>
                        <Label text={`Enter ${formData.serviceAreaType}s`} required />
                        <TextInput 
                            style={styles.input}
                            placeholder={formData.serviceAreaType === 'Pincode' ? "e.g. 560001, 560002" : `e.g. Bangalore`}
                            value={formData.pincodes}
                            onChangeText={(v) => updateForm('pincodes', v)}
                            placeholderTextColor="#94a3b8"
                        />
                        <View style={styles.fieldFooter}>
                            <Text style={styles.helperText}>Enter multiple {formData.serviceAreaType.toLowerCase()}s separated by comma</Text>
                            <TouchableOpacity><Text style={styles.addMoreText}>+ Add More</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Media */}
                <View style={styles.section}>
                    <SectionHeader title="Media" />
                    <Text style={styles.mediaHelper}>Add photos, videos of your work, tools, office, etc.</Text>
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.mediaBtn}>
                            <Ionicons name="image-outline" size={24} color="#4c1d95" />
                            <View style={styles.mediaTextContent}>
                                <Text style={styles.mediaBtnTitle}>Add Photos</Text>
                                <Text style={styles.mediaBtnSub}>JPG, PNG (Max 10 MB)</Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.mediaBtn}>
                            <Ionicons name="videocam-outline" size={24} color="#4c1d95" />
                            <View style={styles.mediaTextContent}>
                                <Text style={styles.mediaBtnTitle}>Add Videos</Text>
                                <Text style={styles.mediaBtnSub}>MP4, MOV (Max 50 MB)</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.mediaStatus}>Added Media (0)</Text>
                    <Text style={styles.noMedia}>No media added yet</Text>
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
                                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                                </TouchableOpacity>
                                <TextInput style={styles.phoneField} placeholder="Mobile number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
                            </View>
                        </View>
                        <View style={[styles.field, { flex: 1 }]}>
                            <Label text="Office Number" optional />
                            <View style={styles.phoneInput}>
                                <TouchableOpacity style={styles.countryCode}>
                                    <Text style={styles.countryText}>+91</Text>
                                    <Ionicons name="chevron-down" size={14} color="#94a3b8" />
                                </TouchableOpacity>
                                <TextInput style={styles.phoneField} placeholder="Office number" placeholderTextColor="#94a3b8" keyboardType="phone-pad" />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity 
                        style={styles.checkboxRow}
                        onPress={() => updateForm('hideMobile', !formData.hideMobile)}
                    >
                        <View style={[styles.checkbox, formData.hideMobile && styles.checkboxActive]}>
                            {formData.hideMobile && <Ionicons name="checkmark" size={12} color="#fff" />}
                        </View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.checkboxLabel}>Hide my mobile number</Text>
                            <Text style={styles.checkboxSub}>Your number will be hidden from others</Text>
                        </View>
                    </TouchableOpacity>

                    <View style={styles.toggleRow}>
                        <View style={styles.toggleInfo}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4c1d95" />
                            </View>
                            <View style={{ marginLeft: 12 }}>
                                <Text style={styles.toggleLabel}>Chat Option</Text>
                                <Text style={styles.toggleSubText}>Allow users to chat with you</Text>
                            </View>
                        </View>
                        <Switch 
                            value={formData.allowChat}
                            onValueChange={(v) => updateForm('allowChat', v)}
                            trackColor={{ false: '#e2e8f0', true: '#4c1d95' }}
                            thumbColor="#fff"
                        />
                    </View>
                </View>

                {/* Additional Details */}
                <View style={styles.section}>
                    <SectionHeader title="Additional Details" optional />
                    <DetailItem icon="cash-outline" title="Pricing" sub="Add your service pricing or starting price" />
                    <DetailItem icon="time-outline" title="Working Hours" sub="Add your working hours" />
                    <DetailItem icon="language-outline" title="Languages Known" sub="Add languages you can communicate in" />
                    <DetailItem icon="star-outline" title="Highlights" sub="Add your key achievements or specialities" />
                </View>

                {/* Footer Buttons */}
                <View style={styles.footerBtns}>
                    <TouchableOpacity style={styles.draftBtn}>
                        <Text style={styles.draftBtnText}>Save as Draft</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.publishBtn}>
                        <Text style={styles.publishBtnText}>Publish Job Profile</Text>
                    </TouchableOpacity>
                </View>
                
                <Text style={styles.termsText}>
                    By publishing, you agree to our <Text style={styles.link}>Terms & Conditions</Text> and <Text style={styles.link}>Privacy Policy</Text>
                </Text>

                <View style={{ height: 120 }} />
            </ScrollView>

            <BottomNav activeTab="Account" />
        </SafeAreaView>
    );
}

function SectionHeader({ title, optional }: any) {
    return (
        <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {optional && <Text style={styles.optionalText}> (Optional)</Text>}
        </View>
    );
}

function Label({ text, required, optional }: any) {
    return (
        <View style={styles.labelRow}>
            <Text style={styles.label}>{text}</Text>
            {required && <Text style={styles.requiredStar}> *</Text>}
            {optional && <Text style={styles.optionalText}> (Optional)</Text>}
        </View>
    );
}

function DetailItem({ icon, title, sub }: any) {
    return (
        <TouchableOpacity style={styles.detailItem}>
            <View style={styles.detailIconBox}>
                <Ionicons name={icon} size={20} color="#4c1d95" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.detailTitle}>{title}</Text>
                <Text style={styles.detailSub}>{sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfd' },
    header: { padding: 20, paddingTop: 65, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#fff' },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#1e293b' },
    previewBtn: { fontSize: 15, color: '#4c1d95', fontWeight: '800' },
    content: { flex: 1 },
    section: { padding: 20, borderBottomWidth: 8, borderBottomColor: '#f8fafc' },
    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 16, fontWeight: '900', color: '#1e293b' },
    optionalText: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
    field: { marginBottom: 20 },
    labelRow: { flexDirection: 'row', marginBottom: 10 },
    label: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    requiredStar: { color: '#ef4444' },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, height: 52, fontSize: 15, color: '#1e293b' },
    row: { flexDirection: 'row', gap: 15 },
    selectInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 16, height: 52 },
    selectText: { fontSize: 14, color: '#1e293b', fontWeight: '600' },
    suggestionsBox: { backgroundColor: '#fff', borderRadius: 18, padding: 20, marginTop: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 5 },
    suggestionsTitle: { fontSize: 12, fontWeight: '800', color: '#94a3b8', marginBottom: 15, textTransform: 'uppercase' },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 12 },
    sugIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f5f7ff', alignItems: 'center', justifyContent: 'center' },
    suggestionText: { fontSize: 14, color: '#1e293b', fontWeight: '700' },
    viewAllCat: { marginTop: 5 },
    viewAllCatText: { fontSize: 13, color: '#4c1d95', fontWeight: '800' },
    textAreaContainer: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 12, minHeight: 120 },
    textArea: { fontSize: 15, color: '#1e293b', textAlignVertical: 'top' },
    charCount: { alignSelf: 'flex-end', fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
    radioRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
    radioItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', minWidth: (width - 60) / 4 },
    radioActive: { borderColor: '#4c1d95', backgroundColor: '#f5f3ff' },
    radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    radioCircleActive: { borderColor: '#4c1d95' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4c1d95' },
    radioLabel: { fontSize: 13, fontWeight: '700', color: '#64748b' },
    radioLabelActive: { color: '#4c1d95' },
    fieldFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    helperText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    addMoreText: { fontSize: 12, color: '#4c1d95', fontWeight: '800' },
    mediaHelper: { fontSize: 12, color: '#64748b', marginBottom: 15, fontWeight: '500' },
    mediaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 15, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: '#cbd5e1' },
    mediaTextContent: { marginLeft: 10 },
    mediaBtnTitle: { fontSize: 13, fontWeight: '800', color: '#4c1d95' },
    mediaBtnSub: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    mediaStatus: { fontSize: 13, fontWeight: '800', color: '#1e293b', marginTop: 20, marginBottom: 5 },
    noMedia: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
    phoneInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', overflow: 'hidden' },
    countryCode: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRightWidth: 1, borderRightColor: '#f1f5f9', height: '100%', gap: 4 },
    countryText: { fontSize: 14, color: '#1e293b', fontWeight: '800' },
    phoneField: { flex: 1, padding: 14, color: '#1e293b', fontSize: 15 },
    checkboxRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 20 },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#cbd5e1', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#4c1d95', borderColor: '#4c1d95' },
    checkboxLabel: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
    checkboxSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', padding: 15, borderRadius: 16, marginTop: 25 },
    toggleInfo: { flexDirection: 'row', alignItems: 'center' },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
    toggleLabel: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    toggleSubText: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    detailItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    detailIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f5f7ff', alignItems: 'center', justifyContent: 'center' },
    detailTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
    detailSub: { fontSize: 11, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    footerBtns: { flexDirection: 'row', padding: 20, gap: 15 },
    draftBtn: { flex: 1, backgroundColor: '#f5f3ff', padding: 16, borderRadius: 14, alignItems: 'center' },
    draftBtnText: { color: '#4c1d95', fontWeight: '800', fontSize: 15 },
    publishBtn: { flex: 1.5, backgroundColor: '#4c1d95', padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: '#4c1d95', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
    publishBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    termsText: { textAlign: 'center', fontSize: 11, color: '#94a3b8', paddingHorizontal: 40, lineHeight: 16 },
    link: { color: '#4c1d95', fontWeight: '700' },
});
