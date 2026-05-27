import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    FlatList, Modal, ActivityIndicator, Switch, Dimensions, StatusBar,
    BackHandler, Pressable,
} from 'react-native';
import MapView, { Marker, Circle, UrlTile, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter, useLocalSearchParams } from 'expo-router';
import OSMMap from '../components/OSMMap';
import { Ionicons, MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { businessApi, authApi } from '../services/api';
import * as ImagePicker from 'expo-image-picker';
import { storageApi } from '../services/storage';

const { width } = Dimensions.get('window');

// ─── Time-range helpers ────────────────────────────────────────────────────
// Slot ranges are stored as "HH:MM AM/PM - HH:MM AM/PM" strings for backwards
// compatibility. Conversion helpers keep the clock picker and conflict
// detection logic working with the same string format.

const buildTimeDate = (hour: number, minute: number): Date => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d;
};

const formatTime = (d: Date): string => {
    const h = d.getHours();
    const m = d.getMinutes();
    const period = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${String(display).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
};

const formatRange = (start: Date, end: Date): string => `${formatTime(start)} - ${formatTime(end)}`;

const parseTimeToMinutes = (s: string): number | null => {
    // Accepts "HH:MM AM/PM" (case insensitive). Returns minutes since midnight.
    const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) return null;
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const period = m[3].toUpperCase();
    if (hh === 12) hh = 0;
    if (period === 'PM') hh += 12;
    return hh * 60 + mm;
};

const parseRange = (s: string): { start: number; end: number } | null => {
    const parts = s.split(/\s*-\s*/);
    if (parts.length !== 2) return null;
    const start = parseTimeToMinutes(parts[0]);
    const end = parseTimeToMinutes(parts[1]);
    if (start === null || end === null) return null;
    return { start, end };
};

const rangesOverlap = (a: { start: number; end: number }, b: { start: number; end: number }) =>
    a.start < b.end && a.end > b.start;

const findConflictingRange = (
    candidate: { start: number; end: number },
    existing: string[],
): string | null => {
    for (const r of existing) {
        const parsed = parseRange(r);
        if (parsed && rangesOverlap(parsed, candidate)) return r;
    }
    return null;
};

// --- DATA ---
const DEFAULT_CATEGORIES = [
    'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Pest Control', 
    'Home Renovation', 'Beauty & Salon', 'Personal Training', 'Yoga', 
    'Education', 'Bakery', 'Catering', 'Interior Design', 'Plumber',
    'Electrician', 'Carpenter', 'Cleaner', 'Painter', 'AC Repair'
];

const EXPERIENCE_LEVELS = ['1+ Year', '2+ Years', '3+ Years', '5+ Years', '10+ Years'];
const BUSINESS_TYPES = ['Service Provider', 'Retailer', 'Manufacturer', 'Freelancer'];
const RESPONSE_TIMES = ['Within 1 Hour', 'Within 2 Hours', 'Within 4 Hours', 'Same Day'];

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 
    'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 
    'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 
    'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 
    'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 
    'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 
    'Ladakh', 'Lakshadweep', 'Puducherry'
];

