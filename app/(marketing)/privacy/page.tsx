import Link from "next/link";


import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — adspoonX",
  description: "Privacy Policy for adspoonX — Facebook Ads Intelligence Platform",
};

const SECTIONS = [
  {
    id: "overview",
    title: "1. Overview",
    content: `adspoonX ("we", "us", or "our") operates the website adspoonx.com and provides a Facebook Ads intelligence platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.

By accessing or using adspoonX, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our services.`,
  },
  {
    id: "information-collected",
    title: "2. Information We Collect",
    subsections: [
      {
        title: "2.1 Account Information",
        content: `When you create an account, we collect:
• Email address
• Name (if provided via Google OAuth)
• Profile picture (if provided via Google OAuth)
• Encrypted password (if using email/password registration)`,
      },
      {
        title: "2.2 Usage Data",
        content: `We automatically collect certain information when you use our service:
• Log data (IP address, browser type, pages visited, time and date of visits)
• Device information (hardware model, operating system)
• Interaction data (ads viewed, searches performed, saved ads)`,
      },
      {
        title: "2.3 Payment Information",
        content: `We use LemonSqueezy as our payment processor. We do not store credit card numbers or sensitive payment information directly. Payment data is handled by LemonSqueezy in accordance with their privacy policy.`,
      },
      {
        title: "2.4 Facebook Ads Data",
        content: `adspoonX displays publicly available data from the Facebook Ads Library. This data is sourced from Meta's public Ads Library and the Ads Library API. We do not collect or store any private Facebook user data. We do not use Facebook Login for our platform.`,
      },
    ],
  },
  {
    id: "how-we-use",
    title: "3. How We Use Your Information",
    content: `We use the information we collect to:
• Create and manage your account
• Provide access to our ad intelligence features
• Process transactions and send related information
• Send transactional emails (account confirmations, password resets)
• Monitor and analyze usage patterns to improve our services
• Detect, prevent, and address technical issues or abuse
• Comply with legal obligations`,
  },
  {
    id: "facebook-data",
    title: "4. Facebook / Meta Platform Data",
    content: `adspoonX uses the Facebook Ads Library API (provided by Meta Platforms, Inc.) to access and display publicly available advertisement data. Specifically:

• We only access data available through Meta's public Ads Library
• We do not use Facebook Login or request access to users' personal Facebook accounts
• We do not collect, store, or process any personal data of Facebook users
• Ad data we display includes: ad creative text, images/videos, page names, and country targeting — all of which are publicly disclosed by Meta
• We do not sell, transfer, or share Meta platform data with third parties
• We use Meta platform data solely to provide the ad research features of our service

Our use of Meta platform data complies with Meta's Platform Terms and Developer Policies.`,
  },
  {
    id: "data-sharing",
    title: "5. Data Sharing and Disclosure",
    content: `We do not sell, trade, or rent your personal information to third parties. We may share data with:

• Service providers: Infrastructure partners (Vercel, Supabase/PostgreSQL) that help us operate our platform, under confidentiality obligations
• Payment processor: LemonSqueezy for payment processing
• Legal requirements: When required by law, court order, or governmental authority
• Business transfer: In connection with a merger, acquisition, or sale of assets, with prior notice to affected users

We do not share your data for advertising or marketing purposes by third parties.`,
  },
  {
    id: "data-retention",
    title: "6. Data Retention",
    content: `We retain your personal data for as long as your account is active or as needed to provide services. You may request deletion of your account and associated data at any time by contacting us at privacy@adspoonx.com.

Upon deletion request, we will remove your personal information within 30 days, except where retention is required by law.`,
  },
  {
    id: "user-rights",
    title: "7. Your Rights",
    content: `Depending on your location, you may have the following rights regarding your personal data:

• Access: Request a copy of the personal data we hold about you
• Correction: Request correction of inaccurate or incomplete data
• Deletion: Request deletion of your personal data ("right to be forgotten")
• Portability: Request a machine-readable copy of your data
• Objection: Object to processing of your data for certain purposes
• Withdrawal: Withdraw consent at any time (where processing is based on consent)

To exercise any of these rights, contact us at privacy@adspoonx.com. We will respond within 30 days.

For users in the European Economic Area (EEA), you also have the right to lodge a complaint with your local data protection authority.`,
  },
  {
    id: "cookies",
    title: "8. Cookies and Tracking",
    content: `We use cookies and similar tracking technologies to:
• Maintain your login session
• Remember your preferences
• Analyze traffic and usage patterns (via server-side analytics only)

We do not use third-party advertising cookies. You can control cookies through your browser settings. Disabling cookies may affect certain features of our service.`,
  },
  {
    id: "security",
    title: "9. Security",
    content: `We implement industry-standard security measures to protect your information:
• Encrypted connections (HTTPS/TLS) for all data transmission
• Passwords stored using bcrypt hashing
• Access controls limiting who can access personal data
• Regular security reviews of our systems

No method of transmission over the Internet is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.`,
  },
  {
    id: "third-party",
    title: "10. Third-Party Services",
    content: `Our service integrates with:
• Google OAuth (for Sign in with Google) — governed by Google's Privacy Policy
• LemonSqueezy (payment processing) — governed by LemonSqueezy's Privacy Policy
• Vercel (hosting) — governed by Vercel's Privacy Policy
• Supabase (database) — governed by Supabase's Privacy Policy
• Meta Ads Library API — governed by Meta's Platform Terms

We are not responsible for the privacy practices of these third-party services.`,
  },
  {
    id: "children",
    title: "11. Children's Privacy",
    content: `Our service is not directed to individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal information, we will delete such information promptly.`,
  },
  {
    id: "international",
    title: "12. International Data Transfers",
    content: `Your information may be transferred to and processed in countries other than your own (including the United States). These countries may have different data protection laws. By using our service, you consent to this transfer. We ensure appropriate safeguards are in place for such transfers in accordance with applicable law.`,
  },
  {
    id: "changes",
    title: "13. Changes to This Policy",
    content: `We may update this Privacy Policy periodically. We will notify you of significant changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of our service after changes constitutes acceptance of the updated policy.`,
  },
  {
    id: "contact",
    title: "14. Contact Us",
    content: `If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

Archy Media LLC
1942 Broadway St. STE 314C, Boulder, CO 80302, USA
Phone: +1 (325) 442-9234
Email: privacy@adspoonx.com
Website: https://adspoonx.com

We aim to respond to all privacy-related inquiries within 5 business days.`,
  },
];

