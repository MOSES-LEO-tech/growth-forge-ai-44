import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link 
      to="/" 
      className="flex items-center gap-2 hover:opacity-80 transition-opacity duration-300"
    >
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
        <GraduationCap className="w-6 h-6 text-primary-foreground" />
      </div>
      <span className="font-bold text-xl">MILESTONE</span>
    </Link>
  );
}
