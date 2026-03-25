import Link from "next/link";


import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — adspoonX",
  description: "Terms of Service for adspoonX — Facebook Ads Intelligence Platform",
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: `By accessing or using adspoonX ("Service"), operated by Archy Media LLC ("Company", "we", "us", or "our"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all the terms and conditions, you may not access or use the Service.

These Terms apply to all visitors, users, and others who access or use the Service. By using the Service, you represent that you are at least 18 years of age and have the legal capacity to enter into this agreement.`,
  },
  {
    id: "description",
    title: "2. Description of Service",
    content: `adspoonX is a Facebook Ads intelligence platform that allows users to search, analyze, and track publicly available Facebook advertisements. The Service provides:

• Access to a database of Facebook ads sourced from publicly available data
• Search and filtering tools to find ads by keyword, niche, country, and other criteria
• Ad tracking and analytics features
• Saved ads and saved searches functionality
• Shop tracking to monitor advertiser activity

All ad data displayed on adspoonX is sourced from publicly available information in the Facebook Ads Library and does not include any private or restricted data.`,
  },
  {
    id: "accounts",
    title: "3. User Accounts",
    content: `To access certain features, you must create an account. You agree to:

• Provide accurate, current, and complete information during registration
• Maintain and promptly update your account information
• Maintain the security of your password and accept all risks of unauthorized access
• Notify us immediately of any unauthorized use of your account
• Not share your account credentials with third parties

We reserve the right to suspend or terminate accounts that violate these Terms or that we reasonably believe are being used fraudulently.`,
  },
  {
    id: "subscriptions",
    title: "4. Subscriptions and Payments",
    subsections: [
      {
        title: "4.1 Free and Paid Plans",
        content: `adspoonX offers both free and paid subscription plans. Free accounts have limited access to features and data. Paid plans unlock additional features, higher usage limits, and premium functionality.`,
      },
      {
        title: "4.2 Billing",
        content: `Paid subscriptions are billed in advance on a recurring basis (monthly, quarterly, or yearly) depending on the plan selected. Payment is processed through our payment partner, LemonSqueezy. By subscribing to a paid plan, you authorize us to charge your payment method on a recurring basis.`,
      },
      {
        title: "4.3 Cancellation and Refunds",
        content: `You may cancel your subscription at any time through your account settings. Upon cancellation, your subscription will remain active until the end of the current billing period. We do not offer refunds for partial billing periods.

If you believe you have been charged in error, please contact us at contact@adspoonx.com within 30 days of the charge.`,
      },
      {
        title: "4.4 Price Changes",
        content: `We reserve the right to modify pricing at any time. Price changes will be communicated in advance and will take effect at the start of your next billing cycle. Continued use of the Service after a price change constitutes acceptance of the new pricing.`,
      },
    ],
  },
  {
    id: "acceptable-use",
    title: "5. Acceptable Use",
    content: `You agree not to use the Service to:

• Violate any applicable local, state, national, or international law or regulation
• Scrape, crawl, or use automated means to access the Service beyond normal usage
• Resell, redistribute, or sublicense access to the Service or its data
• Attempt to gain unauthorized access to our systems, servers, or networks
• Interfere with or disrupt the integrity or performance of the Service
• Upload or transmit viruses, malware, or any other malicious code
• Impersonate another person or entity
• Harass, abuse, or threaten other users
• Use the Service for competitive analysis or to build a competing product
• Remove, obscure, or alter any proprietary notices or labels on the Service

We reserve the right to investigate and take appropriate action against anyone who violates these provisions, including suspending or terminating their account.`,
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual Property",
    content: `The Service and its original content (excluding ad data sourced from public sources), features, and functionality are owned by Archy Media LLC and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.

You may not copy, modify, distribute, sell, or lease any part of our Service or included software, nor may you reverse engineer or attempt to extract the source code of that software.

Ad data displayed on the Service is sourced from publicly available information. We do not claim ownership of third-party ad content. Trademarks, logos, and brand names displayed in ads belong to their respective owners.`,
  },
  {
    id: "data-accuracy",
    title: "7. Data Accuracy and Availability",
    content: `While we strive to provide accurate and up-to-date information, we make no guarantees regarding the accuracy, completeness, or timeliness of the ad data displayed on our platform. Ad data is sourced from public sources and may be subject to delays, errors, or omissions.

The Service is provided on an "as-available" basis. We do not guarantee that the Service will be available at all times or that it will be free of errors, interruptions, or security breaches.

We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice.`,
  },
  {
    id: "limitation",
    title: "8. Limitation of Liability",
    content: `To the maximum extent permitted by applicable law, in no event shall Archy Media LLC, its directors, employees, partners, agents, suppliers, or affiliates be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:

• Your access to or use of (or inability to access or use) the Service
• Any conduct or content of any third party on the Service
• Any content obtained from the Service
• Unauthorized access, use, or alteration of your transmissions or content

Our total liability for any claim arising out of or relating to these Terms or the Service shall not exceed the amount you paid us in the twelve (12) months preceding the claim.`,
  },
  {
    id: "indemnification",
    title: "9. Indemnification",
    content: `You agree to defend, indemnify, and hold harmless Archy Media LLC and its employees, contractors, agents, officers, and directors from and against any and all claims, damages, obligations, losses, liabilities, costs, or debt arising from:

• Your use of and access to the Service
• Your violation of any term of these Terms
• Your violation of any third-party right, including any copyright, property, or privacy right
• Any claim that your use of the Service caused damage to a third party`,
  },
  {
    id: "termination",
    title: "10. Termination",
    content: `We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including without limitation if you breach these Terms.

Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may do so through your account settings or by contacting us.

All provisions of these Terms which by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, indemnity, and limitations of liability.`,
  },
  {
    id: "governing-law",
    title: "11. Governing Law",
    content: `These Terms shall be governed and construed in accordance with the laws of the State of Colorado, United States, without regard to its conflict of law provisions.

Any disputes arising from these Terms or the Service shall be resolved in the state or federal courts located in Boulder County, Colorado. You consent to the personal jurisdiction of such courts and waive any objection to venue.`,
  },
  {
    id: "changes",
    title: "12. Changes to Terms",
    content: `We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect.

By continuing to access or use our Service after revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.`,
  },
  {
    id: "contact",
    title: "13. Contact Us",
    content: `If you have any questions about these Terms of Service, please contact us:

Archy Media LLC
1942 Broadway St. STE 314C, Boulder, CO 80302, USA
Phone: +1 (325) 442-9234
Email: contact@adspoonx.com
Website: https://adspoonx.com`,
  },
];

export default function TermsPage() {
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
            Terms of Service
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
            Please read these Terms of Service carefully before using adspoonX.
            By using the Service, you agree to be bound by these Terms.
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
          Questions about these terms?{" "}
          <a href="mailto:contact@adspoonx.com" className="text-indigo-400 hover:text-indigo-300">
            contact@adspoonx.com
          </a>
        </div>
      </main>
    </div>
  );
}
