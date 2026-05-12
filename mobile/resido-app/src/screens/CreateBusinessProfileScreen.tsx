import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    FlatList, Modal, ActivityIndicator, Switch, Dimensions, StatusBar
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { businessApi } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

// --- DATA ---
const CATEGORIES = [
    'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Pest Control', 
    'Home Renovation', 'Beauty & Salon', 'Personal Training', 'Yoga', 
    'Education', 'Bakery', 'Catering', 'Interior Design', 'Others'
];

const EXPERIENCE_LEVELS = ['1+ Year', '2+ Years', '3+ Years', '5+ Years', '10+ Years'];
const BUSINESS_TYPES = ['Service Provider', 'Retailer', 'Manufacturer', 'Freelancer'];
const RESPONSE_TIMES = ['Within 1 Hour', 'Within 2 Hours', 'Within 4 Hours', 'Same Day'];

export default function CreateBusinessProfileScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams(); // If editing
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!id);

    // Form State
    const [formData, setFormData] = useState({
        businessName: '',
        category: '',
        businessType: '',
        about: '',
        logo: null as string | null,
        experience: '',
        phone: '',
        email: '',
        website: '',
        instagram: '',
        linkedin: '',
        workingHours: { from: '08:00 AM', to: '06:00 PM', days: 'Mon - Sat' },
        
        // Location
        location: '',
        area: '',
        fullAddress: '',
        latitude: 0,
        longitude: 0,
        serviceAreaType: 'AT_LOCATION', // AT_LOCATION, CUSTOMER_LOCATION, SPECIFIC_AREAS
        
        // Services
        services: [] as any[],
    });

    // Temporary state for adding/editing a service
    const [currentService, setCurrentService] = useState({
        id: '',
        name: '',
        description: '',
        pricingType: 'CONTACT', // FIXED, STARTING, CONTACT
        price: '',
        responseTime: 'Within 2 Hours',
        isEmergency: false,
    });
    const [showServiceModal, setShowServiceModal] = useState(false);

    useEffect(() => {
        if (id) {
            fetchProfile();
        }
    }, [id]);

    const fetchProfile = async () => {
        try {
            const res = await businessApi.getProfile(id as string);
            setFormData(res.data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setInitialLoading(false);
        }
    };

    const nextStep = () => setStep(Math.min(step + 1, 4));
    const prevStep = () => setStep(Math.max(step - 1, 1));

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setFormData({ ...formData, logo: result.assets[0].uri });
        }
    };

    const renderStepper = () => (
        <View style={styles.stepperContainer}>
            {[1, 2, 3, 4].map((i) => (
                <React.Fragment key={i}>
                    <View style={styles.stepWrapper}>
                        <View style={[
                            styles.stepCircle, 
                            step >= i ? styles.stepCircleActive : styles.stepCircleInactive
                        ]}>
                            {step > i ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                            ) : (
                                <Text style={[styles.stepNumber, step === i && styles.stepNumberActive]}>{i}</Text>
                            )}
                        </View>
                        <Text style={[styles.stepLabel, step === i && styles.stepLabelActive]}>
                            {i === 1 ? 'Business Info' : i === 2 ? 'Services' : i === 3 ? 'Location' : 'Review & Publish'}
                        </Text>
                    </View>
                    {i < 4 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
                </React.Fragment>
            ))}
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.row}>
                <TouchableOpacity style={styles.logoBox} onPress={pickImage}>
                    {formData.logo ? (
                        <Image source={{ uri: formData.logo }} style={styles.logoImage} />
                    ) : (
                        <>
                            <Ionicons name="camera" size={24} color="#6366f1" />
                            <Text style={styles.logoText}>Add Logo</Text>
                            <Text style={styles.logoSubtext}>JPG, PNG up to 5MB</Text>
                        </>
                    )}
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 12 }}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Business Name *</Text>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Enter business name" 
                            placeholderTextColor="#94a3b8"
                            value={formData.businessName}
                            onChangeText={t => setFormData({...formData, businessName: t})}
                        />
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Business Category *</Text>
                        <View style={styles.pickerContainer}>
                            <TextInput 
                                style={[styles.input, { paddingRight: 40 }]} 
                                placeholder="Select a category" 
                                placeholderTextColor="#94a3b8"
                                value={formData.category}
                                editable={false}
                            />
                            <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Description *</Text>
                <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Describe your business, services and what makes you unique" 
                    placeholderTextColor="#94a3b8"
                    multiline
                    maxLength={250}
                    value={formData.about}
                    onChangeText={t => setFormData({...formData, about: t})}
                />
                <Text style={styles.charCount}>{formData.about.length}/250</Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Years in Business</Text>
                    <View style={styles.pickerContainer}>
                        <Text style={styles.inputPlaceholder}>{formData.experience || 'Select experience'}</Text>
                        <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                    </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Business Type</Text>
                    <View style={styles.pickerContainer}>
                        <Text style={styles.inputPlaceholder}>{formData.businessType || 'Select type'}</Text>
                        <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                    </View>
                </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Contact Information</Text>
            <View style={styles.contactItem}>
                <Ionicons name="call-outline" size={20} color="#64748b" />
                <TextInput 
                    style={styles.contactInput} 
                    placeholder="Enter phone number" 
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={t => setFormData({...formData, phone: t})}
                />
            </View>
            <View style={styles.contactItem}>
                <Ionicons name="mail-outline" size={20} color="#64748b" />
                <TextInput 
                    style={styles.contactInput} 
                    placeholder="Enter email address" 
                    placeholderTextColor="#94a3b8"
                    keyboardType="email-address"
                    value={formData.email}
                    onChangeText={t => setFormData({...formData, email: t})}
                />
            </View>
            <View style={styles.contactItem}>
                <Ionicons name="globe-outline" size={20} color="#64748b" />
                <TextInput 
                    style={styles.contactInput} 
                    placeholder="Enter website (optional)" 
                    placeholderTextColor="#94a3b8"
                    value={formData.website}
                    onChangeText={t => setFormData({...formData, website: t})}
                />
            </View>
            <TouchableOpacity style={styles.contactItem}>
                <Ionicons name="time-outline" size={20} color="#64748b" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.label}>Business Hours</Text>
                    <Text style={styles.valueText}>{formData.workingHours.days}, {formData.workingHours.from} - {formData.workingHours.to}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Social Links (Optional)</Text>
            <Text style={styles.subText}>Add your social media links to connect with more customers</Text>
            
            <View style={styles.socialItem}>
                <Ionicons name="logo-instagram" size={20} color="#64748b" />
                <TextInput 
                    style={styles.contactInput} 
                    placeholder="https://instagram.com/yourbusiness" 
                    placeholderTextColor="#94a3b8"
                    value={formData.instagram}
                    onChangeText={t => setFormData({...formData, instagram: t})}
                />
                <Ionicons name="link-outline" size={18} color="#64748b" />
            </View>
            <View style={styles.socialItem}>
                <Ionicons name="logo-linkedin" size={20} color="#64748b" />
                <TextInput 
                    style={styles.contactInput} 
                    placeholder="https://linkedin.com/company/yourbusiness" 
                    placeholderTextColor="#94a3b8"
                    value={formData.linkedin}
                    onChangeText={t => setFormData({...formData, linkedin: t})}
                />
                <Ionicons name="link-outline" size={18} color="#64748b" />
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Add Your Services</Text>
            <Text style={styles.subText}>Select the services you offer and add details to help customers find you.</Text>

            <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color="#94a3b8" />
                <TextInput 
                    style={styles.searchInput} 
                    placeholder="Search services (e.g., Plumbing, Installation)" 
                    placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity><Text style={styles.browseAll}>Browse All</Text></TouchableOpacity>
            </View>

            <View style={styles.serviceHeader}>
                <Text style={styles.serviceTitle}>Selected Services ({formData.services.length})</Text>
                <TouchableOpacity style={styles.reorderBtn}>
                    <Text style={styles.reorderText}>Reorder</Text>
                    <MaterialCommunityIcons name="menu" size={16} color="#64748b" />
                </TouchableOpacity>
            </View>

            {formData.services.map((s, i) => (
                <View key={i} style={styles.serviceCard}>
                    <View style={styles.dragHandle}><MaterialCommunityIcons name="dots-vertical" size={20} color="#cbd5e1" /></View>
                    <View style={styles.serviceIconBox}>
                        <FontAwesome5 name="tools" size={16} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.serviceName}>{s.name}</Text>
                        <Text style={styles.serviceDesc} numberOfLines={1}>{s.description}</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBtn}><Feather name="edit-2" size={18} color="#64748b" /></TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn}><Ionicons name="trash-outline" size={18} color="#ef4444" /></TouchableOpacity>
                </View>
            ))}

            <TouchableOpacity 
                style={styles.addAnotherBtn} 
                onPress={() => {
                    setCurrentService({ id: '', name: '', description: '', pricingType: 'CONTACT', price: '', responseTime: 'Within 2 Hours', isEmergency: false });
                    setShowServiceModal(true);
                }}
            >
                <Ionicons name="add-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.addAnotherText}>Add Another Service</Text>
            </TouchableOpacity>

            {formData.services.length > 0 && (
                <View style={styles.detailsSection}>
                    <Text style={styles.sectionTitle}>Service Details (For {formData.services[0].name})</Text>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Service Description</Text>
                        <TextInput 
                            style={[styles.input, styles.textArea]} 
                            placeholder="Describe what you offer in this service" 
                            multiline
                            maxLength={250}
                        />
                        <Text style={styles.charCount}>0/250</Text>
                    </View>
                    
                    <Text style={styles.label}>Pricing Type</Text>
                    <View style={styles.radioGroup}>
                        {['Fixed Price', 'Starting From', 'Contact for Price'].map(p => (
                            <TouchableOpacity key={p} style={styles.radioItem}>
                                <View style={[styles.radioCircle, p === 'Contact for Price' && styles.radioCircleActive]}>
                                    {p === 'Contact for Price' && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.radioLabel}>{p}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Average Response Time</Text>
                        <View style={styles.pickerContainer}>
                            <Text style={styles.inputPlaceholder}>Within 2 Hours</Text>
                            <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                        </View>
                    </View>

                    <View style={styles.emergencyRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Emergency Service</Text>
                            <Text style={styles.subText}>Do you provide emergency services?</Text>
                        </View>
                        <Switch value={true} trackColor={{ false: '#e2e8f0', true: '#6366f1' }} />
                    </View>

                    <TouchableOpacity style={styles.contactItem}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Service Area</Text>
                            <Text style={styles.valueText}>Where do you offer this service?</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Set Your Business Location</Text>
            <Text style={styles.subText}>Help customers find and contact your business easily by updating your accurate location.</Text>

            <View style={styles.searchRow}>
                <View style={styles.searchBox}>
                    <Ionicons name="search" size={20} color="#94a3b8" />
                    <TextInput 
                        style={styles.searchInput} 
                        placeholder="Search for area, street, landmark..." 
                        placeholderTextColor="#94a3b8"
                    />
                </View>
                <TouchableOpacity style={styles.locationBtn}>
                    <MaterialCommunityIcons name="target" size={20} color="#fff" />
                    <Text style={styles.locationBtnText}>Use My Location</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.mapContainer}>
                <Image source={{ uri: 'https://maps.googleapis.com/maps/api/staticmap?center=40.7128,-74.0060&zoom=14&size=600x300&key=YOUR_KEY' }} style={styles.mapImage} />
                <View style={styles.mapOverlay}>
                    <Ionicons name="location" size={32} color="#6366f1" />
                    <View style={styles.mapCircle} />
                </View>
                <View style={styles.mapControls}>
                    <TouchableOpacity style={styles.zoomBtn}><Ionicons name="add" size={20} color="#64748b" /></TouchableOpacity>
                    <View style={styles.zoomLine} />
                    <TouchableOpacity style={styles.zoomBtn}><Ionicons name="remove" size={20} color="#64748b" /></TouchableOpacity>
                </View>
            </View>

            <Text style={styles.label}>Selected Location</Text>
            <View style={styles.selectedLocCard}>
                <View style={styles.locIconBox}><Ionicons name="location" size={20} color="#6366f1" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.locTitle}>Greenwoods, Block A, Unit 1203</Text>
                    <Text style={styles.locSub}>Greenwoods Community, Nairobi, Kenya</Text>
                </View>
                <TouchableOpacity><Text style={styles.editText}>Edit</Text><Feather name="edit-2" size={14} color="#6366f1" /></TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Service Area</Text>
            <Text style={styles.subText}>Choose how you want to serve your customers.</Text>
            
            {['Serve at this location', "Serve at customer's location", 'Serve in specific areas'].map(opt => (
                <TouchableOpacity key={opt} style={styles.serviceAreaCard}>
                    <View style={[styles.radioCircle, opt === 'Serve at this location' && styles.radioCircleActive]}>
                        {opt === 'Serve at this location' && <View style={styles.radioInner} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.serviceAreaTitle}>{opt}</Text>
                        <Text style={styles.serviceAreaSub}>
                            {opt === 'Serve at this location' ? 'Customers will visit my business location' : 
                             opt === "Serve at customer's location" ? 'I will travel to customer locations' : 
                             'Select areas where you provide services'}
                        </Text>
                    </View>
                </TouchableOpacity>
            ))}

            <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.tipText}>Tip: Keeping your location accurate helps customers find you faster and builds trust.</Text>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContent}>
            <View style={styles.reviewHeader}>
                <Text style={styles.sectionTitle}>Review Your Business Profile</Text>
                <TouchableOpacity style={styles.editAllBtn}>
                    <Feather name="edit-2" size={16} color="#6366f1" />
                    <Text style={styles.editAllText}>Edit All</Text>
                </TouchableOpacity>
            </View>
            <Text style={styles.subText}>Please review all the details below before publishing.</Text>

            {/* Summary Cards */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryIconBox}><Ionicons name="business" size={20} color="#6366f1" /></View>
                    <Text style={styles.summaryTitle}>Business Information</Text>
                    <TouchableOpacity><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                </View>
                <View style={styles.summaryRow}><Text style={styles.sumLabel}>Business Name</Text><Text style={styles.sumValue}>Greenwoods Plumbing Services</Text></View>
                <View style={styles.summaryRow}><Text style={styles.sumLabel}>Category</Text><Text style={styles.sumValue}>Plumbing</Text></View>
                <View style={styles.summaryRow}><Text style={styles.sumLabel}>Business Type</Text><Text style={styles.sumValue}>Service Provider</Text></View>
                <View style={styles.summaryRow}><Text style={styles.sumLabel}>Years in Business</Text><Text style={styles.sumValue}>5+ Years</Text></View>
                <View style={styles.summaryRow}><Text style={styles.sumLabel}>Description</Text><Text style={[styles.sumValue, { flex: 1, textAlign: 'right' }]}>We provide reliable plumbing services including fixing, installation, and maintenance for homes and offices.</Text></View>
            </View>

            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <View style={styles.summaryIconBox}><FontAwesome5 name="tools" size={16} color="#6366f1" /></View>
                    <Text style={styles.summaryTitle}>Services (3)</Text>
                    <TouchableOpacity><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                </View>
                {['Plumbing', 'Pipe Installation', 'Leak Detection & Repair'].map(s => (
                    <View key={s} style={styles.sumServiceItem}>
                        <Ionicons name="checkmark-circle" size={18} color="#6366f1" />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={styles.sumServiceText}>{s}</Text>
                            <Text style={styles.sumServiceSub}>Fixing, Installation & Maintenance</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.publishBox}>
                <View style={styles.publishIconBox}><Ionicons name="send" size={24} color="#6366f1" /></View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.publishTitle}>Ready to publish?</Text>
                    <Text style={styles.publishSub}>Once published, your business profile will be visible to the community and customers can contact you.</Text>
                </View>
            </View>
        </View>
    );

    const handlePublish = async () => {
        setLoading(true);
        try {
            if (id) {
                await businessApi.updateProfile(id as string, formData);
            } else {
                await businessApi.createProfile(formData);
            }
            Alert.alert('Success', 'Profile published successfully! 🚀');
            router.replace('/business-profiles');
        } catch (error) {
            Alert.alert('Error', 'Failed to publish profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => step === 1 ? router.back() : prevStep()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{id ? 'Edit' : 'Create'} Business Profile</Text>
                    <Text style={styles.headerSub}>Fill in your details to get discovered by your community</Text>
                </View>
            </View>

            {renderStepper()}

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerInner}>
                    {step > 1 && (
                        <TouchableOpacity style={styles.backBtnFooter} onPress={prevStep}>
                            <Text style={styles.backBtnText}>Back</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={[styles.continueBtn, step === 1 && { flex: 1 }]} 
                        onPress={step === 4 ? handlePublish : nextStep}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.continueBtnText}>
                                {step === 4 ? 'Publish My Business Profile' : 'Save & Continue'}
                            </Text>
                        )}
                        {step === 4 && !loading && <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                </View>
                <View style={styles.safetyInfo}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#64748b" />
                    <Text style={styles.safetyText}>Your information is safe and will not be shared without your permission.</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' }, // Dark theme base
    header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },

    stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 40 },
    stepWrapper: { alignItems: 'center', width: 60 },
    stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    stepCircleActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    stepCircleInactive: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
    stepNumber: { fontSize: 14, fontWeight: '800', color: '#94a3b8' },
    stepNumberActive: { color: '#fff' },
    stepLabel: { fontSize: 10, color: '#64748b', marginTop: 8, fontWeight: '700', textAlign: 'center' },
    stepLabelActive: { color: '#6366f1' },
    stepLine: { height: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: -10, marginTop: -20 },
    stepLineActive: { backgroundColor: '#6366f1' },

    stepContent: { padding: 20, backgroundColor: '#0f172a' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 16 },
    subText: { fontSize: 14, color: '#94a3b8', marginBottom: 20, lineHeight: 20 },

    row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    logoBox: { width: 100, height: 100, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
    logoImage: { width: '100%', height: '100%', borderRadius: 12 },
    logoText: { fontSize: 12, fontWeight: '700', color: '#fff', marginTop: 8 },
    logoSubtext: { fontSize: 8, color: '#64748b', marginTop: 2 },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#fff', marginBottom: 8 },
    input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    inputPlaceholder: { color: '#94a3b8', fontSize: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: '#64748b', textAlign: 'right', marginTop: 4 },

    pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pickerIcon: { position: 'absolute', right: 14 },

    contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    contactInput: { flex: 1, marginLeft: 12, color: '#fff', fontSize: 15 },
    valueText: { fontSize: 14, color: '#94a3b8', marginTop: 2 },

    socialItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },

    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchInput: { flex: 1, marginLeft: 10, color: '#fff' },
    browseAll: { fontSize: 13, color: '#6366f1', fontWeight: '700' },

    serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
    serviceTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    reorderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reorderText: { fontSize: 13, color: '#64748b' },

    serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    dragHandle: { paddingRight: 8 },
    serviceIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    serviceName: { fontSize: 15, fontWeight: '700', color: '#fff' },
    serviceDesc: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    iconBtn: { padding: 8 },

    addAnotherBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.05)', borderStyle: 'dashed', borderWidth: 1, borderColor: '#6366f1', marginTop: 8 },
    addAnotherText: { fontSize: 15, fontWeight: '700', color: '#6366f1', marginLeft: 8 },

    detailsSection: { marginTop: 32, padding: 16, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    radioGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    radioItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center' },
    radioCircleActive: { borderColor: '#6366f1' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#6366f1' },
    radioLabel: { fontSize: 13, color: '#fff', fontWeight: '500' },

    emergencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },

    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 12, borderRadius: 12, height: 48 },
    locationBtnText: { color: '#fff', fontSize: 13, fontWeight: '700', marginLeft: 6 },

    mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
    mapImage: { width: '100%', height: '100%' },
    mapOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    mapCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(99, 102, 241, 0.1)', position: 'absolute' },
    mapControls: { position: 'absolute', right: 12, bottom: 12, backgroundColor: '#fff', borderRadius: 8, padding: 4 },
    zoomBtn: { padding: 8, alignItems: 'center' },
    zoomLine: { height: 1, backgroundColor: '#f1f5f9' },

    selectedLocCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 24 },
    locIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    locTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
    locSub: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
    editText: { color: '#6366f1', fontSize: 13, fontWeight: '700', marginRight: 4 },

    serviceAreaCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    serviceAreaTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
    serviceAreaSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

    tipBox: { flexDirection: 'row', backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: 16, borderRadius: 12, marginTop: 12, gap: 12 },
    tipText: { flex: 1, fontSize: 13, color: '#6366f1', lineHeight: 18 },

    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    editAllText: { color: '#6366f1', fontSize: 14, fontWeight: '700' },

    summaryCard: { padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 20 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    summaryIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    summaryTitle: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '800', color: '#fff' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    sumLabel: { fontSize: 14, color: '#94a3b8' },
    sumValue: { fontSize: 14, color: '#fff', fontWeight: '600' },
    sumServiceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sumServiceText: { fontSize: 14, fontWeight: '700', color: '#fff' },
    sumServiceSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },

    publishBox: { padding: 20, backgroundColor: 'rgba(99, 102, 241, 0.05)', borderRadius: 16, borderWidth: 1, borderColor: '#6366f1', flexDirection: 'row', alignItems: 'center' },
    publishIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(99, 102, 241, 0.1)', alignItems: 'center', justifyContent: 'center' },
    publishTitle: { fontSize: 16, fontWeight: '800', color: '#fff' },
    publishSub: { fontSize: 13, color: '#94a3b8', marginTop: 4, lineHeight: 18 },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    footerInner: { flexDirection: 'row', gap: 12 },
    backBtnFooter: { flex: 0.4, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    backBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    continueBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    safetyInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
    safetyText: { fontSize: 11, color: '#64748b' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
});
