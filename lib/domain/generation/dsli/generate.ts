type Actor = "HH" | "COL" | "OPR" | "FLT" | "AST" | "GOV";

export function buildDSLI(params: {
  actor: Actor;
  id: string;
  tgs: {
    cty: string;
    reg: { nrc: string };
    dis: string;
    com: string;
    fkt?: string;
    sec?: string;
    unit?: string;
  };
}) {
  const { actor, id, tgs } = params;

  const parts = [
    "NDAY",
    "FAKO",
    actor,
    id,
    tgs.sec,
    tgs.fkt,
    tgs.com,
    tgs.dis,
    tgs.reg.nrc, // ← your operational code
    tgs.cty,
    tgs.unit
  ].filter(Boolean);

  return parts.join("-");
}