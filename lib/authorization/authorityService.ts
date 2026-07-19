// authorityService.ts

import {
    doc,
    getDoc,
    collection,
    getDocs,
    Firestore,
  } from "firebase/firestore";
  
  import { getDb } from "@/lib/firebase/firebaseApp"; // ✅ LAZY access (critical)
  
  /**
   * Types
   */
  export type AuthorityPermission = {
    function: string;
    actions: string[];
    scope: string;
  };
  
  export type Authority = {
    id: string;
    position: string;
    acting: "full" | "limited" | "readonly";
    authorities: AuthorityPermission[];
  };
  
  /**
   * In-memory cache
   */
  const authorityCache = new Map<string, Authority>();
  
  /**
   * 🔍 Fetch a single authority by ID
   */
  export async function getAuthorityById(
    authorityId: string,
    firestore?: Firestore
  ): Promise<Authority> {
    if (!authorityId) {
      throw new Error("getAuthorityById: authorityId is required");
    }
  
    // ✅ Resolve DB lazily (prevents SSR/build crash)
    const db = firestore ?? getDb();
  
    // ✅ Cache
    if (authorityCache.has(authorityId)) {
      return authorityCache.get(authorityId)!;
    }
  
    const ref = doc(db, "authorities", authorityId);
    const snap = await getDoc(ref);
  
    if (!snap.exists()) {
      throw new Error(
        `Authority "${authorityId}" not found in Firestore`
      );
    }
  
    const data = snap.data();
  
    validateAuthority(data, authorityId);
  
    const authority: Authority = {
      id: authorityId,
      position: data.position,
      acting: data.acting,
      authorities: data.authorities,
    };
  
    authorityCache.set(authorityId, authority);
  
    return authority;
  }
  
  /**
   * 📚 Fetch all authorities
   */
  export async function getAllAuthorities(
    firestore?: Firestore
  ): Promise<Authority[]> {
    const db = firestore ?? getDb();
  
    const colRef = collection(db, "authorities");
    const snapshot = await getDocs(colRef);
  
    const result: Authority[] = [];
  
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
  
      validateAuthority(data, docSnap.id);
  
      const authority: Authority = {
        id: docSnap.id,
        position: data.position,
        acting: data.acting,
        authorities: data.authorities,
      };
  
      authorityCache.set(docSnap.id, authority);
      result.push(authority);
    });
  
    return result;
  }
  
  /**
   * 🧠 Validation (strict)
   */
  function validateAuthority(data: any, id: string) {
    if (!data) {
      throw new Error(`Authority "${id}" is empty`);
    }
  
    if (!data.position || typeof data.position !== "string") {
      throw new Error(`Authority "${id}" missing "position"`);
    }
  
    if (!["full", "limited", "readonly"].includes(data.acting)) {
      throw new Error(`Authority "${id}" invalid "acting": ${data.acting}`);
    }
  
    if (!Array.isArray(data.authorities)) {
      throw new Error(`Authority "${id}" must have authorities array`);
    }
  
    data.authorities.forEach((perm: any, i: number) => {
      if (!perm.function || typeof perm.function !== "string") {
        throw new Error(`Authority "${id}" permission[${i}] invalid function`);
      }
  
      if (
        !Array.isArray(perm.actions) ||
        perm.actions.some((a: any) => typeof a !== "string")
      ) {
        throw new Error(`Authority "${id}" permission[${i}] invalid actions`);
      }
  
      if (!perm.scope || typeof perm.scope !== "string") {
        throw new Error(`Authority "${id}" permission[${i}] invalid scope`);
      }
    });
  }
  
  /**
   * 🧹 Cache reset
   */
  export function clearAuthorityCache() {
    authorityCache.clear();
  }