export default function CreateBusinessProfileScreen() {
    const router = useRouter();
    const { id, initialStep, manageSlots } = useLocalSearchParams(); // If editing
    const isManageSlotsOnly = manageSlots === 'true';
    const [step, setStep] = useState(isManageSlotsOnly ? 4 : (initialStep ? parseInt(initialStep as string) : 1));
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(!!id);
    const [nameChecking, setNameChecking] = useState(false);
    const [nameError, setNameError] = useState('');

    const validateBusinessName = async (name: string) => {
        if (!name || !name.trim()) {
            setNameError('');
            return;
        }
        setNameChecking(true);
        setNameError('');
        try {
            const { data } = await businessApi.getProfiles({ query: name.trim(), limit: 20 });
            const list = data?.items ?? (Array.isArray(data) ? data : []);
            if (list.length > 0) {
                const conflict = list.find((p: any) => 
                    p.businessName.toLowerCase().trim() === name.toLowerCase().trim() && 
                    p.id !== id
                );
                if (conflict) {
                    setNameError('This business name is already taken. Please choose a unique name.');
                }
            }
        } catch (e) {
            console.error('Failed to validate business name:', e);
        } finally {
            setNameChecking(false);
        }
    };

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
        hashtags: '',
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
        
        // Booking Settings
        enableBooking: false,
        bookingSlots: [] as any[],
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

    // Slot Booking States
    const [showSlotModal, setShowSlotModal] = useState(false);
    const [slotSavingLoader, setSlotSavingLoader] = useState(false);
    const [currentSlot, setCurrentSlot] = useState({
        id: '',
        name: '',
        description: '',
        rules: '',
        photoUrl: '',
        maxPersons: 10,
        scheduleType: 'WEEKLY' as 'WEEKLY' | 'MONTHLY' | 'CUSTOM',
        scheduleConfig: '',
        timeSlots: [] as string[],
        allowRecurringBookings: true,
        advanceBookingWeeks: 4,
    });

    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [rules, setRules] = useState('');

    // 1. Weekly days schedule state
    const [weeklyConfig, setWeeklyConfig] = useState<Record<string, string[]>>({
        Monday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Tuesday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Wednesday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Thursday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Friday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
        Saturday: ['10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM'],
        Sunday: ['10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM'],
    });
    const [selectedWeeklyDay, setSelectedWeeklyDay] = useState('Monday');

    // 2. Monthly schedule state
    const [monthlyDays, setMonthlyDays] = useState<number[]>([1, 15]);
    const [monthlySlots, setMonthlySlots] = useState<string[]>(['09:00 AM - 12:00 PM', '02:00 PM - 05:00 PM']);
    const [monthlyDayInput, setMonthlyDayInput] = useState('');

    // 3. Custom calendar schedule state
    const [customDatesSlots, setCustomDatesSlots] = useState<Record<string, string[]>>({
        '2026-05-20': ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'],
        '2026-05-21': ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'],
    });
    const [selectedCustomDate, setSelectedCustomDate] = useState('2026-05-20');
    const [customDateInput, setCustomDateInput] = useState('');

    // Clock-based time range builder. We keep one start/end pair per scheduler
    // tab (weekly, monthly, custom). The native time picker shows when
    // `*Pick` is 'start' or 'end'; tapping a chip swaps the visible picker.
    const [weeklyStart, setWeeklyStart] = useState<Date>(buildTimeDate(9, 0));
    const [weeklyEnd, setWeeklyEnd] = useState<Date>(buildTimeDate(10, 0));
    const [weeklyPick, setWeeklyPick] = useState<'start' | 'end' | null>(null);
    const [monthlyStart, setMonthlyStart] = useState<Date>(buildTimeDate(9, 0));
    const [monthlyEnd, setMonthlyEnd] = useState<Date>(buildTimeDate(12, 0));
    const [monthlyPick, setMonthlyPick] = useState<'start' | 'end' | null>(null);
    const [customStart, setCustomStart] = useState<Date>(buildTimeDate(14, 0));
    const [customEnd, setCustomEnd] = useState<Date>(buildTimeDate(15, 0));
    const [customPick, setCustomPick] = useState<'start' | 'end' | null>(null);

    /** Dismiss the add/edit slot sheet without saving (header back, Android back, X). */
    const closeSlotModal = () => {
        setWeeklyPick(null);
        setMonthlyPick(null);
        setCustomPick(null);
        setShowSlotModal(false);
    };

    const parseSlotDescription = (desc: string | null) => {
        if (!desc) return { text: '', rules: '', photoUrl: '' };
        try {
            const parsed = JSON.parse(desc);
            if (parsed && typeof parsed === 'object') {
                return {
                    text: parsed.text || '',
                    rules: parsed.rules || '',
                    photoUrl: parsed.photoUrl || '',
                };
            }
        } catch (e) {
            // Not JSON
        }
        return { text: desc, rules: '', photoUrl: '' };
    };

    // UI state for Step 3 operational area
    const [reachMode, setReachMode] = useState<'RADIUS' | 'PINCODE' | 'STATE_DISTRICT' | 'PAN_INDIA'>('RADIUS');
    const [selectedState, setSelectedState] = useState('');
    const [stateReachType, setStateReachType] = useState<'STATE' | 'DISTRICT'>('STATE');
    const [showStateModal, setShowStateModal] = useState(false);
    
    // Pincode Search States
    const [pincodeSearchQuery, setPincodeSearchQuery] = useState('');
    const [pincodeSearchResults, setPincodeSearchResults] = useState<any[]>([]);
    const [isPincodeSearching, setIsPincodeSearching] = useState(false);
    const [showPincodeDropdown, setShowPincodeDropdown] = useState(false);

    // District Search States
    const [districtSearchQuery, setDistrictSearchQuery] = useState('');
    const [districtSearchResults, setDistrictSearchResults] = useState<any[]>([]);
    const [isDistrictSearching, setIsDistrictSearching] = useState(false);
    const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

    // Dynamic categories states
    const [dbCategories, setDbCategories] = useState<string[]>([]);
    const [categorySearch, setCategorySearch] = useState('');
    const [customCategory, setCustomCategory] = useState('');

    // Business Hours temp states
    const [showWorkingHoursModal, setShowWorkingHoursModal] = useState(false);
    const [workingHoursDaysType, setWorkingHoursDaysType] = useState<'PRESET' | 'CUSTOM'>('PRESET');
    const [selectedPresetDays, setSelectedPresetDays] = useState('Mon - Sat');
    const [selectedCustomDays, setSelectedCustomDays] = useState<string[]>([]);
    const [tempFromHour, setTempFromHour] = useState('08');
    const [tempFromMin, setTempFromMin] = useState('00');
    const [tempFromAmPm, setTempFromAmPm] = useState('AM');
    const [tempToHour, setTempToHour] = useState('06');
    const [tempToMin, setTempToMin] = useState('00');
    const [tempToAmPm, setTempToAmPm] = useState('PM');

    // Fetch dynamic categories on mount
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const res = await businessApi.getCategories();
                if (res.data && Array.isArray(res.data)) {
                    setDbCategories(res.data);
                }
            } catch (err) {
                console.error('Failed to fetch categories:', err);
            }
        };
        loadCategories();
    }, []);

    useEffect(() => {
        if (id) {
            fetchProfile();
        }
    }, [id]);

    // While the slot sheet is open, hardware back closes the picker first, then the sheet.
    useEffect(() => {
        if (!showSlotModal) return;
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (weeklyPick || monthlyPick || customPick) {
                setWeeklyPick(null);
                setMonthlyPick(null);
                setCustomPick(null);
                return true;
            }
            closeSlotModal();
            return true;
        });
        return () => sub.remove();
    }, [showSlotModal, weeklyPick, monthlyPick, customPick]);

    const fetchProfile = async () => {
        try {
            const res = await businessApi.getProfile(id as string);
            const profile = res.data;
            
            const defaultCategories = [
                'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Pest Control', 
                'Home Renovation', 'Beauty & Salon', 'Personal Training', 'Yoga', 
                'Education', 'Bakery', 'Catering', 'Interior Design', 'Plumber',
                'Electrician', 'Carpenter', 'Cleaner', 'Painter', 'AC Repair',
                'Fashion', 'Jobs', 'Real Estate', 'Tours and Travels', 'Health',
                'Repair Service', 'Electronics and Appliances'
            ];
            
            const hasSlots = profile.slots && profile.slots.length > 0;
            let finalCategory = profile.category || '';
            let parsedCustomCategory = '';
            
            if (profile.category) {
                const cats = profile.category.split(', ').map((c: string) => c.trim());
                const nonDefault = cats.filter((c: string) => !defaultCategories.includes(c));
                if (nonDefault.length > 0) {
                    parsedCustomCategory = nonDefault.join(', ');
                    const activeCats = cats.map((c: string) => defaultCategories.includes(c) ? c : 'Others');
                    finalCategory = Array.from(new Set(activeCats)).join(', ');
                }
            }
            
            setCustomCategory(parsedCustomCategory);
            setFormData(prev => ({
                ...prev,
                ...profile,
                category: finalCategory,
                enableBooking: hasSlots,
                bookingSlots: profile.slots || [],
                showCategoryModal: false,
                showExpModal: false,
                showTypeModal: false
            }));

            if (profile.latitude && profile.longitude) {
                const latDelta = (profile.serviceRadiusKm * 2.5) / 111;
                setMapRegion({
                    latitude: profile.latitude,
                    longitude: profile.longitude,
                    latitudeDelta: latDelta,
                    longitudeDelta: latDelta
                });
                setLocQuery('Saved Location');
            }

            if (profile.serviceAreaType) {
                const type = profile.serviceAreaType;
                const values = profile.serviceAreaValues || [];
                if (type === 'PAN_INDIA') {
                    setReachMode('PAN_INDIA');
                } else if (type === 'STATE') {
                    setReachMode('STATE_DISTRICT');
                    setStateReachType('STATE');
                    if (values.length > 0) {
                        setSelectedState(values[0]);
                    }
                } else if (type === 'DISTRICT') {
                    setReachMode('STATE_DISTRICT');
                    setStateReachType('DISTRICT');
                    if (values.length > 0) {
                        try {
                            const { data } = await authApi.searchLocations(values[0]);
                            if (data && data.length > 0) {
                                const found = data.find((d: any) => d.district.toLowerCase() === values[0].toLowerCase());
                                if (found) {
                                    setSelectedState(found.state);
                                } else {
                                    setSelectedState(data[0].state);
                                }
                            }
                        } catch (e) {
                            console.error('Failed to resolve state for district:', e);
                        }
                    }
                } else if (type === 'PINCODE') {
                    setReachMode('PINCODE');
                } else {
                    setReachMode('RADIUS');
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to load profile');
        } finally {
            setInitialLoading(false);
        }
    };

    const openWorkingHoursModal = () => {
        const wh = formData.workingHours || { from: '08:00 AM', to: '06:00 PM', days: 'Mon - Sat' };
        
        // Parse From
        try {
            const fromParts = wh.from.split(' ');
            const [fHour, fMin] = fromParts[0].split(':');
            setTempFromHour(fHour || '08');
            setTempFromMin(fMin || '00');
            setTempFromAmPm(fromParts[1] || 'AM');
        } catch (e) {
            setTempFromHour('08');
            setTempFromMin('00');
            setTempFromAmPm('AM');
        }

        // Parse To
        try {
            const toParts = wh.to.split(' ');
            const [tHour, tMin] = toParts[0].split(':');
            setTempToHour(tHour || '06');
            setTempToMin(tMin || '00');
            setTempToAmPm(toParts[1] || 'PM');
        } catch (e) {
            setTempToHour('06');
            setTempToMin('00');
            setTempToAmPm('PM');
        }

        // Parse Days
        const presets = ['Daily', 'Mon - Fri', 'Mon - Sat', 'Weekends Only'];
        if (presets.includes(wh.days)) {
            setWorkingHoursDaysType('PRESET');
            setSelectedPresetDays(wh.days);
            setSelectedCustomDays([]);
        } else {
            setWorkingHoursDaysType('CUSTOM');
            setSelectedPresetDays('Mon - Sat');
            setSelectedCustomDays(wh.days ? wh.days.split(', ').map(d => d.trim()) : []);
        }
        
        setShowWorkingHoursModal(true);
    };

    const saveWorkingHours = () => {
        let daysStr = '';
        if (workingHoursDaysType === 'PRESET') {
            daysStr = selectedPresetDays;
        } else {
            if (selectedCustomDays.length === 0) {
                Alert.alert('Error', 'Please select at least one day.');
                return;
            }
            const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const sortedDays = [...selectedCustomDays].sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b));
            daysStr = sortedDays.join(', ');
        }

        const fromStr = `${tempFromHour}:${tempFromMin} ${tempFromAmPm}`;
        const toStr = `${tempToHour}:${tempToMin} ${tempToAmPm}`;

        setFormData({
            ...formData,
            workingHours: {
                from: fromStr,
                to: toStr,
                days: daysStr
            }
        });
        setShowWorkingHoursModal(false);
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
        setShowGlobalDropdown(false);
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

    const handlePincodeSearch = async (text: string) => {
        setPincodeSearchQuery(text);
        if (text.length >= 2) {
            setIsPincodeSearching(true);
            try {
                const { data } = await authApi.searchLocations(text);
                const results: any[] = [];
                const seenPincodes = new Set<string>();
                if (data && Array.isArray(data)) {
                    data.forEach((item: any) => {
                        if (item.pincode && !seenPincodes.has(item.pincode)) {
                            seenPincodes.add(item.pincode);
                            results.push(item);
                        }
                    });
                }
                setPincodeSearchResults(results);
                setShowPincodeDropdown(results.length > 0);
            } catch (error) {
                console.error('Pincode search error:', error);
            } finally {
                setIsPincodeSearching(false);
            }
        } else {
            setPincodeSearchResults([]);
            setShowPincodeDropdown(false);
        }
    };

    const handleDistrictSearch = async (text: string) => {
        setDistrictSearchQuery(text);
        if (text.length >= 2) {
            setIsDistrictSearching(true);
            try {
                const { data } = await authApi.searchLocations(text);
                const results: any[] = [];
                const seenDistricts = new Set<string>();
                if (data && Array.isArray(data)) {
                    data.forEach((item: any) => {
                        if (item.district && 
                            item.state && 
                            selectedState && 
                            item.state.toLowerCase() === selectedState.toLowerCase() && 
                            !seenDistricts.has(item.district.toLowerCase())) {
                            seenDistricts.add(item.district.toLowerCase());
                            results.push(item);
                        }
                    });
                }
                setDistrictSearchResults(results);
                setShowDistrictDropdown(results.length > 0);
            } catch (error) {
                console.error('District search error:', error);
            } finally {
                setIsDistrictSearching(false);
            }
        } else {
            setDistrictSearchResults([]);
            setShowDistrictDropdown(false);
        }
    };

    const addPincodeValue = (pincode: string) => {
        if (pincode && !formData.serviceAreaValues.includes(pincode)) {
            setFormData(prev => ({
                ...prev,
                serviceAreaValues: [...prev.serviceAreaValues, pincode]
            }));
        }
        setPincodeSearchQuery('');
        setShowPincodeDropdown(false);
    };

    const addDistrictValue = (district: string) => {
        if (district && !formData.serviceAreaValues.includes(district)) {
            setFormData(prev => ({
                ...prev,
                serviceAreaValues: [...prev.serviceAreaValues, district]
            }));
        }
        setDistrictSearchQuery('');
        setShowDistrictDropdown(false);
    };

    const handleReachModeChange = (mode: 'RADIUS' | 'PINCODE' | 'STATE_DISTRICT' | 'PAN_INDIA') => {
        setReachMode(mode);
        if (mode === 'PAN_INDIA') {
            setFormData(prev => ({ ...prev, serviceAreaValues: [], serviceAreaType: 'PAN_INDIA' }));
        } else if (mode === 'RADIUS') {
            setFormData(prev => ({ ...prev, serviceAreaValues: [], serviceAreaType: 'RADIUS' }));
        } else if (mode === 'PINCODE') {
            setFormData(prev => ({ ...prev, serviceAreaValues: [], serviceAreaType: 'PINCODE' }));
        } else if (mode === 'STATE_DISTRICT') {
            if (formData.serviceAreaType === 'STATE' && formData.serviceAreaValues.length > 0) {
                setSelectedState(formData.serviceAreaValues[0]);
                setStateReachType('STATE');
            } else if (formData.serviceAreaType === 'DISTRICT' && formData.serviceAreaValues.length > 0) {
                setStateReachType('DISTRICT');
            } else {
                setSelectedState('');
                setStateReachType('STATE');
                setFormData(prev => ({ ...prev, serviceAreaValues: [] }));
            }
        }
    };

    const syncServiceReach = () => {
        let finalType = 'RADIUS';
        let finalValues: string[] = [];

        if (reachMode === 'PAN_INDIA') {
            finalType = 'PAN_INDIA';
            finalValues = [];
        } else if (reachMode === 'PINCODE') {
            if (formData.serviceAreaValues.length > 0) {
                finalType = 'PINCODE';
                finalValues = formData.serviceAreaValues;
            } else {
                finalType = 'RADIUS';
                finalValues = [];
            }
        } else if (reachMode === 'STATE_DISTRICT') {
            if (!selectedState) {
                finalType = 'RADIUS';
                finalValues = [];
            } else if (stateReachType === 'STATE') {
                finalType = 'STATE';
                finalValues = [selectedState];
            } else { // DISTRICT
                if (formData.serviceAreaValues.length > 0) {
                    finalType = 'DISTRICT';
                    finalValues = formData.serviceAreaValues;
                } else {
                    finalType = 'RADIUS';
                    finalValues = [];
                }
            }
        }

        setFormData(prev => ({
            ...prev,
            serviceAreaType: finalType,
            serviceAreaValues: finalValues
        }));

        return { serviceAreaType: finalType, serviceAreaValues: finalValues };
    };

    const getReachPreviewText = () => {
        if (reachMode === 'PAN_INDIA') {
            return 'Visible to users across all of India.';
        }
        if (reachMode === 'RADIUS') {
            return `Visible to users within ${formData.serviceRadiusKm} km of your business location.`;
        }
        if (reachMode === 'PINCODE') {
            if (formData.serviceAreaValues.length === 0) {
                return 'Add at least one pincode to define your service area.';
            }
            return `Visible in pincodes: ${formData.serviceAreaValues.join(', ')}.`;
        }
        if (reachMode === 'STATE_DISTRICT') {
            if (!selectedState) {
                return 'Select a state to define your service area.';
            }
            if (stateReachType === 'STATE') {
                return `Visible to users in the entire state of ${selectedState}.`;
            }
            if (formData.serviceAreaValues.length === 0) {
                return `Add districts in ${selectedState} for your service area.`;
            }
            return `Visible in districts: ${formData.serviceAreaValues.join(', ')} (${selectedState}).`;
        }
        return '';
    };

    const validateStep3Location = (): boolean => {
        if (!formData.latitude || !formData.longitude) {
            Alert.alert('Validation Error', 'Please set your business location on the map (search, GPS, or drag the pin).');
            return false;
        }
        const synced = syncServiceReach();
        if (synced.serviceAreaType === 'PINCODE' && synced.serviceAreaValues.length === 0) {
            Alert.alert('Validation Error', 'Add at least one pincode for your service area, or switch to GPS Radius mode.');
            return false;
        }
        if (synced.serviceAreaType === 'DISTRICT' && synced.serviceAreaValues.length === 0) {
            Alert.alert('Validation Error', 'Add at least one district, or choose Entire State.');
            return false;
        }
        if (synced.serviceAreaType === 'STATE' && synced.serviceAreaValues.length === 0) {
            Alert.alert('Validation Error', 'Please select a state for your service area.');
            return false;
        }
        return true;
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.businessName || !formData.businessName.trim()) {
                Alert.alert('Validation Error', 'Business Name is required');
                return;
            }
            if (nameError) {
                Alert.alert('Validation Error', 'Please choose a unique business name');
                return;
            }
            if (nameChecking) {
                Alert.alert('Validation Error', 'Validating business name, please wait...');
                return;
            }
            if (!formData.category) {
                Alert.alert('Validation Error', 'Business Category is required');
                return;
            }
            if (formData.category === 'Others' && (!customCategory || !customCategory.trim())) {
                Alert.alert('Validation Error', 'Please enter a custom category');
                return;
            }
            if (!formData.about || !formData.about.trim()) {
                Alert.alert('Validation Error', 'Business Description is required');
                return;
            }
        }
        if (step === 3) {
            if (!validateStep3Location()) return;
        }
        setStep(Math.min(step + 1, 5));
    };
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

    const renderStepper = () => {
        if (isManageSlotsOnly) return null;
        return (
            <View style={styles.stepperContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
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
                            {i === 1 ? 'Business Info' : i === 2 ? 'Gallery & Showcase' : i === 3 ? 'Location' : i === 4 ? 'Book Service' : 'Review & Publish'}
                        </Text>
                    </View>
                    {i < 5 && <View style={[styles.stepLine, step > i && styles.stepLineActive]} />}
                </React.Fragment>
            ))}
        </View>
        );
    };

    const renderStep1 = () => (
        <View style={styles.stepContent}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.row}>
                <TouchableOpacity style={styles.logoBox} onPress={pickImage}>
                    {formData.logo ? (
                        <Image source={{ uri: formData.logo }} style={styles.logoImage} />
                    ) : (
                        <>
                            <Ionicons name="camera" size={24} color="#8b5cf6" />
                            <Text style={styles.logoText}>Add Logo</Text>
                            <Text style={styles.logoSubtext}>JPG, PNG up to 5MB</Text>
                        </>
                    )}
                </TouchableOpacity>
                <View style={{ flex: 1, gap: 12 }}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Business Name *</Text>
                        <TextInput 
                            style={[styles.input, nameError ? { borderColor: '#ef4444' } : null]} 
                            placeholder="Enter business name" 
                            placeholderTextColor="#94a3b8"
                            value={formData.businessName}
                            onChangeText={t => {
                                setFormData({...formData, businessName: t});
                                setNameError('');
                            }}
                            onBlur={() => validateBusinessName(formData.businessName)}
                        />
                        {nameChecking && <Text style={{ fontSize: 11, color: '#a78bfa', marginTop: 4 }}>Checking availability...</Text>}
                        {nameError ? <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: '600' }}>{nameError}</Text> : null}
                    </View>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Business Categories *</Text>
                        <TouchableOpacity 
                            style={styles.pickerContainer}
                            onPress={() => setFormData({...formData, showCategoryModal: true})}
                        >
                            <Text style={[styles.pickerValue, !formData.category && { color: '#9A8EBA' }]}>
                                Select categories...
                            </Text>
                            <Ionicons name="chevron-down" size={18} color="#94a3b8" style={styles.pickerIcon} />
                        </TouchableOpacity>
                        
                        {formData.category ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                                {formData.category.split(', ').filter(Boolean).map(cat => (
                                    <View key={cat} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.1)', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 }}>
                                        <Text style={{ fontSize: 13, color: '#60a5fa', fontWeight: '600', marginRight: 4 }}>
                                            {cat === 'Others' && customCategory ? `Others (${customCategory})` : cat}
                                        </Text>
                                        <TouchableOpacity 
                                            onPress={() => {
                                                const active = formData.category.split(', ').filter(Boolean);
                                                const updated = active.filter(c => c !== cat).join(', ');
                                                setFormData({ ...formData, category: updated });
                                            }}
                                        >
                                            <Ionicons name="close-circle" size={16} color="#a78bfa" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>

            {formData.category.split(', ').includes('Others') && (
                <View style={[styles.inputGroup, { marginTop: 12 }]}>
                    <Text style={styles.label}>Custom Category *</Text>
                    <TextInput 
                        style={styles.input} 
                        placeholder="Enter custom business category (e.g. Pet Care)" 
                        placeholderTextColor="#94a3b8"
                        value={customCategory}
                        onChangeText={setCustomCategory}
                    />
                </View>
            )}

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

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Hashtags (Optional)</Text>
                <TextInput 
                    style={styles.input} 
                    placeholder="e.g., #plumber #leak #emergency" 
                    placeholderTextColor="#94a3b8"
                    value={formData.hashtags}
                    onChangeText={t => setFormData({...formData, hashtags: t})}
                />
                <Text style={styles.charCount}>Add hashtags separated by spaces or commas</Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>Years in Business</Text>
                    <TouchableOpacity 
                        style={styles.pickerContainer}
                        onPress={() => setFormData({...formData, showExpModal: true})}
                    >
                        <Text style={[styles.pickerValue, !formData.experience && { color: '#9A8EBA' }]}>
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
                        <Text style={[styles.pickerValue, !formData.businessType && { color: '#9A8EBA' }]}>
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
            <TouchableOpacity style={styles.contactItem} onPress={openWorkingHoursModal}>
                <Ionicons name="time-outline" size={20} color="#64748b" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.label}>Business Hours</Text>
                    <Text style={styles.valueText}>
                        {formData.workingHours ? `${formData.workingHours.days}, ${formData.workingHours.from} - ${formData.workingHours.to}` : 'Set business hours'}
                    </Text>
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

    const renderStep2 = () => {
        return (
            <View style={styles.stepContent}>
                <Text style={styles.sectionTitle}>Business Gallery & Showcase</Text>
                <Text style={styles.subText}>
                    Showcase your work, upload photos or videos, and write descriptions with headings to wow your customers.
                </Text>

                {formData.services.length === 0 ? (
                    <View style={{ padding: 40, backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                        <Ionicons name="images-outline" size={48} color="#64748b" style={{ marginBottom: 12 }} />
                        <Text style={{ color: '#2D2445', fontSize: 16, fontWeight: '700', textAlign: 'center' }}>Your Gallery is Empty</Text>
                        <Text style={{ color: '#7A6B9C', fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: 20, lineHeight: 18 }}>
                            Add images, videos, or highlight text sections to build a stunning profile.
                        </Text>
                    </View>
                ) : (
                    <View style={{ gap: 16, marginBottom: 20 }}>
                        {formData.services.map((item: any, i: number) => (
                            <View key={item.id || i.toString()} style={{ backgroundColor: '#ffffff', borderRadius: 20, borderWidth: 1, borderColor: '#D4C9E8', overflow: 'hidden' }}>
                                {item.pricingType === 'IMAGE' && item.responseTime ? (
                                    <Image source={{ uri: item.responseTime }} style={{ width: '100%', height: 180, resizeMode: 'cover' }} />
                                ) : item.pricingType === 'VIDEO' && item.responseTime ? (
                                    <View style={{ width: '100%', height: 180, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="play-circle" size={48} color="#a78bfa" />
                                        <Text style={{ color: '#9A8EBA', fontSize: 12, marginTop: 8 }}>Video Showcase Attached</Text>
                                    </View>
                                ) : null}

                                <View style={{ padding: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <View style={{ backgroundColor: item.pricingType === 'IMAGE' ? 'rgba(59, 130, 246, 0.1)' : item.pricingType === 'VIDEO' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                    <Text style={{ fontSize: 10, color: item.pricingType === 'IMAGE' ? '#60a5fa' : item.pricingType === 'VIDEO' ? '#fbbf24' : '#34d399', fontWeight: '800' }}>
                                                        {item.pricingType}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#2D2445' }}>{item.name}</Text>
                                        </View>
                                        
                                        <View style={{ flexDirection: 'row', gap: 8 }}>
                                            <TouchableOpacity 
                                                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' }}
                                                onPress={() => {
                                                    setCurrentService(item);
                                                    setShowServiceModal(true);
                                                }}
                                            >
                                                <Feather name="edit-2" size={14} color="#94a3b8" />
                                            </TouchableOpacity>
                                            <TouchableOpacity 
                                                style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center' }}
                                                onPress={() => {
                                                    setFormData({
                                                        ...formData,
                                                        services: formData.services.filter((_, idx) => idx !== i)
                                                    });
                                                }}
                                            >
                                                <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    
                                    {item.description ? (
                                        <Text style={{ fontSize: 14, color: '#9A8EBA', marginTop: 8, lineHeight: 20 }}>
                                            {item.description}
                                        </Text>
                                    ) : null}
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.addAnotherBtn} 
                    onPress={() => {
                        setCurrentService({ 
                            id: '', 
                            name: '', 
                            description: '', 
                            pricingType: 'IMAGE',
                            price: '', 
                            responseTime: '',
                            isEmergency: false 
                        });
                        setShowServiceModal(true);
                    }}
                >
                    <Ionicons name="add-circle-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.addAnotherText}>Add Showcase/Gallery Item</Text>
                </TouchableOpacity>
            </View>
        );
    };

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
                        {isMapSearching && <ActivityIndicator size="small" color="#8b5cf6" style={{ marginRight: 8 }} />}
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

            {/* Reach Mode Grid Selector */}
            <View style={styles.reachGrid}>
                {[
                    { mode: 'RADIUS', label: 'GPS Radius', icon: 'navigate-outline' },
                    { mode: 'PINCODE', label: 'Pincodes', icon: 'mail-outline' },
                    { mode: 'STATE_DISTRICT', label: 'State & Districts', icon: 'map-outline' },
                    { mode: 'PAN_INDIA', label: 'Entire India', icon: 'flag-outline' }
                ].map(item => (
                    <TouchableOpacity 
                        key={item.mode} 
                        style={[styles.reachGridItem, reachMode === item.mode && styles.reachGridItemActive]}
                        onPress={() => handleReachModeChange(item.mode as any)}
                    >
                        <Ionicons name={item.icon as any} size={20} color={reachMode === item.mode ? '#fff' : '#64748b'} />
                        <Text style={[styles.reachGridText, reachMode === item.mode && styles.reachGridTextActive]}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* GPS RADIUS MODE INFO */}
            {reachMode === 'RADIUS' && (
                <View style={styles.infoBox}>
                    <Ionicons name="location-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.infoText}>Service coverage will be determined solely by your base location coordinates and selected radius ({formData.serviceRadiusKm} km).</Text>
                </View>
            )}

            {/* SPECIFIC PINCODES MODE */}
            {reachMode === 'PINCODE' && (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Search & Add Pincodes</Text>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
                        <TextInput 
                            style={styles.searchInput} 
                            placeholder="Enter pincode or location..."
                            placeholderTextColor="#94a3b8"
                            value={pincodeSearchQuery}
                            onChangeText={handlePincodeSearch}
                            keyboardType="numeric"
                        />
                        {isPincodeSearching && <ActivityIndicator size="small" color="#8b5cf6" style={{ marginRight: 8 }} />}
                    </View>
                    
                    {showPincodeDropdown && pincodeSearchResults.length > 0 && (
                        <View style={styles.dropdown}>
                            {pincodeSearchResults.map((loc, idx) => (
                                <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => addPincodeValue(loc.pincode)}>
                                    <Text style={styles.dropdownText}>{loc.pincode} - {loc.placeName}, {loc.district}</Text>
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
                    {formData.serviceAreaValues.length === 0 && (
                        <Text style={[styles.subText, { marginTop: 8, fontStyle: 'italic' }]}>No pincodes selected. Please search and select pincodes, or this will fall back to GPS radius.</Text>
                    )}
                </View>
            )}

            {/* STATE & DISTRICTS MODE */}
            {reachMode === 'STATE_DISTRICT' && (
                <View style={{ marginTop: 16 }}>
                    <Text style={styles.label}>Select Indian State</Text>
                    <TouchableOpacity style={styles.stateSelectBtn} onPress={() => setShowStateModal(true)}>
                        <Text style={styles.stateSelectBtnText}>{selectedState || 'Choose State...'}</Text>
                        <Ionicons name="chevron-down" size={20} color="#94a3b8" />
                    </TouchableOpacity>

                    {selectedState ? (
                        <View style={{ marginTop: 16 }}>
                            <Text style={styles.label}>State Reach Type</Text>
                            <View style={styles.reachTabs}>
                                {[
                                    { type: 'STATE', label: 'Entire State' },
                                    { type: 'DISTRICT', label: 'Specific Districts' }
                                ].map(item => (
                                    <TouchableOpacity 
                                        key={item.type} 
                                        style={[styles.reachTab, stateReachType === item.type && styles.reachTabActive]}
                                        onPress={() => {
                                            setStateReachType(item.type as any);
                                            setFormData(prev => ({ ...prev, serviceAreaValues: [] }));
                                        }}
                                    >
                                        <Text style={[styles.reachTabText, stateReachType === item.type && styles.reachTabTextActive]}>{item.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {stateReachType === 'STATE' ? (
                                <View style={styles.infoBox}>
                                    <Ionicons name="map-outline" size={20} color="#8b5cf6" />
                                    <Text style={styles.infoText}>Your profile will be shown to users in the entire state of {selectedState}.</Text>
                                </View>
                            ) : (
                                <View style={{ marginTop: 16 }}>
                                    <Text style={styles.label}>Search & Add Districts in {selectedState}</Text>
                                    <View style={styles.searchBox}>
                                        <Ionicons name="search" size={18} color="#94a3b8" style={{ marginLeft: 8 }} />
                                        <TextInput 
                                            style={styles.searchInput} 
                                            placeholder="Enter district name..."
                                            placeholderTextColor="#94a3b8"
                                            value={districtSearchQuery}
                                            onChangeText={handleDistrictSearch}
                                        />
                                        {isDistrictSearching && <ActivityIndicator size="small" color="#8b5cf6" style={{ marginRight: 8 }} />}
                                    </View>

                                    {showDistrictDropdown && districtSearchResults.length > 0 && (
                                        <View style={styles.dropdown}>
                                            {districtSearchResults.map((loc, idx) => (
                                                <TouchableOpacity key={idx} style={styles.dropdownItem} onPress={() => addDistrictValue(loc.district)}>
                                                    <Text style={styles.dropdownText}>{loc.district}</Text>
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
                                    {formData.serviceAreaValues.length === 0 && (
                                        <Text style={[styles.subText, { marginTop: 8, fontStyle: 'italic' }]}>No districts selected. Please search and select districts, or this will fall back to GPS radius.</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.infoBox}>
                            <Ionicons name="alert-circle-outline" size={20} color="#f59e0b" />
                            <Text style={[styles.infoText, { color: '#f59e0b' }]}>Please select a state to proceed with State & Districts reach.</Text>
                        </View>
                    )}
                </View>
            )}

            {/* ENTIRE INDIA MODE */}
            {reachMode === 'PAN_INDIA' && (
                <View style={styles.infoBox}>
                    <Ionicons name="flag-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.infoText}>Your profile will be visible to users across all of India.</Text>
                </View>
            )}

            <View style={[styles.infoBox, { marginTop: 16, borderColor: 'rgba(29, 78, 216, 0.3)' }]}>
                <Ionicons name="eye-outline" size={20} color="#a78bfa" />
                <Text style={[styles.infoText, { color: '#93c5fd' }]}>{getReachPreviewText()}</Text>
            </View>

            <View style={styles.tipBox}>
                <Ionicons name="information-circle-outline" size={20} color="#8b5cf6" />
                <Text style={styles.tipText}>Tip: Precise service areas help you get more relevant leads from your neighborhood.</Text>
            </View>
        </View>
    );

    const renderStep4 = () => {
        return (
            <View style={styles.stepContent}>
                <Text style={styles.sectionTitle}>Booking Settings</Text>
                <Text style={styles.subText}>
                    Enable booking to allow customers and community residents to book service slots directly from your profile.
                </Text>

                <View style={[styles.summaryCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18 }]}>
                    <View style={{ flex: 1, marginRight: 16 }}>
                        <Text style={[styles.label, { marginBottom: 4 }]}>Enable Slot Booking</Text>
                        <Text style={{ fontSize: 13, color: '#9A8EBA' }}>
                            {formData.enableBooking ? 'Customers can book scheduled appointments' : 'No online bookings allowed'}
                        </Text>
                    </View>
                    <Switch
                        value={formData.enableBooking}
                        onValueChange={(val) => setFormData({ ...formData, enableBooking: val })}
                        trackColor={{ false: '#334155', true: '#1d4ed8' }}
                        thumbColor={formData.enableBooking ? '#fff' : '#94a3b8'}
                    />
                </View>

                {formData.enableBooking && (
                    <View style={{ marginTop: 12 }}>
                        <Text style={[styles.label, { marginBottom: 12 }]}>Configure Booking Slots</Text>
                        
                        {formData.bookingSlots.length === 0 ? (
                            <View style={{ padding: 24, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <Ionicons name="calendar-outline" size={36} color="#64748b" style={{ marginBottom: 12 }} />
                                <Text style={{ color: '#2D2445', fontSize: 15, fontWeight: '700', textAlign: 'center' }}>No Booking Slots Created</Text>
                                <Text style={{ color: '#7A6B9C', fontSize: 12, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                                    Add your first slot (e.g., "General Consulting" or "Morning Visit") to define when you're available.
                                </Text>
                            </View>
                        ) : (
                            formData.bookingSlots.map((slot: any, index: number) => {
                                // Parse operational days from scheduleConfig
                                let daysText = 'No days selected';
                                try {
                                    const config = typeof slot.scheduleConfig === 'string' 
                                        ? JSON.parse(slot.scheduleConfig) 
                                        : slot.scheduleConfig;
                                    if (config) {
                                        if (slot.scheduleType === 'WEEKLY') {
                                            const reverseMapping: { [key: string]: string } = { 
                                                'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 
                                                'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' 
                                            };
                                            const days: string[] = [];
                                            Object.keys(config).forEach(k => {
                                                if (config[k] && config[k].length > 0 && reverseMapping[k]) {
                                                    days.push(reverseMapping[k]);
                                                }
                                            });
                                            if (days.length > 0) {
                                                const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                                days.sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b));
                                                daysText = days.join(', ');
                                            }
                                        } else if (slot.scheduleType === 'MONTHLY') {
                                            const allowedDays = config.daysOfMonth || [];
                                            daysText = allowedDays.map((d: number) => `Every ${d}th`).join(', ');
                                        } else if (slot.scheduleType === 'CUSTOM') {
                                            daysText = Object.keys(config.dates || {}).join(', ');
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to parse schedule config in renderStep4:', e);
                                }

                                const parsed = parseSlotDescription(slot.description);

                                return (
                                    <View key={slot.id || index.toString()} style={styles.serviceCard}>
                                        {parsed.photoUrl ? (
                                            <Image source={{ uri: parsed.photoUrl }} style={{ width: 44, height: 44, borderRadius: 8, marginRight: 12, resizeMode: 'cover' }} />
                                        ) : (
                                            <View style={[styles.serviceIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)', marginRight: 12 }]}>
                                                <Ionicons name="time" size={18} color="#10b981" />
                                            </View>
                                        )}
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.serviceName}>{slot.name}</Text>
                                            {parsed.text ? <Text style={styles.serviceDesc}>{parsed.text}</Text> : null}
                                            {parsed.rules ? <Text style={{ fontSize: 12, color: '#fbbf24', marginTop: 2 }}>Rules: {parsed.rules}</Text> : null}
                                            <Text style={{ fontSize: 12, color: '#9A8EBA', marginTop: 4 }}>
                                                Availability: <Text style={{ color: '#2D2445', fontWeight: '600' }}>{daysText}</Text>
                                            </Text>
                                            <Text style={{ fontSize: 12, color: '#9A8EBA', marginTop: 2 }}>
                                                Capacity: <Text style={{ color: '#2D2445', fontWeight: '600' }}>{slot.maxPersons} person(s)</Text>
                                                {slot.allowRecurringBookings ? ' • Recurring allowed' : ''}
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                                                {slot.timeSlots && slot.timeSlots.map((ts: string, idx: number) => (
                                                    <View key={idx} style={{ backgroundColor: '#EFE9F8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                        <Text style={{ fontSize: 11, color: '#2D2445', fontWeight: '500' }}>{ts}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                        <TouchableOpacity 
                                            style={styles.iconBtn} 
                                            onPress={() => {
                                                // Load slot to edit
                                                const parsedDetail = parseSlotDescription(slot.description);
                                                setCurrentSlot({
                                                    id: slot.id,
                                                    name: slot.name,
                                                    description: parsedDetail.text || '',
                                                    rules: parsedDetail.rules || '',
                                                    photoUrl: parsedDetail.photoUrl || '',
                                                    maxPersons: slot.maxPersons || 10,
                                                    scheduleType: slot.scheduleType || 'WEEKLY',
                                                    scheduleConfig: slot.scheduleConfig || '',
                                                    timeSlots: slot.timeSlots || [],
                                                    allowRecurringBookings: slot.allowRecurringBookings !== undefined ? slot.allowRecurringBookings : true,
                                                    advanceBookingWeeks: typeof slot.advanceBookingWeeks === 'number' && slot.advanceBookingWeeks > 0 ? slot.advanceBookingWeeks : 4,
                                                });
                                                setPhotoUri(parsedDetail.photoUrl || null);
                                                setRules(parsedDetail.rules || '');

                                                // Initialize sub-schedule builders
                                                try {
                                                    const config = typeof slot.scheduleConfig === 'string'
                                                        ? JSON.parse(slot.scheduleConfig)
                                                        : slot.scheduleConfig;
                                                    if (config) {
                                                        if (slot.scheduleType === 'WEEKLY') {
                                                            setWeeklyConfig({
                                                                Monday: config.Monday || [],
                                                                Tuesday: config.Tuesday || [],
                                                                Wednesday: config.Wednesday || [],
                                                                Thursday: config.Thursday || [],
                                                                Friday: config.Friday || [],
                                                                Saturday: config.Saturday || [],
                                                                Sunday: config.Sunday || [],
                                                            });
                                                            const dayWithSlots = Object.keys(config).find(k => config[k] && config[k].length > 0) || 'Monday';
                                                            setSelectedWeeklyDay(dayWithSlots);
                                                        } else if (slot.scheduleType === 'MONTHLY') {
                                                            setMonthlyDays(config.daysOfMonth || [1, 15]);
                                                            setMonthlySlots(config.slots || []);
                                                        } else if (slot.scheduleType === 'CUSTOM') {
                                                            setCustomDatesSlots(config.dates || {});
                                                            const dates = Object.keys(config.dates || {});
                                                            if (dates.length > 0) {
                                                                setSelectedCustomDate(dates[0]);
                                                            }
                                                        }
                                                    }
                                                } catch (e) {
                                                    console.error('Failed to parse slot config on edit:', e);
                                                }
                                                setShowSlotModal(true);
                                            }}
                                        >
                                            <Feather name="edit-2" size={16} color="#a78bfa" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={styles.iconBtn} 
                                            onPress={() => {
                                                Alert.alert(
                                                    'Delete Slot',
                                                    `Are you sure you want to delete the slot "${slot.name}"?`,
                                                    [
                                                        { text: 'Cancel', style: 'cancel' },
                                                        { 
                                                            text: 'Delete', 
                                                            style: 'destructive',
                                                            onPress: () => {
                                                                setFormData({
                                                                    ...formData,
                                                                    bookingSlots: formData.bookingSlots.filter((s: any) => String(s.id) !== String(slot.id))
                                                                });
                                                            }
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })
                        )}

                        <TouchableOpacity 
                            style={styles.addAnotherBtn}
                            onPress={() => {
                                setCurrentSlot({
                                    id: Date.now().toString(),
                                    name: '',
                                    description: '',
                                    rules: '',
                                    photoUrl: '',
                                    maxPersons: 10,
                                    scheduleType: 'WEEKLY',
                                    scheduleConfig: '',
                                    timeSlots: [],
                                    allowRecurringBookings: true,
                                    advanceBookingWeeks: 4,
                                });
                                setPhotoUri(null);
                                setRules('');
                                setWeeklyConfig({
                                    Monday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
                                    Tuesday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
                                    Wednesday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
                                    Thursday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
                                    Friday: ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '04:00 PM - 05:00 PM'],
                                    Saturday: ['10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM'],
                                    Sunday: ['10:00 AM - 12:00 PM', '02:00 PM - 04:00 PM'],
                                });
                                setSelectedWeeklyDay('Monday');
                                setMonthlyDays([1, 15]);
                                setMonthlySlots(['09:00 AM - 12:00 PM', '02:00 PM - 05:00 PM']);
                                setCustomDatesSlots({
                                    '2026-05-20': ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'],
                                    '2026-05-21': ['09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'],
                                });
                                setSelectedCustomDate('2026-05-20');
                                setShowSlotModal(true);
                            }}
                        >
                            <Ionicons name="add-circle-outline" size={20} color="#8b5cf6" />
                            <Text style={styles.addAnotherText}>Add Booking Slot</Text>
                        </TouchableOpacity>
                    </View>
                )}

            </View>
        );
    };

    const renderSlotModal = () => {
        const validateRange = (start: Date, end: Date): { start: number; end: number } | null => {
            const candidate = { start: start.getHours() * 60 + start.getMinutes(), end: end.getHours() * 60 + end.getMinutes() };
            if (candidate.end <= candidate.start) {
                Alert.alert('Invalid Range', 'End time must be after the start time.');
                return null;
            }
            return candidate;
        };

        const handleAddWeeklySlot = () => {
            const candidate = validateRange(weeklyStart, weeklyEnd);
            if (!candidate) return;
            const range = formatRange(weeklyStart, weeklyEnd);
            const currentSlots = weeklyConfig[selectedWeeklyDay] || [];
            const conflict = findConflictingRange(candidate, currentSlots);
            if (conflict) {
                Alert.alert(
                    'Time Conflict',
                    `This range overlaps an existing slot (${conflict}) for ${selectedWeeklyDay}. Pick a non-overlapping time.`,
                );
                return;
            }
            setWeeklyConfig({
                ...weeklyConfig,
                [selectedWeeklyDay]: [...currentSlots, range],
            });
        };

        const handleRemoveWeeklySlot = (slotToRemove: string) => {
            const currentSlots = weeklyConfig[selectedWeeklyDay] || [];
            setWeeklyConfig({
                ...weeklyConfig,
                [selectedWeeklyDay]: currentSlots.filter(s => s !== slotToRemove)
            });
        };

        // Advanced monthly day/slot handlers
        const handleAddMonthlyDay = () => {
            const dayNum = parseInt(monthlyDayInput);
            if (isNaN(dayNum) || dayNum < 1 || dayNum > 31) {
                Alert.alert('Invalid Day', 'Please enter a day between 1 and 31');
                return;
            }
            if (monthlyDays.includes(dayNum)) {
                Alert.alert('Duplicate', 'This day is already added.');
                return;
            }
            setMonthlyDays([...monthlyDays, dayNum].sort((a, b) => a - b));
            setMonthlyDayInput('');
        };

        const handleRemoveMonthlyDay = (day: number) => {
            setMonthlyDays(monthlyDays.filter(d => d !== day));
        };

        const handleAddMonthlySlot = () => {
            const candidate = validateRange(monthlyStart, monthlyEnd);
            if (!candidate) return;
            const range = formatRange(monthlyStart, monthlyEnd);
            const conflict = findConflictingRange(candidate, monthlySlots);
            if (conflict) {
                Alert.alert(
                    'Time Conflict',
                    `This range overlaps an existing monthly slot (${conflict}). Pick a non-overlapping time.`,
                );
                return;
            }
            setMonthlySlots([...monthlySlots, range]);
        };

        const handleRemoveMonthlySlot = (slotToRemove: string) => {
            setMonthlySlots(monthlySlots.filter(s => s !== slotToRemove));
        };

        // Advanced custom dates/slots handlers
        const handleAddCustomDate = () => {
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(customDateInput.trim())) {
                Alert.alert('Invalid Format', 'Please enter date as YYYY-MM-DD');
                return;
            }
            if (customDatesSlots[customDateInput.trim()]) {
                Alert.alert('Exists', 'This date is already initialized.');
                setSelectedCustomDate(customDateInput.trim());
                return;
            }
            setCustomDatesSlots({
                ...customDatesSlots,
                [customDateInput.trim()]: ['09:00 AM - 10:00 AM']
            });
            setSelectedCustomDate(customDateInput.trim());
            setCustomDateInput('');
        };

        const handleRemoveCustomDate = (dateStr: string) => {
            const updated = { ...customDatesSlots };
            delete updated[dateStr];
            setCustomDatesSlots(updated);
            
            const remainingKeys = Object.keys(updated);
            if (remainingKeys.length > 0) {
                setSelectedCustomDate(remainingKeys[0]);
            } else {
                setSelectedCustomDate('');
            }
        };

        const handleAddCustomSlot = () => {
            if (!selectedCustomDate) {
                Alert.alert('No Date', 'Please add or select a custom date first.');
                return;
            }
            const candidate = validateRange(customStart, customEnd);
            if (!candidate) return;
            const range = formatRange(customStart, customEnd);
            const currentSlots = customDatesSlots[selectedCustomDate] || [];
            const conflict = findConflictingRange(candidate, currentSlots);
            if (conflict) {
                Alert.alert(
                    'Time Conflict',
                    `This range overlaps an existing slot (${conflict}) for ${selectedCustomDate}.`,
                );
                return;
            }
            setCustomDatesSlots({
                ...customDatesSlots,
                [selectedCustomDate]: [...currentSlots, range],
            });
        };

        const handleRemoveCustomSlot = (slotToRemove: string) => {
            const currentSlots = customDatesSlots[selectedCustomDate] || [];
            setCustomDatesSlots({
                ...customDatesSlots,
                [selectedCustomDate]: currentSlots.filter(s => s !== slotToRemove)
            });
        };

        const handlePickPhoto = async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Permission to access gallery is required.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [16, 9],
                quality: 0.7,
            });

            if (!result.canceled) {
                setPhotoUri(result.assets[0].uri);
            }
        };

        const handleSaveSlot = async () => {
            if (!currentSlot.name || !currentSlot.name.trim()) {
                Alert.alert('Validation Error', 'Service / Slot Name is required.');
                return;
            }

            // Formulate scheduling data
            let finalScheduleConfig = '';
            let finalTimeSlots: string[] = [];
            let finalAvailableDates: string[] = [];

            if (currentSlot.scheduleType === 'WEEKLY') {
                finalScheduleConfig = JSON.stringify(weeklyConfig);
                const allSlots = new Set<string>();
                Object.values(weeklyConfig).forEach(slots => slots?.forEach(s => allSlots.add(s)));
                finalTimeSlots = Array.from(allSlots);
                if (finalTimeSlots.length === 0) {
                    Alert.alert('Error', 'Please add at least one slot in your Weekly schedule.');
                    return;
                }
                finalAvailableDates = ['Weekly Slots Enabled'];
            } else if (currentSlot.scheduleType === 'MONTHLY') {
                if (monthlyDays.length === 0 || monthlySlots.length === 0) {
                    Alert.alert('Error', 'Monthly schedule needs both days of the month and available slots.');
                    return;
                }
                finalScheduleConfig = JSON.stringify({
                    daysOfMonth: monthlyDays,
                    slots: monthlySlots
                });
                finalTimeSlots = monthlySlots;
                finalAvailableDates = monthlyDays.map(d => `Day ${d}`);
            } else { // CUSTOM
                const keys = Object.keys(customDatesSlots);
                if (keys.length === 0) {
                    Alert.alert('Error', 'Please add at least one Custom Date with time slots.');
                    return;
                }
                finalScheduleConfig = JSON.stringify({
                    dates: customDatesSlots
                });
                const allSlots = new Set<string>();
                Object.values(customDatesSlots).forEach(slots => slots?.forEach(s => allSlots.add(s)));
                finalTimeSlots = Array.from(allSlots);
                finalAvailableDates = keys;
            }

            setSlotSavingLoader(true);
            try {
                let uploadedPhotoUrl = photoUri || '';
                // Upload slot cover photo if picked
                if (photoUri && (photoUri.startsWith('file:') || photoUri.startsWith('content:'))) {
                    try {
                        const cleanName = `slot_${Date.now()}.jpg`;
                        const res = await storageApi.uploadFile(photoUri, cleanName, 'image/jpeg', 'slots');
                        uploadedPhotoUrl = res as string;
                    } catch (uploadError) {
                        console.error('Failed to upload slot cover photo:', uploadError);
                        Alert.alert('Upload Failed', 'Failed to upload cover photo. Continuing without cover.');
                    }
                }

                // Serialize description, rules, and photoUrl as JSON in description
                const serializedDesc = JSON.stringify({
                    text: currentSlot.description || '',
                    rules: rules || '',
                    photoUrl: uploadedPhotoUrl || '',
                });

                const savedSlot = {
                    ...currentSlot,
                    description: serializedDesc,
                    timeSlots: finalTimeSlots,
                    scheduleConfig: finalScheduleConfig,
                    allowRecurringBookings: currentSlot.allowRecurringBookings
                };

                const idx = formData.bookingSlots.findIndex((s: any) => String(s.id) === String(currentSlot.id));
                let updatedSlots = [...formData.bookingSlots];
                if (idx !== -1) {
                    updatedSlots[idx] = savedSlot;
                } else {
                    updatedSlots.push(savedSlot);
                }

                setFormData({
                    ...formData,
                    bookingSlots: updatedSlots
                });
                closeSlotModal();
            } catch (err) {
                console.error('Failed to save slot:', err);
                Alert.alert('Error', 'Failed to save slot configuration.');
            } finally {
                setSlotSavingLoader(false);
            }
        };

        return (
            <Modal
                visible={showSlotModal}
                transparent
                animationType="slide"
                onRequestClose={closeSlotModal}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <Pressable style={pickerStyles.modalOverlay} onPress={closeSlotModal}>
                        <View
                            style={[pickerStyles.modalContent, { height: '90%', backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}
                            onStartShouldSetResponder={() => true}
                        >
                            
                            {/* Modal Header */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                <Text style={{ fontSize: 20, fontWeight: '800', color: '#2D2445', flex: 1, marginRight: 12 }}>
                                    {formData.bookingSlots.some((s: any) => String(s.id) === String(currentSlot.id)) ? 'Edit Service Slot' : 'New Service Slot & Schedule'}
                                </Text>
                                <TouchableOpacity onPress={closeSlotModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                                    <Ionicons name="close" size={26} color="#64748b" />
                                </TouchableOpacity>
                            </View>
                            
                            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                            
                            {/* Dash Cover Photo Picker (Matches Amenity Cover Upload Layout) */}
                            <TouchableOpacity 
                                style={{ 
                                    height: 160, 
                                    backgroundColor: '#ffffff', 
                                    borderStyle: 'dashed', 
                                    borderWidth: 2, 
                                    borderColor: '#C4B5DC', 
                                    borderRadius: 20, 
                                    marginBottom: 20, 
                                    overflow: 'hidden', 
                                    alignItems: 'center', 
                                    justifyContent: 'center' 
                                }} 
                                onPress={handlePickPhoto}
                            >
                                {photoUri ? (
                                    <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Ionicons name="sparkles-outline" size={32} color="#8b5cf6" />
                                        <Text style={{ fontSize: 14, color: '#8b5cf6', marginTop: 8, fontWeight: '700' }}>Upload Service Cover Photo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Slot Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Business Service / Slot Name *</Text>
                                <TextInput 
                                    style={[styles.input, { color: '#2D2445', backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' }]} 
                                    placeholder="e.g. Special Consultation, Premium Treatment" 
                                    placeholderTextColor="#64748b"
                                    value={currentSlot.name}
                                    onChangeText={t => setCurrentSlot({ ...currentSlot, name: t })}
                                />
                            </View>

                            {/* Description */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput 
                                    style={[styles.input, styles.textArea, { color: '#2D2445', backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' }]} 
                                    placeholder="Provide details about what this service / slot includes..." 
                                    placeholderTextColor="#64748b"
                                    multiline
                                    value={currentSlot.description}
                                    onChangeText={t => setCurrentSlot({ ...currentSlot, description: t })}
                                />
                            </View>

                            {/* Rules & Regulations (Direct matches the Amenity layout) */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Rules & Regulations</Text>
                                <TextInput 
                                    style={[styles.input, styles.textArea, { color: '#2D2445', backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' }]} 
                                    placeholder="Rules & parameters (e.g. Please arrive 5 minutes early, carry booking receipt)..." 
                                    placeholderTextColor="#64748b"
                                    multiline
                                    value={rules}
                                    onChangeText={setRules}
                                />
                            </View>

                            {/* Max Persons per Slot */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Max Persons per Slot *</Text>
                                <TextInput 
                                    style={[styles.input, { color: '#2D2445', backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' }]} 
                                    placeholder="e.g. 10" 
                                    placeholderTextColor="#64748b"
                                    keyboardType="numeric"
                                    value={currentSlot.maxPersons.toString()}
                                    onChangeText={t => {
                                        const num = parseInt(t) || 1;
                                        setCurrentSlot({ ...currentSlot, maxPersons: num });
                                    }}
                                />
                            </View>

                            <View style={{ height: 1, backgroundColor: '#EFE9F8', marginVertical: 20 }} />

                            {/* Advanced Scheduling Builder Selector Tabs */}
                            <Text style={{ fontSize: 16, fontWeight: '800', color: '#2D2445', marginBottom: 15 }}>📅 Advanced Availability Schedule</Text>

                            <View style={{ flexDirection: 'row', backgroundColor: '#F4EEFC', borderRadius: 12, padding: 4, marginBottom: 20 }}>
                                <TouchableOpacity 
                                    style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }, currentSlot.scheduleType === 'WEEKLY' && { backgroundColor: '#8b5cf6' }]} 
                                    onPress={() => setCurrentSlot({ ...currentSlot, scheduleType: 'WEEKLY' })}
                                >
                                    <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9A8EBA' }, currentSlot.scheduleType === 'WEEKLY' && { color: '#2D2445' }]}>Weekly Days</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }, currentSlot.scheduleType === 'MONTHLY' && { backgroundColor: '#8b5cf6' }]} 
                                    onPress={() => setCurrentSlot({ ...currentSlot, scheduleType: 'MONTHLY' })}
                                >
                                    <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9A8EBA' }, currentSlot.scheduleType === 'MONTHLY' && { color: '#2D2445' }]}>Monthly Pattern</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 }, currentSlot.scheduleType === 'CUSTOM' && { backgroundColor: '#8b5cf6' }]} 
                                    onPress={() => setCurrentSlot({ ...currentSlot, scheduleType: 'CUSTOM' })}
                                >
                                    <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9A8EBA' }, currentSlot.scheduleType === 'CUSTOM' && { color: '#2D2445' }]}>Custom Calendar</Text>
                                </TouchableOpacity>
                            </View>

                            {/* 1. WEEKLY FORM */}
                            {currentSlot.scheduleType === 'WEEKLY' && (
                                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                    <Text style={{ fontSize: 13, color: '#9A8EBA', marginBottom: 12, fontWeight: '500' }}>Select a day below to configure its valid time slots:</Text>
                                    
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 15, paddingBottom: 5 }}>
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                            <TouchableOpacity 
                                                key={day} 
                                                style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F4EEFC', marginRight: 8 }, selectedWeeklyDay === day && { backgroundColor: '#8b5cf6' }]}
                                                onPress={() => setSelectedWeeklyDay(day)}
                                            >
                                                <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9A8EBA' }, selectedWeeklyDay === day && { color: '#2D2445' }]}>{day}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#2D2445', marginBottom: 10 }}>Slots for {selectedWeeklyDay}</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                            <TouchableOpacity
                                                onPress={() => setWeeklyPick('start')}
                                                style={styles.timeChip}
                                            >
                                                <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                                                <View style={{ marginLeft: 6 }}>
                                                    <Text style={styles.timeChipLabel}>Start</Text>
                                                    <Text style={styles.timeChipValue}>{formatTime(weeklyStart)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            <Text style={{ color: '#7A6B9C', fontWeight: '800' }}>→</Text>
                                            <TouchableOpacity
                                                onPress={() => setWeeklyPick('end')}
                                                style={styles.timeChip}
                                            >
                                                <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                                                <View style={{ marginLeft: 6 }}>
                                                    <Text style={styles.timeChipLabel}>End</Text>
                                                    <Text style={styles.timeChipValue}>{formatTime(weeklyEnd)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }} onPress={handleAddWeeklySlot}>
                                                <Ionicons name="add" size={22} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                        {weeklyPick && (
                                            <DateTimePicker
                                                value={weeklyPick === 'start' ? weeklyStart : weeklyEnd}
                                                mode="time"
                                                is24Hour={false}
                                                display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                                                onChange={(_e, picked) => {
                                                    const target = weeklyPick;
                                                    setWeeklyPick(null);
                                                    if (!picked) return;
                                                    if (target === 'start') setWeeklyStart(picked);
                                                    else setWeeklyEnd(picked);
                                                }}
                                            />
                                        )}

                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {(weeklyConfig[selectedWeeklyDay] || []).map((slot, index) => (
                                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                                                    <Text style={{ fontSize: 12, color: '#c084fc', fontWeight: '700' }}>{slot}</Text>
                                                    <TouchableOpacity onPress={() => handleRemoveWeeklySlot(slot)}>
                                                        <Ionicons name="close-circle" size={16} color="#fbbf24" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            {(weeklyConfig[selectedWeeklyDay] || []).length === 0 && (
                                                <Text style={{ fontSize: 13, color: '#7A6B9C', fontStyle: 'italic', paddingVertical: 10 }}>No slots configured for this day.</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* 2. MONTHLY FORM */}
                            {currentSlot.scheduleType === 'MONTHLY' && (
                                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                    <Text style={{ fontSize: 13, color: '#9A8EBA', marginBottom: 12, fontWeight: '500' }}>Set which days of the month this service can be reserved:</Text>
                                    
                                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                                        <TextInput 
                                            style={[styles.input, { flex: 1, color: '#2D2445', backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' }]} 
                                            placeholder="Enter day of month (1-31)" 
                                            placeholderTextColor="#64748b"
                                            keyboardType="numeric"
                                            value={monthlyDayInput}
                                            onChangeText={setMonthlyDayInput}
                                        />
                                        <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }} onPress={handleAddMonthlyDay}>
                                            <Ionicons name="calendar-outline" size={20} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 }}>
                                        {monthlyDays.map(day => (
                                            <View key={day} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                                                <Text style={{ fontSize: 12, color: '#c084fc', fontWeight: '700' }}>Every {day}th</Text>
                                                <TouchableOpacity onPress={() => handleRemoveMonthlyDay(day)}>
                                                    <Ionicons name="close-circle" size={16} color="#fbbf24" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>

                                    <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#2D2445', marginBottom: 10 }}>Available Monthly Time Slots</Text>
                                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                            <TouchableOpacity
                                                onPress={() => setMonthlyPick('start')}
                                                style={styles.timeChip}
                                            >
                                                <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                                                <View style={{ marginLeft: 6 }}>
                                                    <Text style={styles.timeChipLabel}>Start</Text>
                                                    <Text style={styles.timeChipValue}>{formatTime(monthlyStart)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            <Text style={{ color: '#7A6B9C', fontWeight: '800' }}>→</Text>
                                            <TouchableOpacity
                                                onPress={() => setMonthlyPick('end')}
                                                style={styles.timeChip}
                                            >
                                                <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                                                <View style={{ marginLeft: 6 }}>
                                                    <Text style={styles.timeChipLabel}>End</Text>
                                                    <Text style={styles.timeChipValue}>{formatTime(monthlyEnd)}</Text>
                                                </View>
                                            </TouchableOpacity>
                                            <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }} onPress={handleAddMonthlySlot}>
                                                <Ionicons name="add" size={22} color="#fff" />
                                            </TouchableOpacity>
                                        </View>
                                        {monthlyPick && (
                                            <DateTimePicker
                                                value={monthlyPick === 'start' ? monthlyStart : monthlyEnd}
                                                mode="time"
                                                is24Hour={false}
                                                display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                                                onChange={(_e, picked) => {
                                                    const target = monthlyPick;
                                                    setMonthlyPick(null);
                                                    if (!picked) return;
                                                    if (target === 'start') setMonthlyStart(picked);
                                                    else setMonthlyEnd(picked);
                                                }}
                                            />
                                        )}

                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {monthlySlots.map((slot, index) => (
                                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                                                    <Text style={{ fontSize: 12, color: '#c084fc', fontWeight: '700' }}>{slot}</Text>
                                                    <TouchableOpacity onPress={() => handleRemoveMonthlySlot(slot)}>
                                                        <Ionicons name="close-circle" size={16} color="#fbbf24" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* 3. CUSTOM CALENDAR FORM */}
                            {currentSlot.scheduleType === 'CUSTOM' && (
                                <View style={{ backgroundColor: '#ffffff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                    <Text style={{ fontSize: 13, color: '#9A8EBA', marginBottom: 12, fontWeight: '500' }}>Configure specific isolated calendar dates and their exact slots:</Text>

                                    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                                        <TextInput 
                                            style={[styles.input, { flex: 1, color: '#2D2445', backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' }]} 
                                            placeholder="Enter Date (YYYY-MM-DD)" 
                                            placeholderTextColor="#64748b"
                                            value={customDateInput}
                                            onChangeText={setCustomDateInput}
                                        />
                                        <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }} onPress={handleAddCustomDate}>
                                            <Ionicons name="checkmark" size={24} color="#fff" />
                                        </TouchableOpacity>
                                    </View>

                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 15, paddingBottom: 5 }}>
                                        {Object.keys(customDatesSlots).map(dateStr => (
                                            <View key={dateStr} style={{ marginRight: 10, flexDirection: 'row', alignItems: 'center' }}>
                                                <TouchableOpacity 
                                                    style={[{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F4EEFC', marginRight: 8 }, selectedCustomDate === dateStr && { backgroundColor: '#8b5cf6' }]}
                                                    onPress={() => setSelectedCustomDate(dateStr)}
                                                >
                                                    <Text style={[{ fontSize: 13, fontWeight: '700', color: '#9A8EBA' }, selectedCustomDate === dateStr && { color: '#2D2445' }]}>{dateStr}</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ marginLeft: -15, zIndex: 10 }} onPress={() => handleRemoveCustomDate(dateStr)}>
                                                    <Ionicons name="close-circle" size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </ScrollView>

                                    {selectedCustomDate ? (
                                        <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                            <Text style={{ fontSize: 14, fontWeight: '800', color: '#2D2445', marginBottom: 10 }}>Slots for {selectedCustomDate}</Text>
                                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                                                <TouchableOpacity
                                                    onPress={() => setCustomPick('start')}
                                                    style={styles.timeChip}
                                                >
                                                    <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                                                    <View style={{ marginLeft: 6 }}>
                                                        <Text style={styles.timeChipLabel}>Start</Text>
                                                        <Text style={styles.timeChipValue}>{formatTime(customStart)}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                <Text style={{ color: '#7A6B9C', fontWeight: '800' }}>→</Text>
                                                <TouchableOpacity
                                                    onPress={() => setCustomPick('end')}
                                                    style={styles.timeChip}
                                                >
                                                    <Ionicons name="time-outline" size={14} color="#8b5cf6" />
                                                    <View style={{ marginLeft: 6 }}>
                                                        <Text style={styles.timeChipLabel}>End</Text>
                                                        <Text style={styles.timeChipValue}>{formatTime(customEnd)}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                                <TouchableOpacity style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' }} onPress={handleAddCustomSlot}>
                                                    <Ionicons name="add" size={22} color="#fff" />
                                                </TouchableOpacity>
                                            </View>
                                            {customPick && (
                                                <DateTimePicker
                                                    value={customPick === 'start' ? customStart : customEnd}
                                                    mode="time"
                                                    is24Hour={false}
                                                    display={Platform.OS === 'ios' ? 'spinner' : 'clock'}
                                                    onChange={(_e, picked) => {
                                                        const target = customPick;
                                                        setCustomPick(null);
                                                        if (!picked) return;
                                                        if (target === 'start') setCustomStart(picked);
                                                        else setCustomEnd(picked);
                                                    }}
                                                />
                                            )}

                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {(customDatesSlots[selectedCustomDate] || []).map((slot, index) => (
                                                    <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                                                        <Text style={{ fontSize: 12, color: '#c084fc', fontWeight: '700' }}>{slot}</Text>
                                                        <TouchableOpacity onPress={() => handleRemoveCustomSlot(slot)}>
                                                            <Ionicons name="close-circle" size={16} color="#fbbf24" />
                                                        </TouchableOpacity>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        <Text style={{ fontSize: 13, color: '#7A6B9C', fontStyle: 'italic', paddingVertical: 10 }}>Add a custom date to build its time slots list.</Text>
                                    )}
                                </View>
                            )}

                            {/* Recurring Booking Option Switch */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                <View style={{ flex: 1, marginRight: 15 }}>
                                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#2D2445', marginBottom: 4 }}>Allow Recurring Bookings</Text>
                                    <Text style={{ fontSize: 12, color: '#7A6B9C', lineHeight: 16 }}>Allows residents to schedule recurring reservations weekly or monthly if a slot fills up or is completed.</Text>
                                </View>
                                <Switch 
                                    value={currentSlot.allowRecurringBookings}
                                    onValueChange={(val) => setCurrentSlot({ ...currentSlot, allowRecurringBookings: val })}
                                    trackColor={{ false: '#334155', true: '#a78bfa' }}
                                    thumbColor={currentSlot.allowRecurringBookings ? '#8b5cf6' : '#94a3b8'}
                                />
                            </View>

                            {/* Advance Booking Window */}
                            <View style={{ marginTop: 16, backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                <Text style={{ fontSize: 14, fontWeight: '800', color: '#2D2445', marginBottom: 4 }}>
                                    Allow Booking In Advance
                                </Text>
                                <Text style={{ fontSize: 12, color: '#7A6B9C', lineHeight: 16, marginBottom: 12 }}>
                                    How many weeks ahead can customers reserve this slot? Customers can pick any
                                    date inside this window from a calendar.
                                </Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {[1, 2, 3, 4, 6, 8, 12].map((wk) => {
                                        const active = currentSlot.advanceBookingWeeks === wk;
                                        return (
                                            <TouchableOpacity
                                                key={wk}
                                                onPress={() => setCurrentSlot({ ...currentSlot, advanceBookingWeeks: wk })}
                                                style={{
                                                    paddingHorizontal: 14,
                                                    paddingVertical: 8,
                                                    borderRadius: 20,
                                                    borderWidth: 1,
                                                    borderColor: active ? '#8b5cf6' : '#D4C9E8',
                                                    backgroundColor: active ? '#8b5cf6' : '#F8F5FF',
                                                }}
                                            >
                                                <Text
                                                    style={{
                                                        fontSize: 12,
                                                        fontWeight: '800',
                                                        color: active ? '#ffffff' : '#7A6B9C',
                                                    }}
                                                >
                                                    {wk === 1 ? '1 week' : `${wk} weeks`}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                        </ScrollView>

                        {/* Save Button */}
                        <TouchableOpacity style={styles.saveSlotBtn} onPress={handleSaveSlot} disabled={slotSavingLoader} activeOpacity={0.85}>
                            {slotSavingLoader ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                                    <Text style={styles.saveSlotBtnText}>Save Booking Slot</Text>
                                </>
                            )}
                        </TouchableOpacity>
                        </View>
                    </Pressable>
                </KeyboardAvoidingView>
            </Modal>
        );
    };

    const renderStep5 = () => {
        const displayCategory = formData.category === 'Others'
            ? (customCategory ? `Others (${customCategory})` : 'Others')
            : (formData.category || 'N/A');

        return (
            <View style={styles.stepContent}>
                <View style={styles.reviewHeader}>
                    <Text style={styles.sectionTitle}>Review Your Business Profile</Text>
                    <TouchableOpacity style={styles.editAllBtn} onPress={() => setStep(1)}>
                        <Feather name="edit-2" size={16} color="#8b5cf6" />
                        <Text style={styles.editAllText}>Edit All</Text>
                    </TouchableOpacity>
                </View>
                <Text style={styles.subText}>Please review all the details below before publishing.</Text>

                {/* Summary Cards */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <View style={styles.summaryIconBox}><Ionicons name="business" size={20} color="#8b5cf6" /></View>
                        <Text style={styles.summaryTitle}>Business Information</Text>
                        <TouchableOpacity onPress={() => setStep(1)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Business Name</Text>
                        <Text style={styles.sumValue}>{formData.businessName || 'N/A'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Category</Text>
                        <Text style={styles.sumValue}>{displayCategory}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Business Type</Text>
                        <Text style={styles.sumValue}>{formData.businessType || 'N/A'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Years in Business</Text>
                        <Text style={styles.sumValue}>{formData.experience || 'N/A'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Description</Text>
                        <Text style={[styles.sumValue, { flex: 1, textAlign: 'right' }]}>{formData.about || 'N/A'}</Text>
                    </View>
                </View>

                <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <View style={styles.summaryIconBox}><FontAwesome5 name="tools" size={16} color="#8b5cf6" /></View>
                        <Text style={styles.summaryTitle}>Services ({formData.services.length})</Text>
                        <TouchableOpacity onPress={() => setStep(2)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                    </View>
                    {formData.services.length === 0 ? (
                        <Text style={[styles.subText, { fontStyle: 'italic', marginBottom: 0 }]}>No services added yet.</Text>
                    ) : (
                        formData.services.map((s, idx) => (
                            <View key={idx} style={styles.sumServiceItem}>
                                <Ionicons name="checkmark-circle" size={18} color="#8b5cf6" />
                                <View style={{ marginLeft: 8, flex: 1 }}>
                                    <Text style={styles.sumServiceText}>{s.name}</Text>
                                    {s.description ? <Text style={styles.sumServiceSub}>{s.description}</Text> : null}
                                    <Text style={[styles.sumServiceSub, { color: '#a78bfa', fontWeight: '600' }]}>
                                        {s.pricingType === 'CONTACT' ? 'Contact for Price' : s.pricingType === 'STARTING' ? `Starting from ₹${s.price}` : `Fixed Price: ₹${s.price}`}
                                        {s.isEmergency ? ' • Emergency Service' : ''}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}
                </View>

                {/* Service Coverage Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <View style={styles.summaryIconBox}><Ionicons name="map" size={18} color="#8b5cf6" /></View>
                        <Text style={styles.summaryTitle}>Service Coverage</Text>
                        <TouchableOpacity onPress={() => setStep(3)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Base Location</Text>
                        <Text style={styles.sumValue}>{formData.area || 'GPS Location'}</Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Reach Mode</Text>
                        <Text style={styles.sumValue}>
                            {reachMode === 'RADIUS' && 'GPS Location Radius'}
                            {reachMode === 'PINCODE' && 'Specific Pincodes'}
                            {reachMode === 'STATE_DISTRICT' && (stateReachType === 'STATE' ? 'Entire State' : 'Specific Districts')}
                            {reachMode === 'PAN_INDIA' && 'Entire India'}
                        </Text>
                    </View>

                    {reachMode === 'RADIUS' && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.sumLabel}>Radius Distance</Text>
                            <Text style={styles.sumValue}>{formData.serviceRadiusKm} km</Text>
                        </View>
                    )}

                    {reachMode === 'PINCODE' && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.sumLabel}>Pincodes Selected</Text>
                            <Text style={[styles.sumValue, { flex: 1, textAlign: 'right' }]}>
                                {formData.serviceAreaValues.length > 0 ? formData.serviceAreaValues.join(', ') : 'None (Defaults to GPS Radius)'}
                            </Text>
                        </View>
                    )}

                    {reachMode === 'STATE_DISTRICT' && (
                        <>
                            <View style={styles.summaryRow}>
                                <Text style={styles.sumLabel}>Selected State</Text>
                                <Text style={styles.sumValue}>{selectedState || 'N/A'}</Text>
                            </View>
                            {stateReachType === 'DISTRICT' && (
                                <View style={styles.summaryRow}>
                                    <Text style={styles.sumLabel}>Districts Selected</Text>
                                    <Text style={[styles.sumValue, { flex: 1, textAlign: 'right' }]}>
                                        {formData.serviceAreaValues.length > 0 ? formData.serviceAreaValues.join(', ') : 'None (Defaults to GPS Radius)'}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    {reachMode === 'PAN_INDIA' && (
                        <View style={styles.summaryRow}>
                            <Text style={styles.sumLabel}>Coverage</Text>
                            <Text style={styles.sumValue}>Pan-India Visibility</Text>
                        </View>
                    )}
                </View>

                {/* Booking Settings Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <View style={styles.summaryIconBox}><Ionicons name="calendar" size={18} color="#8b5cf6" /></View>
                        <Text style={styles.summaryTitle}>Booking Settings</Text>
                        <TouchableOpacity onPress={() => setStep(4)}><Text style={styles.editText}>Edit</Text></TouchableOpacity>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.sumLabel}>Slot Booking</Text>
                        <Text style={styles.sumValue}>{formData.enableBooking ? 'Enabled' : 'Disabled'}</Text>
                    </View>
                    {formData.enableBooking && formData.bookingSlots.length > 0 && (
                        <View style={{ marginTop: 12 }}>
                            <Text style={[styles.sumLabel, { marginBottom: 10 }]}>Active Slots ({formData.bookingSlots.length})</Text>
                            {formData.bookingSlots.map((slot: any, idx: number) => {
                                let daysText = '';
                                try {
                                    const config = typeof slot.scheduleConfig === 'string' 
                                        ? JSON.parse(slot.scheduleConfig) 
                                        : slot.scheduleConfig;
                                    if (config) {
                                        if (slot.scheduleType === 'WEEKLY') {
                                            const reverseMapping: { [key: string]: string } = { 
                                                'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 
                                                'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun' 
                                            };
                                            const days: string[] = [];
                                            Object.keys(config).forEach(k => {
                                                if (config[k] && config[k].length > 0 && reverseMapping[k]) {
                                                    days.push(reverseMapping[k]);
                                                }
                                            });
                                            if (days.length > 0) {
                                                const weekOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                                                days.sort((a, b) => weekOrder.indexOf(a) - weekOrder.indexOf(b));
                                                daysText = days.join(', ');
                                            }
                                        } else if (slot.scheduleType === 'MONTHLY') {
                                            const allowedDays = config.daysOfMonth || [];
                                            daysText = allowedDays.map((d: number) => `Every ${d}th`).join(', ');
                                        } else if (slot.scheduleType === 'CUSTOM') {
                                            daysText = Object.keys(config.dates || {}).join(', ');
                                        }
                                    }
                                } catch (e) {
                                    console.error('Failed to parse schedule config in renderStep5:', e);
                                }

                                const parsed = parseSlotDescription(slot.description);

                                return (
                                    <View key={idx} style={{ backgroundColor: '#ffffff', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#D4C9E8' }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                            {parsed.photoUrl ? (
                                                <Image source={{ uri: parsed.photoUrl }} style={{ width: 40, height: 40, borderRadius: 8, marginRight: 10, resizeMode: 'cover' }} />
                                            ) : (
                                                <View style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: 'rgba(139, 92, 246, 0.1)', marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Ionicons name="time" size={16} color="#8b5cf6" />
                                                </View>
                                            )}
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2D2445' }}>{slot.name}</Text>
                                                    <Text style={{ fontSize: 11, color: '#a78bfa', fontWeight: '600' }}>Cap: {slot.maxPersons}</Text>
                                                </View>
                                                {parsed.text ? (
                                                    <Text style={{ fontSize: 11, color: '#9A8EBA', marginTop: 2 }} numberOfLines={1}>{parsed.text}</Text>
                                                ) : null}
                                            </View>
                                        </View>
                                        
                                        {parsed.rules ? (
                                            <Text style={{ fontSize: 11, color: '#fbbf24', marginBottom: 6 }}>Rules: {parsed.rules}</Text>
                                        ) : null}
                                        
                                        <View style={{ borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 6, marginTop: 4 }}>
                                            <Text style={{ fontSize: 11, color: '#7A6B9C' }}>
                                                Availability: <Text style={{ color: '#2D2445', fontWeight: '600' }}>{daysText || 'None'}</Text>
                                            </Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                                {slot.timeSlots && slot.timeSlots.map((ts: string, sIdx: number) => (
                                                    <View key={sIdx} style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                                                        <Text style={{ fontSize: 10, color: '#c084fc', fontWeight: '600' }}>{ts}</Text>
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    )}
                </View>

                <View style={styles.publishBox}>
                    <View style={styles.publishIconBox}><Ionicons name="send" size={24} color="#8b5cf6" /></View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.publishTitle}>Ready to publish?</Text>
                        <Text style={styles.publishSub}>Once published, your business profile will be visible to the community and customers can contact you.</Text>
                    </View>
                </View>
            </View>
        );
    };

    const handlePublish = async () => {
        setLoading(true);
        try {
            const synced = syncServiceReach();
            
            let finalCategory = formData.category || '';
            if (finalCategory) {
                const cats = finalCategory.split(', ').map(c => c.trim());
                const idx = cats.indexOf('Others');
                if (idx !== -1 && customCategory) {
                    cats[idx] = customCategory;
                }
                finalCategory = cats.join(', ');
            }

            // Include all business details in the payload
            const payload = {
                ...formData,
                category: finalCategory,
                serviceAreaType: synced.serviceAreaType,
                serviceAreaValues: synced.serviceAreaValues,
                pincode: formData.location, // Mapping for backend
                city: formData.area,        // Mapping for backend
                expertise: formData.experience,
                description: formData.about,
                images: formData.logo ? [formData.logo] : [], // Use logo as primary image
                services: formData.services.map((s: any) => ({
                    name: s.name,
                    description: s.description || '',
                    pricingType: s.pricingType || 'TEXT',
                    price: 0,
                    responseTime: s.responseTime || '',
                    isEmergency: false
                })), // Ensure services list is sent
                slots: formData.enableBooking ? formData.bookingSlots.map((s: any) => ({
                    name: s.name,
                    description: s.description || null,
                    maxPersons: s.maxPersons || 1,
                    timeSlots: s.timeSlots || [],
                    scheduleType: s.scheduleType || 'WEEKLY',
                    scheduleConfig: typeof s.scheduleConfig === 'string' ? s.scheduleConfig : JSON.stringify(s.scheduleConfig),
                    allowRecurringBookings: s.allowRecurringBookings || false,
                    advanceBookingWeeks: typeof s.advanceBookingWeeks === 'number' && s.advanceBookingWeeks > 0 ? s.advanceBookingWeeks : 4,
                })) : []
            };

            if (id) {
                await businessApi.updateProfile(id as string, payload);
            } else {
                await businessApi.createProfile(payload);
            }
            Alert.alert('Success', 'Profile published successfully! 🚀');
            router.replace('/business-profiles');
        } catch (error: any) {
            console.error('Publish error:', error);
            const msg = error.response?.data?.message || 'Failed to publish profile. Please check your network and try again.';
            Alert.alert('Error', msg);
        } finally {
            setLoading(false);
        }
    };

    const renderCategoryPickerModal = () => {
        const defaultCategories = [
            'Plumbing', 'Electrical', 'Carpentry', 'Cleaning', 'Pest Control', 
            'Home Renovation', 'Beauty & Salon', 'Personal Training', 'Yoga', 
            'Education', 'Bakery', 'Catering', 'Interior Design', 'Plumber',
            'Electrician', 'Carpenter', 'Cleaner', 'Painter', 'AC Repair',
            'Fashion', 'Jobs', 'Real Estate', 'Tours and Travels', 'Health',
            'Repair Service', 'Electronics and Appliances'
        ];
        
        // Merge base list and db categories
        const merged = Array.from(new Set([
            ...defaultCategories,
            ...(dbCategories || []),
            ...(formData.category && formData.category !== 'Others' ? [formData.category] : [])
        ]));
        
        // Sort and exclude 'Others'
        const sorted = merged.filter(c => c && c !== 'Others').sort((a, b) => a.localeCompare(b));
        const allOptions = [...sorted, 'Others'];

        // Filter based on search query
        const query = categorySearch.toLowerCase().trim();
        const filtered = query
            ? [...allOptions.filter(c => c.toLowerCase().includes(query) && c !== 'Others'), 'Others']
            : allOptions;

        const activeList = formData.category ? formData.category.split(', ').filter(Boolean) : [];

        return (
            <Modal visible={formData.showCategoryModal} transparent animationType="slide">
                <View style={pickerStyles.modalOverlay}>
                    <View style={[pickerStyles.modalContent, { height: '80%' }]}>
                        <View style={pickerStyles.modalHeader}>
                            <Text style={pickerStyles.modalTitle}>Select Categories</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <TouchableOpacity 
                                    style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                                    onPress={() => {
                                        setCategorySearch('');
                                        setFormData({...formData, showCategoryModal: false});
                                    }}
                                >
                                    <Text style={{ color: '#2D2445', fontSize: 13, fontWeight: '700' }}>Done</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => {
                                    setCategorySearch('');
                                    setFormData({...formData, showCategoryModal: false});
                                }}>
                                    <Ionicons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        
                        {/* Search input */}
                        <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 12, paddingHorizontal: 12, height: 48 }}>
                            <Ionicons name="search" size={20} color="#94a3b8" />
                            <TextInput
                                style={{ flex: 1, color: '#2D2445', marginLeft: 8, fontSize: 15 }}
                                placeholder="Search or filter categories..."
                                placeholderTextColor="#94a3b8"
                                value={categorySearch}
                                onChangeText={setCategorySearch}
                            />
                            {categorySearch ? (
                                <TouchableOpacity onPress={() => setCategorySearch('')}>
                                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <ScrollView keyboardShouldPersistTaps="handled">
                            {filtered.map(opt => {
                                const isSelected = activeList.includes(opt);
                                return (
                                    <TouchableOpacity 
                                        key={opt} 
                                        style={pickerStyles.optionItem} 
                                        onPress={() => {
                                            let updated: string[];
                                            if (isSelected) {
                                                updated = activeList.filter(c => c !== opt);
                                            } else {
                                                updated = [...activeList, opt];
                                            }
                                            setFormData({...formData, category: updated.join(', ')});
                                        }}
                                    >
                                        <Text style={[
                                            pickerStyles.optionText, 
                                            isSelected && { color: '#a78bfa', fontWeight: '800' }
                                        ]}>
                                            {opt}
                                        </Text>
                                        <Ionicons 
                                            name={isSelected ? "checkbox" : "square-outline"} 
                                            size={20} 
                                            color={isSelected ? "#3b82f6" : "#64748b"} 
                                        />
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderWorkingHoursModal = () => {
        return (
            <Modal visible={showWorkingHoursModal} transparent animationType="slide">
                <View style={pickerStyles.modalOverlay}>
                    <View style={[pickerStyles.modalContent, { height: '82%' }]}>
                        <View style={pickerStyles.modalHeader}>
                            <Text style={pickerStyles.modalTitle}>Configure Business Hours</Text>
                            <TouchableOpacity onPress={() => setShowWorkingHoursModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
                            {/* Operational Days */}
                            <View style={workingHoursStyles.daysSection}>
                                <Text style={workingHoursStyles.sectionHeader}>Operational Days</Text>
                                
                                <View style={workingHoursStyles.tabBar}>
                                    <TouchableOpacity 
                                        style={[workingHoursStyles.tab, workingHoursDaysType === 'PRESET' && workingHoursStyles.tabActive]}
                                        onPress={() => setWorkingHoursDaysType('PRESET')}
                                    >
                                        <Text style={[workingHoursStyles.tabText, workingHoursDaysType === 'PRESET' && workingHoursStyles.tabTextActive]}>Preset Ranges</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[workingHoursStyles.tab, workingHoursDaysType === 'CUSTOM' && workingHoursStyles.tabActive]}
                                        onPress={() => setWorkingHoursDaysType('CUSTOM')}
                                    >
                                        <Text style={[workingHoursStyles.tabText, workingHoursDaysType === 'CUSTOM' && workingHoursStyles.tabTextActive]}>Custom Days</Text>
                                    </TouchableOpacity>
                                </View>

                                {workingHoursDaysType === 'PRESET' ? (
                                    <View style={workingHoursStyles.presetGrid}>
                                        {['Daily', 'Mon - Fri', 'Mon - Sat', 'Weekends Only'].map(preset => (
                                            <TouchableOpacity
                                                key={preset}
                                                style={[workingHoursStyles.presetItem, selectedPresetDays === preset && workingHoursStyles.presetItemActive]}
                                                onPress={() => setSelectedPresetDays(preset)}
                                            >
                                                <Text style={[workingHoursStyles.presetText, selectedPresetDays === preset && workingHoursStyles.presetTextActive]}>{preset}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                ) : (
                                    <View style={workingHoursStyles.customDaysContainer}>
                                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => {
                                            const isSelected = selectedCustomDays.includes(day);
                                            return (
                                                <TouchableOpacity
                                                    key={day}
                                                    style={[workingHoursStyles.dayCircle, isSelected && workingHoursStyles.dayCircleActive]}
                                                    onPress={() => {
                                                        if (isSelected) {
                                                            setSelectedCustomDays(selectedCustomDays.filter(d => d !== day));
                                                        } else {
                                                            setSelectedCustomDays([...selectedCustomDays, day]);
                                                        }
                                                    }}
                                                >
                                                    <Text style={[workingHoursStyles.dayCircleText, isSelected && workingHoursStyles.dayCircleTextActive]}>
                                                        {day.substring(0, 3)}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>

                            {/* From Time Selector */}
                            <View style={workingHoursStyles.timeSelectSection}>
                                <Text style={workingHoursStyles.timeHeader}>From (Opening Time)</Text>
                                <View style={workingHoursStyles.row}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={workingHoursStyles.scrollContainer}>
                                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                                            <TouchableOpacity 
                                                key={h} 
                                                style={[workingHoursStyles.timeButton, tempFromHour === h && workingHoursStyles.timeButtonActive]}
                                                onPress={() => setTempFromHour(h)}
                                            >
                                                <Text style={[workingHoursStyles.timeButtonText, tempFromHour === h && workingHoursStyles.timeButtonTextActive]}>{h}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={[workingHoursStyles.row, { marginTop: 8 }]}>
                                    {['00', '15', '30', '45'].map(m => (
                                        <TouchableOpacity 
                                            key={m} 
                                            style={[workingHoursStyles.timeButton, { flex: 1 }, tempFromMin === m && workingHoursStyles.timeButtonActive]}
                                            onPress={() => setTempFromMin(m)}
                                        >
                                            <Text style={[workingHoursStyles.timeButtonText, tempFromMin === m && workingHoursStyles.timeButtonTextActive]}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <View style={{ width: 16 }} />
                                    {['AM', 'PM'].map(p => (
                                        <TouchableOpacity 
                                            key={p} 
                                            style={[workingHoursStyles.timeButton, { flex: 1 }, tempFromAmPm === p && workingHoursStyles.timeButtonActive]}
                                            onPress={() => setTempFromAmPm(p)}
                                        >
                                            <Text style={[workingHoursStyles.timeButtonText, tempFromAmPm === p && workingHoursStyles.timeButtonTextActive]}>{p}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* To Time Selector */}
                            <View style={workingHoursStyles.timeSelectSection}>
                                <Text style={workingHoursStyles.timeHeader}>To (Closing Time)</Text>
                                <View style={workingHoursStyles.row}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={workingHoursStyles.scrollContainer}>
                                        {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map(h => (
                                            <TouchableOpacity 
                                                key={h} 
                                                style={[workingHoursStyles.timeButton, tempToHour === h && workingHoursStyles.timeButtonActive]}
                                                onPress={() => setTempToHour(h)}
                                            >
                                                <Text style={[workingHoursStyles.timeButtonText, tempToHour === h && workingHoursStyles.timeButtonTextActive]}>{h}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                                <View style={[workingHoursStyles.row, { marginTop: 8 }]}>
                                    {['00', '15', '30', '45'].map(m => (
                                        <TouchableOpacity 
                                            key={m} 
                                            style={[workingHoursStyles.timeButton, { flex: 1 }, tempToMin === m && workingHoursStyles.timeButtonActive]}
                                            onPress={() => setTempToMin(m)}
                                        >
                                            <Text style={[workingHoursStyles.timeButtonText, tempToMin === m && workingHoursStyles.timeButtonTextActive]}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                    <View style={{ width: 16 }} />
                                    {['AM', 'PM'].map(p => (
                                        <TouchableOpacity 
                                            key={p} 
                                            style={[workingHoursStyles.timeButton, { flex: 1 }, tempToAmPm === p && workingHoursStyles.timeButtonActive]}
                                            onPress={() => setTempToAmPm(p)}
                                        >
                                            <Text style={[workingHoursStyles.timeButtonText, tempToAmPm === p && workingHoursStyles.timeButtonTextActive]}>{p}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={[styles.continueBtn, { marginTop: 12 }]} onPress={saveWorkingHours}>
                            <Text style={styles.continueBtnText}>Apply Business Hours</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderStatePickerModal = () => {
        return (
            <Modal visible={showStateModal} transparent animationType="slide">
                <View style={pickerStyles.modalOverlay}>
                    <View style={[pickerStyles.modalContent, { height: '80%' }]}>
                        <View style={pickerStyles.modalHeader}>
                            <Text style={pickerStyles.modalTitle}>Select Indian State / UT</Text>
                            <TouchableOpacity onPress={() => setShowStateModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {INDIAN_STATES.map(state => (
                                <TouchableOpacity 
                                    key={state} 
                                    style={pickerStyles.optionItem} 
                                    onPress={() => {
                                        setSelectedState(state);
                                        setFormData(prev => ({ ...prev, serviceAreaValues: [] }));
                                        setShowStateModal(false);
                                    }}
                                >
                                    <Text style={[
                                        pickerStyles.optionText, 
                                        selectedState === state && { color: '#a78bfa', fontWeight: '800' }
                                    ]}>
                                        {state}
                                    </Text>
                                    {selectedState === state && (
                                        <Ionicons name="checkmark" size={18} color="#a78bfa" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => {
                        if (showSlotModal) {
                            closeSlotModal();
                            return;
                        }
                        if (isManageSlotsOnly || step === 1) router.back();
                        else prevStep();
                    }}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{isManageSlotsOnly ? 'Manage Booking Slots' : (id ? 'Edit' : 'Create') + ' Business Profile'}</Text>
                    <Text style={styles.headerSub}>{isManageSlotsOnly ? 'Update your service availability and configure slots' : 'Fill in your details to get discovered by your community'}</Text>
                </View>
            </View>

            {renderStepper()}

            <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
                {step === 4 && renderStep4()}
                {step === 5 && renderStep5()}
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.footerInner}>
                    {isManageSlotsOnly ? (
                        <TouchableOpacity 
                            style={[styles.continueBtn, { flex: 1, backgroundColor: '#10b981', shadowColor: '#10b981' }]} 
                            onPress={async () => {
                                setLoading(true);
                                try {
                                    const slotPayload = formData.enableBooking ? formData.bookingSlots.map((s: any) => ({
                                        name: s.name,
                                        description: s.description || null,
                                        maxPersons: s.maxPersons || 1,
                                        timeSlots: s.timeSlots || [],
                                        scheduleType: s.scheduleType || 'WEEKLY',
                                        scheduleConfig: typeof s.scheduleConfig === 'string' ? s.scheduleConfig : JSON.stringify(s.scheduleConfig),
                                        allowRecurringBookings: s.allowRecurringBookings || false
                                    })) : [];
                                    await businessApi.updateProfile(id as string, {
                                        enableBooking: formData.enableBooking,
                                        slots: slotPayload
                                    });
                                    Alert.alert('✅ Saved!', 'Booking slots updated successfully.', [
                                        { text: 'OK', onPress: () => router.back() }
                                    ]);
                                } catch (err: any) {
                                    const msg = err.response?.data?.message || 'Failed to save slots.';
                                    Alert.alert('Error', msg);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : (
                                <>
                                    <Ionicons name="save-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                    <Text style={styles.continueBtnText}>Save & Update Booking Slots</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <>
                            {step > 1 && (
                                <TouchableOpacity style={styles.backBtnFooter} onPress={prevStep}>
                                    <Text style={styles.backBtnText}>Back</Text>
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity 
                                style={[styles.continueBtn, step === 1 && { flex: 1 }]} 
                                onPress={step === 5 ? handlePublish : nextStep}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.continueBtnText}>
                                        {step === 5 ? 'Publish My Business Profile' : 'Save & Continue'}
                                    </Text>
                                )}
                                {step === 5 && !loading && <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 8 }} />}
                            </TouchableOpacity>
                        </>
                    )}
                </View>
                <View style={styles.safetyInfo}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#64748b" />
                    <Text style={styles.safetyText}>Your information is safe and will not be shared without your permission.</Text>
                </View>
            </View>
            {/* Modals for Pickers */}
            {renderCategoryPickerModal()}
            {renderWorkingHoursModal()}
            {renderStatePickerModal()}

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

            {/* Showcase Item Modal */}
            <Modal visible={showServiceModal} transparent animationType="slide">
                <View style={pickerStyles.modalOverlay}>
                    <View style={[pickerStyles.modalContent, { maxHeight: '85%' }]}>
                        <View style={pickerStyles.modalHeader}>
                            <Text style={pickerStyles.modalTitle}>{currentService.id ? 'Edit Showcase Item' : 'Add Showcase Item'}</Text>
                            <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Heading / Title *</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="e.g., Completed Bathroom Makeover, Video Tour" 
                                    placeholderTextColor="#94a3b8"
                                    value={currentService.name}
                                    onChangeText={t => setCurrentService({...currentService, name: t})}
                                />
                            </View>
                            
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Media Type</Text>
                                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                    {[
                                        { label: 'Photo', type: 'IMAGE', icon: 'image-outline' },
                                        { label: 'Video', type: 'VIDEO', icon: 'videocam-outline' },
                                        { label: 'Text Only', type: 'TEXT', icon: 'document-text-outline' },
                                    ].map(item => {
                                        const isSel = currentService.pricingType === item.type;
                                        return (
                                            <TouchableOpacity 
                                                key={item.type}
                                                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: isSel ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: isSel ? '#1d4ed8' : 'rgba(255,255,255,0.05)', borderRadius: 12, paddingVertical: 12, gap: 6 }}
                                                onPress={() => setCurrentService({
                                                    ...currentService,
                                                    pricingType: item.type,
                                                    responseTime: currentService.pricingType === item.type ? currentService.responseTime : ''
                                                })}
                                            >
                                                <Ionicons name={item.icon as any} size={16} color={isSel ? '#3b82f6' : '#64748b'} />
                                                <Text style={{ fontSize: 13, fontWeight: '700', color: isSel ? '#3b82f6' : '#94a3b8' }}>{item.label}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </View>

                            {currentService.pricingType !== 'TEXT' && (
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Upload {currentService.pricingType === 'IMAGE' ? 'Photo' : 'Video'} *</Text>
                                    <TouchableOpacity 
                                        style={{ width: '100%', height: 160, borderRadius: 16, backgroundColor: '#ffffff', borderStyle: 'dashed', borderWidth: 2, borderColor: currentService.responseTime ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
                                        onPress={async () => {
                                            const mediaTypes = currentService.pricingType === 'IMAGE'
                                                ? ImagePicker.MediaTypeOptions.Images
                                                : ImagePicker.MediaTypeOptions.Videos;
                                            const result = await ImagePicker.launchImageLibraryAsync({
                                                mediaTypes,
                                                allowsEditing: true,
                                                quality: 0.7,
                                            });
                                            if (!result.canceled) {
                                                setCurrentService({
                                                    ...currentService,
                                                    responseTime: result.assets[0].uri
                                                });
                                            }
                                        }}
                                    >
                                        {currentService.responseTime ? (
                                            currentService.pricingType === 'IMAGE' ? (
                                                <Image source={{ uri: currentService.responseTime }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                                            ) : (
                                                <View style={{ alignItems: 'center' }}>
                                                    <Ionicons name="play-circle" size={40} color="#10b981" />
                                                    <Text style={{ color: '#10b981', fontSize: 12, fontWeight: '600', marginTop: 8 }}>Video Selected</Text>
                                                    <Text style={{ color: '#7A6B9C', fontSize: 10, marginTop: 2 }}>Tap to change video</Text>
                                                </View>
                                            )
                                        ) : (
                                            <>
                                                <Ionicons name="cloud-upload-outline" size={32} color="#64748b" />
                                                <Text style={{ color: '#9A8EBA', fontSize: 14, fontWeight: '600', marginTop: 8 }}>
                                                    Select {currentService.pricingType === 'IMAGE' ? 'Photo' : 'Video'}
                                                </Text>
                                                <Text style={{ color: '#7A6B9C', fontSize: 11, marginTop: 2 }}>
                                                    Max file size 10MB
                                                </Text>
                                            </>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description</Text>
                                <TextInput 
                                    style={[styles.input, styles.textArea]} 
                                    placeholder="Write a clear, helpful description about this gallery item..." 
                                    placeholderTextColor="#94a3b8"
                                    multiline
                                    value={currentService.description}
                                    onChangeText={t => setCurrentService({...currentService, description: t})}
                                />
                            </View>

                            <TouchableOpacity 
                                style={[styles.continueBtn, { marginTop: 20 }]}
                                onPress={() => {
                                    if (!currentService.name) {
                                        Alert.alert('Error', 'Please enter a heading/title');
                                        return;
                                    }
                                    if (currentService.pricingType !== 'TEXT' && !currentService.responseTime) {
                                        Alert.alert('Error', `Please select a ${currentService.pricingType === 'IMAGE' ? 'photo' : 'video'} to upload.`);
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
                                <Text style={styles.continueBtnText}>Save Gallery Item</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
            
            {/* Slot Modal */}
            {renderSlotModal()}
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
    modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445' },
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
    optionItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    optionText: { fontSize: 16, color: '#2D2445' }
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' }, // Dark theme base
    header: { padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#EFE9F8', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    headerSub: { fontSize: 13, color: '#9A8EBA', marginTop: 2 },

    stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, paddingHorizontal: 40 },
    stepWrapper: { alignItems: 'center', width: 60 },
    stepCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
    stepCircleActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    stepCircleInactive: { backgroundColor: '#F4EEFC', borderColor: '#C4B5DC' },
    stepNumber: { fontSize: 14, fontWeight: '800', color: '#9A8EBA' },
    stepNumberActive: { color: '#2D2445' },
    stepLabel: { fontSize: 10, color: '#7A6B9C', marginTop: 8, fontWeight: '700', textAlign: 'center' },
    stepLabelActive: { color: '#8b5cf6' },
    stepLine: { height: 2, flex: 1, backgroundColor: '#EFE9F8', marginHorizontal: -10, marginTop: -20 },
    stepLineActive: { backgroundColor: '#8b5cf6' },

    stepContent: { padding: 20, backgroundColor: '#F8F5FF' },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#2D2445', marginBottom: 16 },
    subText: { fontSize: 14, color: '#9A8EBA', marginBottom: 20, lineHeight: 20 },

    row: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    logoBox: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#C4B5DC', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' },
    logoImage: { width: '100%', height: '100%', borderRadius: 12 },
    logoText: { fontSize: 12, fontWeight: '700', color: '#2D2445', marginTop: 8 },
    logoSubtext: { fontSize: 8, color: '#7A6B9C', marginTop: 2 },

    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '700', color: '#2D2445', marginBottom: 8 },
    input: { backgroundColor: '#F4EEFC', borderRadius: 12, padding: 14, fontSize: 15, color: '#2D2445', borderWidth: 1, borderColor: '#C4B5DC' },
    inputPlaceholder: { color: '#9A8EBA', fontSize: 15 },
    textArea: { height: 100, textAlignVertical: 'top' },
    charCount: { fontSize: 11, color: '#7A6B9C', textAlign: 'right', marginTop: 4 },

    pickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F4EEFC', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#C4B5DC' },
    pickerIcon: { position: 'absolute', right: 14 },

    contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#C4B5DC' },
    contactInput: { flex: 1, marginLeft: 12, color: '#2D2445', fontSize: 15 },
    valueText: { fontSize: 14, color: '#9A8EBA', marginTop: 2 },

    socialItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', padding: 14, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#C4B5DC' },

    searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', paddingHorizontal: 14, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#C4B5DC' },
    searchInput: { flex: 1, marginLeft: 10, color: '#2D2445' },
    browseAll: { fontSize: 13, color: '#8b5cf6', fontWeight: '700' },

    serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12 },
    serviceTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    reorderBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    reorderText: { fontSize: 13, color: '#7A6B9C' },

    serviceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#C4B5DC' },
    dragHandle: { paddingRight: 8 },
    serviceIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    serviceName: { fontSize: 15, fontWeight: '700', color: '#2D2445' },
    serviceDesc: { fontSize: 13, color: '#9A8EBA', marginTop: 2 },
    iconBtn: { padding: 8 },

    addAnotherBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, backgroundColor: 'rgba(37, 99, 235, 0.05)', borderStyle: 'dashed', borderWidth: 1, borderColor: '#8b5cf6', marginTop: 8 },
    addAnotherText: { fontSize: 15, fontWeight: '700', color: '#8b5cf6', marginLeft: 8 },

    detailsSection: { marginTop: 32, padding: 16, backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#D4C9E8' },
    radioGroup: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    radioItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    radioCircle: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center' },
    radioCircleActive: { borderColor: '#8b5cf6' },
    radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8b5cf6' },
    radioLabel: { fontSize: 13, color: '#2D2445', fontWeight: '500' },

    emergencyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#EFE9F8' },

    searchRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    locationBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 12, borderRadius: 12, height: 48 },
    locationBtnText: { color: '#2D2445', fontSize: 13, fontWeight: '700', marginLeft: 6 },

    mapContainer: { height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 20 },
    mapImage: { width: '100%', height: '100%' },
    mapOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
    mapCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(37, 99, 235, 0.1)', position: 'absolute' },
    mapControls: { position: 'absolute', right: 12, top: 12, backgroundColor: '#fff', borderRadius: 8, padding: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 },
    mapControlBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
    zoomBtn: { padding: 8, alignItems: 'center' },
    zoomLine: { height: 1, backgroundColor: '#EFE9F8' },

    selectedLocCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4EEFC', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#C4B5DC', marginBottom: 24 },
    locIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    locTitle: { fontSize: 15, fontWeight: '700', color: '#2D2445' },
    locSub: { fontSize: 13, color: '#9A8EBA', marginTop: 2 },
    editText: { color: '#8b5cf6', fontSize: 13, fontWeight: '700', marginRight: 4 },

    serviceAreaCard: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#F4EEFC', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#C4B5DC' },
    serviceAreaTitle: { fontSize: 15, fontWeight: '700', color: '#2D2445' },
    serviceAreaSub: { fontSize: 12, color: '#9A8EBA', marginTop: 2 },

    tipBox: { flexDirection: 'row', backgroundColor: 'rgba(37, 99, 235, 0.05)', padding: 16, borderRadius: 12, marginTop: 12, gap: 12 },
    tipText: { flex: 1, fontSize: 13, color: '#8b5cf6', lineHeight: 18 },

    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    editAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    editAllText: { color: '#8b5cf6', fontSize: 14, fontWeight: '700' },

    summaryCard: { padding: 16, backgroundColor: '#F4EEFC', borderRadius: 16, borderWidth: 1, borderColor: '#C4B5DC', marginBottom: 20 },
    summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    summaryIconBox: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    summaryTitle: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '800', color: '#2D2445' },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    sumLabel: { fontSize: 14, color: '#9A8EBA' },
    sumValue: { fontSize: 14, color: '#2D2445', fontWeight: '600' },
    sumServiceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sumServiceText: { fontSize: 14, fontWeight: '700', color: '#2D2445' },
    sumServiceSub: { fontSize: 12, color: '#9A8EBA', marginTop: 2 },

    publishBox: { padding: 20, backgroundColor: 'rgba(37, 99, 235, 0.05)', borderRadius: 16, borderWidth: 1, borderColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center' },
    publishIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(37, 99, 235, 0.1)', alignItems: 'center', justifyContent: 'center' },
    publishTitle: { fontSize: 16, fontWeight: '800', color: '#2D2445' },
    publishSub: { fontSize: 13, color: '#9A8EBA', marginTop: 4, lineHeight: 18 },

    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#F8F5FF', borderTopWidth: 1, borderTopColor: '#D4C9E8' },
    footerInner: { flexDirection: 'row', gap: 12 },
    backBtnFooter: { flex: 0.4, height: 56, borderRadius: 16, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C4B5DC' },
    backBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '700' },
    continueBtn: { flex: 1, height: 56, borderRadius: 16, backgroundColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#1d4ed8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
    continueBtnText: { color: '#2D2445', fontSize: 16, fontWeight: '800' },
    saveSlotBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8b5cf6', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 18, marginTop: 10 },
    saveSlotBtnText: { color: '#2D2445', fontSize: 13, fontWeight: '700', letterSpacing: 0.2 },
    timeChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C4B5DC',
        backgroundColor: '#F4EEFC',
    },
    timeChipLabel: { fontSize: 10, fontWeight: '700', color: '#9A8EBA', textTransform: 'uppercase', letterSpacing: 0.5 },
    timeChipValue: { fontSize: 13, fontWeight: '800', color: '#2D2445' },
    safetyInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
    safetyText: { fontSize: 11, color: '#7A6B9C' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '85%', padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },

    dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    dropdownText: { color: '#2D2445', fontSize: 14 },

    reachTabs: { flexDirection: 'row', backgroundColor: '#F4EEFC', borderRadius: 12, padding: 4 },
    reachTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    reachTabActive: { backgroundColor: '#8b5cf6' },
    reachTabText: { fontSize: 11, fontWeight: '700', color: '#9A8EBA' },
    reachTabTextActive: { color: '#2D2445' },

    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 6 },
    chipText: { color: '#2D2445', fontSize: 12, fontWeight: '700' },

    mapViewContainer: { height: 400, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#EFE9F8', marginBottom: 20, position: 'relative', zIndex: 1 },
    map: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
    mapOverlayHeader: { position: 'absolute', top: 15, left: 15, right: 15, zIndex: 9999 },
    mapSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', height: 48, borderRadius: 12, paddingHorizontal: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 10000 },
    mapSearchInput: { flex: 1, marginLeft: 10, fontSize: 14, color: '#2D2445' },
    mapGpsBtn: { position: 'absolute', right: 15, bottom: 20, backgroundColor: '#fff', width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, zIndex: 100 },
    dropdown: { position: 'absolute', top: 55, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 12, paddingVertical: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5, maxHeight: 200, zIndex: 10001 },
    infoBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(37, 99, 235, 0.05)', padding: 16, borderRadius: 12, marginTop: 16, gap: 12 },
    infoText: { flex: 1, fontSize: 13, color: '#8b5cf6' },
    pickerValue: { fontSize: 15, color: '#2D2445', fontWeight: '500' },
    radiusValueText: { fontSize: 16, fontWeight: '800', color: '#8b5cf6' },
    sliderContainer: { flexDirection: 'row', gap: 10, marginTop: 12 },
    radiusChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#C4B5DC' },
    radiusChipActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    radiusChipText: { fontSize: 13, fontWeight: '700', color: '#9A8EBA' },
    radiusChipTextActive: { color: '#2D2445' },
    reachGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    reachGridItem: { width: '48%', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
    reachGridItemActive: { backgroundColor: 'rgba(29, 78, 216, 0.15)', borderColor: '#8b5cf6' },
    reachGridText: { fontSize: 13, fontWeight: '700', color: '#7A6B9C' },
    reachGridTextActive: { color: '#2D2445' },
    stateSelectBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F4EEFC', borderRadius: 12, paddingHorizontal: 16, height: 48, borderWidth: 1, borderColor: '#C4B5DC' },
    stateSelectBtnText: { color: '#2D2445', fontSize: 15, fontWeight: '600' },
});

const workingHoursStyles = StyleSheet.create({
    daysSection: { marginBottom: 20 },
    sectionHeader: { fontSize: 16, fontWeight: '700', color: '#2D2445', marginBottom: 12 },
    tabBar: { flexDirection: 'row', backgroundColor: '#F4EEFC', borderRadius: 12, padding: 4, marginBottom: 16 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: '#8b5cf6' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#9A8EBA' },
    tabTextActive: { color: '#2D2445' },
    presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    presetItem: { flex: 1, minWidth: '45%', paddingVertical: 14, alignItems: 'center', backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12 },
    presetItemActive: { backgroundColor: 'rgba(29, 78, 216, 0.1)', borderColor: '#8b5cf6' },
    presetText: { fontSize: 14, color: '#9A8EBA', fontWeight: '600' },
    presetTextActive: { color: '#a78bfa', fontWeight: '800' },
    customDaysContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    dayCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center' },
    dayCircleActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
    dayCircleText: { fontSize: 12, fontWeight: '700', color: '#9A8EBA' },
    dayCircleTextActive: { color: '#2D2445' },
    timeSelectSection: { marginBottom: 20, borderTopWidth: 1, borderTopColor: '#EFE9F8', paddingTop: 16 },
    timeHeader: { fontSize: 15, fontWeight: '700', color: '#2D2445', marginBottom: 12 },
    row: { flexDirection: 'row', gap: 8 },
    scrollContainer: { gap: 8, paddingRight: 16 },
    timeButton: { width: 48, height: 40, borderRadius: 10, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center' },
    timeButtonActive: { backgroundColor: 'rgba(29, 78, 216, 0.1)', borderColor: '#8b5cf6' },
    timeButtonText: { fontSize: 14, fontWeight: '600', color: '#9A8EBA' },
    timeButtonTextActive: { color: '#a78bfa', fontWeight: '800' }
});
