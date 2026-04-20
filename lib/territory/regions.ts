export type RegionMeta = {
    name: string;        // normalized
    iso: string;         // ISO 3166-2
    nrc: string;         // NdaY Regional Code
  };
  
  export const REGIONS: Record<string, RegionMeta> = {
    ANALAMANGA:         { name: "ANALAMANGA", iso: "MG-ANA", nrc: "ANA" },
    ANALANJIROFO:       { name: "ANALANJIROFO", iso: "MG-ANJ", nrc: "ANJ" },
    ALAOTRA_MANGORO:    { name: "ALAOTRA_MANGORO", iso: "MG-ALA", nrc: "ALM" },
    AMORONI_MANIA:      { name: "AMORONI_MANIA", iso: "MG-AMO", nrc: "AMM" },
    ANDROY:             { name: "ANDROY", iso: "MG-AND", nrc: "AND" },
    ANOSY:              { name: "ANOSY", iso: "MG-ANO", nrc: "ANO" },
    ATSINANANA:         { name: "ATSINANANA", iso: "MG-ATS", nrc: "ATS" },
    ATSIMO_ANDREFANA:   { name: "ATSIMO_ANDREFANA", iso: "MG-ATS", nrc: "ATD" }, // collision-resolved NRC
    ATSIMO_ATSINANANA:  { name: "ATSIMO_ATSINANANA", iso: "MG-ATA", nrc: "ATA" },
  
    BETSIBOKA:          { name: "BETSIBOKA", iso: "MG-BET", nrc: "BET" },
    BOENY:              { name: "BOENY", iso: "MG-BOE", nrc: "BOE" },
    BONGOLAVA:          { name: "BONGOLAVA", iso: "MG-BGL", nrc: "BGL" },
    DIANA:              { name: "DIANA", iso: "MG-DIA", nrc: "DIA" },
    FITOVINANY:         { name: "FITOVINANY", iso: "MG-FIT", nrc: "FIT" },
    HAUTE_MATSIATRA:    { name: "HAUTE_MATSIATRA", iso: "MG-HMA", nrc: "HMA" },
    IHOROMBE:           { name: "IHOROMBE", iso: "MG-IHO", nrc: "IHO" },
    ITASY:              { name: "ITASY", iso: "MG-ITA", nrc: "ITA" },
    MELAKY:             { name: "MELAKY", iso: "MG-MEL", nrc: "MEL" },
    MENABE:             { name: "MENABE", iso: "MG-MEN", nrc: "MEN" },
    SAVA:               { name: "SAVA", iso: "MG-SAV", nrc: "SAV" },
    SOFIA:              { name: "SOFIA", iso: "MG-SOF", nrc: "SOF" },
    VAKINANKARATRA:     { name: "VAKINANKARATRA", iso: "MG-VAK", nrc: "VAK" },
    VATOVAVY:           { name: "VATOVAVY", iso: "MG-VAT", nrc: "VAT" },
  
    // newest (verify ISO when finalized)
    AMBATOSOA:          { name: "AMBATOSOA", iso: "MG-AMB", nrc: "AMB" }
  };