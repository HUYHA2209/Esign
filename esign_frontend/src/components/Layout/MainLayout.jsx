import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const MainLayout = ({ children }) => {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Sidebar - Fixed width */}
            <Sidebar />

            {/* Main Content */}
            <div className="ml-60">
                <Header />

                <main className="p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default MainLayout;
