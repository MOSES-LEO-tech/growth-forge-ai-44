import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, MapPin } from "lucide-react";

interface SchoolCardData {
  id: number | string;
  name: string;
  logo_url?: string;
  location?: string;
  student_count?: number;
  tagline?: string;
  type?: string;
  description?: string;
  // Legacy fields for mock data
  logoUrl?: string;
  studentCount?: number;
}

interface SchoolCardProps {
  school: SchoolCardData;
}

const SchoolCard = ({ school }: SchoolCardProps) => {
  const navigate = useNavigate();

  // Map API response to card format
  const logoUrl = school.logo_url || school.logoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(school.name)}&background=random`;
  const studentCount = school.student_count || school.studentCount || 0;
  const tagline = school.tagline || school.description || '';
  const type = school.type || 'School';
  const location = school.location || 'Location not specified';

  return (
    <Card
      className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
      onClick={() => navigate(`/schools/${school.id}`)}
    >
      <div className="relative h-48 bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center">
        <img 
          src={logoUrl} 
          alt={school.name} 
          className="w-32 h-32 rounded-full object-cover border-4 border-background shadow-lg group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(school.name)}&background=667eea&color=fff&size=128`;
          }}
        />
      </div>
      
      <CardContent className="p-6">
        <h3 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
          {school.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 italic line-clamp-2">{tagline}</p>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <MapPin className="w-4 h-4" />
          <span>{location}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Users className="w-4 h-4" />
          <span>{studentCount.toLocaleString()} students</span>
        </div>
        

        <div className="inline-block px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
          {type}
        </div>
      </CardContent>
    </Card>
  );
};

export default SchoolCard;
