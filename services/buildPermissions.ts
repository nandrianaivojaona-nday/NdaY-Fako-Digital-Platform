// services/buildPermissions.ts

import { Authority } from "@/services/authorityService";

export type Permission = {
  function: string;
  actions: string[];
  scope: string;
};

export function buildPermissions(authority: Authority): Permission[] {
  return authority.authorities;
}

