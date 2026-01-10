import { HeroSection } from "@/components/home/HeroSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { VisualGallerySection } from "@/components/home/VisualGallerySection";
import { BenefitsSection } from "@/components/home/BenefitsSection";
import { PricingSection } from "@/components/home/PricingSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeFooter } from "@/components/home/HomeFooter";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-background font-sans text-slate-900">
      {/* Navigation Bar */}
      <HomeHeader />

      {/* Main Content */}
      <main className="flex-1 pt-20"> {/* pt-20 to account for fixed header height */}
        <HeroSection />
        <VisualGallerySection />
        <HowItWorksSection />
        <BenefitsSection />
        <PricingSection />
        <FinalCTASection />
      </main>

      {/* Footer */}
      <HomeFooter />
    </div>
  );
}
