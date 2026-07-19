import { getAuthorityById } from "./../authorization/authorityService"

// --------------------
// TYPES
// --------------------

type AppUser = {
  id: string
  role: string
  authorityId?: string
  operatorId?: string
}

// --------------------
// CORE PERMISSION CHECK
// --------------------

export async function can(
  user: AppUser | null,
  func: string,
  action: string,
  context?: {
    operatorId?: string
    authorityId?: string
  }
): Promise<boolean> {
  if (!user) return false

  // --------------------
  // ADMIN SHORT-CIRCUIT
  // --------------------
  if (user.role === "ADMIN") {
    return true
  }

  // --------------------
  // AUTHORITY-BASED CHECK
  // --------------------
  if (!user.authorityId) return false

  const authority = await getAuthorityById(user.authorityId)

  if (!authority) return false

  // --------------------
  // ACTING LEVEL CONTROL
  // --------------------
  if (authority.acting === "readonly" && action !== "read") {
    return false
  }

  if (authority.acting === "limited" && action === "delete") {
    return false
  }

  // --------------------
  // MATCH PERMISSIONS
  // --------------------
  return authority.authorities.some((perm) => {
    const functionMatch = perm.function === func
    const actionMatch = perm.actions.includes(action)

    if (!functionMatch || !actionMatch) return false

    // --------------------
    // SCOPE HANDLING
    // --------------------

    switch (perm.scope) {
      case "global":
        return true

      case "authority":
        return (
          context?.authorityId &&
          context.authorityId === user.authorityId
        )

      case "operator":
        return (
          context?.operatorId &&
          context.operatorId === user.operatorId
        )

      case "self":
        return true // can refine later

      default:
        return false
    }
  })
}