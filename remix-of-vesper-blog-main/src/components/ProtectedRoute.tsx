import { useState, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase";
import type { UserRole } from "@/services/authService";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    allowedRole: UserRole;
}

/**
 * Protects dashboard routes by role.
 * Waits for Firebase Auth to restore session before rendering.
 * Uses sessionStorage for role (per-tab).
 */
const ProtectedRoute = ({ allowedRole }: ProtectedRouteProps) => {
    const [loading, setLoading] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthenticated(!!user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    // Show loading spinner while Firebase restores auth state
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Read role from sessionStorage
    const stored = sessionStorage.getItem("vasudha_user");

    if (!authenticated && !stored) {
        return <Navigate to="/login" replace />;
    }

    // Check role match
    if (stored) {
        try {
            const user = JSON.parse(stored);
            if (user.role && user.role !== allowedRole) {
                return <Navigate to={`/${user.role}-dashboard`} replace />;
            }
        } catch {
            return <Navigate to="/login" replace />;
        }
    }

    return <Outlet />;
};

export default ProtectedRoute;
