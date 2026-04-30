import Navbar from "@/components/Navbar";
import HowItWorksSection from "@/components/HowItWorks";
import Footer from "@/components/Footer";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
