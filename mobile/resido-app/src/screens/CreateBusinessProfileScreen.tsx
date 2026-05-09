import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    FlatList, Modal, ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { businessApi } from '../services/api';

// --- DATA ---
const CATEGORIES = [
    { name: 'Home & Maintenance', subcategories: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'AC Service', 'Appliance Repair', 'Cleaning', 'Pest Control', 'Laundry', 'Interior Design', 'Home Renovation', 'Smart Home Setup', 'CCTV Installation', 'Water Purifier Service', 'Movers & Packers'] },
    { name: 'Education & Training', subcategories: ['Home Tuition', 'Online Classes', 'Competitive Exam Coaching', 'Coding Classes', 'Language Training', 'Music Classes', 'Dance Classes', 'Art & Craft', 'Public Speaking', 'Career Guidance', 'Skill Development', 'Workshop Sessions'] },
    { name: 'Health, Fitness & Wellness', subcategories: ['Personal Training', 'Yoga', 'Meditation', 'Diet & Nutrition', 'Physiotherapy', 'Mental Wellness', 'Martial Arts', 'Sports Coaching', 'Gym Training', 'Wellness Consultation', 'Home Nursing', 'Elder Care'] },
    { name: 'Food & Catering', subcategories: ['Home Chef', 'Tiffin Service', 'Bakery', 'Catering', 'Meal Preparation', 'Snacks & Sweets', 'Party Orders', 'Juice & Beverages', 'Cloud Kitchen', 'Cooking Classes'] },
    { name: 'Beauty & Lifestyle', subcategories: ['Makeup Artist', 'Hair Styling', 'Beauty Services', 'Nail Art', 'Spa & Massage', 'Bridal Services', 'Grooming', 'Fashion Styling', 'Mehendi Design', 'Tattoo Artist'] },
    { name: 'Pets & Animal Care', subcategories: ['Pet Grooming', 'Pet Sitting', 'Pet Walking', 'Training', 'Veterinary Support', 'Boarding', 'Pet Accessories', 'Pet Adoption'] },
    { name: 'Technology & Digital Services', subcategories: ['Graphic Design', 'Video Editing', 'Photography', 'Web Development', 'App Development', 'UI/UX Design', 'Social Media Management', 'Digital Marketing', 'Content Writing', 'SEO Services', 'Printing Services', 'Tech Support'] },
    { name: 'Events & Entertainment', subcategories: ['Photography', 'Videography', 'Decoration', 'DJ & Music', 'Event Planning', 'Birthday Events', 'Wedding Services', 'Anchoring', 'Sound & Lighting', 'Performers', 'Community Events'] },
    { name: 'Business & Professional Services', subcategories: ['Legal Services', 'Financial Consulting', 'Accounting', 'Tax Services', 'Insurance', 'Real Estate', 'Business Consulting', 'Resume Building', 'Recruitment', 'Virtual Assistance'] },
    { name: 'Rental & Sharing', subcategories: ['Furniture Rental', 'Vehicle Rental', 'Appliance Rental', 'Party Equipment Rental', 'Dress/Costume Rental', 'Room Sharing', 'Co-working Space', 'Parking Rental'] },
    { name: 'Marketplace', subcategories: ['Furniture', 'Electronics', 'Books', 'Fashion', 'Kids Items', 'Appliances', 'Vehicles', 'Home Decor', 'Sports Equipment', 'Gaming', 'Handmade Products'] },
    { name: 'Jobs & Opportunities', subcategories: ['Full-Time Jobs', 'Part-Time Jobs', 'Freelance Work', 'Internship', 'Temporary Work', 'Community Hiring', 'Staff Hiring', 'Referral Opportunities'] },
    { name: 'Community & Social', subcategories: ['Volunteer Services', 'NGOs', 'Resident Clubs', 'Hobby Groups'] },
    { name: 'Travel & Transport', subcategories: ['Cab Services', 'Travel Planning', 'Bike Taxi', 'Parcel Delivery'] },
    { name: 'Others', subcategories: [] }
];

