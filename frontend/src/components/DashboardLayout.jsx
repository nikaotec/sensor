import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
    return (
        <div className="min-h-screen bg-background-dark">
            <Sidebar />
            {/* Desktop: offset for sidebar | Mobile: offset for top bar */}
            <main className="main-content ml-64 p-6 md:p-8 lg:p-10 max-md:ml-0 max-md:pt-20">
                <div className="animate-fade-in">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
