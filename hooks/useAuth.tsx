"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react"

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
  type Auth,
} from "firebase/auth"

import { getAuthClient } from "@/lib/firebase/firebaseApp"
import { set } from "idb-keyval"

// ======================================================
// TYPES
// ======================================================

type UserProfile = {
  id: string
  role:
    | "ADMIN"
    | "AUTHORITY"
    | "OPERATOR"
    | "CITIZEN"

  operatorId?: string
  authorityId?: string
}

type Permissions = {
  canAccessAdmin: boolean
  canAccessAuthority: boolean
  canAccessOperator: boolean
  canAccessCitizen: boolean
}

type AuthState = {
  firebaseUser: User | null
  user: UserProfile | null
  permissions: Permissions | null
  loading: boolean

  can: (
    key: keyof Permissions
  ) => boolean

  refresh: () => Promise<void>

  loginWithEmail: (
    email: string,
    password: string
  ) => Promise<void>

  registerWithEmail: (
    email: string,
    password: string
  ) => Promise<void>

  loginWithGoogle: () => Promise<void>

  logout: () => Promise<void>
}

// ======================================================
// CONTEXT
// ======================================================

const AuthContext = createContext<
  AuthState | undefined
>(undefined)

// ======================================================
// PROVIDER
// ======================================================

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [firebaseUser, setFirebaseUser] =
    useState<User | null>(null)

  const [user, setUser] =
    useState<UserProfile | null>(null)

  const [permissions, setPermissions] =
    useState<Permissions | null>(null)

  const [loading, setLoading] =
    useState(true)

  const authRef =
    useRef<Auth | null>(null)

  const initializedRef =
    useRef(false)

  const sessionSyncsRef =
    useRef(new Map<string, Promise<void>>())

  // ======================================================
  // HELPERS
  // ======================================================

  const waitForCookieSync = async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, 250)
    )
  }

  const clearAuthSession = useCallback(async (expectedUid?: string) => {
    const auth = authRef.current;
    if (
      expectedUid &&
      auth?.currentUser &&
      auth.currentUser.uid !== expectedUid
    ) {
      return;
    }

    try {
      if (auth?.currentUser) await signOut(auth);
    } catch (error) {
      console.error("[AUTH] Firebase sign-out failed:", error);
    }

    try {
      await fetch("/api/session", {
        method: "DELETE",
        credentials: "include",
      });
    } catch (error) {
      console.error("[AUTH] Session cookie clear failed:", error);
    } finally {
      setFirebaseUser(null);
      setUser(null);
      setPermissions(null);
      setLoading(false);
    }
  }, []);

  const syncSession = useCallback(
    (fbUser: User) => {
      const pendingSync = sessionSyncsRef.current.get(fbUser.uid);
      if (pendingSync) return pendingSync;

      const syncPromise = (async () => {
        const postSession = (token: string) =>
          fetch("/api/session", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          });

        let token = await fbUser.getIdToken();
        let response = await postSession(token);

        // The API may have just minted updated custom claims. Refresh the
        // Firebase token and retry once so the session cookie carries them.
        if (response.status === 409) {
          const result = await response.json().catch(() => null);
          if (result?.error === "CLAIMS_REFRESH_REQUIRED") {
            token = await fbUser.getIdToken(true);
            response = await postSession(token);
          } else {
            throw new Error(result?.message ?? "Failed to establish session");
          }
        }

        if (!response.ok) {
          const result = await response.json().catch(() => null);
          if (result?.error === "AUTH_TOKEN_REJECTED") {
            await clearAuthSession(fbUser.uid);
          }
          throw new Error(
            typeof result?.message === "string"
              ? result.message
              : `Failed to establish session (HTTP ${response.status})`
          );
        }

        // Allow browser to persist cookie
        await waitForCookieSync();
      })();

      sessionSyncsRef.current.set(fbUser.uid, syncPromise);
      return syncPromise.finally(() => {
        if (sessionSyncsRef.current.get(fbUser.uid) === syncPromise) {
          sessionSyncsRef.current.delete(fbUser.uid);
        }
      });
    },
    [clearAuthSession]
  )

  // ======================================================
  // LOAD USER DATA
  // ======================================================

  const loadUserData = useCallback(
    async (fbUser: User | null) => {
      if (!fbUser) {
        setUser(null);
        setPermissions(null);
        return;
      }

      // Reuse the session cookie issued at sign-in. Reissuing it on every
      // reload fails after Firebase's recent-sign-in window has elapsed.
      const pendingSync = sessionSyncsRef.current.get(fbUser.uid);
      if (pendingSync) await pendingSync;

      let sessionResponse = await fetch("/api/session", {
        method: "GET",
        credentials: "include",
      });
      // A fresh sign-in can finish setting its cookie while the auth-state
      // listener's first verification request is in flight. Check once more
      // after a miss to avoid racing that response.
      if (!sessionResponse.ok) {
        sessionResponse = await fetch("/api/session", {
          method: "GET",
          credentials: "include",
        });
      }
      if (!sessionResponse.ok) {
        setUser(null);
        setPermissions(null);
        return;
      }

      try {
        // Load profile + permissions
        const [userRes, permRes] = await Promise.all([
          fetch("/api/internal/users/profile", {
            credentials: "include",
          }),
          fetch("/api/internal/permissions", {
            credentials: "include",
          }),
        ]);

        const userData = userRes.ok ? await userRes.json() : null;
        const permData = permRes.ok ? await permRes.json() : null;

        setUser(userData);
        setPermissions(permData);
      } catch (err) {
        console.error("[AUTH] Failed loading user profile:", err);

        // 🔥 FALLBACK: Create a basic user from Firebase Auth data
        // This allows the app to proceed even if the profile endpoints aren't ready
        const fallbackUser: UserProfile = {
          id: fbUser.uid,
          role: "CITIZEN", // default role
        };

        console.log("[AUTH] Using fallback user profile:", fallbackUser);
        setUser(fallbackUser);

        // Set default permissions
        setPermissions({
          canAccessAdmin: false,
          canAccessAuthority: false,
          canAccessOperator: false,
          canAccessCitizen: true, // at least citizen access
        });
      }
    },
    []
  );

  // ======================================================
  // AUTH INITIALIZATION
  // ======================================================

  useEffect(() => {
    let isMounted = true

    const auth = getAuthClient()

    // Prevent SSR crashes
    if (!auth) {
      console.warn(
        "[AUTH] Firebase auth unavailable"
      )

      setLoading(false)
      return
    }

    authRef.current = auth

    // ----------------------------------------
    // AUTH STATE LISTENER
    // ----------------------------------------

    const unsubAuth =
      onAuthStateChanged(
        auth,
        async (fbUser) => {
          if (!isMounted) return

          try {
            setLoading(true)
            // Prevent initialization storms
            if (!initializedRef.current) {
              initializedRef.current = true
            }

            setFirebaseUser(fbUser)
            setUser(null)
            setPermissions(null)
            // Load profile data separately
            await loadUserData(fbUser)

            // IMPORTANT:
            // Authentication restored.
            // Stop global loading immediately.
            setLoading(false)


          } catch (err) {
            console.error(
              "[AUTH] Auth state error:",
              err
            )

            setLoading(false)
          }
        }
      )

    return () => {
      isMounted = false

      unsubAuth()
    }
    }, [loadUserData])

  // ======================================================
  // RBAC
  // ======================================================

  const can = useCallback(
    (key: keyof Permissions) => {
      return !!permissions?.[key]
    },
    [permissions]
  )

  // ======================================================
  // REFRESH
  // ======================================================

  const refresh = useCallback(
    async () => {
      const auth = authRef.current

      if (!auth?.currentUser) return

      try {
        await loadUserData(auth.currentUser)
      } catch (err) {
        console.error(
          "[AUTH] Refresh failed:",
          err
        )
      }
    },
    [loadUserData]
  )

  // ======================================================
  // LOGIN
  // ======================================================

  const loginWithEmail = async (
    email: string,
    password: string
  ) => {
    const auth = authRef.current

    if (!auth) {
      throw new Error(
        "Auth unavailable"
      )
    }

    const cred =
      await signInWithEmailAndPassword(
        auth,
        email,
        password
      )

    await syncSession(cred.user)
    await loadUserData(cred.user)
  }

  // ======================================================
  // REGISTER
  // ======================================================

  const registerWithEmail = async (
    email: string,
    password: string
  ) => {
    const auth = authRef.current

    if (!auth) {
      throw new Error(
        "Auth unavailable"
      )
    }

    const cred =
      await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )

    await syncSession(cred.user)
    await loadUserData(cred.user)
  }

  // ======================================================
  // GOOGLE LOGIN
  // ======================================================

  const loginWithGoogle = async () => {
    const auth = authRef.current

    if (!auth) {
      throw new Error(
        "Auth unavailable"
      )
    }

    const provider =
      new GoogleAuthProvider()

    const cred =
      await signInWithPopup(
        auth,
        provider
      )

    await syncSession(cred.user)
    await loadUserData(cred.user)
  }

  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = async () => {
    await clearAuthSession()
  }

  // ======================================================
  // CONTEXT VALUE
  // ======================================================

  const value: AuthState = {
    firebaseUser,
    user,
    permissions,
    loading,

    can,

    refresh,

    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ======================================================
// HOOK
// ======================================================

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      "useAuth must be used within AuthProvider"
    )
  }

  return context
}
