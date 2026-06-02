import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Image, Alert, ActivityIndicator, Switch, Dimensions, FlatList, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { businessApi } from '../services/api';
import { storageApi } from '../services/storage';

const { width } = Dimensions.get('window');

// Templates definitions
const TEMPLATES = [
    { id: 'standard', name: 'Standard Layout', icon: 'card-outline' },
    { id: 'modern', name: 'Modern Theme', icon: 'color-palette-outline' },
    { id: 'classic', name: 'Classic Retro', icon: 'ribbon-outline' }
];

export default function BusinessInvoicesScreen() {
    const router = useRouter();
    const { profileId } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'setup' | 'generate' | 'history'>('setup');

    // Profile & WorkingHours JSON State
    const [profile, setProfile] = useState<any>(null);
    const [enableBills, setEnableBills] = useState(false);
    
    // 1. Setup Tab State
    const [invoiceSettings, setInvoiceSettings] = useState({
        logo: null as string | null,
        seal: null as string | null,
        signature: null as string | null,
        businessName: '',
        gstDetails: '',
        gstRate: '18', // Default 18%
        dateTimeFormat: 'YYYY-MM-DD',
        template: 'standard',
        products: [] as Array<{ id: string; name: string; price: number }>
    });

    // 2. Invoices List / History State
    const [invoices, setInvoices] = useState<any[]>([]);

    // Catalog Inputs
    const [newProductName, setNewProductName] = useState('');
    const [newProductPrice, setNewProductPrice] = useState('');

    // 3. Generate Invoice Form State
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [invoiceDate, setInvoiceDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    // Invoice Line Items state
    const [invoiceItems, setInvoiceItems] = useState<Array<{ product: { id: string; name: string; price: number }; quantity: number }>>([]);
    const [selectedCatalogProduct, setSelectedCatalogProduct] = useState<any>(null);
    const [selectedQty, setSelectedQty] = useState(1);
    
    // Ad-hoc line item state
    const [adhocName, setAdhocName] = useState('');
    const [adhocPrice, setAdhocPrice] = useState('');

    // 4. Filters State for History
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);

    // Initial Profile Load
    useEffect(() => {
        if (profileId) {
            loadProfileData();
        }
    }, [profileId]);

    const loadProfileData = async () => {
        setLoading(true);
        try {
            const res = await businessApi.getProfile(profileId as string);
            const pData = res.data;
            setProfile(pData);

            const wh = pData.workingHours;
            if (wh && typeof wh === 'object') {
                setEnableBills((wh as any).enableBills || false);
                setInvoices((wh as any).invoices || []);
                
                const loadedSettings = (wh as any).invoiceSettings || {};
                setInvoiceSettings({
                    logo: loadedSettings.logo || null,
                    seal: loadedSettings.seal || null,
                    signature: loadedSettings.signature || null,
                    businessName: loadedSettings.businessName || pData.businessName || '',
                    gstDetails: loadedSettings.gstDetails || '',
                    gstRate: String(loadedSettings.gstRate || '18'),
                    dateTimeFormat: loadedSettings.dateTimeFormat || 'YYYY-MM-DD',
                    template: loadedSettings.template || 'standard',
                    products: loadedSettings.products || []
                });
            } else {
                // Initialize default invoice settings
                setInvoiceSettings(prev => ({
                    ...prev,
                    businessName: pData.businessName || ''
                }));
            }
            
            // Auto generate invoice ID on load
            setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
        } catch (error) {
            console.error('Failed to load profile for invoices:', error);
            Alert.alert('Error', 'Failed to load business profile data.');
        } finally {
            setLoading(false);
        }
    };

    // Save Billing Settings to Backend
    const handleSaveSettings = async (showFeedback = true) => {
        setSaving(true);
        try {
            const updatedWorkingHours = {
                ...(profile.workingHours || {}),
                enableBills: true, // Force true since we are in manage screen
                invoiceSettings,
                invoices // Preserve historical invoices
            };

            await businessApi.updateProfile(profileId as string, {
                workingHours: updatedWorkingHours
            });
            
            // Sync local profile state
            setProfile((prev: any) => ({ ...prev, workingHours: updatedWorkingHours }));
            if (showFeedback) {
                Alert.alert('Success', 'Invoice settings and catalog updated successfully! 🧾');
            }
        } catch (error) {
            console.error('Failed to save invoice settings:', error);
            Alert.alert('Error', 'Failed to save billing settings.');
        } finally {
            setSaving(false);
        }
    };

    // Photo pick and upload helper
    const handlePickImage = async (field: 'logo' | 'seal' | 'signature') => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Permission to access gallery is required.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: field === 'logo' ? [1, 1] : [2, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const ext = uri.split('.').pop() || 'jpg';
            const name = `${field}_${Date.now()}.${ext}`;
            try {
                setSaving(true);
                const uploadedUrl = await storageApi.uploadFile(uri, name, `image/${ext === 'png' ? 'png' : 'jpeg'}`, 'invoices');
                setInvoiceSettings(prev => ({ ...prev, [field]: uploadedUrl }));
                Alert.alert('Success', `${field.toUpperCase()} uploaded and ready!`);
            } catch (err) {
                console.error('Image upload error:', err);
                Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
            } finally {
                setSaving(false);
            }
        }
    };

    // Product catalog handlers
    const addProductToCatalog = () => {
        if (!newProductName.trim()) {
            Alert.alert('Error', 'Product/Service name is required');
            return;
        }
        const price = parseFloat(newProductPrice);
        if (isNaN(price) || price <= 0) {
            Alert.alert('Error', 'Please enter a valid price');
            return;
        }

        const newProduct = {
            id: `prod_${Date.now()}`,
            name: newProductName.trim(),
            price
        };

        setInvoiceSettings(prev => {
            const updated = { ...prev, products: [...prev.products, newProduct] };
            return updated;
        });

        setNewProductName('');
        setNewProductPrice('');
    };

    const removeProductFromCatalog = (id: string) => {
        setInvoiceSettings(prev => ({
            ...prev,
            products: prev.products.filter(p => p.id !== id)
        }));
    };

    // Dynamic Calculations for Generator Tab
    const summaryCalculations = useMemo(() => {
        let subtotal = 0;
        invoiceItems.forEach(item => {
            subtotal += item.product.price * item.quantity;
        });

        const rate = parseFloat(invoiceSettings.gstRate) || 0;
        const gstAmount = (subtotal * rate) / 100;
        const total = subtotal + gstAmount;

        return { subtotal, gstAmount, total };
    }, [invoiceItems, invoiceSettings.gstRate]);

    const addProductToInvoice = () => {
        if (!selectedCatalogProduct) {
            Alert.alert('Error', 'Please select a product from the catalog');
            return;
        }
        const existingIndex = invoiceItems.findIndex(item => item.product.id === selectedCatalogProduct.id);
        if (existingIndex !== -1) {
            const updated = [...invoiceItems];
            updated[existingIndex].quantity += selectedQty;
            setInvoiceItems(updated);
        } else {
            setInvoiceItems(prev => [...prev, { product: selectedCatalogProduct, quantity: selectedQty }]);
        }
        // Reset selections
        setSelectedCatalogProduct(null);
        setSelectedQty(1);
    };

    const addAdhocProductToInvoice = () => {
        if (!adhocName.trim()) {
            Alert.alert('Error', 'Ad-hoc item name is required');
            return;
        }
        const price = parseFloat(adhocPrice);
        if (isNaN(price) || price <= 0) {
            Alert.alert('Error', 'Please enter a valid price for the item');
            return;
        }

        const customProduct = {
            id: `adhoc_${Date.now()}`,
            name: adhocName.trim(),
            price
        };

        setInvoiceItems(prev => [...prev, { product: customProduct, quantity: 1 }]);
        setAdhocName('');
        setAdhocPrice('');
    };

    const removeInvoiceItem = (index: number) => {
        setInvoiceItems(prev => prev.filter((_, idx) => idx !== index));
    };

    // Escaping helper to mitigate HTML-injection/XSS during PDF rendering
    const escapeHtml = (str: any): string => {
        if (str === undefined || str === null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    // HTML Invoice Template Generator
    const generateHtmlTemplate = (invoiceData: any) => {
        const logoHtml = invoiceSettings.logo ? `<img src="${invoiceSettings.logo}" class="logo" />` : `<div class="placeholder-logo">${escapeHtml(invoiceSettings.businessName.slice(0, 1))}</div>`;
        const sealHtml = invoiceSettings.seal ? `<img src="${invoiceSettings.seal}" class="seal" />` : '';
        const signatureHtml = invoiceSettings.signature ? `<img src="${invoiceSettings.signature}" class="signature" />` : '<div style="height: 40px; border-bottom: 1px dashed #ccc; width: 150px; margin: 0 auto 5px auto;"></div>';

        // Render invoice rows
        const rowsHtml = invoiceData.items.map((item: any, idx: number) => `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${escapeHtml(item.product.name)}</td>
                <td style="text-align: right;">₹${item.product.price.toFixed(2)}</td>
                <td style="text-align: center;">${item.quantity}</td>
                <td style="text-align: right;">₹${(item.product.price * item.quantity).toFixed(2)}</td>
            </tr>
        `).join('');

        const formattedDate = dayjs(invoiceData.date).format(invoiceSettings.dateTimeFormat);

        // Standard CSS
        let css = '';
        let layoutHtml = '';

        if (invoiceSettings.template === 'modern') {
            css = `
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b; margin: 30px; line-height: 1.5; }
                .header-wrapper { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { max-height: 70px; max-width: 140px; object-fit: contain; }
                .placeholder-logo { width: 60px; height: 60px; border-radius: 12px; background: #3b82f6; color: white; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: bold; }
                .title-area { text-align: right; }
                .title { font-size: 28px; font-weight: 800; color: #3b82f6; letter-spacing: 1px; margin: 0; }
                .inv-num { font-size: 14px; color: #64748b; margin-top: 5px; }
                .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
                .card { padding: 15px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; }
                .card-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-bottom: 8px; }
                .card-text { font-size: 13px; font-weight: 500; margin: 3px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .items-table th { background: #3b82f6; color: white; padding: 12px 10px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
                .items-table td { padding: 12px 10px; border-bottom: 1px solid #e2e8f0; font-size: 13px; }
                .summary-container { display: flex; justify-content: space-between; align-items: flex-start; margin-top: 20px; }
                .seal-box { text-align: center; width: 160px; }
                .seal { max-height: 75px; max-width: 120px; }
                .totals-box { width: 260px; }
                .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
                .grand-total { font-size: 16px; font-weight: bold; color: #3b82f6; border-bottom: none; border-top: 2px solid #3b82f6; padding-top: 10px; }
                .sign-box { text-align: center; margin-top: 40px; display: flex; flex-direction: column; align-items: center; float: right; width: 180px; }
                .signature { max-height: 50px; max-width: 120px; margin-bottom: 5px; }
                .footer { text-align: center; margin-top: 60px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 15px; }
            `;
            layoutHtml = `
                <div class="header-wrapper">
                    <div>${logoHtml}</div>
                    <div class="title-area">
                        <div class="title">INVOICE</div>
                        <div class="inv-num">Number: <b>#${escapeHtml(invoiceData.id)}</b></div>
                        <div class="inv-num">Date: ${escapeHtml(formattedDate)}</div>
                    </div>
                </div>
                <div class="details-grid">
                    <div class="card">
                        <div class="card-title">From (Merchant)</div>
                        <div class="card-text"><b>${escapeHtml(invoiceSettings.businessName)}</b></div>
                        ${invoiceSettings.gstDetails ? `<div class="card-text">GSTIN: ${escapeHtml(invoiceSettings.gstDetails)}</div>` : ''}
                    </div>
                    <div class="card">
                        <div class="card-title">Billed To (Client)</div>
                        <div class="card-text">Name: <b>${escapeHtml(invoiceData.clientName)}</b></div>
                        ${invoiceData.clientEmail ? `<div class="card-text">Email: ${escapeHtml(invoiceData.clientEmail)}</div>` : ''}
                        ${invoiceData.clientPhone ? `<div class="card-text">Phone: ${escapeHtml(invoiceData.clientPhone)}</div>` : ''}
                    </div>
                </div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">Sl No.</th>
                            <th style="text-align: left;">Item Description</th>
                            <th style="width: 18%; text-align: right;">Unit Price</th>
                            <th style="width: 12%; text-align: center;">Qty</th>
                            <th style="width: 20%; text-align: right;">Total Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <div class="summary-container">
                    <div class="seal-box">
                        ${sealHtml ? `<div><b>Official Seal</b></div><div style="margin-top: 5px;">${sealHtml}</div>` : ''}
                    </div>
                    <div class="totals-box">
                        <div class="totals-row">
                            <span>Subtotal:</span>
                            <span>₹${invoiceData.subtotal.toFixed(2)}</span>
                        </div>
                        <div class="totals-row">
                            <span>Tax (GST ${invoiceSettings.gstRate}%):</span>
                            <span>₹${invoiceData.gstAmount.toFixed(2)}</span>
                        </div>
                        <div class="totals-row grand-total">
                            <span>Grand Total:</span>
                            <span>₹${invoiceData.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
                <div class="sign-box">
                    <div>${signatureHtml}</div>
                    <div style="font-size: 12px; font-weight: bold; color: #475569;">Authorized Signature</div>
                </div>
                <div style="clear: both;"></div>
                <div class="footer">
                    Generated via Resido platform. Thank you for your business!
                </div>
            `;
        } else if (invoiceSettings.template === 'classic') {
            css = `
                body { font-family: 'Times New Roman', Times, serif; color: #000; margin: 40px; line-height: 1.4; }
                .header-classic { text-align: center; margin-bottom: 25px; }
                .logo { max-height: 60px; max-width: 120px; margin-bottom: 8px; }
                .placeholder-logo { display: none; }
                .title-classic { font-size: 26px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; border-bottom: 3px double #000; padding-bottom: 5px; margin-top: 5px; }
                .double-divider { border-top: 3px double #000; margin: 15px 0; }
                .info-table { width: 100%; font-size: 13px; margin-bottom: 20px; }
                .info-table td { padding: 4px 0; vertical-align: top; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 25px; }
                .items-table th { border-top: 2px solid #000; border-bottom: 2px solid #000; padding: 8px 5px; font-size: 12px; text-transform: uppercase; font-weight: bold; }
                .items-table td { padding: 8px 5px; border-bottom: 1px dashed #777; font-size: 13px; }
                .seal-sig-row { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
                .seal-area { text-align: center; border: 1px solid #333; padding: 10px; width: 140px; height: 90px; border-radius: 4px; font-size: 11px; }
                .seal { max-height: 60px; max-width: 100px; }
                .signature-area { text-align: center; width: 180px; }
                .signature { max-height: 45px; max-width: 110px; }
                .totals-box { width: 240px; margin-left: auto; font-size: 13px; border-top: 2px solid #000; padding-top: 8px; }
                .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
                .grand-total { font-weight: bold; border-top: 1px solid #000; border-bottom: 2px solid #000; padding: 6px 0; font-size: 14px; }
                .footer { text-align: center; font-size: 11px; font-style: italic; margin-top: 50px; border-top: 1px solid #000; padding-top: 10px; }
            `;
            layoutHtml = `
                <div class="header-classic">
                    ${logoHtml ? `<div>${logoHtml}</div>` : ''}
                    <div style="font-size: 20px; font-weight: bold;">${escapeHtml(invoiceSettings.businessName)}</div>
                    ${invoiceSettings.gstDetails ? `<div style="font-size: 12px;">GSTIN: ${escapeHtml(invoiceSettings.gstDetails)}</div>` : ''}
                    <div class="title-classic">BILL / INVOICE</div>
                </div>
                <table class="info-table">
                    <tr>
                        <td style="width: 50%;">
                            <b>INVOICE TO:</b><br/>
                            Name: ${escapeHtml(invoiceData.clientName)}<br/>
                            ${invoiceData.clientEmail ? `Email: ${escapeHtml(invoiceData.clientEmail)}<br/>` : ''}
                            ${invoiceData.clientPhone ? `Phone: ${escapeHtml(invoiceData.clientPhone)}` : ''}
                        </td>
                        <td style="width: 50%; text-align: right;">
                            <b>INVOICE DETAILS:</b><br/>
                            Invoice No: #${escapeHtml(invoiceData.id)}<br/>
                            Date: ${escapeHtml(formattedDate)}<br/>
                            Currency: INR (₹)
                        </td>
                    </tr>
                </table>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">S.No</th>
                            <th style="text-align: left;">Description of Goods / Services</th>
                            <th style="width: 18%; text-align: right;">Rate (₹)</th>
                            <th style="width: 12%; text-align: center;">Qty</th>
                            <th style="width: 20%; text-align: right;">Amount (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <div class="totals-box">
                    <div class="totals-row">
                        <span>Subtotal:</span>
                        <span>₹${invoiceData.subtotal.toFixed(2)}</span>
                    </div>
                    <div class="totals-row">
                        <span>GST (${invoiceSettings.gstRate}%):</span>
                        <span>₹${invoiceData.gstAmount.toFixed(2)}</span>
                    </div>
                    <div class="totals-row grand-total">
                        <span>Net Payable:</span>
                        <span>₹${invoiceData.total.toFixed(2)}</span>
                    </div>
                </div>
                <div class="seal-sig-row">
                    <div class="seal-area">
                        ${sealHtml ? `<div><b>OFFICIAL SEAL</b></div><div style="margin-top: 5px;">${sealHtml}</div>` : '<div>STAMP & SEAL AREA</div>'}
                    </div>
                    <div class="signature-area">
                        <div>${signatureHtml}</div>
                        <div style="font-size: 11px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 5px;">AUTHORISED SIGNATORY</div>
                    </div>
                </div>
                <div class="footer">
                    Thank you. We value your collaboration!
                </div>
            `;
        } else {
            // Standard / default Layout
            css = `
                body { font-family: Arial, sans-serif; color: #333; margin: 30px; line-height: 1.4; }
                .logo { max-height: 60px; max-width: 120px; object-fit: contain; }
                .placeholder-logo { width: 50px; height: 50px; background: #475569; color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
                .grid { display: table; width: 100%; table-layout: fixed; margin-bottom: 25px; }
                .col { display: table-cell; vertical-align: top; }
                .invoice-title { font-size: 24px; font-weight: bold; text-align: right; color: #333; margin: 0; }
                .divider { border-top: 2px solid #ccc; margin: 15px 0; }
                .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .items-table th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 10px; font-size: 12px; font-weight: bold; text-align: left; }
                .items-table td { border: 1px solid #d1d5db; padding: 10px; font-size: 13px; }
                .summary-table { width: 280px; margin-left: auto; margin-top: 20px; border-collapse: collapse; }
                .summary-table td { padding: 6px; font-size: 13px; }
                .grand-total-row { font-weight: bold; background: #f3f4f6; border-top: 1px solid #333; border-bottom: 1px solid #333; }
                .graphics-row { display: flex; justify-content: space-between; margin-top: 35px; align-items: flex-end; }
                .seal { max-height: 60px; max-width: 100px; }
                .signature { max-height: 45px; max-width: 110px; }
                .sign-label { font-size: 11px; font-weight: bold; text-align: center; border-top: 1px solid #999; margin-top: 5px; width: 150px; }
                .footer { text-align: center; margin-top: 50px; font-size: 11px; color: #777; border-top: 1px solid #eee; padding-top: 10px; }
            `;
            layoutHtml = `
                <div class="grid">
                    <div class="col" style="width: 50%;">${logoHtml}</div>
                    <div class="col" style="width: 50%; text-align: right;">
                        <div class="invoice-title">INVOICE</div>
                        <div style="font-size: 13px; color: #555; margin-top: 5px;">
                            Invoice Ref: <b>#${escapeHtml(invoiceData.id)}</b><br/>
                            Date of Issue: ${escapeHtml(formattedDate)}
                        </div>
                    </div>
                </div>
                <div class="divider"></div>
                <div class="grid">
                    <div class="col" style="width: 50%;">
                        <div style="font-size: 12px; font-weight: bold; color: #555; text-transform: uppercase;">Sender (Provider)</div>
                        <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">${escapeHtml(invoiceSettings.businessName)}</div>
                        ${invoiceSettings.gstDetails ? `<div style="font-size: 13px; margin-top: 2px;">GSTIN: ${escapeHtml(invoiceSettings.gstDetails)}</div>` : ''}
                    </div>
                    <div class="col" style="width: 50%;">
                        <div style="font-size: 12px; font-weight: bold; color: #555; text-transform: uppercase;">Recipient (Client)</div>
                        <div style="font-size: 14px; font-weight: bold; margin-top: 5px;">${escapeHtml(invoiceData.clientName)}</div>
                        ${invoiceData.clientEmail ? `<div style="font-size: 13px; margin-top: 2px;">Email: ${escapeHtml(invoiceData.clientEmail)}</div>` : ''}
                        ${invoiceData.clientPhone ? `<div style="font-size: 13px; margin-top: 2px;">Phone: ${escapeHtml(invoiceData.clientPhone)}</div>` : ''}
                    </div>
                </div>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th style="width: 8%; text-align: center;">No.</th>
                            <th>Description</th>
                            <th style="width: 18%; text-align: right;">Price</th>
                            <th style="width: 12%; text-align: center;">Qty</th>
                            <th style="width: 20%; text-align: right;">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
                <table class="summary-table">
                    <tr>
                        <td>Subtotal:</td>
                        <td style="text-align: right;">₹${invoiceData.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Tax (GST ${invoiceSettings.gstRate}%):</td>
                        <td style="text-align: right;">₹${invoiceData.gstAmount.toFixed(2)}</td>
                    </tr>
                    <tr class="grand-total-row">
                        <td><b>Total Due:</b></td>
                        <td style="text-align: right;"><b>₹${invoiceData.total.toFixed(2)}</b></td>
                    </tr>
                </table>
                <div class="graphics-row">
                    <div>
                        ${sealHtml ? `<div style="font-size: 11px; margin-bottom: 4px; font-weight: bold; color: #555;">Stamp/Seal:</div><div>${sealHtml}</div>` : ''}
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <div>${signatureHtml}</div>
                        <div class="sign-label">Authorized Signature</div>
                    </div>
                </div>
                <div class="footer">
                    Thank you for choosing ${escapeHtml(invoiceSettings.businessName)}. This is a computer generated invoice.
                </div>
            `;
        }

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>${css}</style>
            </head>
            <body>
                ${layoutHtml}
            </body>
            </html>
        `;
    };

    // Generate PDF & Share Action
    const handleGenerateInvoice = async () => {
        if (!clientName.trim()) {
            Alert.alert('Validation Error', 'Client name is required.');
            return;
        }
        if (invoiceItems.length === 0) {
            Alert.alert('Validation Error', 'Please add at least one item to the invoice.');
            return;
        }
        if (!invoiceNumber.trim()) {
            Alert.alert('Validation Error', 'Invoice reference number is required.');
            return;
        }

        // Check if invoice ID is already taken
        const conflict = invoices.find(inv => inv.id.toLowerCase() === invoiceNumber.trim().toLowerCase());
        if (conflict) {
            Alert.alert('Conflict Error', 'An invoice with this ID already exists. Please choose a unique Invoice ID.');
            return;
        }

        setSaving(true);
        try {
            const invoiceData = {
                id: invoiceNumber.trim(),
                date: invoiceDate.toISOString(),
                clientName: clientName.trim(),
                clientEmail: clientEmail.trim(),
                clientPhone: clientPhone.trim(),
                items: invoiceItems,
                subtotal: summaryCalculations.subtotal,
                gstAmount: summaryCalculations.gstAmount,
                total: summaryCalculations.total,
                template: invoiceSettings.template
            };

            // Build HTML
            const html = generateHtmlTemplate(invoiceData);

            // Print HTML to local PDF file
            const { uri } = await Print.printToFileAsync({ html });
            console.log('PDF rendered successfully at:', uri);

            // Upload PDF to S3 using storageApi
            // Let's create a predictable name for the pdf file
            const pdfFileName = `inv_${invoiceNumber.trim()}_${Date.now()}.pdf`;
            let remotePdfUrl = '';
            try {
                remotePdfUrl = await storageApi.uploadFile(uri, pdfFileName, 'application/pdf', 'invoices') as string;
            } catch (uploadErr) {
                console.warn('Could not upload invoice PDF to remote server. Using local uri as fallback:', uploadErr);
                remotePdfUrl = uri;
            }

            // Create final record containing remote URL
            const invoiceRecord = {
                ...invoiceData,
                pdfUri: remotePdfUrl
            };

            // Update local state and DB payload
            const updatedInvoices = [invoiceRecord, ...invoices];
            const updatedWorkingHours = {
                ...(profile.workingHours || {}),
                enableBills: true,
                invoiceSettings,
                invoices: updatedInvoices
            };

            await businessApi.updateProfile(profileId as string, {
                workingHours: updatedWorkingHours
            });

            setInvoices(updatedInvoices);
            setProfile((prev: any) => ({ ...prev, workingHours: updatedWorkingHours }));

            Alert.alert('✅ Invoice Generated!', 'PDF bill created successfully.', [
                {
                    text: 'Share Invoice',
                    onPress: async () => {
                        try {
                            await Sharing.shareAsync(uri);
                        } catch (shareErr) {
                            Alert.alert('Error', 'Failed to share file.');
                        }
                    }
                },
                { text: 'Close' }
            ]);

            // Reset form details
            setClientName('');
            setClientEmail('');
            setClientPhone('');
            setInvoiceItems([]);
            setInvoiceNumber(`INV-${Date.now().toString().slice(-6)}`);
            setActiveTab('history');

        } catch (error) {
            console.error('Invoice generation failed:', error);
            Alert.alert('Error', 'Failed to generate invoice PDF.');
        } finally {
            setSaving(false);
        }
    };

    // Shared Re-Print/Re-Share Action for history
    const handleShareInvoice = async (invoiceRecord: any) => {
        try {
            setSaving(true);
            const html = generateHtmlTemplate(invoiceRecord);
            const { uri } = await Print.printToFileAsync({ html });
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error('Failed to share invoice:', error);
            Alert.alert('Error', 'Failed to render/share invoice.');
        } finally {
            setSaving(false);
        }
    };

    // Invoice History Filtering
    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            // Search Query Filter
            const matchesSearch = 
                inv.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.clientEmail && inv.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()));

            // Date Range Filter
            let matchesDates = true;
            const invDateObj = dayjs(inv.date);

            if (startDate) {
                // Beginning of start date
                const startLimit = dayjs(startDate).startOf('day');
                if (invDateObj.isBefore(startLimit)) matchesDates = false;
            }
            if (endDate) {
                // End of end date
                const endLimit = dayjs(endDate).endOf('day');
                if (invDateObj.isAfter(endLimit)) matchesDates = false;
            }

            return matchesSearch && matchesDates;
        });
    }, [invoices, searchQuery, startDate, endDate]);

    if (loading) {
        return (
            <SafeAreaView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading Billing Details...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#2D2445" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle}>Bills & Invoices</Text>
                    <Text style={styles.headerSub}>{escapeHtml(profile?.businessName)}</Text>
                </View>
                {saving && <ActivityIndicator size="small" color="#10b981" style={{ marginRight: 8 }} />}
            </View>

            {/* Segment Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'setup' && styles.tabBtnActive]} 
                    onPress={() => setActiveTab('setup')}
                >
                    <Ionicons name="settings-outline" size={16} color={activeTab === 'setup' ? '#fff' : '#7A6B9C'} />
                    <Text style={[styles.tabText, activeTab === 'setup' && styles.tabTextActive]}>Setup & Catalog</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'generate' && styles.tabBtnActive]} 
                    onPress={() => setActiveTab('generate')}
                >
                    <Ionicons name="add-circle-outline" size={16} color={activeTab === 'generate' ? '#fff' : '#7A6B9C'} />
                    <Text style={[styles.tabText, activeTab === 'generate' && styles.tabTextActive]}>New Bill</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]} 
                    onPress={() => setActiveTab('history')}
                >
                    <Ionicons name="list-outline" size={16} color={activeTab === 'history' ? '#fff' : '#7A6B9C'} />
                    <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>History</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                {/* ──────────────────────────────────────────────────────── */}
                {/* TAB 1: SETUP & CATALOG                                   */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'setup' && (
                    <View style={styles.tabContent}>
                        {/* Company Details */}
                        <Text style={styles.sectionTitle}>Invoice Graphics & Credentials</Text>
                        
                        {/* Graphic Uploads row */}
                        <View style={styles.graphicsRow}>
                            <TouchableOpacity style={styles.graphicBox} onPress={() => handlePickImage('logo')}>
                                {invoiceSettings.logo ? (
                                    <Image source={{ uri: invoiceSettings.logo }} style={styles.graphicImage as any} />
                                ) : (
                                    <View style={styles.graphicPlaceholder}>
                                        <Ionicons name="image-outline" size={24} color="#10b981" />
                                        <Text style={styles.graphicLabel}>Add Logo</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.graphicBox} onPress={() => handlePickImage('seal')}>
                                {invoiceSettings.seal ? (
                                    <Image source={{ uri: invoiceSettings.seal }} style={styles.graphicImage as any} />
                                ) : (
                                    <View style={styles.graphicPlaceholder}>
                                        <Ionicons name="shield-checkmark-outline" size={24} color="#10b981" />
                                        <Text style={styles.graphicLabel}>Add Seal</Text>
                                    </View>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.graphicBox} onPress={() => handlePickImage('signature')}>
                                {invoiceSettings.signature ? (
                                    <Image source={{ uri: invoiceSettings.signature }} style={styles.graphicImage as any} />
                                ) : (
                                    <View style={styles.graphicPlaceholder}>
                                        <Ionicons name="create-outline" size={24} color="#10b981" />
                                        <Text style={styles.graphicLabel}>Signature</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Text Settings */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Company/Business Name on Bills</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Enter corporate name" 
                                placeholderTextColor="#94a3b8"
                                value={invoiceSettings.businessName}
                                onChangeText={t => setInvoiceSettings({ ...invoiceSettings, businessName: t })}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 2, marginRight: 12 }]}>
                                <Text style={styles.label}>GSTIN / Tax details</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="e.g. 29AAAAA1111A1Z1" 
                                    placeholderTextColor="#94a3b8"
                                    value={invoiceSettings.gstDetails}
                                    onChangeText={t => setInvoiceSettings({ ...invoiceSettings, gstDetails: t })}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>GST Rate (%)</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="18" 
                                    keyboardType="numeric"
                                    placeholderTextColor="#94a3b8"
                                    value={invoiceSettings.gstRate}
                                    onChangeText={t => setInvoiceSettings({ ...invoiceSettings, gstRate: t })}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Date Display Format</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="e.g. YYYY-MM-DD or DD MMM YYYY" 
                                placeholderTextColor="#94a3b8"
                                value={invoiceSettings.dateTimeFormat}
                                onChangeText={t => setInvoiceSettings({ ...invoiceSettings, dateTimeFormat: t })}
                            />
                        </View>

                        {/* Invoice Templates */}
                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Invoice Template Style</Text>
                        <View style={styles.templatesRow}>
                            {TEMPLATES.map(tpl => (
                                <TouchableOpacity 
                                    key={tpl.id}
                                    style={[
                                        styles.templateCard, 
                                        invoiceSettings.template === tpl.id && styles.templateCardActive
                                    ]}
                                    onPress={() => setInvoiceSettings({ ...invoiceSettings, template: tpl.id })}
                                >
                                    <Ionicons 
                                        name={tpl.icon as any} 
                                        size={20} 
                                        color={invoiceSettings.template === tpl.id ? '#10b981' : '#7A6B9C'} 
                                    />
                                    <Text style={[
                                        styles.templateCardText, 
                                        invoiceSettings.template === tpl.id && styles.templateCardTextActive
                                    ]}>{tpl.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Products Catalog section */}
                        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Products & Services Catalog</Text>
                        <View style={styles.catalogForm}>
                            <TextInput
                                style={[styles.input, { marginBottom: 8 }]}
                                placeholder="Item / Service Name"
                                placeholderTextColor="#94a3b8"
                                value={newProductName}
                                onChangeText={setNewProductName}
                            />
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Price (₹)"
                                    keyboardType="numeric"
                                    placeholderTextColor="#94a3b8"
                                    value={newProductPrice}
                                    onChangeText={setNewProductPrice}
                                />
                                <TouchableOpacity style={styles.addCatalogBtn} onPress={addProductToCatalog}>
                                    <Ionicons name="add" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {invoiceSettings.products.length === 0 ? (
                            <View style={styles.emptyCatalogCard}>
                                <Text style={styles.emptyCatalogText}>Catalog is empty. Add products above to easily select them during billing.</Text>
                            </View>
                        ) : (
                            <View style={styles.catalogList}>
                                {invoiceSettings.products.map(prod => (
                                    <View key={prod.id} style={styles.catalogItem}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.catalogItemName}>{prod.name}</Text>
                                            <Text style={styles.catalogItemPrice}>₹{prod.price.toFixed(2)}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => removeProductFromCatalog(prod.id)} style={styles.catalogItemDelete}>
                                            <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.saveBtn} 
                            onPress={() => handleSaveSettings(true)}
                            disabled={saving}
                        >
                            <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Configuration & Catalog'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* TAB 2: GENERATE BILL                                     */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'generate' && (
                    <View style={styles.tabContent}>
                        <Text style={styles.sectionTitle}>Client Billing Details</Text>
                        
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Invoice / Reference Number *</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="INV-1002" 
                                placeholderTextColor="#94a3b8"
                                value={invoiceNumber}
                                onChangeText={setInvoiceNumber}
                            />
                        </View>

                        <View style={styles.inputRow}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                                <Text style={styles.label}>Client Name *</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Resident/Customer name" 
                                    placeholderTextColor="#94a3b8"
                                    value={clientName}
                                    onChangeText={setClientName}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Client Phone</Text>
                                <TextInput 
                                    style={styles.input} 
                                    placeholder="Mobile number" 
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#94a3b8"
                                    value={clientPhone}
                                    onChangeText={setClientPhone}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Client Email</Text>
                            <TextInput 
                                style={styles.input} 
                                placeholder="billing@domain.com" 
                                keyboardType="email-address"
                                autoCapitalize="none"
                                placeholderTextColor="#94a3b8"
                                value={clientEmail}
                                onChangeText={setClientEmail}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Invoice Date</Text>
                            <TouchableOpacity style={styles.datePickerToggle} onPress={() => setShowDatePicker(true)}>
                                <Ionicons name="calendar-outline" size={18} color="#10b981" style={{ marginRight: 8 }} />
                                <Text style={{ color: '#2D2445', fontWeight: '500' }}>{dayjs(invoiceDate).format(invoiceSettings.dateTimeFormat)}</Text>
                            </TouchableOpacity>
                            {showDatePicker && (
                                <DateTimePicker
                                    value={invoiceDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event, selectedDate) => {
                                        setShowDatePicker(false);
                                        if (selectedDate) setInvoiceDate(selectedDate);
                                    }}
                                />
                            )}
                        </View>

                        {/* Items Addition Block */}
                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Add Items / Services to Bill</Text>
                        
                        {invoiceSettings.products.length > 0 && (
                            <View style={styles.itemAddBlock}>
                                <Text style={styles.label}>Select Catalog Product</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                    {invoiceSettings.products.map(prod => (
                                        <TouchableOpacity 
                                            key={prod.id} 
                                            style={[
                                                styles.catalogSelectChip, 
                                                selectedCatalogProduct?.id === prod.id && styles.catalogSelectChipActive
                                            ]}
                                            onPress={() => setSelectedCatalogProduct(prod)}
                                        >
                                            <Text style={[
                                                styles.catalogSelectChipText, 
                                                selectedCatalogProduct?.id === prod.id && styles.catalogSelectChipTextActive
                                            ]}>{prod.name} (₹{prod.price})</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <Text style={[styles.label, { marginRight: 8 }]}>Quantity:</Text>
                                    <TouchableOpacity 
                                        style={styles.qtyBtn} 
                                        onPress={() => setSelectedQty(prev => Math.max(1, prev - 1))}
                                    >
                                        <Ionicons name="remove" size={18} color="#2D2445" />
                                    </TouchableOpacity>
                                    <Text style={styles.qtyVal}>{selectedQty}</Text>
                                    <TouchableOpacity 
                                        style={styles.qtyBtn} 
                                        onPress={() => setSelectedQty(prev => prev + 1)}
                                    >
                                        <Ionicons name="add" size={18} color="#2D2445" />
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity style={styles.addItemBtn} onPress={addProductToInvoice}>
                                        <Text style={styles.addItemBtnText}>Add Item</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Quick Ad-hoc item entry */}
                        <View style={[styles.itemAddBlock, { marginTop: 12 }]}>
                            <Text style={styles.label}>Quick Custom (Ad-hoc) Item</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                <TextInput
                                    style={[styles.input, { flex: 2 }]}
                                    placeholder="Item name"
                                    placeholderTextColor="#94a3b8"
                                    value={adhocName}
                                    onChangeText={setAdhocName}
                                />
                                <TextInput
                                    style={[styles.input, { flex: 1 }]}
                                    placeholder="Price"
                                    keyboardType="numeric"
                                    placeholderTextColor="#94a3b8"
                                    value={adhocPrice}
                                    onChangeText={setAdhocPrice}
                                />
                                <TouchableOpacity style={styles.addAdhocBtn} onPress={addAdhocProductToInvoice}>
                                    <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Current Invoice Table / List */}
                        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Bill Summary Table</Text>
                        {invoiceItems.length === 0 ? (
                            <View style={styles.emptyTableCard}>
                                <Ionicons name="receipt-outline" size={32} color="#94a3b8" />
                                <Text style={styles.emptyTableText}>No items added to bill yet.</Text>
                            </View>
                        ) : (
                            <View style={styles.invoiceTable}>
                                {invoiceItems.map((item, idx) => (
                                    <View key={idx} style={styles.invoiceRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.invoiceItemName}>{item.product.name}</Text>
                                            <Text style={styles.invoiceItemSub}>₹{item.product.price.toFixed(2)} x {item.quantity}</Text>
                                        </View>
                                        <Text style={styles.invoiceItemTotal}>₹{(item.product.price * item.quantity).toFixed(2)}</Text>
                                        <TouchableOpacity onPress={() => removeInvoiceItem(idx)} style={styles.itemRemoveBtn}>
                                            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {/* Calc totals */}
                                <View style={styles.totalsSection}>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>Subtotal:</Text>
                                        <Text style={styles.totalVal}>₹{summaryCalculations.subtotal.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.totalRow}>
                                        <Text style={styles.totalLabel}>GST ({invoiceSettings.gstRate}%):</Text>
                                        <Text style={styles.totalVal}>₹{summaryCalculations.gstAmount.toFixed(2)}</Text>
                                    </View>
                                    <View style={[styles.totalRow, styles.grandTotalRow]}>
                                        <Text style={[styles.totalLabel, { fontWeight: '800' }]}>Grand Total:</Text>
                                        <Text style={[styles.totalVal, { fontWeight: '800', color: '#10b981' }]}>₹{summaryCalculations.total.toFixed(2)}</Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity 
                            style={styles.generateBtn}
                            onPress={handleGenerateInvoice}
                            disabled={saving || invoiceItems.length === 0}
                        >
                            <Ionicons name="document-text" size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.generateBtnText}>{saving ? 'Generating...' : 'Generate & Share PDF Bill'}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* ──────────────────────────────────────────────────────── */}
                {/* TAB 3: BILL HISTORY                                      */}
                {/* ──────────────────────────────────────────────────────── */}
                {activeTab === 'history' && (
                    <View style={styles.tabContent}>
                        {/* Search and Filters */}
                        <Text style={styles.sectionTitle}>Search & Date Filter</Text>
                        <View style={styles.searchBarContainer}>
                            <Ionicons name="search-outline" size={18} color="#7A6B9C" style={{ marginLeft: 12 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search by Invoice ID, Client Name..."
                                placeholderTextColor="#94a3b8"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 12 }}>
                                    <Ionicons name="close-circle" size={16} color="#94a3b8" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Date Range selectors */}
                        <View style={styles.filterDatesRow}>
                            <TouchableOpacity style={styles.filterDateBtn} onPress={() => setShowStartPicker(true)}>
                                <Ionicons name="calendar-outline" size={14} color="#10b981" />
                                <Text style={styles.filterDateText}>
                                    {startDate ? dayjs(startDate).format('YYYY-MM-DD') : 'Start Date'}
                                </Text>
                                {startDate && (
                                    <TouchableOpacity 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setStartDate(null);
                                        }}
                                        style={{ marginLeft: 6 }}
                                    >
                                        <Ionicons name="close" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.filterDateBtn} onPress={() => setShowEndPicker(true)}>
                                <Ionicons name="calendar-outline" size={14} color="#10b981" />
                                <Text style={styles.filterDateText}>
                                    {endDate ? dayjs(endDate).format('YYYY-MM-DD') : 'End Date'}
                                </Text>
                                {endDate && (
                                    <TouchableOpacity 
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            setEndDate(null);
                                        }}
                                        style={{ marginLeft: 6 }}
                                    >
                                        <Ionicons name="close" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Date Pickers Modals */}
                        {showStartPicker && (
                            <DateTimePicker
                                value={startDate || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowStartPicker(false);
                                    if (selectedDate) setStartDate(selectedDate);
                                }}
                            />
                        )}

                        {showEndPicker && (
                            <DateTimePicker
                                value={endDate || new Date()}
                                mode="date"
                                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                onChange={(event, selectedDate) => {
                                    setShowEndPicker(false);
                                    if (selectedDate) setEndDate(selectedDate);
                                }}
                            />
                        )}

                        {/* History Invoices List */}
                        <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Generated Bills ({filteredInvoices.length})</Text>
                        
                        {filteredInvoices.length === 0 ? (
                            <View style={styles.emptyHistoryCard}>
                                <Ionicons name="folder-open-outline" size={40} color="#94a3b8" />
                                <Text style={styles.emptyHistoryText}>No matching generated invoices found.</Text>
                            </View>
                        ) : (
                            <View style={{ gap: 12 }}>
                                {filteredInvoices.map((inv) => (
                                    <View key={inv.id} style={styles.invoiceCard}>
                                        <View style={styles.invoiceCardHeader}>
                                            <View>
                                                <Text style={styles.invoiceCardId}>#{inv.id}</Text>
                                                <Text style={styles.invoiceCardDate}>
                                                    {dayjs(inv.date).format(invoiceSettings.dateTimeFormat)}
                                                </Text>
                                            </View>
                                            <Text style={styles.invoiceCardTotal}>₹{inv.total.toFixed(2)}</Text>
                                        </View>
                                        <View style={styles.invoiceCardBody}>
                                            <Text style={styles.invoiceCardClient}>Client: <b>{inv.clientName}</b></Text>
                                            {inv.clientEmail ? <Text style={styles.invoiceCardEmail}>{inv.clientEmail}</Text> : null}
                                            <Text style={styles.invoiceCardItemsCount}>{inv.items?.length || 0} line items listed</Text>
                                        </View>
                                        <View style={styles.invoiceCardActions}>
                                            <TouchableOpacity 
                                                style={styles.actionBtn}
                                                onPress={() => handleShareInvoice(inv)}
                                                disabled={saving}
                                            >
                                                <Ionicons name="share-social-outline" size={14} color="#10b981" />
                                                <Text style={styles.actionBtnText}>Share PDF</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F5FF' },
    loadingContainer: { flex: 1, backgroundColor: '#F8F5FF', justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 15, fontWeight: '700', color: '#7A6B9C' },
    
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#EFE9F8' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F4EEFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#2D2445' },
    headerSub: { fontSize: 13, color: '#10b981', fontWeight: '700', marginTop: 2 },

    tabContainer: { flexDirection: 'row', backgroundColor: '#F4EEFC', padding: 4, borderRadius: 16, margin: 16, gap: 4 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 6 },
    tabBtnActive: { backgroundColor: '#10b981' },
    tabText: { fontSize: 13, fontWeight: '700', color: '#7A6B9C' },
    tabTextActive: { color: '#fff' },

    scrollContent: { padding: 16, paddingBottom: 40 },
    tabContent: { gap: 16 },

    sectionTitle: { fontSize: 14, fontWeight: '800', color: '#9A8EBA', textTransform: 'uppercase', letterSpacing: 0.8 },
    label: { fontSize: 13, fontWeight: '700', color: '#2D2445', marginBottom: 6 },
    input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#2D2445' },
    inputGroup: { gap: 4, marginBottom: 8 },
    inputRow: { flexDirection: 'row' },
    
    // Graphics uploads
    graphicsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginVertical: 8 },
    graphicBox: { flex: 1, aspectRatio: 1.3, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4C9E8', borderStyle: 'dashed', borderRadius: 16, overflow: 'hidden' },
    graphicPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
    graphicLabel: { fontSize: 11, fontWeight: '700', color: '#7A6B9C' },
    graphicImage: { width: '100%', height: '100%', resizeMode: 'contain' },

    // Templates
    templatesRow: { flexDirection: 'row', gap: 8, marginVertical: 8 },
    templateCard: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 14, padding: 12, alignItems: 'center', gap: 6 },
    templateCardActive: { borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.05)' },
    templateCardText: { fontSize: 11, fontWeight: '700', color: '#7A6B9C' },
    templateCardTextActive: { color: '#10b981' },

    // Catalog Form & List
    catalogForm: { backgroundColor: '#F4EEFC', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#C4B5DC' },
    addCatalogBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center', justifyContent: 'center' },
    emptyCatalogCard: { backgroundColor: '#fff', borderStyle: 'dashed', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 14, padding: 20, alignItems: 'center' },
    emptyCatalogText: { fontSize: 12, color: '#7A6B9C', textAlign: 'center', lineHeight: 18 },
    catalogList: { gap: 8 },
    catalogItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#EFE9F8' },
    catalogItemName: { fontSize: 14, fontWeight: '700', color: '#2D2445' },
    catalogItemPrice: { fontSize: 12, fontWeight: '700', color: '#10b981', marginTop: 2 },
    catalogItemDelete: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(239, 68, 68, 0.05)', alignItems: 'center', justifyContent: 'center' },

    saveBtn: { backgroundColor: '#2D2445', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
    saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

    // Generator Form
    datePickerToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12, padding: 14 },
    itemAddBlock: { backgroundColor: '#F4EEFC', borderRadius: 16, padding: 14, borderStyle: 'solid', borderWidth: 1, borderColor: '#D4C9E8' },
    catalogSelectChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#fff', marginRight: 8, borderWidth: 1, borderColor: '#D4C9E8' },
    catalogSelectChipActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
    catalogSelectChipText: { fontSize: 12, fontWeight: '700', color: '#7A6B9C' },
    catalogSelectChipTextActive: { color: '#fff' },
    qtyBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', borderStyle: 'solid', borderWidth: 1, borderColor: '#D4C9E8', alignItems: 'center', justifyContent: 'center' },
    qtyVal: { fontSize: 15, fontWeight: '800', width: 28, textAlign: 'center', color: '#2D2445' },
    addItemBtn: { flex: 1, marginLeft: 12, backgroundColor: '#2D2445', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    addItemBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    addAdhocBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#2D2445', alignItems: 'center', justifyContent: 'center' },

    emptyTableCard: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#EFE9F8' },
    emptyTableText: { fontSize: 13, color: '#7A6B9C', fontWeight: '500' },
    
    // Invoice Bill list
    invoiceTable: { backgroundColor: '#fff', borderRadius: 16, borderStyle: 'solid', borderWidth: 1, borderColor: '#D4C9E8', overflow: 'hidden' },
    invoiceRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F4EEFC' },
    invoiceItemName: { fontSize: 14, fontWeight: '700', color: '#2D2445' },
    invoiceItemSub: { fontSize: 11, color: '#7A6B9C', marginTop: 2 },
    invoiceItemTotal: { fontSize: 14, fontWeight: '800', color: '#2D2445', marginRight: 10 },
    itemRemoveBtn: { padding: 4 },

    totalsSection: { padding: 14, backgroundColor: '#F8F5FF', gap: 8 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
    totalLabel: { fontSize: 13, color: '#7A6B9C', fontWeight: '600' },
    totalVal: { fontSize: 13, color: '#2D2445', fontWeight: '700' },
    grandTotalRow: { borderTopWidth: 1, borderTopColor: '#D4C9E8', paddingTop: 10, marginTop: 4 },

    generateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', borderRadius: 16, paddingVertical: 16, marginTop: 16 },
    generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

    // History Tab
    searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D4C9E8', borderRadius: 12, height: 48 },
    searchInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, color: '#2D2445' },
    filterDatesRow: { flexDirection: 'row', gap: 12, marginVertical: 8 },
    filterDateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4EEFC', borderWidth: 1, borderColor: '#C4B5DC', borderRadius: 10, paddingVertical: 10, gap: 6 },
    filterDateText: { fontSize: 12, fontWeight: '700', color: '#7A6B9C' },
    emptyHistoryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 40, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#EFE9F8' },
    emptyHistoryText: { fontSize: 13, color: '#7A6B9C', fontWeight: '500', textAlign: 'center' },

    invoiceCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#EFE9F8' },
    invoiceCardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F8F5FF', paddingBottom: 10 },
    invoiceCardId: { fontSize: 15, fontWeight: '800', color: '#2D2445' },
    invoiceCardDate: { fontSize: 11, color: '#7A6B9C', marginTop: 2 },
    invoiceCardTotal: { fontSize: 16, fontWeight: '800', color: '#10b981' },
    invoiceCardBody: { paddingVertical: 12, gap: 4 },
    invoiceCardClient: { fontSize: 13, color: '#2D2445' },
    invoiceCardEmail: { fontSize: 12, color: '#7A6B9C' },
    invoiceCardItemsCount: { fontSize: 11, color: '#9A8EBA', marginTop: 2 },
    invoiceCardActions: { borderTopWidth: 1, borderTopColor: '#F8F5FF', paddingTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(16, 185, 129, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    actionBtnText: { fontSize: 12, fontWeight: '700', color: '#10b981' }
});
