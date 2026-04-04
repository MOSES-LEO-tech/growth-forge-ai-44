import { useState } from "react";
import { useMyApplications, useUpdateApplicationStatus, ScholarshipStatus, ScholarshipApplication } from "@/hooks/useScholarshipApplications";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { 
  Bookmark, 
  Send, 
  Users, 
  Trophy, 
  XCircle, 
  Calendar, 
  DollarSign, 
  MoreVertical,
  Pencil
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLUMNS: { id: ScholarshipStatus; label: string; icon: any; color: string }[] = [
  { id: 'bookmarked', label: 'Bookmarked', icon: Bookmark, color: 'border-t-blue-500' },
  { id: 'applied', label: 'Applied', icon: Send, color: 'border-t-amber-500' },
  { id: 'interview', label: 'Interview', icon: Users, color: 'border-t-purple-500' },
  { id: 'awarded', label: 'Awarded', icon: Trophy, color: 'border-t-emerald-500' },
  { id: 'rejected', label: 'Rejected', icon: XCircle, color: 'border-t-red-500' },
];

const ApplicationCard = ({ app }: { app: ScholarshipApplication }) => {
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(app.notes || "");
  const updateStatus = useUpdateApplicationStatus();
  const { toast } = useToast();

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("scholarshipId", app.scholarship_id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleUpdateNotes = async () => {
    try {
      await updateStatus.mutateAsync({ 
        scholarshipId: app.scholarship_id, 
        status: app.status, 
        notes 
      });
      setIsEditingNotes(false);
      toast({ title: "Notes updated" });
    } catch (error) {
      toast({ title: "Failed to update notes", variant: "destructive" });
    }
  };

  return (
    <Card 
      draggable 
      onDragStart={handleDragStart}
      className="cursor-move hover:shadow-md transition-shadow bg-white border-slate-200"
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-bold line-clamp-2">{app.scholarship.title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
            <MoreVertical className="h-4 w-4 text-slate-400" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5 bg-slate-100 text-slate-600 border-none">
            < DollarSign className="h-2.5 w-2.5 mr-0.5" />
            {app.scholarship.amount ? `$${app.scholarship.amount.toLocaleString()}` : "Variable"}
          </Badge>
          {app.scholarship.deadline && (
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-5 bg-blue-50 text-blue-600 border-none">
              <Calendar className="h-2.5 w-2.5 mr-0.5" />
              {format(new Date(app.scholarship.deadline), "MMM d")}
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Notes</span>
            {!isEditingNotes && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-4 w-4" 
                onClick={() => setIsEditingNotes(true)}
              >
                <Pencil className="h-3 w-3 text-slate-400" />
              </Button>
            )}
          </div>
          
          {isEditingNotes ? (
            <div className="space-y-2">
              <Input 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs h-8 px-2"
                placeholder="Add notes..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdateNotes();
                  if (e.key === 'Escape') {
                    setIsEditingNotes(false);
                    setNotes(app.notes || "");
                  }
                }}
              />
              <div className="flex gap-1 justify-end">
                <Button size="sm" className="h-6 text-[10px] px-2" onClick={handleUpdateNotes}>Save</Button>
                <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => {
                  setIsEditingNotes(false);
                  setNotes(app.notes || "");
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic line-clamp-2 min-h-[1rem]">
              {app.notes || "No notes added..."}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const MyApplications = () => {
  const { data: applications, isLoading } = useMyApplications();
  const updateStatus = useUpdateApplicationStatus();
  const { toast } = useToast();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, status: ScholarshipStatus) => {
    e.preventDefault();
    const scholarshipId = e.dataTransfer.getData("scholarshipId");
    
    const app = applications?.find(a => a.scholarship_id === scholarshipId);
    if (app && app.status !== status) {
      try {
        await updateStatus.mutateAsync({ scholarshipId, status });
        toast({ title: `Moved to ${status}` });
      } catch (error) {
        toast({ title: "Failed to update status", variant: "destructive" });
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-grow pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">My Scholarship Tracker</h1>
            <p className="text-slate-500 font-medium">Manage and track your scholarship application journey.</p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 h-full items-start">
              {COLUMNS.map((column) => (
                <div 
                  key={column.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className="flex flex-col gap-4 min-h-[500px]"
                >
                  <div className={cn(
                    "bg-white border-t-4 p-3 rounded-lg shadow-sm flex items-center gap-2 sticky top-24 z-10",
                    column.color
                  )}>
                    <column.icon className="h-4 w-4 text-slate-600" />
                    <h2 className="text-sm font-bold text-slate-700">{column.label}</h2>
                    <Badge variant="secondary" className="ml-auto bg-slate-100 text-slate-500 border-none h-5 px-1.5 text-[10px]">
                      {applications?.filter(a => a.status === column.id).length || 0}
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {applications
                      ?.filter(a => a.status === column.id)
                      .map((app) => (
                        <ApplicationCard key={app.id} app={app} />
                      ))}
                    
                    {applications?.filter(a => a.status === column.id).length === 0 && (
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center bg-slate-50/50">
                        <p className="text-xs text-slate-400 font-medium">No applications here</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MyApplications;
