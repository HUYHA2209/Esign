import React from 'react';
import { Outlet, useParams } from 'react-router-dom';
import OrgSidebar from './OrgSidebar';
import OrgHeader from './OrgHeader';

const OrgMainLayout = () => {
    const { orgUrl } = useParams();
    const orgName = orgUrl
        ? orgUrl.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        : 'Tổ chức';

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar - Fixed width */}
            <OrgSidebar orgUrl={orgUrl} orgName={orgName} />

            {/* Main Content */}
            <div className="flex-1 ml-60 flex flex-col min-h-screen">
                <OrgHeader orgUrl={orgUrl} orgName={orgName} />

                <main className="flex-1 p-7">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default OrgMainLayout;
