import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, BookMarked, Calendar, Plus, Users, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface AcademicStructureWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface ClassRecord {
  id: number;
  name: string;
  grade: string;
  studentCount: number;
  teacherName?: string;
}

interface SubjectRecord {
  id: number;
  name: string;
  code: string;
  grade: string;
}

interface AcademicYearRecord {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export function AcademicStructureWidget({ className = "", defaultExpanded = false, schoolId }: AcademicStructureWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<SubjectRecord[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYearRecord[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        setClasses([
          { id: 1, name: "Class 10A", grade: "10", studentCount: 32, teacherName: "Mrs. Williams" },
          { id: 2, name: "Class 10B", grade: "10", studentCount: 28, teacherName: "Mr. Brown" },
          { id: 3, name: "Class 9A", grade: "9", studentCount: 30, teacherName: "Ms. Davis" },
        ]);
        setSubjects([
          { id: 1, name: "Mathematics", code: "MATH", grade: "10" },
          { id: 2, name: "Physics", code: "PHY", grade: "10" },
          { id: 3, name: "Chemistry", code: "CHEM", grade: "10" },
          { id: 4, name: "English", code: "ENG", grade: "9" },
        ]);
        setAcademicYears([
          { id: 1, name: "2025-2026", startDate: "2025-09-01", endDate: "2026-07-15", isActive: true },
          { id: 2, name: "2024-2025", startDate: "2024-09-01", endDate: "2025-07-15", isActive: false },
        ]);
        setLoading(false);
      }, 500);
    };

    fetchData();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Academic Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Structure
          </div>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <Tabs defaultValue="classes" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="classes" className="flex-1">Classes ({classes.length})</TabsTrigger>
              <TabsTrigger value="subjects" className="flex-1">Subjects ({subjects.length})</TabsTrigger>
              <TabsTrigger value="years" className="flex-1">Years</TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {classes.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <GraduationCap className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="font-medium">{cls.name}</p>
                          <p className="text-sm text-muted-foreground">Grade {cls.grade} · {cls.studentCount} students</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {cls.teacherName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="subjects" className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {subjects.map(subject => (
                    <div key={subject.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <BookMarked className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">{subject.name}</p>
                          <p className="text-sm text-muted-foreground">{subject.code} · Grade {subject.grade}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="years" className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {academicYears.map(year => (
                    <div key={year.id} className={`flex items-center justify-between p-3 border rounded-lg ${year.isActive ? 'bg-green-50 dark:bg-green-950' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Calendar className={`h-5 w-5 ${year.isActive ? 'text-green-500' : 'text-gray-500'}`} />
                        <div>
                          <p className="font-medium">{year.name} {year.isActive && <span className="text-xs text-green-600 ml-2">(Active)</span>}</p>
                          <p className="text-sm text-muted-foreground">{year.startDate} - {year.endDate}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
