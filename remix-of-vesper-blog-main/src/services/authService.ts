// Authentication service for Vasudha — Firebase Auth + Firestore
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";

export type UserRole = "farmer" | "buyer" | "logistics";

export interface LoginPayload {
    email: string;
    password: string;
    role: UserRole; // kept for UI role-selection, actual role comes from Firestore
}

export interface SignupPayload {
    fullName: string;
    email: string;
    password: string;
    location: string;
    role: UserRole;
}

export interface User {
    id: string;
    fullName: string;
    email: string;
    role: UserRole;
    location: string;
}

/**
 * Create a new account with Firebase Auth and store profile in Firestore.
 */
export async function signup(payload: SignupPayload): Promise<User> {
    // 1. Create Firebase Auth user
    const credential = await createUserWithEmailAndPassword(
        auth,
        payload.email,
        payload.password
    );

    const uid = credential.user.uid;

    // 2. Store profile in Firestore: users/{uid}
    const userData = {
        name: payload.fullName,
        email: payload.email,
        role: payload.role,
        location: payload.location,
        createdAt: serverTimestamp(),
    };

    await setDoc(doc(db, "users", uid), userData);

    // 3. Build local user object
    const user: User = {
        id: uid,
        fullName: payload.fullName,
        email: payload.email,
        role: payload.role,
        location: payload.location,
    };

    // 4. Persist to sessionStorage (per-tab, survives refresh but not tab close)
    sessionStorage.setItem("vasudha_user", JSON.stringify(user));

    return user;
}

/**
 * Sign in with Firebase Auth and read role from Firestore.
 */
export async function login(payload: LoginPayload): Promise<User> {
    // 1. Authenticate with Firebase
    const credential = await signInWithEmailAndPassword(
        auth,
        payload.email,
        payload.password
    );

    const uid = credential.user.uid;

    // 2. Read profile from Firestore
    const snap = await getDoc(doc(db, "users", uid));

    let role: UserRole = payload.role;
    let fullName = "User";
    let location = "";

    if (snap.exists()) {
        const data = snap.data();
        role = (data.role as UserRole) || payload.role;
        fullName = data.name || "User";
        location = data.location || "";
    }

    // 3. Build local user object
    const user: User = {
        id: uid,
        fullName,
        email: payload.email,
        role,
        location,
    };

    // 4. Persist to sessionStorage
    sessionStorage.setItem("vasudha_user", JSON.stringify(user));

    return user;
}

/**
 * Sign out from Firebase and clear local storage.
 */
export async function logout(): Promise<void> {
    await signOut(auth);
    sessionStorage.removeItem("vasudha_user");
}

/**
 * Get the currently authenticated user from sessionStorage.
 */
export function getCurrentUser(): User | null {
    const stored = sessionStorage.getItem("vasudha_user");
    if (stored) {
        try {
            return JSON.parse(stored) as User;
        } catch {
            return null;
        }
    }
    return null;
}

/** Fetch full user profile from Firestore `users/{uid}` */
export async function getUserProfile(uid: string): Promise<Record<string, any> | null> {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() };
}

/** Update user profile fields in Firestore `users/{uid}` */
export async function updateUserProfile(uid: string, data: Record<string, any>): Promise<void> {
    const { id, ...rest } = data; // strip id if present
    await setDoc(doc(db, "users", uid), { ...rest, updatedAt: serverTimestamp() }, { merge: true });
    // Also update sessionStorage so TopNav reflects changes
    const current = getCurrentUser();
    if (current && current.id === uid) {
        if (data.name) current.fullName = data.name;
        if (data.location) current.location = data.location;
        sessionStorage.setItem("vasudha_user", JSON.stringify(current));
    }
}

