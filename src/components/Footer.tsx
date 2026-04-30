import Logo from "@/components/Logo";
import { brand } from "@/lib/brand";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t bg-card">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-10 grid gap-8 md:grid-cols-[1.25fr_1fr_1fr_1fr]">
          <div>
            <div className="mb-4">
              <Logo />
            </div>
            <p className="max-w-xs text-sm text-muted-foreground">{brand.tagline}</p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/#features" className="hover:text-foreground">Features</Link></li>
              <li><Link to="/#how-it-works" className="hover:text-foreground">How It Works</Link></li>
              <li><Link to="/#for-schools" className="hover:text-foreground">For Schools</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/about" className="hover:text-foreground">About</Link></li>
              <li><Link to="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link to="/careers" className="hover:text-foreground">Careers</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link to="/terms" className="hover:text-foreground">Terms</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-6 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} {brand.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
