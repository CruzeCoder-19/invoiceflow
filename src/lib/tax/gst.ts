/**
 * Pure GST computation utilities — no DB access, no framework imports.
 *
 * Money convention: all rupee values are plain JS `number` (IEEE 754 double).
 * Rounding: Math.round(x * 100) / 100 — safe up to ~₹9,00,00,000 per line
 * item. For larger values consider a decimal library (e.g. decimal.js).
 */

export type SupplyType = "INTRA_STATE" | "INTER_STATE";

const GST_RATES = [0, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

// ---------------------------------------------------------------------------
// Supply type detection
// ---------------------------------------------------------------------------

/**
 * Compares seller and buyer state codes to determine supply type.
 * Throws if either code is absent — callers must validate inputs first.
 */
export function determineSupplyType(
  sellerStateCode: string | null | undefined,
  buyerStateCode: string | null | undefined
): SupplyType {
  if (!sellerStateCode || !buyerStateCode) {
    throw new Error("Both seller and buyer state codes are required to determine supply type");
  }
  return sellerStateCode.trim() === buyerStateCode.trim() ? "INTRA_STATE" : "INTER_STATE";
}

// ---------------------------------------------------------------------------
// Tax computation
// ---------------------------------------------------------------------------

export interface LineTaxResult {
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Computes CGST/SGST (intra-state) or IGST (inter-state) for a single line.
 * Each component is rounded independently before summing.
 *
 * INTRA_STATE: cgst = sgst = round(taxableValue × rate / 200), igst = 0
 * INTER_STATE: igst = round(taxableValue × rate / 100), cgst = sgst = 0
 */
export function computeLineTax(
  taxableValue: number,
  gstRatePct: number,
  supplyType: SupplyType
): LineTaxResult {
  if (supplyType === "INTRA_STATE") {
    const half = round2((taxableValue * gstRatePct) / 200);
    return { cgst: half, sgst: half, igst: 0, totalTax: round2(half + half) };
  } else {
    const igst = round2((taxableValue * gstRatePct) / 100);
    return { cgst: 0, sgst: 0, igst, totalTax: igst };
  }
}

// ---------------------------------------------------------------------------
// GSTIN validation
// ---------------------------------------------------------------------------

/**
 * Validates a GSTIN in two stages:
 *   1. Structural regex check (format and length)
 *   2. MOD-36 check-digit verification via verifyGstinChecksum()
 * Optionally cross-checks the embedded state code against expectedStateCode.
 */
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstin(
  gstin: string,
  expectedStateCode?: string
): { ok: true } | { ok: false; error: string } {
  const trimmed = gstin.trim().toUpperCase();

  if (!GSTIN_REGEX.test(trimmed)) {
    return {
      ok: false,
      error: "Invalid GSTIN format. Expected: 2 digits + 5 letters + 4 digits + letter + alphanumeric + Z + alphanumeric (e.g. 21AABCU9603R1ZX)",
    };
  }

  const checksumResult = verifyGstinChecksum(trimmed);
  if (!checksumResult.ok) return checksumResult;

  if (expectedStateCode) {
    const gstinState = trimmed.slice(0, 2);
    if (gstinState !== expectedStateCode.trim()) {
      return {
        ok: false,
        error: `GSTIN's state code (${gstinState}) does not match the selected state (${expectedStateCode}).`,
      };
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------------------
// MOD-36 checksum (structural check digit verification)
// ---------------------------------------------------------------------------

/**
 * MOD-36 check-digit verification for GSTIN (position 15).
 * Character set: '0'–'9' → 0–9, 'A'–'Z' → 10–35 (base-36).
 * Alternating weights 1/2; products ≥ 36 have their base-36 digits summed.
 * Expected check = CHARSET[(36 - (sum % 36)) % 36].
 * Called internally by validateGstin() after structural regex passes.
 */
const CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function charValue(c: string): number {
  return CHARSET.indexOf(c);
}

export function verifyGstinChecksum(
  gstin: string
): { ok: true } | { ok: false; error: string } {
  const s = gstin.trim().toUpperCase();
  if (s.length !== 15) return { ok: false, error: "GSTIN must be 15 characters" };

  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = charValue(s[i]);
    if (val === -1) return { ok: false, error: `Invalid character '${s[i]}' at position ${i + 1}` };
    const product = val * (i % 2 === 0 ? 1 : 2);
    // Two-digit product: add the two digits
    sum += product < 36 ? product : Math.floor(product / 36) + (product % 36);
  }

  const expectedIndex = (36 - (sum % 36)) % 36;
  const expected = CHARSET[expectedIndex];
  const actual = s[14];

  if (actual !== expected) {
    return {
      ok: false,
      error: `GSTIN check digit is invalid (got '${actual}', expected '${expected}').`,
    };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true for recognised GST rates; used in Zod refinements. */
export function isValidGstRate(rate: number): rate is GstRate {
  return (GST_RATES as readonly number[]).includes(rate);
}
