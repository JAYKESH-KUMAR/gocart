'use client'

import AdminLayout from "@/components/admin/AdminLayout";
import { useAuth } from "@clerk/nextjs";
import { SignIn } from "@clerk/nextjs";

export default function RootAdminLayout({ children }) {
    const { userId } = useAuth();

    if (!userId) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <SignIn fallbackRedirectUrl="/admin" routing="hash" />
            </div>
        );
    }

    return (
        <AdminLayout>
            {children}
        </AdminLayout>
    );
}