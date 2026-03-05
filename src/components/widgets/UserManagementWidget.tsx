import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserCog, UserX, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { schoolAdmin } from "@/services/api";

interface UserManagementWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface UserRecord {
  id: number;
  full_name: string;
  email: string;
  role: string;
  grade?: string;
  isActive?: boolean;
}

export function UserManagementWidget({ className = "", defaultExpanded = false, schoolId }: UserManagementWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<UserRecord[]>([]);
  const [teachers, setTeachers] = useState<UserRecord[]>([]);
  const [parents, setParents] = useState<UserRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        const [studentsRes, teachersRes, parentsRes] = await Promise.all([
          schoolAdmin.getStudents({ limit: 50 }),
          schoolAdmin.getTeachers({ limit: 50 }),
          schoolAdmin.getParents({ limit: 50 })
        ]);
        
        setStudents(studentsRes.data || []);
        setTeachers(teachersRes.data || []);
        setParents(parentsRes.data || []);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        setError('Failed to load users');
        // Fallback to mock data for demo
        setStudents([
          { id: 1, full_name: "John Smith", email: "john@example.com", role: "student", grade: "10A" },
          { id: 2, full_name: "Jane Doe", email: "jane@example.com", role: "student", grade: "9B" },
          { id: 3, full_name: "Mike Johnson", email: "mike@example.com", role: "student", grade: "11A" },
        ]);
        setTeachers([
          { id: 4, full_name: "Mrs. Williams", email: "williams@school.edu", role: "teacher" },
          { id: 5, full_name: "Mr. Brown", email: "brown@school.edu", role: "teacher" },
        ]);
        setParents([
          { id: 6, full_name: "Robert Smith", email: "robert@example.com", role: "parent" },
          { id: 7, full_name: "Sarah Johnson", email: "sarah@example.com", role: "parent" },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
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
            <Users className="h-5 w-5" />
            User Management
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
              <UserPlus className="h-4 w-4 mr-1" /> Add User
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search users..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="students" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="students" className="flex-1">Students ({students.length})</TabsTrigger>
                <TabsTrigger value="teachers" className="flex-1">Teachers ({teachers.length})</TabsTrigger>
                <TabsTrigger value="parents" className="flex-1">Parents ({parents.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="students" className="mt-4">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {students.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(student => (
                      <div key={student.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{student.full_name}</p>
                          <p className="text-sm text-muted-foreground">{student.email} · {student.grade}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500">
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="teachers" className="mt-4">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {teachers.filter(t => t.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(teacher => (
                      <div key={teacher.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{teacher.full_name}</p>
                          <p className="text-sm text-muted-foreground">{teacher.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500">
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="parents" className="mt-4">
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-12" />)}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {parents.filter(p => p.full_name.toLowerCase().includes(searchTerm.toLowerCase())).map(parent => (
                      <div key={parent.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{parent.full_name}</p>
                          <p className="text-sm text-muted-foreground">{parent.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost">
                            <UserCog className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-500">
                            <UserX className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
