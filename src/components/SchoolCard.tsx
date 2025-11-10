import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin } from "lucide-react";

interface School {
  id: string;
  name: string;
  logoUrl?: string;
  location: string;
  studentCount: number;
  tagline: string;
  type: string;
}

interface SchoolCardProps {
  school: School;
}

const SchoolCard = ({ school }: SchoolCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
      onClick={() => navigate(`/schools/${school.id}`)}
    >
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
        {school.logoUrl ? (
          <img 
            src={school.logoUrl} 
            alt={school.name} 
            className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg group-hover:scale-110 transition-transform duration-300"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center text-4xl font-bold text-muted-foreground border-4 border-background shadow-lg">
            {school.name.charAt(0)}
          </div>
        )}
      </div>
      
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
          {school.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 italic">{school.tagline}</p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin className="w-4 h-4" />
          <span>{school.location}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="w-4 h-4" />
          <span>{school.studentCount.toLocaleString()} students</span>
        </div>

        <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
          {school.type}
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolCard;
