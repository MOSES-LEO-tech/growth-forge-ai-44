import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { useNavigation } from "@/utils/navigation";

interface BackToHomeProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  className?: string;
}

/**
 * A button component that navigates back to the home page
 */
const BackToHome = ({ 
  variant = "default", 
  size = "default", 
  showIcon = true,
  className = ""
}: BackToHomeProps) => {
  const { goToHomePage } = useNavigation();

  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={goToHomePage}
      className={className}
    >
      {showIcon && <Home className="mr-2 h-4 w-4" />}
      Back to Home
    </Button>
  );
};

export default BackToHome;