export default function CreateBusinessProfileScreen() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        profileType: 'BUSINESS', // BUSINESS or JOB
        businessName: '',
        category: '',
        subcategory: '',
        customCategory: '',
        customSubcategory: '',
        businessType: 'INDIVIDUAL', // INDIVIDUAL or COMPANY
        about: '',
        location: '',
        area: '',
        operatingArea: 'WITHIN', // WITHIN or OUTSIDE
        experience: '',
        services: [] as any[],
        pricingType: 'FIXED', // FIXED or CUSTOM
        workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        workingHours: { from: '09:00 AM', to: '07:00 PM' },
        responseTime: 'Within 1 hour',
        gallery: [] as string[],
        documents: [] as any[],
        whyUs: '',
    });

    // Dropdown States
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);
    const [searchText, setSearchText] = useState('');

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    const filteredCategories = useMemo(() => {
        if (!searchText) return CATEGORIES;
        return CATEGORIES.filter(c => c.name.toLowerCase().includes(searchText.toLowerCase()));
    }, [searchText]);

    const activeCategoryData = CATEGORIES.find(c => c.name === formData.category);
    const filteredSubcategories = useMemo(() => {
        if (!activeCategoryData) return [];
        if (!searchText) return activeCategoryData.subcategories;
        return activeCategoryData.subcategories.filter(s => s.toLowerCase().includes(searchText.toLowerCase()));
    }, [searchText, activeCategoryData]);

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
                <TouchableOpacity onPress={prevStep} disabled={step === 1}>
                    <Ionicons name="arrow-back" size={24} color={step === 1 ? '#e2e8f0' : '#1e293b'} />
                </TouchableOpacity>
                <Text style={styles.stepText}>Step {step} of 5</Text>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={styles.skipText}>{step === 5 ? 'Preview' : 'Skip'}</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(step / 5) * 100}%` }]} />
            </View>
        </View>
    );

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.title}>Create Your Business Profile</Text>
            <Text style={styles.subtitle}>Choose how you want to use Resido</Text>

            <TouchableOpacity 
                style={[styles.typeCard, formData.profileType === 'BUSINESS' && styles.typeCardActive]}
                onPress={() => setFormData({ ...formData, profileType: 'BUSINESS' })}
            >
                <View style={[styles.typeIconBox, formData.profileType === 'BUSINESS' && styles.typeIconBoxActive]}>
                    <MaterialCommunityIcons name="storefront" size={32} color={formData.profileType === 'BUSINESS' ? '#6366f1' : '#64748b'} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.typeTitle}>Business / Service Profile</Text>
                    <Text style={styles.typeDesc}>Offer services or run a business in your community</Text>
                    <View style={styles.typeBadge}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.typeBadgeText}>Get bookings & grow</Text>
                    </View>
                </View>
                <View style={[styles.radio, formData.profileType === 'BUSINESS' && styles.radioActive]}>
                    {formData.profileType === 'BUSINESS' && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.typeCard, formData.profileType === 'JOB' && styles.typeCardActive]}
                onPress={() => setFormData({ ...formData, profileType: 'JOB' })}
            >
                <View style={[styles.typeIconBox, formData.profileType === 'JOB' && styles.typeIconBoxActive]}>
                    <MaterialCommunityIcons name="briefcase-outline" size={32} color={formData.profileType === 'JOB' ? '#6366f1' : '#64748b'} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.typeTitle}>Job / Professional Profile</Text>
                    <Text style={styles.typeDesc}>Find jobs, freelance work or showcase your skills</Text>
                    <View style={styles.typeBadge}>
                        <Ionicons name="eye" size={12} color="#6366f1" />
                        <Text style={styles.typeBadgeText}>Get discovered</Text>
                    </View>
                </View>
                <View style={[styles.radio, formData.profileType === 'JOB' && styles.radioActive]}>
                    {formData.profileType === 'JOB' && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>

            <View style={styles.infoBox}>
                <Ionicons name="shield-checkmark" size={20} color="#6366f1" />
                <Text style={styles.infoText}>Verified. Trusted. Local. Business profiles are visible to residents in your community. Build trust and grow together.</Text>
            </View>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.title}>Let's set up your business details</Text>
            <Text style={styles.subtitle}>Tell us about your business</Text>

            <View style={styles.photoContainer}>
                <TouchableOpacity style={styles.uploadBox}>
                    <Ionicons name="camera-outline" size={32} color="#6366f1" />
                    <Text style={styles.uploadText}>Upload Photo</Text>
                    <Text style={styles.uploadHint}>JPG, PNG (Max 5MB)</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name*</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="Enter business name" 
                    value={formData.businessName}
                    onChangeText={t => setFormData({ ...formData, businessName: t })}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Category*</Text>
                <TouchableOpacity style={styles.dropdown} onPress={() => { setSearchText(''); setShowCategoryModal(true); }}>
                    <Text style={[styles.dropdownText, !formData.category && { color: '#94a3b8' }]}>
                        {formData.category || 'Select category'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {formData.category === 'Others' && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Specify Category*</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Type your category" 
                        value={formData.customCategory}
                        onChangeText={t => setFormData({ ...formData, customCategory: t })}
                    />
                </View>
            )}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Sub Category (Optional)</Text>
                <TouchableOpacity 
                    style={[styles.dropdown, !formData.category && styles.dropdownDisabled]} 
                    disabled={!formData.category}
                    onPress={() => { setSearchText(''); setShowSubcategoryModal(true); }}
                >
                    <Text style={[styles.dropdownText, !formData.subcategory && { color: '#94a3b8' }]}>
                        {formData.subcategory || 'Select sub category'}
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
            </View>

            {formData.subcategory === 'Others' && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Specify Sub Category*</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Type your sub category" 
                        value={formData.customSubcategory}
                        onChangeText={t => setFormData({ ...formData, customSubcategory: t })}
                    />
                </View>
            )}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Type*</Text>
                <View style={styles.segmentedControl}>
                    <TouchableOpacity 
                        style={[styles.segment, formData.businessType === 'INDIVIDUAL' && styles.segmentActive]}
                        onPress={() => setFormData({ ...formData, businessType: 'INDIVIDUAL' })}
                    >
                        <Text style={[styles.segmentText, formData.businessType === 'INDIVIDUAL' && styles.segmentTextActive]}>Individual</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.segment, formData.businessType === 'COMPANY' && styles.segmentActive]}
                        onPress={() => setFormData({ ...formData, businessType: 'COMPANY' })}
                    >
                        <Text style={[styles.segmentText, formData.businessType === 'COMPANY' && styles.segmentTextActive]}>Company</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>About Your Business*</Text>
                    <Text style={styles.charCount}>{formData.about.length}/300</Text>
                </View>
                <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Tell residents about your business, your experience and what makes you unique..." 
                    multiline
                    maxLength={300}
                    value={formData.about}
                    onChangeText={t => setFormData({ ...formData, about: t })}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Location in Community (Tower / Block / Flat)*</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g. Tower A, Flat 402" 
                    value={formData.location}
                    onChangeText={t => setFormData({ ...formData, location: t })}
                />
            </View>

            {formData.operatingArea === 'OUTSIDE' && (
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Business Area / District*</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="e.g. Indiranagar, Bangalore" 
                        value={formData.area}
                        onChangeText={t => setFormData({ ...formData, area: t })}
                    />
                </View>
            )}

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Operating Area*</Text>
                <View style={styles.radioGroup}>
                    <TouchableOpacity style={styles.radioOption} onPress={() => setFormData({ ...formData, operatingArea: 'WITHIN' })}>
                        <View style={[styles.radio, formData.operatingArea === 'WITHIN' && styles.radioActive]}>
                            {formData.operatingArea === 'WITHIN' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.radioLabel}>Within Community</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.radioOption} onPress={() => setFormData({ ...formData, operatingArea: 'OUTSIDE' })}>
                        <View style={[styles.radio, formData.operatingArea === 'OUTSIDE' && styles.radioActive]}>
                            {formData.operatingArea === 'OUTSIDE' && <View style={styles.radioInner} />}
                        </View>
                        <Text style={styles.radioLabel}>Outside Community</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderStep3 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.title}>Add your services, pricing & availability</Text>
            <Text style={styles.subtitle}>Help residents know what you offer</Text>

            <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                    <Text style={styles.label}>Services Offered*</Text>
                    <TouchableOpacity><Text style={styles.linkText}>+ Add Custom</Text></TouchableOpacity>
                </View>
                <View style={styles.tagContainer}>
                    {['Home Cleaning', 'Deep Cleaning', 'Sofa Cleaning', 'Kitchen Cleaning'].map((s, i) => (
                        <View key={i} style={styles.tag}>
                            <Ionicons name="color-wand-outline" size={14} color="#6366f1" style={{ marginRight: 4 }} />
                            <Text style={styles.tagText}>{s}</Text>
                            <TouchableOpacity><Ionicons name="close" size={14} color="#64748b" /></TouchableOpacity>
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Add Pricing*</Text>
                <View style={styles.radioGroup}>
                    <TouchableOpacity style={styles.radioOption} onPress={() => setFormData({ ...formData, pricingType: 'FIXED' })}>
                        <View style={[styles.radio, formData.pricingType === 'FIXED' && styles.radioActive]}>
                            {formData.pricingType === 'FIXED' && <View style={styles.radioInner} />}
                        </View>
                        <View>
                            <Text style={styles.radioLabelBold}>Fixed Pricing</Text>
                            <Text style={styles.radioSub}>Set fixed price for your services</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.radioOption} onPress={() => setFormData({ ...formData, pricingType: 'CUSTOM' })}>
                        <View style={[styles.radio, formData.pricingType === 'CUSTOM' && styles.radioActive]}>
                            {formData.pricingType === 'CUSTOM' && <View style={styles.radioInner} />}
                        </View>
                        <View>
                            <Text style={styles.radioLabelBold}>Custom Pricing</Text>
                            <Text style={styles.radioSub}>Discuss price with customer</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.pricingList}>
                {[
                    { name: 'Home Cleaning', price: '500' },
                    { name: 'Deep Cleaning', price: '1,200' },
                    { name: 'Sofa Cleaning', price: '800' }
                ].map((item, i) => (
                    <View key={i} style={styles.pricingRow}>
                        <Text style={styles.pricingName}>{item.name}</Text>
                        <View style={styles.priceEdit}>
                            <Text style={styles.priceText}>₹ {item.price}</Text>
                            <TouchableOpacity><Feather name="edit-3" size={16} color="#64748b" /></TouchableOpacity>
                        </View>
                    </View>
                ))}
                <TouchableOpacity style={styles.addMoreBtn}>
                    <Text style={styles.addMoreText}>+ Add Another Service</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Availability*</Text>
                <Text style={styles.subLabel}>Set your working days & hours</Text>
                <View style={styles.daySelector}>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <TouchableOpacity 
                            key={day} 
                            style={[styles.dayCircle, formData.workingDays.includes(day) && styles.dayCircleActive]}
                            onPress={() => {
                                const newDays = formData.workingDays.includes(day) 
                                    ? formData.workingDays.filter(d => d !== day)
                                    : [...formData.workingDays, day];
                                setFormData({ ...formData, workingDays: newDays });
                            }}
                        >
                            <Text style={[styles.dayText, formData.workingDays.includes(day) && styles.dayTextActive]}>{day}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.timeGrid}>
                <View style={styles.timeBox}>
                    <Text style={styles.label}>Working Hours</Text>
                    <View style={styles.timeRow}>
                        <TouchableOpacity style={styles.timeDropdown}><Text>09:00 AM</Text><Ionicons name="chevron-down" size={16} /></TouchableOpacity>
                        <Text style={{ marginHorizontal: 8 }}>to</Text>
                        <TouchableOpacity style={styles.timeDropdown}><Text>07:00 PM</Text><Ionicons name="chevron-down" size={16} /></TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );

    const renderStep4 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.title}>Build trust with residents</Text>
            <Text style={styles.subtitle}>Add details that build trust & credibility</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Gallery (Optional)</Text>
                <Text style={styles.subLabel}>Add photos of your work, setup or team</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6958?w=200' }} style={styles.galleryImg} />
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=200' }} style={styles.galleryImg} />
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=200' }} style={styles.galleryImg} />
                    <TouchableOpacity style={styles.addGalleryBox}>
                        <Ionicons name="add" size={24} color="#6366f1" />
                        <Text style={styles.addGalleryText}>Add More</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Documents</Text>
                <Text style={styles.subLabel}>Upload licences, certificates or any proof</Text>
                <View style={styles.docList}>
                    <View style={styles.docItem}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#64748b" />
                        <Text style={styles.docName}>Aadhaar Card</Text>
                        <Text style={styles.docStatus}>Uploaded ✓</Text>
                    </View>
                    <View style={styles.docItem}>
                        <MaterialCommunityIcons name="card-account-details-outline" size={24} color="#64748b" />
                        <Text style={styles.docName}>PAN Card</Text>
                        <Text style={styles.docStatus}>Uploaded ✓</Text>
                    </View>
                    <View style={styles.docItem}>
                        <Ionicons name="document-text-outline" size={24} color="#6366f1" />
                        <Text style={styles.docName}>Business License (Optional)</Text>
                        <TouchableOpacity><Text style={styles.uploadLink}>Upload</Text></TouchableOpacity>
                    </View>
                </View>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Why should residents choose you?*</Text>
                <TextInput 
                    style={[styles.input, styles.textArea]} 
                    placeholder="Share what makes your service reliable and special..." 
                    multiline
                    maxLength={200}
                    value={formData.whyUs}
                    onChangeText={t => setFormData({ ...formData, whyUs: t })}
                />
            </View>
        </View>
    );

    const renderStep5 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.title}>Almost there!</Text>
            <Text style={styles.subtitle}>Review your profile before going live</Text>

            <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                    <View style={styles.previewIconBox}>
                        <Ionicons name="color-wand" size={24} color="#6366f1" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.previewName}>Sparkle Home Cleaning</Text>
                            <Ionicons name="checkmark-circle" size={16} color="#6366f1" style={{ marginLeft: 4 }} />
                        </View>
                        <Text style={styles.previewLoc}>Tower A • Flat 1203</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Ionicons name="star" size={14} color="#f59e0b" />
                            <Text style={styles.ratingText}>4.8 (24 reviews) • 36 Bookings</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.previewTags}>
                    <View style={styles.pTag}><Text style={styles.pTagText}>Home Cleaning</Text></View>
                    <View style={styles.pTag}><Text style={styles.pTagText}>Deep Cleaning</Text></View>
                    <View style={styles.pTag}><Text style={styles.pTagText}>Sofa Cleaning</Text></View>
                </View>

                <Text style={styles.previewAbout}>Professional home cleaning services with a trusted & experienced team.</Text>

                <View style={styles.previewMeta}>
                    <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={16} color="#64748b" />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={styles.metaLabel}>Operating Area</Text>
                            <Text style={styles.metaValue}>Within Community</Text>
                        </View>
                    </View>
                    <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={16} color="#64748b" />
                        <View style={{ marginLeft: 8 }}>
                            <Text style={styles.metaLabel}>Response Time</Text>
                            <Text style={styles.metaValue}>Within 1 hour</Text>
                        </View>
                    </View>
                </View>
            </View>

            <View style={styles.termsBox}>
                <TouchableOpacity style={styles.checkbox}>
                    <Ionicons name="checkbox" size={24} color="#6366f1" />
                </TouchableOpacity>
                <Text style={styles.termsText}>
                    I agree to Resido's <Text style={styles.link}>Terms & Conditions</Text> and <Text style={styles.link}>Business Policy</Text>.
                </Text>
            </View>
        </View>
    );

    const handleGoLive = async () => {
        setLoading(true);
        try {
            await businessApi.createProfile(formData);
            Alert.alert('Success', 'Your business profile is now live! 🚀');
            router.replace('/');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to create business profile');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {renderProgressBar()}
                <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}
                    {step === 4 && renderStep4()}
                    {step === 5 && renderStep5()}
                </ScrollView>

                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.continueBtn, loading && { opacity: 0.7 }]} 
                        onPress={step === 5 ? handleGoLive : nextStep}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.continueText}>{step === 5 ? 'Go Live 🚀' : 'Continue'}</Text>
                                {step < 5 && <Ionicons name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />}
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            {/* Category Modal */}
            <Modal visible={showCategoryModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Category</Text>
                            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
                                <Ionicons name="close" size={24} color="#1e293b" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={20} color="#94a3b8" />
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="Search categories..." 
                                value={searchText}
                                onChangeText={setSearchText}
                                autoFocus
                            />
                        </View>
                        <FlatList 
                            data={filteredCategories}
                            keyExtractor={item => item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setFormData({ ...formData, category: item.name, subcategory: '', customCategory: '', customSubcategory: '' });
                                        setShowCategoryModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, formData.category === item.name && styles.modalItemTextActive]}>{item.name}</Text>
                                    {formData.category === item.name && <Ionicons name="checkmark" size={20} color="#6366f1" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Subcategory Modal */}
            <Modal visible={showSubcategoryModal} animationType="slide" transparent={true}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Sub Category</Text>
                            <TouchableOpacity onPress={() => setShowSubcategoryModal(false)}>
                                <Ionicons name="close" size={24} color="#1e293b" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalSearch}>
                            <Ionicons name="search" size={20} color="#94a3b8" />
                            <TextInput 
                                style={styles.modalInput} 
                                placeholder="Search sub categories..." 
                                value={searchText}
                                onChangeText={setSearchText}
                                autoFocus
                            />
                        </View>
                        <FlatList 
                            data={[...filteredSubcategories, 'Others']}
                            keyExtractor={item => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.modalItem}
                                    onPress={() => {
                                        setFormData({ ...formData, subcategory: item, customSubcategory: '' });
                                        setShowSubcategoryModal(false);
                                    }}
                                >
                                    <Text style={[styles.modalItemText, formData.subcategory === item && styles.modalItemTextActive]}>{item}</Text>
                                    {formData.subcategory === item && <Ionicons name="checkmark" size={20} color="#6366f1" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    progressContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 15, backgroundColor: '#fff' },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    stepText: { fontSize: 14, fontWeight: '700', color: '#6366f1' },
    skipText: { fontSize: 14, color: '#6366f1', fontWeight: '600' },
    progressBarBg: { height: 4, backgroundColor: '#f1f5f9', borderRadius: 2 },
    progressBarFill: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 },

    stepContent: { padding: 24 },
    title: { fontSize: 28, fontWeight: '800', color: '#1e293b', letterSpacing: -0.5 },
    subtitle: { fontSize: 16, color: '#64748b', marginTop: 6, marginBottom: 32 },

    typeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9' },
    typeCardActive: { borderColor: '#6366f1', backgroundColor: '#f5f3ff' },
    typeIconBox: { width: 64, height: 64, borderRadius: 16, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    typeIconBoxActive: { backgroundColor: '#fff' },
    typeTitle: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    typeDesc: { fontSize: 14, color: '#64748b', marginTop: 4 },
    typeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    typeBadgeText: { fontSize: 12, fontWeight: '700', color: '#f59e0b', marginLeft: 4 },

    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#cbd5e1', alignItems: 'center', justifyContent: 'center' },
    radioActive: { borderColor: '#6366f1' },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#6366f1' },

    infoBox: { flexDirection: 'row', backgroundColor: '#f8fafc', padding: 20, borderRadius: 20, marginTop: 10, gap: 12 },
    infoText: { flex: 1, fontSize: 14, color: '#64748b', lineHeight: 20 },

    photoContainer: { alignItems: 'center', marginVertical: 32 },
    uploadBox: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#f8fafc', borderStyle: 'dashed', borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
    uploadText: { fontSize: 14, fontWeight: '700', color: '#1e293b', marginTop: 8 },
    uploadHint: { fontSize: 10, color: '#94a3b8', marginTop: 2 },

    inputGroup: { marginBottom: 24 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    label: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
    subLabel: { fontSize: 12, color: '#64748b', marginBottom: 12 },
    input: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, fontSize: 16, color: '#1e293b', borderWidth: 1, borderColor: '#f1f5f9' },
    textArea: { height: 120, textAlignVertical: 'top' },
    charCount: { fontSize: 12, color: '#94a3b8' },

    dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    dropdownText: { fontSize: 16, color: '#1e293b' },
    dropdownDisabled: { opacity: 0.5 },

    segmentedControl: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4 },
    segment: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
    segmentActive: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
    segmentText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
    segmentTextActive: { color: '#6366f1' },

    radioGroup: { gap: 12 },
    radioOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#f1f5f9', gap: 12 },
    radioLabel: { fontSize: 16, color: '#1e293b', fontWeight: '600' },
    radioLabelBold: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    radioSub: { fontSize: 13, color: '#64748b', marginTop: 2 },

    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#e0e7ff' },
    tagText: { fontSize: 14, fontWeight: '700', color: '#6366f1', marginRight: 6 },
    linkText: { fontSize: 14, fontWeight: '700', color: '#6366f1' },

    pricingList: { marginTop: 12, gap: 12 },
    pricingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', borderRadius: 16 },
    pricingName: { fontSize: 16, fontWeight: '600', color: '#1e293b' },
    priceEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    priceText: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
    addMoreBtn: { padding: 16, alignItems: 'center' },
    addMoreText: { color: '#6366f1', fontWeight: '700' },

    daySelector: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
    dayCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    dayCircleActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    dayText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    dayTextActive: { color: '#fff' },

    timeGrid: { marginTop: 20 },
    timeBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    timeDropdown: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },

    galleryScroll: { flexDirection: 'row', marginTop: 12 },
    galleryImg: { width: 100, height: 100, borderRadius: 16, marginRight: 12 },
    addGalleryBox: { width: 100, height: 100, borderRadius: 16, backgroundColor: '#f5f3ff', borderStyle: 'dashed', borderWidth: 2, borderColor: '#6366f1', alignItems: 'center', justifyContent: 'center' },
    addGalleryText: { fontSize: 12, fontWeight: '700', color: '#6366f1', marginTop: 4 },

    docList: { marginTop: 12, gap: 12 },
    docItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f8fafc', borderRadius: 16, gap: 12 },
    docName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1e293b' },
    docStatus: { fontSize: 12, color: '#10b981', fontWeight: '700' },
    uploadLink: { fontSize: 14, color: '#6366f1', fontWeight: '700' },

    previewCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.05, shadowRadius: 20, elevation: 5 },
    previewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    previewIconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
    previewName: { fontSize: 18, fontWeight: '800', color: '#1e293b' },
    previewLoc: { fontSize: 12, color: '#64748b', marginTop: 2 },
    ratingText: { fontSize: 12, color: '#64748b', marginLeft: 4, fontWeight: '500' },
    previewTags: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    pTag: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    pTagText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
    previewAbout: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 20 },
    previewMeta: { flexDirection: 'row', gap: 32, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 20 },
    metaItem: { flexDirection: 'row', alignItems: 'center' },
    metaLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase' },
    metaValue: { fontSize: 13, color: '#1e293b', fontWeight: '700' },

    termsBox: { flexDirection: 'row', marginTop: 32, gap: 12, alignItems: 'center' },
    checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
    termsText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 18 },
    link: { color: '#6366f1', fontWeight: '700' },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f1f5f9' },
    continueBtn: { backgroundColor: '#6366f1', height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8 },
    continueText: { color: '#fff', fontSize: 18, fontWeight: '800' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b' },
    modalSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 16, height: 50, marginBottom: 16 },
    modalInput: { flex: 1, marginLeft: 10, fontSize: 16, color: '#1e293b' },
    modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    modalItemText: { fontSize: 16, color: '#64748b', fontWeight: '500' },
    modalItemTextActive: { color: '#6366f1', fontWeight: '800' }
});
