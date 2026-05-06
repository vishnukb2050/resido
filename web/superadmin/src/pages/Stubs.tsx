import React from 'react';

const StubPage = ({ title }: { title: string }) => (
    <div style={{ padding: '32px', color: '#fff' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{title}</h1>
        <p style={{ color: '#94a3b8', marginTop: '16px' }}>This page is under development.</p>
    </div>
);

export const DashboardPage = () => <StubPage title="SuperAdmin Dashboard" />;
export const OnboardClientPage = () => <StubPage title="Onboard Client" />;
export const ClientDetailPage = () => <StubPage title="Client Details" />;
export const SettingsPage = () => <StubPage title="System Settings" />;
