import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SupportedPlatforms from "@/components/SupportedPlatforms";
import HowItWorks from "@/components/HowItWorks";
import CheckoutMockup from "@/components/CheckoutMockup";
import SplitCalculator from "@/components/SplitCalculator";
import AIFeatures from "@/components/AIFeatures";
import PricingSection from "@/components/PricingSection";
import WaitlistForm from "@/components/WaitlistForm";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <SupportedPlatforms />
      <HowItWorks />
      <CheckoutMockup />
      <SplitCalculator />
      <AIFeatures />
      <PricingSection />
      <WaitlistForm />
      <Footer />
    </div>
  );
};

export default Index;
