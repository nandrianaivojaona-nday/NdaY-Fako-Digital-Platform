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
  onIdTokenChanged,
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

  // ======================================================
  // HELPERS
  // ======================================================

  const waitForCookieSync = async () => {
    await new Promise((resolve) =>
      setTimeout(resolve, 250)
    )
  }

  const syncSession = useCallback(
    async (token: string) => {
      const response = await fetch(
        "/api/session",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        }
      )

      if (!response.ok) {
        throw new Error(
          "Failed to establish session"
        )
      }

      // Allow browser to persist cookie
      await waitForCookieSync()
    },
    []
  )

  // ======================================================
  // LOAD USER DATA
  // ======================================================

  const loadUserData = useCallback(
    async (fbUser: User | null) => {
      if (!fbUser) {
        setUser(null)
        setPermissions(null)
        return
      }

      try {
        const token =
          await fbUser.getIdToken()

        // Sync middleware session
        await syncSession(token)

        // Load profile + permissions
        const [userRes, permRes] =
          await Promise.all([
            fetch(
              "/api/internal/users/profile",
              {
                credentials: "include",
              }
            ),
            fetch(
              "/api/internal/permissions",
              {
                credentials: "include",
              }
            ),
          ])

        const userData = userRes.ok
          ? await userRes.json()
          : null

        const permData = permRes.ok
          ? await permRes.json()
          : null

        setUser(userData)
        setPermissions(permData)
      } catch (err) {
        console.error(
          "[AUTH] Failed loading user data:",
          err
        )

        // IMPORTANT:
        // Do NOT clear firebase auth state.
        // Only clear profile-level data.

        setUser(null)
        setPermissions(null)
      }
    },
    [syncSession]
  )

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

    // ----------------------------------------
    // TOKEN REFRESH LISTENER
    // ----------------------------------------

    const unsubToken =
      onIdTokenChanged(
        auth,
        async (fbUser) => {
          if (!isMounted) return

          if (!fbUser) return

          try {
            const token =
              await fbUser.getIdToken()

            await fetch(
              "/api/session",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                credentials: "include",
              }
            )
          } catch (err) {
            console.error(
              "[AUTH] Token refresh error:",
              err
            )
          }
        }
      )

    return () => {
      isMounted = false

      unsubAuth()
      unsubToken()
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
        const token =
          await auth.currentUser.getIdToken(
            true
          )

        await syncSession(token)

        await loadUserData(
          auth.currentUser
        )
      } catch (err) {
        console.error(
          "[AUTH] Refresh failed:",
          err
        )
      }
    },
    [loadUserData, syncSession]
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

    const token =
      await cred.user.getIdToken()

    await syncSession(token)
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

    const token =
      await cred.user.getIdToken()

    await syncSession(token)
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

    const token =
      await cred.user.getIdToken()

    await syncSession(token)
  }

  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = async () => {
    const auth = authRef.current

    if (!auth) return

    try {
      await signOut(auth)

      await fetch(
        "/api/session",
        {
          method: "DELETE",
          credentials: "include",
        }
      )
    } catch (err) {
      console.error(
        "[AUTH] Logout failed:",
        err
      )
    } finally {
      setFirebaseUser(null)
      setUser(null)
      setPermissions(null)
      setLoading(false)
    }
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
