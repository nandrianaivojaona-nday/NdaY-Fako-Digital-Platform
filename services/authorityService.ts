// services/authService.ts

import {
    GoogleAuthProvider,
    OAuthProvider,
    signInWithPopup,
    linkWithPopup,
    signOut,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
  } from "firebase/auth";
  
  import { getAuthClient } from "@/lib/firebase/firebaseApp";
  
  /**
   * 📧 Email login (PRIMARY)
   */
  export async function loginWithEmail(email: string, password: string) {
    const auth = getAuthClient();
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }
  
  /**
   * 🆕 Email signup
   */
  export async function signupWithEmail(email: string, password: string) {
    const auth = getAuthClient();
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  }
  
  /**
   * 🔵 Google login (secondary option)
   */
  export async function signInWithGoogle() {
    const auth = getAuthClient();
    const provider = new GoogleAuthProvider();
  
    const result = await signInWithPopup(auth, provider);
    return result.user;
  }
  
  /**
   * 🔗 LinkedIn linking (post-login ONLY)
   */
  export async function linkLinkedIn() {
    const auth = getAuthClient();
  
    if (!auth.currentUser) {
      throw new Error("User must be logged in first");
    }
  
    const provider = new OAuthProvider("linkedin.com");
  
    try {
      return await linkWithPopup(auth.currentUser, provider);
    } catch (error: any) {
      if (error.code === "auth/credential-already-in-use") {
        throw new Error("LinkedIn already linked to another account");
      }
      throw error;
    }
  }
  
  /**
   * 🚪 Logout
   */
  export async function logout() {
    const auth = getAuthClient();
    await signOut(auth);
  }

  // services/authorityService.ts
export interface Authority {
  id: string;
  name: string;
  level: 'national' | 'regional' | 'municipality' | 'fokontany';
  location?: string;
  adminId?: string;
  authorities: {
    function: string;
    actions: string[];
    scope: string;
  }[];

  // ... other fields
}