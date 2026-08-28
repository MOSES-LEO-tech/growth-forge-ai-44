import { useState, useEffect } from "react";
import { getStudentsBySchool } from "@/lib/supabase/teacher";
import { useAuth } from "@/contexts/AuthContext";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Search, Mail, MoreHorizontal, Loader2, Eye, UserMinus } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudentDirectoryWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

export function StudentDirectoryWidget({ className, defaultExpanded }: StudentDirectoryWidgetProps) {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState("");
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState<any[]>([]);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);

    // Fetch students
    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setLoading(true);
            try {
                const studentsData = await getStudentsBySchool(user.id);
                setStudents(studentsData);
                setClasses([]); // Mocked classes for now
            } catch (error) {
                console.error("Failed to fetch data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

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
                    <Select
                        value={selectedClass ?? "all"}
                        onValueChange={(value) => setSelectedClass(value === "all" ? null : value)}
                    >
                        <SelectTrigger className="h-10 w-full sm:w-[180px]" aria-label="Filter students by class">
                            <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All classes</SelectItem>
                            {classes.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name} ({c.student_count})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                            <div className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                            aria-label={`Actions for ${student.full_name}`}
                                        >
                                            <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                            Student actions
                                        </DropdownMenuLabel>
                                        <DropdownMenuItem
                                            onClick={() => window.open(`mailto:${student.email}`)}
                                            className="gap-2 cursor-pointer"
                                        >
                                            <Eye className="h-4 w-4" aria-hidden="true" />
                                            View Profile
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => window.open(`mailto:${student.email}`)}
                                            className="gap-2 cursor-pointer"
                                        >
                                            <Mail className="h-4 w-4" aria-hidden="true" />
                                            Send Message
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                                            <UserMinus className="h-4 w-4" aria-hidden="true" />
                                            Remove Student
                                        </DropdownMenuItem>
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
