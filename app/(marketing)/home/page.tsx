import MarketingNav from "@/components/marketing/MarketingNav";
import HeroSection from "@/components/marketing/HeroSection";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import PricingSection from "@/components/marketing/PricingSection";
import FooterSection from "@/components/marketing/FooterSection";

export default function HomePage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--sidebar-bg)", color: "var(--text-primary)" }}
    >
      <MarketingNav />
      <HeroSection />
      <FeaturesSection />
      <PricingSection />
      <FooterSection />
    </main>
  );
}
