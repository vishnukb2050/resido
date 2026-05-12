import React, { useState, useMemo, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput,
    Image, SafeAreaView, KeyboardAvoidingView, Platform, Alert,
    FlatList, Modal, ActivityIndicator, Switch, Dimensions, StatusBar
} from 'react-native';
import CreateBusinessProfileScreen from '../src/screens/CreateBusinessProfileScreen';
export default function Page() { return <CreateBusinessProfileScreen />; }
