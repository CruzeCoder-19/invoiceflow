import { z } from "zod";
import { validateGstin, isValidGstRate } from "@/lib/tax/gst";
import { INDIAN_STATES } from "@/lib/tax/states";

// ---------------------------------------------------------------------------
// Reusable primitives
// ---------------------------------------------------------------------------

/**
 * Validates a GSTIN string — structural regex + MOD-36 checksum +
 * optional state-code cross-check.
 * Returns a Zod string schema with a .superRefine() so it composes cleanly
 * into larger schemas via .merge() or .extend().
 */
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .superRefine((val, ctx) => {
    const result = validateGstin(val);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.error });
    }
  });

/** Optional PAN — 10-char format AAAAA9999A, empty string treated as absent. */
export const optionalPanSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v?.toUpperCase()))
  .superRefine((val, ctx) => {
    if (!val) return;
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(val)) {
      ctx.addIssue({ code: "custom", message: "Invalid PAN format (e.g. ABCDE1234F)" });
    }
  });

/** Optional GSTIN — empty string treated as absent (no validation). */
export const optionalGstinSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v?.toUpperCase()))
  .superRefine((val, ctx) => {
    if (!val) return;
    const result = validateGstin(val);
    if (!result.ok) {
      ctx.addIssue({ code: "custom", message: result.error });
    }
  });

/** 2-digit numeric state code that exists in the GSTN list. */
export const stateCodeSchema = z
  .string()
  .trim()
  .regex(/^\d{2}$/, "State code must be 2 digits")
  .refine((v) => v in INDIAN_STATES, { message: "Unrecognised state code" });

export const optionalStateCodeSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v === "" ? undefined : v))
  .refine((v) => !v || v in INDIAN_STATES, { message: "Unrecognised state code" });

// ---------------------------------------------------------------------------
// GST details schemas (used for settings + client forms)
// ---------------------------------------------------------------------------

/**
 * GST details for the seller (User record).
 * GSTIN is optional (unregistered sellers → BILL_OF_SUPPLY).
 * When GSTIN is provided, state code is required and the two must agree.
 */
export const sellerGstDetailsSchema = z
  .object({
    gstin: optionalGstinSchema,
    gstStateCode: optionalStateCodeSchema,
    gstStateName: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.gstin && !data.gstStateCode) {
      ctx.addIssue({
        code: "custom",
        path: ["gstStateCode"],
        message: "State is required when GSTIN is provided",
      });
      return;
    }
    if (data.gstin && data.gstStateCode) {
      const result = validateGstin(data.gstin, data.gstStateCode);
      if (!result.ok) {
        ctx.addIssue({ code: "custom", path: ["gstin"], message: result.error });
      }
    }
  });

export type SellerGstDetailsInput = z.infer<typeof sellerGstDetailsSchema>;

/**
 * GST details for a buyer (Client record).
 * isBusiness drives UI; server derives it from !!gstin.
 * When isBusiness is true, GSTIN + state code are both required.
 * State code is always required (used for place-of-supply even for B2C).
 *
 * TODO: billing state (Client.state) and GST state (gstStateCode) are
 * independent today and are not cross-validated. A future improvement is to
 * warn when the two diverge (e.g. billing state "Maharashtra" vs GSTIN state
 * code "21" Odisha) so the user can reconcile before saving.
 */
export const clientGstDetailsSchema = z
  .object({
    isBusiness: z.boolean().default(false),
    gstin: optionalGstinSchema,
    gstStateCode: optionalStateCodeSchema,
    gstStateName: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isBusiness) {
      if (!data.gstin) {
        ctx.addIssue({
          code: "custom",
          path: ["gstin"],
          message: "GSTIN is required for business clients",
        });
      }
      if (!data.gstStateCode) {
        ctx.addIssue({
          code: "custom",
          path: ["gstStateCode"],
          message: "State is required for business clients",
        });
      }
      if (data.gstin && data.gstStateCode) {
        const result = validateGstin(data.gstin, data.gstStateCode);
        if (!result.ok) {
          ctx.addIssue({ code: "custom", path: ["gstin"], message: result.error });
        }
      }
    }
  });

export type ClientGstDetailsInput = z.infer<typeof clientGstDetailsSchema>;

// ---------------------------------------------------------------------------
// Invoice GST schema
// ---------------------------------------------------------------------------

export const supplyTypeSchema = z.enum(["INTRA_STATE", "INTER_STATE"]);
export const documentTypeSchema = z.enum(["TAX_INVOICE", "BILL_OF_SUPPLY"]);

/**
 * GST fields that extend the base invoice schema.
 * placeOfSupply is required when any GST data is present.
 */
export const invoiceGstSchema = z.object({
  supplyType: supplyTypeSchema.optional(),
  placeOfSupply: optionalStateCodeSchema,
  supplyTypeOverridden: z.boolean().default(false),
  documentType: documentTypeSchema.default("TAX_INVOICE"),
  // Snapshots are derived server-side; client need not send them.
});

export type InvoiceGstInput = z.infer<typeof invoiceGstSchema>;

/** Per-line GST rate — must be one of the valid GST slabs. */
export const gstRatePctSchema = z
  .number()
  .int("GST rate must be a whole number")
  .refine(isValidGstRate, { message: "GST rate must be 0, 5, 12, 18, or 28" });
