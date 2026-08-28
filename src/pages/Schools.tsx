import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Globe, Users, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSchools } from "@/hooks/useSchools";

const Schools = () => {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useSchools(
    debouncedSearch || undefined,
    countryFilter === "all" ? undefined : countryFilter
  );

  const schools = data?.schools || [];
  const countries = Array.from(new Set(schools.map((s) => s.country).filter(Boolean))) as string[];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-12 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">Schools</h1>
                <p className="text-slate-500 text-lg max-w-2xl">
                  Discover our partner educational institutions committed to empowering students through technology and creativity.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by school name..."
                  className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 min-w-[200px]">
                <Filter className="w-4 h-4 text-slate-400" />
                <Select value={countryFilter} onValueChange={setCountryFilter}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200">
                    <SelectValue placeholder="All Countries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Countries</SelectItem>
                    {countries.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-slate-200">
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-16 w-16 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-0 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardContent>
                  <CardFooter className="p-6 pt-4">
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : schools.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {schools.map((school) => (
                <Card key={school.id} className="group hover:shadow-md transition-all duration-300 border-slate-200 overflow-hidden bg-white">
                  <CardHeader className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16 rounded-lg border border-slate-100 shadow-sm bg-slate-50">
                        <AvatarImage src={school.logo_url || ""} alt={school.name} className="object-contain p-2" />
                        <AvatarFallback className="rounded-lg bg-primary/5 text-primary font-bold text-xl">
                          {school.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <h3 className="font-bold text-xl text-slate-900 group-hover:text-primary transition-colors line-clamp-1">
                          {school.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="line-clamp-1">{school.location}</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-6 py-0 pb-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-medium">
                        <Globe className="w-3 h-3 mr-1" />
                        {school.country}
                      </Badge>
                      {school.student_count && (
                        <Badge variant="secondary" className="bg-blue-50 text-blue-600 border-none font-medium">
                          <Users className="w-3 h-3 mr-1" />
                          {school.student_count.toLocaleString()} Students
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm line-clamp-2 leading-relaxed h-10">
                      {school.description || "A dedicated partner school focused on providing high-quality education and empowering students."}
                    </p>
                  </CardContent>
                  <CardFooter className="p-6 pt-2 border-t border-slate-50 bg-slate-50/50">
                    <Button asChild className="w-full bg-white hover:bg-slate-900 hover:text-white text-slate-900 border border-slate-200 shadow-sm transition-all font-semibold">
                      <Link to={`/schools/${school.id}`}>View Profile</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">No schools found</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-8">
                We couldn't find any schools matching your current search criteria. Try a different keyword or filter.
              </p>
              <Button variant="outline" onClick={() => { setSearchInput(""); setCountryFilter("all"); }}>
                Clear all filters
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Schools;
