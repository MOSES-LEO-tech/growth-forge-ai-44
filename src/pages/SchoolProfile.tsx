import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Globe, Calendar, Users, Trophy, 
  Image as ImageIcon, School as SchoolIcon, Star, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSchool, useSchoolStats } from "@/hooks/useSchools";

const SchoolProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: school, isLoading: isLoadingSchool, isError } = useSchool(id || "");
  const { data: stats, isLoading: isLoadingStats } = useSchoolStats(id || "");

  if (isLoadingSchool) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-grow pt-24 pb-16">
          <div className="container mx-auto px-4 space-y-8">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-64 w-full rounded-3xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
              <Skeleton className="h-32 rounded-xl" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isError || !school) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center pt-24">
          <div className="text-center space-y-6 max-w-md px-4">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">School not found</h2>
              <p className="text-slate-500 mb-6">
                We couldn't find the school you're looking for. It may have been removed or the link is incorrect.
              </p>
              <Button onClick={() => navigate("/schools")} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Schools
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Navigation */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/schools")} 
            className="mb-8 text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schools
          </Button>

          {/* Hero Section */}
          <div className="relative mb-12">
            <div className="h-48 md:h-64 w-full bg-secondary rounded-3xl overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </div>
            <div className="absolute -bottom-8 left-8 flex flex-col md:flex-row md:items-end gap-6 w-full px-4 md:px-0">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 rounded-3xl border-4 border-white shadow-xl bg-white">
                <AvatarImage src={school.logo_url || ""} alt={school.name} className="object-contain p-4" />
                <AvatarFallback className="rounded-3xl bg-primary/5 text-primary text-4xl font-bold">
                  {school.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="pb-4 space-y-2">
                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                  {school.name}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-slate-600 font-medium">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{school.location}, {school.country}</span>
                  </div>
                  {school.founded_year && (
                    <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>Founded {school.founded_year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12 mt-16 md:mt-8">
            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Total Students</CardTitle>
                <Users className="w-5 h-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-slate-900">{stats?.total_students || 0}</div>
                )}
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Achievements</CardTitle>
                <Trophy className="w-5 h-5 text-amber-500" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-slate-900">{stats?.total_achievements || 0}</div>
                )}
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Scholarships Won</CardTitle>
                <Star className="w-5 h-5 text-emerald-500" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-bold text-slate-900">{stats?.total_scholarships_won || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="about" className="space-y-8">
            <TabsList className="bg-white border border-slate-200 p-1 h-auto rounded-xl inline-flex overflow-x-auto max-w-full">
              <TabsTrigger value="about" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Info className="w-4 h-4 mr-2" />
                About
              </TabsTrigger>
              <TabsTrigger value="students" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Users className="w-4 h-4 mr-2" />
                Students
              </TabsTrigger>
              <TabsTrigger value="gallery" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <ImageIcon className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
              <TabsTrigger value="hall-of-fame" className="rounded-lg px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-white transition-all">
                <Trophy className="w-4 h-4 mr-2" />
                Hall of Fame
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-0">
              <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                <CardHeader className="border-b border-slate-50 p-8">
                  <CardTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <SchoolIcon className="w-6 h-6 text-primary" />
                    School Description
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                  {school.description || "No description provided for this school. This institution is a valued Milestone partner committed to academic excellence and student development."}
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="students" className="mt-0">
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-bold text-slate-900">Enrolled Students</CardTitle>
                  <CardDescription>Members of the {school.name} student community.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {/* Placeholder Students */}
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all group">
                        <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                          <AvatarImage src={`https://i.pravatar.cc/150?u=${i + school.id}`} />
                          <AvatarFallback>ST</AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 group-hover:text-primary transition-colors">Student {i + 1}</div>
                          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Grade {9 + (i % 4)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gallery" className="mt-0">
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-bold text-slate-900">School Gallery</CardTitle>
                  <CardDescription>Recent highlights and events from {school.name}.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="aspect-video rounded-xl bg-slate-100 overflow-hidden relative group cursor-pointer shadow-sm">
                        <img 
                          src={`https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80&fit=crop&crop=focalpoint&fp-y=0.5&auto=format&sig=${i}`} 
                          alt="Gallery item"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <ImageIcon className="text-white w-8 h-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hall-of-fame" className="mt-0">
              <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-bold text-slate-900">Hall of Fame</CardTitle>
                  <CardDescription>Celebrating our top-achieving students.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-center gap-6">
                          <div className="text-3xl font-black text-slate-200 w-8">#{i + 1}</div>
                          <Avatar className="h-16 w-16 border-4 border-white shadow-sm">
                            <AvatarImage src={`https://i.pravatar.cc/150?u=hof-${i}`} />
                            <AvatarFallback>HOF</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-bold text-xl text-slate-900">Elite Achiever {i + 1}</div>
                            <div className="text-slate-500 flex items-center gap-2">
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                              <span className="font-medium">Top Performer • {1000 - i * 100} XP</span>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none px-4 py-1">
                          View Portfolio
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SchoolProfile;
