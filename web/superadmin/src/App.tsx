import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ClientsPage from './pages/ClientsPage';
import { DashboardPage, OnboardClientPage, ClientDetailPage, SettingsPage } from './pages/Stubs';

export default function App() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) return <LoginPage />;

    return (
        <Layout>
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/clients" element={<ClientsPage />} />
                <Route path="/clients/new" element={<OnboardClientPage />} />
                <Route path="/clients/:id" element={<ClientDetailPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Layout>
    );
}
