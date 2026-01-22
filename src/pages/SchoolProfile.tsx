import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Mail, Users, BookOpen, Calendar } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SchoolGallery from "@/components/SchoolGallery";
import SchoolStats from "@/components/SchoolStats";
import SchoolHallOfFame from "@/components/SchoolHallOfFame";
import SchoolYearbook from "@/components/SchoolYearbook";
import { useInView } from "@/hooks/useInView";

type SchoolData = {
  id: string;
  name: string;
  logoUrl: string;
  bannerUrl: string;
  location: string;
  studentCount: number;
  teacherCount: number;
  activeUsers: number;
  tagline: string;
  type: string;
  level: string;
  curriculum: string;
  description: string;
  contact: { email: string; phone: string; address: string };
  colors: { primary: string; secondary: string };
  gallery: string[];
  hallOfFame: { name: string; role: string; image: string; bio: string }[];
  yearbooks: { year: number; coverUrl: string }[];
};

const schoolData: Record<string, SchoolData> = {
  "1": {
    id: "1",
    name: "Greenfield International Academy",
    logoUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=200&h=200&fit=crop",
    bannerUrl: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=400&fit=crop",
    location: "London, UK",
    studentCount: 850,
    teacherCount: 85,
    activeUsers: 720,
    tagline: "Excellence in Education",
    type: "International School",
    level: "Primary & Secondary",
    curriculum: "IGCSE, A-Levels",
    description: "Greenfield International Academy is committed to providing world-class education that nurtures critical thinking, creativity, and global citizenship.",
    contact: {
      email: "info@greenfield.edu",
      phone: "+44 20 1234 5678",
      address: "123 Education Lane, London, UK"
    },
    colors: {
      primary: "hsl(142, 76%, 36%)",
      secondary: "hsl(142, 76%, 56%)"
    },
    gallery: [
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=600&h=400&fit=crop",
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&h=400&fit=crop"
    ],
    hallOfFame: [
      {
        name: "Emma Richardson",
        role: "Valedictorian 2023",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
        bio: "Top graduate with perfect scores in Mathematics and Science"
      },
      {
        name: "James Chen",
        role: "Science Olympiad Winner",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
        bio: "International Science Olympiad Gold Medalist"
      },
      {
        name: "Sarah Ahmed",
        role: "Outstanding Leadership",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
        bio: "Student Council President, Community Service Award"
      }
    ],
    yearbooks: [
      { year: 2023, coverUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=400&fit=crop" },
      { year: 2022, coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=400&fit=crop" },
      { year: 2021, coverUrl: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=400&fit=crop" }
    ]
  }
};

const SchoolProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const school = schoolData[id || "1"];
  
  const { ref: headerRef, isInView: headerInView } = useInView({ threshold: 0.2 });
  const { ref: statsRef, isInView: statsInView } = useInView({ threshold: 0.2 });
  const { ref: galleryRef, isInView: galleryInView } = useInView({ threshold: 0.2 });
  const { ref: fameRef, isInView: fameInView } = useInView({ threshold: 0.2 });

  if (!school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">School not found</h2>
          <Button onClick={() => navigate("/schools")}>Back to Schools</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Banner */}
      <div 
        className="relative h-80 bg-cover bg-center"
        style={{ backgroundImage: `url(${school.bannerUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={school.logoUrl} 
            alt={school.name}
            className="w-32 h-32 rounded-full border-4 border-white shadow-2xl"
          />
        </div>
      </div>

      {/* Header Info */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/schools")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schools
          </Button>

          <div 
            ref={headerRef}
            className={`transition-all duration-1000 ${
              headerInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <h1 className="text-5xl font-bold mb-4">{school.name}</h1>
            <p className="text-xl text-muted-foreground italic mb-6">{school.tagline}</p>
            <p className="text-lg text-muted-foreground max-w-3xl mb-8">{school.description}</p>
            
            <div className="flex flex-wrap gap-4 mb-8">
              <Button size="lg">
                <Mail className="w-5 h-5 mr-2" />
                Contact School
              </Button>
              <Button size="lg" variant="outline">
                <Users className="w-5 h-5 mr-2" />
                Join Community
              </Button>
            </div>
          </div>

          {/* Specifications */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>School Information</CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Level</p>
                <p className="font-semibold">{school.level}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Curriculum</p>
                <p className="font-semibold">{school.curriculum}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <p className="font-semibold">{school.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="font-semibold">{school.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contact</p>
                <p className="font-semibold">{school.contact.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <p className="font-semibold">{school.contact.address}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats */}
      <section 
        ref={statsRef}
        className={`py-12 bg-muted/30 transition-all duration-1000 ${
          statsInView ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="container mx-auto px-4">
          <SchoolStats 
            studentCount={school.studentCount}
            teacherCount={school.teacherCount}
            activeUsers={school.activeUsers}
            isInView={statsInView}
          />
        </div>
      </section>

      {/* Gallery */}
      <section 
        ref={galleryRef}
        className={`py-12 transition-all duration-1000 ${
          galleryInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8">School Gallery</h2>
          <SchoolGallery images={school.gallery} />
        </div>
      </section>

      {/* Hall of Fame */}
      <section 
        ref={fameRef}
        className={`py-12 bg-muted/30 transition-all duration-1000 ${
          fameInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8">Hall of Fame</h2>
          <SchoolHallOfFame members={school.hallOfFame} isInView={fameInView} />
        </div>
      </section>

      {/* Yearbooks */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8">Yearbook Collection</h2>
          <SchoolYearbook yearbooks={school.yearbooks} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SchoolProfile;
