import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { getScholarships, searchScholarships } from "@/lib/supabase/scholarships";
import { useToast } from "@/hooks/use-toast";
import { useInView } from "@/hooks/useInView";
import { useApplicationStatus, useBookmarkScholarship } from "@/hooks/useScholarshipApplications";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Search, 
  Calendar, 
  DollarSign, 
  Bookmark, 
  ChevronDown, 
  ChevronUp,
  Loader2,
  GraduationCap
} from "lucide-react";
import { format, differenceInDays, isWithinInterval, addMonths, startOfMonth, endOfMonth } from "date-fns";

const ScholarshipCard = ({ scholarship, index, gridInView }: { scholarship: any, index: number, gridInView: boolean }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { data: status } = useApplicationStatus(scholarship.id);
  const bookmarkMutation = useBookmarkScholarship();

  const isBookmarked = !!status;

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save scholarships.",
        variant: "destructive"
      });
      navigate("/auth");
      return;
    }

    try {
      if (isBookmarked) {
        toast({ title: "Already saved", description: "This scholarship is already in your list." });
      } else {
        await bookmarkMutation.mutateAsync(scholarship.id);
        toast({ title: "Saved!", description: "Scholarship saved to your list." });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save scholarship. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleApply = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  const getDeadlineInfo = (deadlineStr: string | null) => {
    if (!deadlineStr) return { label: "No deadline", color: "bg-gray-100 text-gray-700" };
    
    const deadline = new Date(deadlineStr);
    const daysLeft = differenceInDays(deadline, new Date());
    const formattedDate = format(deadline, "MMM d, yyyy");

    if (daysLeft < 0) return { label: `Ended ${formattedDate}`, color: "bg-gray-100 text-gray-500" };
    if (daysLeft < 30) return { label: `Due: ${formattedDate}`, color: "bg-red-100 text-red-700" };
    if (daysLeft < 60) return { label: `Due: ${formattedDate}`, color: "bg-yellow-100 text-yellow-700" };
    return { label: `Due: ${formattedDate}`, color: "bg-green-100 text-green-700" };
  };

  const deadlineInfo = getDeadlineInfo(scholarship.deadline);

  return (
    <div
      className={`transition-all duration-700 ${
        gridInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
      style={{ transitionDelay: `${index * 100}ms` }}
    >
      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
        <CardHeader className="relative pb-2">
          <div className="flex justify-between items-start gap-2">
            <CardTitle className="text-xl line-clamp-2 pr-8">{scholarship.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              className={`absolute top-4 right-4 h-8 w-8 ${isBookmarked ? 'text-primary fill-primary' : 'text-muted-foreground'}`}
              onClick={handleBookmark}
            >
              <Bookmark className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {scholarship.amount ? `$${scholarship.amount.toLocaleString()}` : "Variable"}
            </Badge>
            <Badge className={deadlineInfo.color}>
              <Calendar className="h-3 w-3 mr-1" />
              {deadlineInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col pt-2">
          <div className="relative mb-4 flex-1">
            <p className={`text-sm text-muted-foreground ${!isExpanded ? 'line-clamp-2' : ''}`}>
              {scholarship.requirements || "No specific requirements listed."}
            </p>
            {scholarship.requirements && scholarship.requirements.length > 100 && (
              <Button
                variant="link"
                size="sm"
                className="p-0 h-auto text-xs mt-1"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <span className="flex items-center gap-1">Show less <ChevronUp className="h-3 w-3" /></span>
                ) : (
                  <span className="flex items-center gap-1">Read more <ChevronDown className="h-3 w-3" /></span>
                )}
              </Button>
            )}
          </div>
          <Button className="w-full mt-auto" onClick={handleApply}>
            Apply Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

const ScholarshipSkeleton = () => (
  <Card className="h-full">
    <CardHeader className="pb-2">
      <Skeleton className="h-6 w-3/4 mb-2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-24" />
      </div>
    </CardHeader>
    <CardContent>
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6 mb-4" />
      <Skeleton className="h-10 w-full" />
    </CardContent>
  </Card>
);

const Scholarships = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [amountFilter, setAmountFilter] = useState("all");
  const [deadlineFilter, setDeadlineFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.2 });
  const { ref: gridRef, isInView: gridInView } = useInView({ threshold: 0.1 });
  const { toast } = useToast();

  const { data: scholarships, isLoading, error } = useQuery({
    queryKey: ['scholarships', searchQuery],
    queryFn: () => searchQuery ? searchScholarships(searchQuery) : getScholarships(),
    staleTime: 5 * 60 * 1000,
  });

  const filteredAndSortedScholarships = (scholarships || []).filter(s => {
    // Amount Filter
    if (amountFilter !== "all") {
      const amount = s.amount || 0;
      if (amountFilter === "under5k" && amount >= 5000) return false;
      if (amountFilter === "5k-15k" && (amount < 5000 || amount > 15000)) return false;
      if (amountFilter === "15kplus" && amount <= 15000) return false;
    }

    // Deadline Filter
    if (deadlineFilter !== "all" && s.deadline) {
      const deadline = new Date(s.deadline);
      const now = new Date();
      if (deadlineFilter === "thisMonth") {
        const end = endOfMonth(now);
        if (deadline > end || deadline < now) return false;
      }
      if (deadlineFilter === "next3Months") {
        const end = addMonths(now, 3);
        if (deadline > end || deadline < now) return false;
      }
    }
    if (deadlineFilter === "open" && !s.deadline) return true;
    if (deadlineFilter !== "all" && !s.deadline && deadlineFilter !== "open") return false;

    return true;
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    if (sortBy === "deadline") {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    if (sortBy === "amount") return (b.amount || 0) - (a.amount || 0);
    return 0;
  });

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <section className="border-b pt-32 pb-16">
        <div className="container mx-auto px-4">
          <div 
            ref={heroRef}
            className={`text-center max-w-3xl mx-auto transition-all duration-1000 ${
              heroInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <p className="editorial-kicker mb-3">Opportunity desk</p>
            <h1 className="mb-6 text-5xl font-semibold md:text-6xl">Scholarships & Opportunities</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Discover funding opportunities to support your academic journey and unlock your potential.
            </p>

            {/* Search Bar */}
            <div className="relative max-w-xl mx-auto mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title or requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg"
              />
            </div>
            {!isLoading && !error && (
              <p className="text-sm text-muted-foreground">
                {filteredAndSortedScholarships.length} scholarships available
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Filter Bar */}
      <section className="py-4 border-y bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
              <div className="w-full md:w-48">
                <Select value={amountFilter} onValueChange={setAmountFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Amount Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Amounts</SelectItem>
                    <SelectItem value="under5k">Under $5,000</SelectItem>
                    <SelectItem value="5k-15k">$5,000–$15,000</SelectItem>
                    <SelectItem value="15kplus">$15,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full md:w-48">
                <Select value={deadlineFilter} onValueChange={setDeadlineFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Deadline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Deadlines</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="next3Months">Next 3 Months</SelectItem>
                    <SelectItem value="open">Open (No deadline)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Sort by:</span>
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="deadline">Deadline (Soonest)</SelectItem>
                  <SelectItem value="amount">Amount (Highest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map(i => <ScholarshipSkeleton key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-xl text-destructive mb-4">Failed to load scholarships. Please try again.</p>
              <Button onClick={() => window.location.reload()} variant="outline">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Retry
              </Button>
            </div>
          ) : filteredAndSortedScholarships.length === 0 ? (
            <div className="text-center py-16">
              <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No scholarships found</h3>
              <p className="text-muted-foreground mb-6">Try adjusting your filters or search query.</p>
              <Button onClick={() => {
                setSearchQuery("");
                setAmountFilter("all");
                setDeadlineFilter("all");
                setSortBy("newest");
              }} variant="link">
                Clear all filters
              </Button>
            </div>
          ) : (
            <div 
              ref={gridRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {filteredAndSortedScholarships.map((scholarship, index) => (
                <ScholarshipCard 
                  key={scholarship.id} 
                  scholarship={scholarship} 
                  index={index}
                  gridInView={gridInView}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Scholarships;
