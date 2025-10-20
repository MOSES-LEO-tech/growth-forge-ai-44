import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  return (
    <section 
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        background: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url(${heroBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="absolute inset-0 bg-[var(--gradient-hero)] opacity-80" />
      
      <div className="container mx-auto px-4 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 backdrop-blur-sm border border-secondary/30 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="text-sm font-medium text-secondary-foreground">Next-Gen Student Portfolio Platform</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-100">
          Your Journey,
          <br />
          <span className="bg-gradient-to-r from-secondary to-accent bg-clip-text text-transparent">
            Beautifully Documented
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-200 mb-12 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
          Track achievements, build portfolios, and unlock opportunities with AI-powered guidance tailored to your unique path.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6 group">
              Start Your Journey
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/#features">
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20">
              Explore Features
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-20 max-w-4xl mx-auto">
          {[
            { label: "Students", value: "10K+" },
            { label: "Projects", value: "25K+" },
            { label: "Schools", value: "150+" },
            { label: "Awards", value: "5K+" }
          ].map((stat, index) => (
            <div 
              key={stat.label} 
              className="text-center animate-in fade-in slide-in-from-bottom-4 duration-1000"
              style={{ animationDelay: `${400 + index * 100}ms` }}
            >
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stat.value}</div>
              <div className="text-sm text-gray-300">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
};

export default Hero;