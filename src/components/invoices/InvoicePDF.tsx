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
  invoiceTitle: {
    fontSize: 28,
    fontFamily: "NotoSans", fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  invoiceNumber: { fontSize: 11, color: "#6b7280" },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "NotoSans", fontWeight: "bold",
    color: "#9ca3af",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  billTo: { fontSize: 10, color: "#374151", lineHeight: 1.7 },
  billToName: { fontFamily: "NotoSans", fontWeight: "bold", fontSize: 11, color: "#111827" },
  metaRow: { flexDirection: "row", marginBottom: 4 },
  metaLabel: { fontSize: 9, color: "#9ca3af", width: 80 },
  metaValue: { fontSize: 9, color: "#374151", fontFamily: "NotoSans", fontWeight: "bold" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#e5e7eb", marginVertical: 16 },
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
    fontFamily: "NotoSans", fontWeight: "bold",
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
  colDesc: { flex: 1 },
  colQty: { width: 50, textAlign: "right" },
  colRate: { width: 80, textAlign: "right" },
  colAmount: { width: 80, textAlign: "right" },
  totalSection: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", marginBottom: 4 },
  totalLabel: { fontSize: 10, color: "#6b7280", width: 120, textAlign: "right", paddingRight: 12 },
  totalValue: { fontSize: 10, color: "#374151", width: 80, textAlign: "right" },
  grandTotalLabel: {
    fontSize: 12,
    fontFamily: "NotoSans", fontWeight: "bold",
    color: "#111827",
    width: 120,
    textAlign: "right",
    paddingRight: 12,
  },
  grandTotalValue: {
    fontSize: 12,
    fontFamily: "NotoSans", fontWeight: "bold",
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
    alignSelf: "flex-start",
    marginTop: 8,
  },
  statusText: { fontSize: 9, fontFamily: "NotoSans", fontWeight: "bold", color: "#059669" },
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

export function InvoicePDFDocument({ invoice, logoDataUrl }: InvoicePDFProps) {
  const { client, user, items } = invoice;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            {logoDataUrl && (
              <Image src={logoDataUrl} style={styles.logoImage} />
            )}
            <Text style={styles.logo}>{user?.company ?? "InvoiceDo"}</Text>
            {user && (
              <Text style={styles.companyInfo}>
                {[user.address, user.city, user.state, user.country]
                  .filter(Boolean)
                  .join(", ")}
                {user.email ? `\n${user.email}` : ""}
                {user.phone ? `\n${user.phone}` : ""}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            {invoice.status === "PAID" && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>PAID</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Bill To + Meta */}
        <View style={[styles.row, styles.section]}>
          <View>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.billToName}>{client.name}</Text>
            {client.company && (
              <Text style={styles.billTo}>{client.company}</Text>
            )}
            <Text style={styles.billTo}>
              {[client.address, client.city, client.state, client.country]
                .filter(Boolean)
                .join(", ")}
            </Text>
            {client.email && <Text style={styles.billTo}>{client.email}</Text>}
          </View>
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
          </View>
        </View>

        <View style={styles.divider} />

        {/* Items Table */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, styles.colDesc]}>Description</Text>
          <Text style={[styles.tableHeaderText, styles.colQty]}>Qty</Text>
          <Text style={[styles.tableHeaderText, styles.colRate]}>Rate</Text>
          <Text style={[styles.tableHeaderText, styles.colAmount]}>Amount</Text>
        </View>
        {items.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={[{ fontSize: 10, color: "#374151" }, styles.colDesc]}>
              {item.description}
            </Text>
            <Text style={[{ fontSize: 10, color: "#374151" }, styles.colQty]}>
              {item.quantity}
            </Text>
            <Text style={[{ fontSize: 10, color: "#374151" }, styles.colRate]}>
              {formatMoney(Number(item.rate))}
            </Text>
            <Text style={[{ fontSize: 10, color: "#374151" }, styles.colAmount]}>
              {formatMoney(Number(item.amount))}
            </Text>
          </View>
        ))}

        {/* Totals */}
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
          {Number(invoice.taxRate) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({Number(invoice.taxRate)}%)</Text>
              <Text style={styles.totalValue}>{formatMoney(Number(invoice.taxAmount))}</Text>
            </View>
          )}
          <View style={[styles.divider, { width: 200, marginVertical: 8 }]} />
          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total Due</Text>
            <Text style={styles.grandTotalValue}>{formatMoney(Number(invoice.total))}</Text>
          </View>
        </View>

        {/* Notes & Terms */}
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
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.notesText}>{invoice.terms}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
