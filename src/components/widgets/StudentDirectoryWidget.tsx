import { useState, useEffect } from "react";
import { teacher } from "@/services/api";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Search, Mail, MoreHorizontal, GraduationCap, Loader2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Mock Data
const MOCK_STUDENTS = [
    { id: 1, name: "Alice Johnson", grade: "10th", status: "Active", avatar: "", email: "alice@example.com", growthScore: 850 },
    { id: 2, name: "Bob Smith", grade: "11th", status: "Active", avatar: "", email: "bob@example.com", growthScore: 720 },
    { id: 3, name: "Charlie Brown", grade: "9th", status: "Absent", avatar: "", email: "charlie@example.com", growthScore: 690 },
    { id: 4, name: "Diana Prince", grade: "12th", status: "Active", avatar: "", email: "diana@example.com", growthScore: 910 },
    { id: 5, name: "Evan Wright", grade: "10th", status: "Inactive", avatar: "", email: "evan@example.com", growthScore: 500 },
    { id: 6, name: "Fiona Gallagher", grade: "11th", status: "Active", avatar: "", email: "fiona@example.com", growthScore: 780 },
    { id: 7, name: "George Bailey", grade: "12th", status: "Active", avatar: "", email: "george@example.com", growthScore: 880 },
    { id: 8, name: "Hannah Montana", grade: "9th", status: "Active", avatar: "", email: "hannah@example.com", growthScore: 750 },
];

interface StudentDirectoryWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function StudentDirectoryWidget({ className, defaultExpanded }: StudentDirectoryWidgetProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    // Fetch classes and students
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [classesRes, studentsRes] = await Promise.all([
                    teacher.getClasses(),
                    teacher.getStudents({ limit: 50 })
                ]);
                setClasses(classesRes.data || []);
                setStudents(studentsRes.data?.students || []);
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter students based on search and class selection
    const filteredStudents = students.filter(student => {
        const matchesSearch = !searchQuery || 
            student.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            student.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesClass = !selectedClass || student.class_id === parseInt(selectedClass);
        return matchesSearch && matchesClass;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Active': return 'bg-green-500';
            case 'Absent': return 'bg-amber-500';
            case 'Inactive': return 'bg-slate-400';
            default: return 'bg-slate-400';
        }
    };

    // Calculate growth score from projects and achievements
    const getGrowthScore = (student: any) => {
        const projects = student.project_count || 0;
        const achievements = student.achievement_count || 0;
        return Math.min(1000, (projects * 50) + (achievements * 100));
    };

    const CollapsedContent = () => (
        <div className="flex flex-col h-full items-center justify-center text-center gap-2">
            {loading ? (
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            ) : (
                <>
                    <div className="flex -space-x-3 overflow-hidden p-2">
                        {students.slice(0, 4).map((s) => (
                            <Avatar key={s.id} className="inline-block border-2 border-background w-8 h-8">
                                <AvatarImage src={s.avatar_url} />
                                <AvatarFallback>{s.full_name?.charAt(0) || '?'}</AvatarFallback>
                            </Avatar>
                        ))}
                        {students.length > 4 && (
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                                +{students.length - 4}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-2xl font-bold">{students.length}</p>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                    </div>
                </>
            )}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col h-full gap-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Student Directory</h3>
                    <p className="text-sm text-muted-foreground">Manage and view all students</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {/* Class filter */}
                    <select 
                        className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={selectedClass || ''}
                        onChange={(e) => setSelectedClass(e.target.value || null)}
                    >
                        <option value="">All Classes</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.student_count})</option>
                        ))}
                    </select>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search students..."
                            className="pl-8"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                        <p>No students found{searchQuery ? ` matching "${searchQuery}"` : ''}</p>
                    </div>
                ) : (
                    filteredStudents.map((student) => (
                        <div key={student.id} className="group relative flex flex-col items-center p-6 bg-card border rounded-xl hover:shadow-md transition-all">
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="w-4 h-4" />
                                            <span className="sr-only">Actions</span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => alert(`View profile for ${student.full_name}`)}>View Profile</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => window.open(`mailto:${student.email}`)}>Send Message</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive">Remove Student</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="relative mb-4">
                                <Avatar className="w-20 h-20">
                                    <AvatarImage src={student.avatar_url} />
                                    <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                        {student.full_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                            </div>

                            <h4 className="font-bold text-lg text-center truncate w-full">{student.full_name}</h4>
                            <p className="text-sm text-muted-foreground mb-1">{student.grade || 'No grade'} Grade</p>

                            <div className="flex items-center gap-1 text-xs text-primary font-medium bg-primary/5 px-2 py-1 rounded-full mb-4">
                                <GraduationCap className="w-3 h-3" />
                                <span>Score: {getGrowthScore(student)}</span>
                            </div>

                            <div className="w-full mt-auto pt-2 border-t flex justify-center gap-2">
                                <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => window.open(`mailto:${student.email}`)}>
                                    <Mail className="w-3 h-3 mr-2" />
                                    Email
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
            {filteredStudents.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <p>No students found matching "{searchQuery}"</p>
                </div>
            )}
        </div>
    );

    return (
        <ExpandableWidget
            title="Class Directory"
            icon={<Users className="w-5 h-5 text-blue-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
