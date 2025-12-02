import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";

export default function Logo() {
  return (
    <Link 
      to="/" 
      className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-300"
    >
      <img src={logoImage} alt="Milestone Logo" className="w-10 h-10 rounded-lg" />
      <span className="font-bold text-xl">MILESTONE</span>
    </Link>
  );
}
