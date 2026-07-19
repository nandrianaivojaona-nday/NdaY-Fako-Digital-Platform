export type Authority = {
    id: string
    position: string
    acting: string
    authorities: {
      function: string
      actions: string[]
      scope: string
    }[]
  }
  
  export function can(
    authority: Authority | null,
    func: string,
    action: string,
    scope?: string
  ): boolean {
    if (!authority) return false
  
    return authority.authorities.some((a) => {
      const functionMatch = a.function === func
      const actionMatch = a.actions.includes(action)
      const scopeMatch = scope ? a.scope === scope : true
  
      return functionMatch && actionMatch && scopeMatch
    })
  }