import Navbar from "@/components/Navbar";
import FeaturesSection from "@/components/Features";
import ForSchools from "@/components/ForSchools";
import Footer from "@/components/Footer";

const Features = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-16">
        <FeaturesSection />
        <ForSchools />
      </main>
      <Footer />
    </div>
  );
};

export default Features;
