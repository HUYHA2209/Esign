import React, { useState, useEffect } from 'react';
import { Outlet, useParams, useLocation } from 'react-router-dom';
import OrgSidebar from './OrgSidebar';
import OrgHeader from './OrgHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { getWorkSpaces } from '../../service/userApi';

const OrgMainLayout = () => {
    const { orgUrl } = useParams();
    const location = useLocation();
    const [orgName, setOrgName] = useState('Đang tải...');

    useEffect(() => {
        const fetchOrgDetails = async () => {
            if (!orgUrl) return;
            try {
                const res = await getWorkSpaces();
                if (res && res.result) {
                    const ws = res.result.find(w => w.accountUrl === orgUrl);
                    if (ws) {
                        setOrgName(ws.accountName);
                    } else {
                        setOrgName(orgUrl.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
                    }
                }
            } catch (error) {
                console.error("Failed to load organization details", error);
                setOrgName(orgUrl.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
            }
        };
        fetchOrgDetails();
    }, [orgUrl]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar - Fixed width */}
            <OrgSidebar orgUrl={orgUrl} orgName={orgName} />

            {/* Main Content */}
            <div className="flex-1 ml-60 flex flex-col min-h-screen bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/30 via-transparent to-transparent">
                <OrgHeader orgUrl={orgUrl} orgName={orgName} />

                <main className="flex-1 p-7 overflow-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: "easeOut" }}
                            className="max-w-7xl mx-auto w-full"
                        >
                            <Outlet context={{ orgName, orgUrl }} />
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
};

export default OrgMainLayout;
