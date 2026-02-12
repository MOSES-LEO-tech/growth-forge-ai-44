import { useEffect, useState } from 'react';
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
import schoolsService, { SchoolWithStats } from "@/services/schools";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from 'lucide-react';

const SchoolProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [school, setSchool] = useState<SchoolWithStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { ref: headerRef, isInView: headerInView } = useInView({ threshold: 0.2 });
  const { ref: statsRef, isInView: statsInView } = useInView({ threshold: 0.2 });
  const { ref: galleryRef, isInView: galleryInView } = useInView({ threshold: 0.2 });
  const { ref: fameRef, isInView: fameInView } = useInView({ threshold: 0.2 });

  useEffect(() => {
    const fetchSchool = async () => {
      if (!id) {
        setError('School ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const schoolData = await schoolsService.getSchool(Number(id));
        setSchool(schoolData);
      } catch (err: any) {
        console.error('Error fetching school:', err);
        setError(err.response?.data?.message || 'Failed to load school profile');
        toast({
          title: 'Error',
          description: 'Failed to load school profile',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSchool();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading school profile...</span>
      </div>
    );
  }

  if (error || !school) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">School not found</h2>
          <p className="text-muted-foreground mb-4">{error || 'The school you are looking for does not exist.'}</p>
          <Button onClick={() => navigate("/schools")}>Back to Schools</Button>
        </div>
      </div>
    );
  }

  // Fallback data if API returns partial data
  const schoolData = {
    id: school.id,
    name: school.name,
    logoUrl: school.logo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(school.name)}&background=random`,
    bannerUrl: school.banner_url || "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&h=400&fit=crop",
    location: school.location || 'Location not specified',
    studentCount: school.student_count || 0,
    teacherCount: school.teacher_count || 0,
    activeUsers: school.student_count || 0,
    tagline: school.description?.substring(0, 100) || 'Excellence in Education',
    type: school.type || 'School',
    level: school.level || 'Primary & Secondary',
    curriculum: school.curriculum?.join(', ') || 'Standard Curriculum',
    description: school.description || 'A dedicated educational institution committed to student success.',
    contact: {
      email: school.contact_email || 'contact@school.edu',
      phone: school.contact_phone || '+1 234 567 8900',
      address: school.address || school.location
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
        name: "Student Excellence Award",
        role: "Top Performer 2024",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
        bio: "Recognized for outstanding academic achievement"
      }
    ],
    yearbooks: [
      { year: 2024, coverUrl: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=400&fit=crop" },
      { year: 2023, coverUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=300&h=400&fit=crop" }
    ]
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Banner */}
      <div 
        className="relative h-80 bg-cover bg-center"
        style={{ backgroundImage: `url(${schoolData.bannerUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 to-black/70" />
        <div className="absolute inset-0 flex items-center justify-center">
          <img 
            src={schoolData.logoUrl} 
            alt={schoolData.name}
            className="w-32 h-32 rounded-full border-4 border-white shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(schoolData.name)}&background=667eea&color=fff&size=128`;
            }}
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
            <h1 className="text-5xl font-bold mb-4">{schoolData.name}</h1>
            <p className="text-xl text-muted-foreground italic mb-6">{schoolData.tagline}</p>
            <p className="text-lg text-muted-foreground max-w-3xl mb-8">{schoolData.description}</p>
            
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
                <p className="font-semibold">{schoolData.level}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Curriculum</p>
                <p className="font-semibold">{schoolData.curriculum}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Type</p>
                <p className="font-semibold">{schoolData.type}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Location</p>
                <p className="font-semibold">{schoolData.location}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Contact</p>
                <p className="font-semibold">{schoolData.contact.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Address</p>
                <p className="font-semibold">{schoolData.contact.address}</p>
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
            studentCount={schoolData.studentCount}
            teacherCount={schoolData.teacherCount}
            activeUsers={schoolData.activeUsers}
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
          <SchoolGallery images={schoolData.gallery} />
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
          <SchoolHallOfFame members={schoolData.hallOfFame} isInView={fameInView} />
        </div>
      </section>

      {/* Yearbooks */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-bold mb-8">Yearbook Collection</h2>
          <SchoolYearbook yearbooks={schoolData.yearbooks} />
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default SchoolProfile;
