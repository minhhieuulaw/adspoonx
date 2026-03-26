import MarketingNav from "@/components/marketing/MarketingNav";
import HeroSection from "@/components/marketing/HeroSection";
import FeaturesSection from "@/components/marketing/FeaturesSection";
import LiveStatsSection from "@/components/marketing/LiveStatsSection";
import PricingSection from "@/components/marketing/PricingSection";
import FooterSection from "@/components/marketing/FooterSection";
import AnnouncementBanner from "@/components/marketing/AnnouncementBanner";

export default function HomePage() {
  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--sidebar-bg)", color: "var(--text-primary)" }}
    >
      {/* Banner thông báo từ admin — hiển thị trên cùng, đẩy nav xuống */}
      <AnnouncementBanner />
      <MarketingNav />
      <HeroSection />
      <LiveStatsSection />
      <FeaturesSection />
      <PricingSection />
      <FooterSection />
    </main>
  );
}
