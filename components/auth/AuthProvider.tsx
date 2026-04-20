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
import { auth, googleProvider } from "@/lib/firebase";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Session persistence
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);

      // 👉 Hook for DB sync later
      if (firebaseUser) {
        console.log("User logged in:", firebaseUser.email);
      }
    });

    return () => unsubscribe();
  }, []);

  // ✉️ Email login
  const loginWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Email login error:", error);
    }
  };

  // 🆕 Email registration
  const registerWithEmail = async (email: string, password: string) => {
    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      console.log("User registered:", res.user.email);

      // 👉 TODO: create user profile in DB
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  // ⚡ Google login (secondary)
  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);

      console.log("Google login:", res.user.email);

      // 👉 TODO: ensure user exists in DB
    } catch (error) {
      console.error("Google login error:", error);
    }
  };

  // 🚪 Logout
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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

// Hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};