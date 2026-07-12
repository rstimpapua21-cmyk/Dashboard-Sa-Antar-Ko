/**
 * PII (Personally Identifiable Information) masking helpers.
 * Used to protect patient identity for roles without `view_patient_pii`.
 */

const HONORIFIC = /^(Tn\.|Ny\.|Nn\.|An\.|Anak\.)\s*/i;

export function maskName(name: string): string {
  if (!name) return "-";
  const m = name.match(HONORIFIC);
  const prefix = m ? m[0] : "";
  const rest = name.slice(prefix.length).trim();
  const parts = rest.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return prefix || "-";

  const first = parts[0];
  const maskedFirst =
    first.length <= 1 ? "•••" : first[0] + "•••";
  const tail = parts
    .slice(1)
    .map((p) => (p ? p[0] + "••" : ""))
    .filter(Boolean)
    .join(" ");

  return `${prefix}${maskedFirst}${tail ? " " + tail : ""}`.trim();
}

export function maskRM(rm: string): string {
  if (!rm) return "-";
  if (rm.length <= 3) return "•••";
  return rm.slice(0, 3) + "••" + rm.slice(-2);
}

export function maskAddress(addr: string): string {
  if (!addr) return "-";
  const parts = addr
    .split(/[,\/]/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 0) return "-";
  const first = parts[0];
  const shown = first.length > 14 ? first.slice(0, 14) + "…" : first;
  return `${shown} (disamarkan)`;
}

export function maskText(value: string): string {
  if (!value) return "-";
  return value[0] + "•••";
}

/**
 * Returns the display value for a field based on PII permission.
 */
export function protect(
  value: string,
  canViewPII: boolean,
  kind: "name" | "rm" | "address" | "text" = "text"
): string {
  if (canViewPII) return value || "-";
  switch (kind) {
    case "name":
      return maskName(value);
    case "rm":
      return maskRM(value);
    case "address":
      return maskAddress(value);
    default:
      return maskText(value);
  }
}
