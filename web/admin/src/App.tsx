import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import DashboardPage from './pages/DashboardPage';

// Stub missing pages
const StubPage = ({ title }: { title: string }) => (
    <div style={{ padding: 24, color: '#fff' }}><h1>{title}</h1><p>Coming Soon</p></div>
);

export default function App() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/accept-invite" element={<AcceptInvitePage />} />
            
            {isAuthenticated ? (
                <Route element={<Layout />}>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/members" element={<StubPage title="Members" />} />
                    <Route path="/departments" element={<StubPage title="Departments" />} />
                    <Route path="/residents" element={<StubPage title="Residents" />} />
                    <Route path="/notices" element={<StubPage title="Notice Board" />} />
                    <Route path="/polls" element={<StubPage title="Polls" />} />
                    <Route path="/groups" element={<StubPage title="Groups" />} />
                    <Route path="/accounting" element={<StubPage title="Accounting" />} />
                    <Route path="/visitors" element={<StubPage title="Visitor Log" />} />
                    <Route path="/complaints" element={<StubPage title="Complaints" />} />
                    <Route path="/chat" element={<StubPage title="Chat" />} />
                    <Route path="/settings" element={<StubPage title="Settings" />} />
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
            ) : (
                <Route path="*" element={<Navigate to="/login" replace />} />
            )}
        </Routes>
    );
}
