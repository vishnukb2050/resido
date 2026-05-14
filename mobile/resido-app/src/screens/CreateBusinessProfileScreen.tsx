import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    FlatList, Modal, ActivityIndicator, Switch, Dimensions, StatusBar
} from 'react-native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import OSMMap from '../components/OSMMap';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { businessApi, authApi } from '../services/api';
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
        serviceAreaType: 'PINCODE', // PINCODE, DISTRICT, STATE, PAN_INDIA
        serviceAreaValues: [] as string[],
        serviceRadiusKm: 10,
        baseLocation: null as any,
        
        // Modal states
        showCategoryModal: false,
        showExpModal: false,
        showTypeModal: false,
        
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
            if (res.data.latitude && res.data.longitude) {
                const latDelta = (res.data.serviceRadiusKm * 2.5) / 111;
                setMapRegion({
                    latitude: res.data.latitude,
                    longitude: res.data.longitude,
                    latitudeDelta: latDelta,
                    longitudeDelta: latDelta
                });
                setLocQuery('Saved Location');
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setInitialLoading(false);
        }
    };

    // Location Search Logic
    const [locQuery, setLocQuery] = useState('');
    const [locResults, setLocResults] = useState<any[]>([]);
    const [showGlobalDropdown, setShowGlobalDropdown] = useState(false);
    const [showMapDropdown, setShowMapDropdown] = useState(false);
    const [mapSearchQuery, setMapSearchQuery] = useState('');

    const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
    const [isMapSearching, setIsMapSearching] = useState(false);
    const [mapRegion, setMapRegion] = useState({
        latitude: 20.5937,
        longitude: 78.9629,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    const handleLocSearch = async (text: string) => {
        setLocQuery(text);
        if (text.length > 2) {
            try {
                const { data } = await authApi.searchLocations(text);
                setLocResults(data);
                setShowGlobalDropdown(true);
            } catch (error) {
                console.error(error);
            }
        } else {
            setShowGlobalDropdown(false);
        }
    };

    const handleMapPlaceSearch = async (text: string) => {
        setMapSearchQuery(text);
        if (text.length > 2) {
            setIsMapSearching(true);
            try {
                console.log('Searching business map places for:', text);
                const { data } = await authApi.searchLocations(text);
                console.log('Found business places:', data.length);
                const results = data.map((item: any, idx: number) => ({
                    id: item.id || `loc_${idx}`,
                    display_name: `${item.placeName}, ${item.district} (${item.pincode})`,
                    latitude: item.latitude,
                    longitude: item.longitude,
                    type: 'area',
                    pincode: item.pincode
                })).filter((item: any) => item.latitude && item.longitude);
                
                console.log('Filtered business map results:', results.length);
                setMapSearchResults(results);
                setShowMapDropdown(results.length > 0);
            } catch (error) {
                console.error('Map place search error:', error);
            } finally {
                setIsMapSearching(false);
            }
        } else {
            setMapSearchResults([]);
            setShowMapDropdown(false);
        }
    };

    const onSelectMapPlace = (place: any) => {
        setMapSearchQuery(place.display_name);
        const latDelta = (formData.serviceRadiusKm * 2.5) / 111;
        setMapRegion({
            latitude: place.latitude,
            longitude: place.longitude,
            latitudeDelta: latDelta,
            longitudeDelta: latDelta
        });
        setFormData({ 
            ...formData, 
            latitude: place.latitude, 
            longitude: place.longitude,
            area: place.display_name.split(',')[0],
            location: place.pincode || formData.location
        });
        setShowMapDropdown(false);
        setMapSearchResults([]);
    };

    const handleMarkerDragEnd = (coord: { latitude: number, longitude: number }) => {
        setFormData({ ...formData, latitude: coord.latitude, longitude: coord.longitude });
        setMapSearchQuery(`Picked Location (${coord.latitude.toFixed(4)}, ${coord.longitude.toFixed(4)})`);
    };

    const handleRadiusChange = (radius: number) => {
        const latDelta = (radius * 2.5) / 111;
        setMapRegion({
            ...mapRegion,
            latitudeDelta: latDelta,
            longitudeDelta: latDelta
        });
        setFormData({ ...formData, serviceRadiusKm: radius });
    };

    const addServiceArea = (loc: any) => {
        let value = '';
        if (formData.serviceAreaType === 'PINCODE') value = loc.pincode;
        else if (formData.serviceAreaType === 'DISTRICT') value = loc.district;
        else if (formData.serviceAreaType === 'STATE') value = loc.state;

        if (value && !formData.serviceAreaValues.includes(value)) {
            setFormData({
                ...formData,
                serviceAreaValues: [...formData.serviceAreaValues, value]
            });
        }
        setLocQuery('');
        setShowLocDropdown(false);
    };

    const removeServiceArea = (val: string) => {
        setFormData({
            ...formData,
            serviceAreaValues: formData.serviceAreaValues.filter(v => v !== val)
        });
    };
    
    const getCurrentLocation = async () => {
        setLoading(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Please allow location access to fetch your coordinates.');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;
            const latDelta = (formData.serviceRadiusKm * 2.5) / 111;
            setMapRegion({
                latitude,
                longitude,
                latitudeDelta: latDelta,
                longitudeDelta: latDelta
            });
            setFormData({ ...formData, latitude, longitude });
            setLocQuery('Current Location (GPS)');
        } catch (error) {
            Alert.alert('Error', 'Failed to get current location');
        } finally {
            setLoading(false);
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
                        <TouchableOpacity 
                            style={styles.pickerContainer}
                            onPress={() => setFormData({...formData, showCategoryModal: true})}
                        >
                            <Text style={[styles.pickerValue, !formData.category && { color: '#94a3b8' }]}>
                                {formData.category || 'Select a category'}
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                        </TouchableOpacity>
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
                    <TouchableOpacity 
                        style={styles.pickerContainer}
                        onPress={() => setFormData({...formData, showExpModal: true})}
                    >
                        <Text style={[styles.pickerValue, !formData.experience && { color: '#94a3b8' }]}>
                            {formData.experience || 'Select experience'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                    </TouchableOpacity>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Business Type</Text>
                    <TouchableOpacity 
                        style={styles.pickerContainer}
                        onPress={() => setFormData({...formData, showTypeModal: true})}
                    >
                        <Text style={[styles.pickerValue, !formData.businessType && { color: '#94a3b8' }]}>
                            {formData.businessType || 'Select type'}
                        </Text>
                        <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                    </TouchableOpacity>
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
                    <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => {
                            setCurrentService(s);
                            setShowServiceModal(true);
                        }}
                    >
                        <Feather name="edit-2" size={18} color="#64748b" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.iconBtn}
                        onPress={() => {
                            setFormData({
                                ...formData,
                                services: formData.services.filter((_, idx) => idx !== i)
                            });
                        }}
                    >
                        <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
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
                            value={currentService.description}
                            onChangeText={t => setCurrentService({...currentService, description: t})}
                        />
                        <Text style={styles.charCount}>{currentService.description.length}/250</Text>
                    </View>
                    
                    <Text style={styles.label}>Pricing Type</Text>
                    <View style={styles.radioGroup}>
                        {['FIXED', 'STARTING', 'CONTACT'].map(p => (
                            <TouchableOpacity 
                                key={p} 
                                style={styles.radioItem}
                                onPress={() => setCurrentService({...currentService, pricingType: p})}
                            >
                                <View style={[styles.radioCircle, currentService.pricingType === p && styles.radioCircleActive]}>
                                    {currentService.pricingType === p && <View style={styles.radioInner} />}
                                </View>
                                <Text style={styles.radioLabel}>{p === 'CONTACT' ? 'Contact for Price' : p === 'STARTING' ? 'Starting From' : 'Fixed Price'}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {currentService.pricingType !== 'CONTACT' && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Price (₹)</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Enter amount" 
                                keyboardType="numeric"
                                value={currentService.price}
                                onChangeText={t => setCurrentService({...currentService, price: t})}
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Average Response Time</Text>
                        <TouchableOpacity 
                            style={styles.pickerContainer}
                            onPress={() => {/* Add picker for response time if needed */}}
                        >
                            <Text style={styles.pickerValue}>{currentService.responseTime}</Text>
                            <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.emergencyRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>Emergency Service</Text>
                            <Text style={styles.subText}>Do you provide emergency services?</Text>
                        </View>
                        <Switch 
                            value={currentService.isEmergency} 
                            onValueChange={v => setCurrentService({...currentService, isEmergency: v})}
                            trackColor={{ false: '#e2e8f0', true: '#6366f1' }} 
                        />
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

            <Text style={styles.label}>Business Base Location</Text>
            <View style={{ zIndex: 100 }}>
                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="location" size={20} color="#94a3b8" />
                        <TextInput 
                            style={styles.searchInput} 
                            placeholder="Search your office/shop location..." 
                            placeholderTextColor="#94a3b8"
                            value={mapSearchQuery}
                            onChangeText={handleMapPlaceSearch}
                        />
                        {isMapSearching && <ActivityIndicator size="small" color="#6366f1" style={{ marginRight: 8 }} />}
                    </View>
                    <TouchableOpacity style={styles.locationBtn} onPress={getCurrentLocation}>
                        <Ionicons name="navigate" size={18} color="#fff" />
                        <Text style={styles.locationBtnText}>GPS</Text>
                    </TouchableOpacity>
                </View>
                {showMapDropdown && mapSearchResults.length > 0 && (
                    <View style={styles.dropdown}>
                        {mapSearchResults.map((place, idx) => (
                            <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => onSelectMapPlace(place)}>
                                <Text style={styles.dropdownText}>{place.display_name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            <View style={styles.mapContainer}>
                <OSMMap
                    style={StyleSheet.absoluteFill}
                    region={mapRegion}
                    onRegionChangeComplete={setMapRegion}
                    draggableMarker={formData.latitude ? { latitude: formData.latitude, longitude: formData.longitude } : undefined}
                    onMarkerDragEnd={handleMarkerDragEnd}
                    circle={formData.latitude ? {
                        center: { latitude: formData.latitude, longitude: formData.longitude },
                        radius: formData.serviceRadiusKm * 1000
                    } : undefined}
                    markers={[]}
                />
                
                {/* Map Controls */}
                </View>

            <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.label}>Service Coverage Radius (km)</Text>
                    <Text style={styles.radiusValueText}>{formData.serviceRadiusKm} km</Text>
                </View>
                <View style={styles.sliderContainer}>
                    {[5, 10, 20, 50, 100].map(r => (
                        <TouchableOpacity 
                            key={r} 
                            style={[styles.radiusChip, formData.serviceRadiusKm === r && styles.radiusChipActive]}
                            onPress={() => handleRadiusChange(r)}
                        >
                            <Text style={[styles.radiusChipText, formData.serviceRadiusKm === r && styles.radiusChipTextActive]}>{r}km</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Service Reach (Operational Area)</Text>
            <Text style={styles.subText}>Define where you provide your services. Customers in these areas will see your profile.</Text>
            
            <View style={styles.reachTabs}>
                {['PINCODE', 'DISTRICT', 'STATE', 'PAN_INDIA'].map(type => (
                    <TouchableOpacity 
                        key={type} 
                        style={[styles.reachTab, formData.serviceAreaType === type && styles.reachTabActive]}
                        onPress={() => setFormData({ ...formData, serviceAreaType: type, serviceAreaValues: [] })}
                    >
                        <Text style={[styles.reachTabText, formData.serviceAreaType === type && styles.reachTabTextActive]}>{type.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {formData.serviceAreaType !== 'PAN_INDIA' && (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Add {formData.serviceAreaType.toLowerCase()}s</Text>
                    <View style={styles.searchBox}>
                        <TextInput 
                            style={styles.searchInput} 
                            placeholder={`Search ${formData.serviceAreaType.toLowerCase()} to add...`}
                            value={locQuery}
                            onChangeText={handleLocSearch}
                        />
                        <TouchableOpacity style={{ padding: 8 }} onPress={() => {
                            if (locResults.length > 0) addServiceArea(locResults[0]);
                        }}>
                            <Ionicons name="add" size={24} color="#6366f1" />
                        </TouchableOpacity>
                    </View>
                    
                    {showGlobalDropdown && (
                        <View style={styles.dropdown}>
                            {locResults.map((loc, idx) => (
                                <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => {
                                    addServiceArea(loc);
                                    setShowGlobalDropdown(false);
                                }}>
                                    <Text style={styles.dropdownText}>{loc.placeName}, {loc.district} ({loc.pincode})</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    <View style={styles.chipContainer}>
                        {formData.serviceAreaValues.map(val => (
                            <View key={val} style={styles.chip}>
                                <Text style={styles.chipText}>{val}</Text>
                                <TouchableOpacity onPress={() => removeServiceArea(val)}>
                                    <Ionicons name="close-circle" size={16} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {formData.serviceAreaType === 'PAN_INDIA' && (
                <View style={styles.infoBox}>
                    <Ionicons name="globe-outline" size={20} color="#6366f1" />
                    <Text style={styles.infoText}>Your profile will be visible to users across all of India.</Text>
                </View>
            )}

            <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
                <Text style={styles.tipText}>Tip: Precise service areas help you get more relevant leads from your neighborhood.</Text>
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
            {/* Modals for Pickers */}
            {renderGenericPicker(
                formData.showCategoryModal, 
                'Select Business Category',
                ['Plumber', 'Electrician', 'Carpenter', 'Cleaner', 'Painter', 'AC Repair', 'Pest Control'],
                (val) => setFormData({...formData, category: val, showCategoryModal: false}),
                () => setFormData({...formData, showCategoryModal: false})
            )}

            {renderGenericPicker(
                formData.showExpModal, 
                'Select Years in Business',
                ['0-1 Year', '1-3 Years', '3-5 Years', '5-10 Years', '10+ Years'],
                (val) => setFormData({...formData, experience: val, showExpModal: false}),
                () => setFormData({...formData, showExpModal: false})
            )}

            {renderGenericPicker(
                formData.showTypeModal, 
                'Select Business Type',
                ['Individual', 'Small Business', 'Company', 'Agency'],
                (val) => setFormData({...formData, businessType: val, showTypeModal: false}),
                () => setFormData({...formData, showTypeModal: false})
            )}

            {/* Service Modal */}
            <Modal visible={showServiceModal} transparent animationType="slide">
                <View style={pickerStyles.modalOverlay}>
                    <View style={[pickerStyles.modalContent, { maxHeight: '80%' }]}>
                        <View style={pickerStyles.modalHeader}>
                            <Text style={pickerStyles.modalTitle}>{currentService.id ? 'Edit Service' : 'Add New Service'}</Text>
                            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Service Name *</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="e.g., Pipe Fixing, Full Cleaning" 
                                    placeholderTextColor="#94a3b8"
                                    value={currentService.name}
                                    onChangeText={t => setCurrentService({...currentService, name: t})}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput 
                                    style={[styles.input, styles.textArea]} 
                                    placeholder="Describe the service details..." 
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    value={currentService.description}
                                    onChangeText={t => setCurrentService({...currentService, description: t})}
                                />
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Average Price (Optional)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Enter price" 
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="numeric"
                                    value={currentService.price}
                                    onChangeText={t => setCurrentService({...currentService, price: t})}
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.continueBtn, { marginTop: 20 }]}
                                onPress={() => {
                                    if (!currentService.name) {
                                        Alert.alert('Error', 'Please enter a service name');
                                        return;
                                    }
                                    const newServices = [...formData.services];
                                    if (currentService.id) {
                                        const idx = newServices.findIndex(s => s.id === currentService.id);
                                        if (idx !== -1) newServices[idx] = currentService;
                                    } else {
                                        newServices.push({ ...currentService, id: Date.now().toString() });
                                    }
                                    setFormData({ ...formData, services: newServices });
                                    setShowServiceModal(false);
                                }}
                            >
                                <Text style={styles.continueBtnText}>Save Service</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const renderGenericPicker = (visible: boolean, title: string, options: string[], onSelect: (val: string) => void, onClose: () => void) => (
    <Modal visible={visible} transparent animationType="slide">
        <View style={pickerStyles.modalOverlay}>
            <View style={pickerStyles.modalContent}>
                <View style={pickerStyles.modalHeader}>
                    <Text style={pickerStyles.modalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <ScrollView>
                    {options.map(opt => (
                        <TouchableOpacity key={opt} style={pickerStyles.optionItem} onPress={() => onSelect(opt)}>
                            <Text style={pickerStyles.optionText}>{opt}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    </Modal>
);

const pickerStyles = StyleSheet.create({
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
    dropdownContainer: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        maxHeight: 300,
        zIndex: 9999,
        elevation: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        flexDirection: 'row',
        alignItems: 'center',
    },
    dropdownText: {
        fontSize: 14,
        color: '#1E293B',
        flex: 1,
    },
    optionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    optionText: { fontSize: 16, color: '#fff' }
});

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
    mapControls: { position: 'absolute', right: 12, top: 12, backgroundColor: '#fff', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    mapControlBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
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

    dropdown: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    dropdownText: { color: '#fff', fontSize: 14 },

    reachTabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4 },
    reachTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    reachTabActive: { backgroundColor: '#6366f1' },
    reachTabText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
    reachTabTextActive: { color: '#fff' },

    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366f1', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    chipText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    mapViewContainer: { height: 400, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 20, position: 'relative', zIndex: 1 },
    map: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
    mapOverlayHeader: { position: 'absolute', top: 15, left: 15, right: 15, zIndex: 9999 },
    mapSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 48, borderRadius: 12, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 10000 },
    mapSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#1e293b' },
    mapGpsBtn: { position: 'absolute', right: 15, bottom: 20, backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 100 },
    dropdown: { position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, maxHeight: 200, zIndex: 10001 },
    infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.05)', padding: 16, borderRadius: 12, marginTop: 16, gap: 12 },
    infoText: { flex: 1, fontSize: 13, color: '#6366f1' },
    pickerValue: { fontSize: 15, color: '#fff', fontWeight: '500' },
    radiusValueText: { fontSize: 16, fontWeight: '800', color: '#6366f1' },
    sliderContainer: { flexDirection: 'row', gap: 10, marginTop: 12 },
    radiusChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    radiusChipActive: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
    radiusChipText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
    radiusChipTextActive: { color: '#fff' },
});
