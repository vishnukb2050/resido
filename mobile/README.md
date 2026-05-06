# Resido Mobile - Resident & Service Provider App

A high-performance mobile application built with React Native and Expo, serving residents, community admins, and service providers.

## 📱 Key Features

### 1. Authentication (OTP-Based)
- **Passwordless Login**: Secure 4-digit OTP verification.
- **Auto-Visibility**: High-contrast UI for clear input across all lighting conditions.
- **Session Persistence**: JWT storage via Expo SecureStore.

### 2. Community Management
- **Dashboard**: Role-specific grids for quick access to features.
- **Notices & Polls**: Stay updated with community announcements.
- **Global Chat**: Real-time communication with neighbors and staff.

### 3. Service Discovery Engine
- **Search Services**: Find professionals (Plumbers, Electricians, etc.) nearby.
- **Location Filter**: Search by Pincode, City, or District.
- **Provider Cards**: View expertise, description, and direct contact options.

### 4. Professional Job Profiles
- **Profile Builder**: Any user can register as a service provider.
- **Service Area**: Set your service region (Pincode/City) to be discoverable by other users.

### 5. Advanced Profile Management
- **Detailed Bio**: Manage Name, Age, and personal description.
- **Profile Photo**: Instant photo updates with secure AWS S3 integration.
- **Workspace Switcher**: Easily switch between different apartment communities if you reside in multiple.

---

## 🛠 Tech Details

- **Framework**: Expo (React Native)
- **Routing**: Expo Router (File-based routing)
- **Icons**: Expo Vector Icons (Ionicons, MaterialIcons)
- **Storage**: Zustand (State), SecureStore (Tokens)
- **Networking**: Axios with request interceptors for Auth and Tenant headers.

---

## 🏗 Directory Structure

```bash
resido-app/
├── app/                # Expo Router screens (Navigation)
├── src/
│   ├── components/     # Reusable UI (Dashboards, Inputs)
│   ├── screens/        # Core Screen Logic
│   │   ├── auth/       # Login, OTP
│   │   ├── profile/    # Personal & Job Profiles
│   │   └── services/   # Search & Discovery
│   ├── services/       # API, Storage, Storage Utility
│   └── store/          # Zustand State Management (Auth, Theme)
└── assets/             # Images, Fonts, Icons
```

---

## 🛠 Development & Build

### Installation
```bash
cd mobile/resido-app
npm install
```

### Running Locally
```bash
npx expo start
```

### Building the APK (Manual)
Run the provided build script to generate a release APK:
```bash
bash build_apk.sh
```
The script handles:
1. Expo prebuild (native directory generation).
2. Clean assembly of Gradle release.
3. APK output mapping.

---

## 📄 License
Internal Proprietary Software. © 2026 Resido Tech.
