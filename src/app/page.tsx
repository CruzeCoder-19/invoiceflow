import type { Metadata } from "next";
import Link from "next/link";
import { Zap, FileText, Users, BarChart2, Download, Shield, ArrowRight, CheckCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "InvoiceDo — Invoice Smarter, Get Paid Faster",
  description: "Create professional invoices, manage clients, and track payments — all in one place.",
};

const features = [
  {
    icon: FileText,
    title: "Professional Invoices",
    desc: "Create beautiful, branded invoices in seconds with auto-generated numbers and PDF export.",
  },
  {
    icon: Users,
    title: "Client Management",
    desc: "Keep all your client details organised in one place. Link invoices directly to clients.",
  },
  {
    icon: BarChart2,
    title: "Revenue Dashboard",
    desc: "Track paid, outstanding, and overdue amounts at a glance with live charts.",
  },
  {
    icon: Download,
    title: "PDF Generation",
    desc: "Download pixel-perfect PDF invoices to share with clients or keep for your records.",
  },
  {
    icon: Shield,
    title: "Secure Auth",
    desc: "Sign in with Google or email/password. Your data is always private and protected.",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    desc: "Get started in minutes — no complicated configuration, no credit card required.",
  },
];

const highlights = [
  "Auto-generated invoice numbers (INV-0001…)",
  "Tax rate & discount calculations",
  "Draft, Sent, Paid, Overdue & Cancelled statuses",
  "Vercel-ready for one-click deployment",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900">InvoiceDo</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white pt-20 pb-24 sm:pt-28 sm:pb-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-xs font-medium text-indigo-700 mb-6">
            <Zap className="h-3 w-3" /> SaaS Invoice Generator
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Invoicing that
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {" "}gets you paid
            </span>
          </h1>
          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            InvoiceDo lets you create professional invoices, manage clients, and track revenue —
            all from a clean, fast dashboard.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-md hover:bg-indigo-700 transition-colors"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Sign in
            </Link>
          </div>

          {/* Highlights */}
          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-1.5 text-sm text-gray-500">
                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                {h}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">
              A complete invoicing toolkit built with Next.js 14, PostgreSQL, and Prisma.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl border border-gray-200 bg-gray-50 p-6 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-600">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to streamline your invoicing?</h2>
          <p className="mt-3 text-indigo-200">
            Create your free account and send your first invoice in minutes.
          </p>
          <Link
            href="/register"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} InvoiceDo. Built with Next.js, Prisma & Tailwind CSS.
      </footer>
    </div>
  );
}
