import {
  Document,
  Font,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Invoice, InvoiceItem, Client, User } from "@prisma/client";
import { getStateName } from "@/lib/tax/states";
import path from "path";

Font.register({
  family: "NotoSans",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/NotoSans-Regular.ttf"), fontWeight: "normal" },
    { src: path.join(process.cwd(), "public/fonts/NotoSans-Bold.ttf"), fontWeight: "bold" },
  ],
});

interface InvoicePDFProps {
  invoice: Invoice & {
    items: InvoiceItem[];
    client: Client;
    user: User | null;
  };
  logoDataUrl?: string | null;
}

// ── Column width budget ────────────────────────────────────────────────────
// A4: 595pt. Horizontal padding: 2×50 = 100pt. Usable: 495pt.
// Table paddingHorizontal: 10 each side = 20pt. Column space: 475pt.
//
// Intra-state fixed cols: 30+60+70+45+55+55+65 = 380 → 95pt for flex desc ✓
// Inter-state fixed cols: 30+60+70+45+55+65    = 325 → 150pt for flex desc ✓
// Legacy/BOS  fixed cols: 50+80+80             = 210 → 265pt for flex desc ✓

const styles = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 10,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 50,
    color: "#1a1a2e",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  logo: { fontSize: 22, fontFamily: "NotoSans", fontWeight: "bold", color: "#4f46e5" },
  logoImage: { width: 80, height: 80, objectFit: "contain", marginBottom: 8 },
  companyInfo: { fontSize: 9, color: "#6b7280", lineHeight: 1.6 },
  // GST info lines appended to seller/buyer blocks
  gstInfoBlock: { marginTop: 5 },
  gstInfoLine: { fontSize: 8, color: "#9ca3af", lineHeight: 1.5 },
  gstInfoBold: { fontFamily: "NotoSans", fontWeight: "bold", color: "#6b7280" },
  invoiceTitle: {
    fontSize: 26,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
    textAlign: "right",
  },
  invoiceNumber: { fontSize: 11, color: "#6b7280" },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  billTo: { fontSize: 10, color: "#374151", lineHeight: 1.7 },
  billToName: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 11, color: "#111827" },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { fontSize: 9, color: "#9ca3af", width: 90 },
  metaValue: { fontSize: 9, color: "#374151", fontFamily: "NotoSans", fontWeight: "bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 16 },
  // Legacy banner
  legacyBanner: {
    backgroundColor: "#f3f4f6",
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  legacyBannerText: { fontSize: 8, color: "#6b7280" },
  // Table
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderRadius: 4,
    paddingVertical: 7,
    paddingHorizontal: 10,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  // Non-GST column widths (legacy / BILL_OF_SUPPLY)
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colRate: { width: 80, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  // GST-mode narrower variants of the existing columns
  colQtyGst: { width: 30, textAlign: "right" },
  colRateGst: { width: 60, textAlign: "right" },
  colAmountGst: { width: 65, textAlign: "right" },
  // New GST-specific columns
  colTaxable: { width: 70, textAlign: "right" },
  colGstRate: { width: 45, textAlign: "right" },
  colCgst: { width: 55, textAlign: "right" },
  colSgst: { width: 55, textAlign: "right" },
  colIgst: { width: 55, textAlign: "right" },
  // Totals
  totalSection: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", marginBottom: 4 },
  totalLabel: { fontSize: 10, color: "#6b7280", width: 130, textAlign: "right", paddingRight: 12 },
  totalValue: { fontSize: 10, color: "#374151", width: 80, textAlign: "right" },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#111827",
    width: 130,
    textAlign: "right",
    paddingRight: 12,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "NotoSans",
    fontWeight: "bold",
    color: "#4f46e5",
    width: 80,
    textAlign: "right",
  },
  notesSection: { marginTop: 24 },
  notesText: { fontSize: 9, color: "#6b7280", lineHeight: 1.6 },
  statusBadge: {
    backgroundColor: "#ecfdf5",
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 10,
    alignSelf: "flex-end",
    marginTop: 8,
  },
  statusText: { fontSize: 9, fontFamily: "NotoSans", fontWeight: "bold", color: "#059669" },
  // Override footer
  overrideNote: { fontSize: 8, color: "#d97706", marginTop: 12 },
});