export default function PrivacyPage() {
  const lastUpdated = "March 26, 2026";

  return (
    <div className="min-h-screen" style={{ background: "var(--sidebar-bg)", color: "var(--text-primary)" }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: "rgba(15,17,23,0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <Link href="/home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-transparent.png" alt="AdSpoonX" className="h-7" style={{ filter: "invert(1)", objectFit: "contain" }} />
        </Link>
        <Link
          href="/login"
          className="text-sm font-semibold px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
        >
          Get Started Free
        </Link>
      </nav>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-20">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-3" style={{ color: "var(--text-primary)" }}>
            Privacy Policy
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Last updated: {lastUpdated}
          </p>
          <div
            className="mt-6 p-4 rounded-xl text-sm"
            style={{
              background: "rgba(99,102,241,0.08)",
              border: "1px solid rgba(99,102,241,0.2)",
              color: "var(--text-secondary)",
            }}
          >
            This Privacy Policy applies to adspoonX (adspoonx.com) and describes how we handle your
            personal information. Please read it carefully before using our services.
          </div>
        </div>

        {/* Table of Contents */}
        <nav
          className="mb-12 p-5 rounded-xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
            Contents
          </p>
          <ul className="space-y-1.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm transition-colors hover:text-indigo-400"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
                {section.title}
              </h2>

              {"subsections" in section && section.subsections ? (
                <div className="space-y-6">
                  {section.subsections.map((sub) => (
                    <div key={sub.title}>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--text-secondary)" }}>
                        {sub.title}
                      </h3>
                      <p
                        className="text-sm leading-relaxed whitespace-pre-line"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {sub.content}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-line"
                  style={{ color: "var(--text-muted)" }}
                >
                  {"content" in section ? section.content : ""}
                </p>
              )}

              <div
                className="mt-8 h-px"
                style={{ background: "var(--border)" }}
              />
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div
          className="mt-12 p-5 rounded-xl text-sm text-center"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
          }}
        >
          Questions about this policy?{" "}
          <a href="mailto:privacy@adspoonx.com" className="text-indigo-400 hover:text-indigo-300">
            privacy@adspoonx.com
          </a>
        </div>
      </main>
    </div>
  );
}
