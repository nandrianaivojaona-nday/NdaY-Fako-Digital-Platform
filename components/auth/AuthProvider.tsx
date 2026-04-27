"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

import { doc, getDoc, setDoc } from "firebase/firestore";

import { getAuthClient, getDb, getGoogleProvider } from "@/lib/firebase";

/* =========================
   TYPES
========================= */

type AppUser = {
  uid: string;
  email: string | null;
  role: "ADMIN" | "OPERATOR" | "CITIZEN";
};

type AuthContextType = {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

/* =========================
   CONTEXT
========================= */

const AuthContext = createContext<AuthContextType | null>(null);

/* =========================
   PROVIDER
========================= */

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const auth = getAuthClient();
    const db = getDb();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          const newUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            role: "CITIZEN", // default role
          };

          await setDoc(ref, newUser);
          setAppUser(newUser);
        } else {
          setAppUser(snap.data() as AppUser);
        }
      } else {
        setAppUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /* =========================
     ACTIONS
  ========================= */

  const loginWithEmail = async (email: string, password: string) => {
    const auth = getAuthClient();
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string) => {
    const auth = getAuthClient();
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const loginWithGoogle = async () => {
    const auth = getAuthClient();
    const provider = getGoogleProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    const auth = getAuthClient();
    await signOut(auth);
  };

  /* =========================
     PROVIDER VALUE
  ========================= */

  return (
    <AuthContext.Provider
      value={{
        user,
        appUser,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

/* =========================
   HOOK
========================= */

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};