function formatMoney(amount: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Renders a small "GSTIN / PAN / State" block in seller and buyer sections. */
function GstInfoBlock({
  gstin,
  stateCode,
  pan,
  unregisteredLabel = "—",
}: {
  gstin: string | null;
  stateCode: string | null;
  pan?: string | null;
  unregisteredLabel?: string;
}) {
  const stateName = stateCode ? getStateName(stateCode) : null;
  return (
    <View style={styles.gstInfoBlock}>
      <Text style={styles.gstInfoLine}>
        <Text style={styles.gstInfoBold}>GSTIN: </Text>
        {gstin ?? unregisteredLabel}
      </Text>
      {pan && (
        <Text style={styles.gstInfoLine}>
          <Text style={styles.gstInfoBold}>PAN: </Text>
          {pan}
        </Text>
      )}
      {stateCode && (
        <Text style={styles.gstInfoLine}>
          <Text style={styles.gstInfoBold}>State: </Text>
          {stateCode}
          {stateName ? ` — ${stateName}` : ""}
        </Text>
      )}
    </View>
  );
}

export function InvoicePDFDocument({ invoice, logoDataUrl }: InvoicePDFProps) {
  const { client, user, items } = invoice;

  // ── Derived flags ──────────────────────────────────────────────────────
  const isLegacy = invoice.supplyType === null;
  const isTaxInvoice = invoice.documentType === "TAX_INVOICE";
  const isIntra = invoice.supplyType === "INTRA_STATE";
  const isInter = invoice.supplyType === "INTER_STATE";

  // Whether to show GST-specific columns and blocks
  const showGst = !isLegacy && isTaxInvoice;
  const showCgstSgst = showGst && isIntra;
  const showIgst = showGst && isInter;

  // Tax totals from per-line stored amounts
  const cgstTotal = items.reduce((s, i) => s + Number(i.cgstAmount), 0);
  const sgstTotal = items.reduce((s, i) => s + Number(i.sgstAmount), 0);
  const igstTotal = items.reduce((s, i) => s + Number(i.igstAmount), 0);

  // Document title
  const docTitle = isLegacy
    ? "INVOICE"
    : invoice.documentType === "BILL_OF_SUPPLY"
      ? "BILL OF SUPPLY"
      : "TAX INVOICE";

  // Place of supply display string
  const placeOfSupplyText = invoice.placeOfSupply
    ? `${invoice.placeOfSupply}${getStateName(invoice.placeOfSupply) ? ` — ${getStateName(invoice.placeOfSupply)}` : ""}`
    : null;

  // Column style selectors: narrower variants when GST columns are present
  const qtyCol = showGst ? styles.colQtyGst : styles.colQty;
  const rateCol = showGst ? styles.colRateGst : styles.colRate;
  const amountCol = showGst ? styles.colAmountGst : styles.colAmount;

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Document header ──────────────────────────────────────── */}
        <View style={styles.header}>

          {/* Seller block */}
          <View>
            {logoDataUrl && <Image src={logoDataUrl} style={styles.logoImage} />}
            <Text style={styles.logo}>{user?.company ?? "InvoiceDo"}</Text>
            {user && (
              <Text style={styles.companyInfo}>
                {[user.address, user.city, user.state, user.country].filter(Boolean).join(", ")}
                {user.email ? `\n${user.email}` : ""}
                {user.phone ? `\n${user.phone}` : ""}
              </Text>
            )}
            {/* Seller GST info — snapshot at issue time, PAN from user profile */}
            {!isLegacy && (
              <GstInfoBlock
                gstin={invoice.sellerGstinSnapshot}
                stateCode={invoice.sellerStateSnapshot}
                pan={user?.pan ?? null}
              />
            )}
          </View>

          {/* Document title block */}
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invoiceTitle}>{docTitle}</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            {invoice.status === "PAID" && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>PAID</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Bill To + Invoice Details ─────────────────────────── */}
        <View style={[styles.row, styles.section]}>

          {/* Buyer block */}
          <View>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.billToName}>{client.name}</Text>
            {client.company && <Text style={styles.billTo}>{client.company}</Text>}
            <Text style={styles.billTo}>
              {[client.address, client.city, client.state, client.country]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {client.email && <Text style={styles.billTo}>{client.email}</Text>}
            {/* Buyer GST info — snapshot at issue time */}
            {!isLegacy && (
              <GstInfoBlock
                gstin={invoice.buyerGstinSnapshot}
                stateCode={invoice.buyerStateSnapshot}
                unregisteredLabel="N/A"
              />
            )}
          </View>

          {/* Invoice meta */}
          <View>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Issue Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Due Date</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.dueDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Status</Text>
              <Text style={styles.metaValue}>{invoice.status}</Text>
            </View>
            {!isLegacy && placeOfSupplyText && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Place of Supply</Text>
                <Text style={styles.metaValue}>{placeOfSupplyText}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* ── Legacy banner ─────────────────────────────────────── */}
        {isLegacy && (
          <View style={styles.legacyBanner}>
            <Text style={styles.legacyBannerText}>
              Legacy invoice — no GST breakdown available
            </Text>
          </View>
        )}

        {/* ── Items Table ───────────────────────────────────────── */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, qtyCol]}>Qty</Text>
          <Text style={[styles.tableHeaderText, rateCol]}>Rate</Text>
          {showGst && (
            <>
              <Text style={[styles.tableHeaderText, styles.colTaxable]}>Taxable</Text>
              <Text style={[styles.tableHeaderText, styles.colGstRate]}>GST%</Text>
            </>
          )}
          {showCgstSgst && (
            <>
              <Text style={[styles.tableHeaderText, styles.colCgst]}>CGST</Text>
              <Text style={[styles.tableHeaderText, styles.colSgst]}>SGST</Text>
            </>
          )}
          {showIgst && (
            <Text style={[styles.tableHeaderText, styles.colIgst]}>IGST</Text>
          )}
          <Text style={[styles.tableHeaderText, amountCol]}>Amount</Text>
        </View>

        {items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[{ fontSize: 10, color: "#374151" }, styles.colDesc]}>
              {item.description}
            </Text>
            <Text style={[{ fontSize: 10, color: "#374151" }, qtyCol]}>
              {item.quantity}
            </Text>
            <Text style={[{ fontSize: 10, color: "#374151" }, rateCol]}>
              {formatMoney(Number(item.rate))}
            </Text>
            {showGst && (
              <>
                <Text style={[{ fontSize: 10, color: "#374151" }, styles.colTaxable]}>
                  {formatMoney(Number(item.taxableValue))}
                </Text>
                <Text style={[{ fontSize: 10, color: "#374151" }, styles.colGstRate]}>
                  {item.gstRatePct}%
                </Text>
              </>
            )}
            {showCgstSgst && (
              <>
                <Text style={[{ fontSize: 9, color: "#374151" }, styles.colCgst]}>
                  {formatMoney(Number(item.cgstAmount))}
                </Text>
                <Text style={[{ fontSize: 9, color: "#374151" }, styles.colSgst]}>
                  {formatMoney(Number(item.sgstAmount))}
                </Text>
              </>
            )}
            {showIgst && (
              <Text style={[{ fontSize: 9, color: "#374151" }, styles.colIgst]}>
                {formatMoney(Number(item.igstAmount))}
              </Text>
            )}
            <Text style={[{ fontSize: 10, color: "#374151" }, amountCol]}>
              {formatMoney(Number(item.amount))}
            </Text>
          </View>
        ))}

        {/* ── Totals ────────────────────────────────────────────── */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{formatMoney(Number(invoice.subtotal))}</Text>
          </View>

          {Number(invoice.discount) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount</Text>
              <Text style={[styles.totalValue, { color: "#059669" }]}>
                -{formatMoney(Number(invoice.discount))}
              </Text>
            </View>
          )}

          {/* Legacy: single tax line */}
          {isLegacy && Number(invoice.taxRate) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({Number(invoice.taxRate)}%)</Text>
              <Text style={styles.totalValue}>{formatMoney(Number(invoice.taxAmount))}</Text>
            </View>
          )}

          {/* GST intra-state: CGST + SGST */}
          {showCgstSgst && (
            <>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>CGST</Text>
                <Text style={styles.totalValue}>{formatMoney(cgstTotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>SGST</Text>
                <Text style={styles.totalValue}>{formatMoney(sgstTotal)}</Text>
              </View>
            </>
          )}

          {/* GST inter-state: IGST */}
          {showIgst && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IGST</Text>
              <Text style={styles.totalValue}>{formatMoney(igstTotal)}</Text>
            </View>
          )}

          <View style={[styles.divider, { width: 210, marginVertical: 8 }]} />

          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(Number(invoice.total))}</Text>
          </View>
        </View>

        {/* ── Notes & Terms ─────────────────────────────────────── */}
        {(invoice.notes || invoice.terms) && (
          <View style={[styles.divider, { marginTop: 24 }]} />
        )}
        {invoice.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}
        {invoice.terms && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>Terms &amp; Conditions</Text>
            <Text style={styles.notesText}>{invoice.terms}</Text>
          </View>
        )}

      </Page>
    </Document>
  );
}
