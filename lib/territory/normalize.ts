export function normalizeName(input: string): string {
    return input
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/['’]/g, "")            // remove apostrophes
      .replace(/[^a-zA-Z0-9]+/g, "_")  // spaces & symbols -> _
      .replace(/^_+|_+$/g, "")         // trim _
      .toUpperCase();
  }