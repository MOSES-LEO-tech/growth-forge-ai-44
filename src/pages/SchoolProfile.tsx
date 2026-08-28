import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  ArrowLeft, MapPin, Calendar, Users, Trophy, 
  Image as ImageIcon, School as SchoolIcon, Star, Info,
  Newspaper, CalendarDays, BookOpen, Download, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSchool, useSchoolStats } from "@/hooks/useSchools";
import { getPublishedSchoolCms, getPublishedSchoolPage } from "@/lib/supabase/cms";
import { listSchoolGalleryMedia } from "@/lib/supabase/schoolMedia";
import SanitizedHtml from "@/components/SanitizedHtml";
import type { SchoolCmsBundle } from "@/lib/supabase/cms";
import type { CmsPage, SchoolGalleryMedia } from "@/integrations/supabase/types";

const DEFAULT_SCHOOL_COVER_IMAGE =
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1800&q=80";

const DEFAULT_SCHOOL_GALLERY_IMAGES = [
  "https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560785496-3c9d27877182?auto=format&fit=crop&w=1200&q=80",
];

const uniqueImageUrls = (urls: Array<string | null | undefined>) => {
  const seen = new Set<string>();
  return urls
    .map((url) => url?.trim())
    .filter((url): url is string => {
      if (!url || seen.has(url)) return false;
      seen.add(url);
      return true;
    });
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const EMPTY_CMS_BUNDLE: SchoolCmsBundle = { pages: [], news: [], events: [], resources: [] };

const SchoolProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: school, isLoading: isLoadingSchool, isError } = useSchool(id || "");
  const { data: stats, isLoading: isLoadingStats } = useSchoolStats(id || "");

  const [cms, setCms] = useState<SchoolCmsBundle>(EMPTY_CMS_BUNDLE);
  const [aboutPage, setAboutPage] = useState<CmsPage | null>(null);
  const [cmsLoading, setCmsLoading] = useState(true);
  const [galleryMedia, setGalleryMedia] = useState<SchoolGalleryMedia[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setCmsLoading(true);
    setGalleryLoading(true);
    Promise.all([getPublishedSchoolCms(id), getPublishedSchoolPage(id, "about")])
      .then(([bundle, page]) => {
        if (cancelled) return;
        setCms(bundle);
        setAboutPage(page);
        setCmsLoading(false);
      })
      .catch((error) => {
        console.warn("Failed to load published CMS content:", error);
        if (!cancelled) setCmsLoading(false);
      });
    listSchoolGalleryMedia(id)
      .then((media) => {
        if (cancelled) return;
        setGalleryMedia(media);
        setGalleryLoading(false);
      })
      .catch((error) => {
        console.warn("Failed to load school gallery:", error);
        if (!cancelled) setGalleryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (isLoadingSchool) {
    return (
      <div className="editorial flex min-h-screen flex-col bg-background">
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
      <div className="editorial flex min-h-screen flex-col bg-background">
        <Navbar />
        <main className="flex-grow flex items-center justify-center pt-24">
          <div className="text-center space-y-6 max-w-md px-4">
              <div className="editorial-panel p-8">
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="mb-2 text-2xl font-bold text-foreground">School not found</h2>
              <p className="mb-6 text-muted-foreground">
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

  const galleryImages = uniqueImageUrls(school.gallery_urls || []);
  const displayGalleryImages = galleryImages.length > 0
    ? galleryImages
    : uniqueImageUrls([school.cover_url, school.logo_url, ...DEFAULT_SCHOOL_GALLERY_IMAGES]).slice(0, 6);
  const coverImage = school.cover_url?.trim() || displayGalleryImages[0] || DEFAULT_SCHOOL_COVER_IMAGE;
  const coverFallback = displayGalleryImages.find((url) => url !== coverImage) || DEFAULT_SCHOOL_COVER_IMAGE;
  const schoolLocation = [school.location, school.country].filter(Boolean).join(", ") || "Milestone partner school";

  return (
    <div className="editorial flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Back Navigation */}
          <Button 
            variant="ghost" 
            onClick={() => navigate("/schools")} 
            className="mb-8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Schools
          </Button>

          {/* Hero Section */}
          <div className="relative mb-12 overflow-hidden rounded-3xl bg-slate-900 shadow-sm">
            <div className="relative h-[300px] md:h-[360px] w-full">
              {school.hero_video_url ? (
                <video
                  src={school.hero_video_url}
                  poster={coverImage}
                  className="h-full w-full object-cover"
                  autoPlay
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={coverImage}
                  alt={`${school.name} campus`}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = coverFallback;
                  }}
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-950/45 via-transparent to-transparent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-5 p-6 md:flex-row md:items-end md:p-8">
              <Avatar className="h-28 w-28 md:h-36 md:w-36 rounded-3xl border-4 border-white/90 shadow-xl bg-white">
                <AvatarImage src={school.logo_url || ""} alt={school.name} className="object-contain p-4" />
                <AvatarFallback className="rounded-3xl bg-primary/5 text-primary text-4xl font-bold">
                  {school.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-3 pb-1">
                <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
                  {school.name}
                </h1>
                {school.tagline && (
                  <p className="text-white/85 text-base max-w-xl">{school.tagline}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-white/90 font-medium">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{schoolLocation}</span>
                  </div>
                  {school.founded_year && (
                    <div className="flex items-center gap-1.5 border-l border-white/25 pl-4">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span>Founded {school.founded_year}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
            <Card className="editorial-panel transition-colors hover:border-[hsl(var(--ring))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="caps-label text-[10px] font-semibold text-muted-foreground">Total Students</CardTitle>
                <Users className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-semibold">{stats?.total_students || 0}</div>
                )}
              </CardContent>
            </Card>
            <Card className="editorial-panel transition-colors hover:border-[hsl(var(--ring))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="caps-label text-[10px] font-semibold text-muted-foreground">Achievements</CardTitle>
                <Trophy className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-semibold">{stats?.total_achievements || 0}</div>
                )}
              </CardContent>
            </Card>
            <Card className="editorial-panel transition-colors hover:border-[hsl(var(--ring))]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="caps-label text-[10px] font-semibold text-muted-foreground">Scholarships Won</CardTitle>
                <Star className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-3xl font-semibold">{stats?.total_scholarships_won || 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="about" className="space-y-8">
            <TabsList className="editorial-panel inline-flex h-auto max-w-full overflow-x-auto rounded-lg p-1">
              <TabsTrigger value="about" className="rounded-full px-5 py-2 data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] transition-colors">
                <Info className="w-4 h-4 mr-2" />
                About
              </TabsTrigger>
              <TabsTrigger value="news" className="rounded-full px-5 py-2 data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] transition-colors">
                <Newspaper className="w-4 h-4 mr-2" />
                News
              </TabsTrigger>
              <TabsTrigger value="events" className="rounded-full px-5 py-2 data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] transition-colors">
                <CalendarDays className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="resources" className="rounded-full px-5 py-2 data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] transition-colors">
                <BookOpen className="w-4 h-4 mr-2" />
                Resources
              </TabsTrigger>
              <TabsTrigger value="gallery" className="rounded-full px-5 py-2 data-[state=active]:bg-[hsl(var(--primary))] data-[state=active]:text-[hsl(var(--primary-foreground))] transition-colors">
                <ImageIcon className="w-4 h-4 mr-2" />
                Gallery
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-0">
              <Card className="editorial-panel overflow-hidden">
                <CardHeader className="border-b border-border p-8">
                  <CardTitle className="flex items-center gap-2 text-2xl font-bold">
                    <SchoolIcon className="w-6 h-6 text-primary" />
                    {aboutPage ? aboutPage.title : "School Description"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  {aboutPage ? (
                    <div className="space-y-5">
                      {aboutPage.hero_image_url && (
                        <img
                          src={aboutPage.hero_image_url}
                          alt={aboutPage.title}
                          className="h-56 w-full rounded-xl object-cover"
                        />
                      )}
                      {aboutPage.content ? (
                        <SanitizedHtml html={aboutPage.content} className="rich-text text-lg" />
                      ) : (
                        <p className="text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground">
                          {school.description || "No description provided for this school. This institution is a valued Milestone partner committed to academic excellence and student development."}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-lg leading-relaxed whitespace-pre-wrap text-muted-foreground">
                    {school.description || "No description provided for this school. This institution is a valued Milestone partner committed to academic excellence and student development."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="news" className="mt-0">
              <div className="space-y-4">
                {cmsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-40 rounded-2xl" />
                    <Skeleton className="h-40 rounded-2xl" />
                  </div>
                ) : cms.news.length === 0 ? (
                  <Card className="editorial-panel">
                    <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                      <Newspaper className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">No news published yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  cms.news.map((item) => (
                    <Card key={item.id} className="editorial-panel">
                      <CardContent className="p-8">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {item.featured && <Badge className="bg-primary text-primary-foreground">Featured</Badge>}
                          <span className="text-xs uppercase tracking-wider text-muted-foreground">
                            {formatDate(item.publish_at || item.created_at)}
                          </span>
                        </div>
                        <h3 className="mb-2 text-xl font-bold">{item.title}</h3>
                        <SanitizedHtml html={item.body} className="rich-text text-muted-foreground" />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="events" className="mt-0">
              <div className="space-y-4">
                {cmsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-32 rounded-2xl" />
                    <Skeleton className="h-32 rounded-2xl" />
                  </div>
                ) : cms.events.length === 0 ? (
                  <Card className="editorial-panel">
                    <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                      <CalendarDays className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">No upcoming events published.</p>
                    </CardContent>
                  </Card>
                ) : (
                  cms.events.map((event) => (
                    <Card key={event.id} className="editorial-panel">
                      <CardContent className="flex flex-col gap-4 p-8 md:flex-row md:items-start">
                        <div className="flat-icon h-12 w-12 shrink-0">
                          <CalendarDays className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-primary">{formatDate(event.event_date)}</span>
                            {event.end_date && (
                              <span className="text-sm text-muted-foreground">to {formatDate(event.end_date)}</span>
                            )}
                          </div>
                          <h3 className="mb-1 text-xl font-bold">{event.title}</h3>
                          {event.location && (
                            <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </p>
                          )}
                          {event.description && (
                            <SanitizedHtml html={event.description} className="rich-text text-muted-foreground" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="resources" className="mt-0">
              <div className="space-y-4">
                {cmsLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                  </div>
                ) : cms.resources.length === 0 ? (
                  <Card className="editorial-panel">
                    <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground" />
                      <p className="text-muted-foreground">No resources published yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {cms.resources.map((resource) => (
                      <Card key={resource.id} className="editorial-panel">
                        <CardContent className="flex h-full flex-col gap-3 p-6">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-lg font-bold">{resource.title}</h3>
                            {resource.category && (
                              <Badge variant="secondary" className="shrink-0">{resource.category}</Badge>
                            )}
                          </div>
                          {resource.description && (
                            <p className="text-sm text-muted-foreground">{resource.description}</p>
                          )}
                          <div className="mt-auto flex flex-wrap items-center gap-2">
                            {resource.file_type && (
                              <span className="text-xs uppercase tracking-wider text-muted-foreground">{resource.file_type}</span>
                            )}
                            {resource.tags && resource.tags.length > 0 && (
                              <span className="flex flex-wrap items-center gap-1.5">
                                {resource.tags.slice(0, 4).map((tag) => (
                                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Tag className="h-3 w-3" />
                                    {tag}
                                  </span>
                                ))}
                              </span>
                            )}
                            {resource.file_url && (
                              <a
                                href={resource.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                              >
                                <Download className="h-4 w-4" />
                                Download
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="gallery" className="mt-0">
              <Card className="editorial-panel overflow-hidden">
                <CardHeader className="p-8">
                  <CardTitle className="text-2xl font-bold">School Gallery</CardTitle>
                  <CardDescription>Recent highlights and events from {school.name}.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {galleryLoading ? (
                      [...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="aspect-video rounded-lg" />
                      ))
                    ) : galleryMedia.length > 0 ? (
                      galleryMedia.map((item) => (
                        <figure key={item.id} className="overflow-hidden rounded-lg border bg-card">
                          <div className="aspect-video bg-muted">
                            {item.media_type === "video" ? (
                              <video
                                src={item.url}
                                className="h-full w-full object-cover"
                                muted
                                loop
                                playsInline
                                controls
                              />
                            ) : (
                              <img
                                src={item.url}
                                alt={item.caption || `${school.name} gallery`}
                                className="h-full w-full object-cover"
                              />
                            )}
                          </div>
                          {item.caption && (
                            <figcaption className="p-3 text-sm text-muted-foreground">{item.caption}</figcaption>
                          )}
                        </figure>
                      ))
                    ) : (
                      displayGalleryImages.map((imageUrl, i) => (
                        <div key={`${imageUrl}-${i}`} className="aspect-video relative overflow-hidden rounded-lg bg-muted group cursor-pointer">
                          <img
                            src={imageUrl}
                            alt={`${school.name} gallery ${i + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(event) => {
                              event.currentTarget.onerror = null;
                              event.currentTarget.src = DEFAULT_SCHOOL_GALLERY_IMAGES[i % DEFAULT_SCHOOL_GALLERY_IMAGES.length];
                            }}
                          />
                        </div>
                      ))
                    )}
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
