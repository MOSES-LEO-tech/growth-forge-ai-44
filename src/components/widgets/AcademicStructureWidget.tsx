import { useCallback, useEffect, useState } from "react";
import {
  BookMarked,
  Calendar,
  FolderOpen,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { AcademicClass, AcademicSubject, AcademicYear } from "@/integrations/supabase/types";
import {
  createAcademicClass,
  createAcademicSubject,
  createAcademicYear,
  deleteAcademicClass,
  deleteAcademicSubject,
  deleteAcademicYear,
  listAcademicClasses,
  listAcademicSubjects,
  listAcademicYears,
  updateAcademicClass,
  updateAcademicSubject,
  updateAcademicYear,
} from "@/lib/supabase/academics";

interface AcademicStructureWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

type EditorState =
  | { kind: "class"; editing?: AcademicClass }
  | { kind: "subject"; editing?: AcademicSubject }
  | { kind: "year"; editing?: AcademicYear }
  | null;

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function AcademicStructureWidget({
  className = "",
  defaultExpanded = false,
  schoolId,
}: AcademicStructureWidgetProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [editor, setEditor] = useState<EditorState>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!schoolId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [c, s, y] = await Promise.all([
        listAcademicClasses(schoolId),
        listAcademicSubjects(schoolId),
        listAcademicYears(schoolId),
      ]);
      setClasses(c);
      setSubjects(s);
      setYears(y);
    } catch (error) {
      toast({
        title: "Academic data failed",
        description: getErrorMessage(error, "Unable to load academic structure."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, toast]);

  useEffect(() => {
    void load();
  }, [load]);

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
          <p className="text-sm text-muted-foreground">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Academic Structure
          </div>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <Tabs defaultValue="classes" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="classes" className="flex-1">Classes ({classes.length})</TabsTrigger>
              <TabsTrigger value="subjects" className="flex-1">Subjects ({subjects.length})</TabsTrigger>
              <TabsTrigger value="years" className="flex-1">Years ({years.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="mt-4">
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditor({ kind: "class" })}>
                  <Plus className="mr-1 h-4 w-4" /> Add class
                </Button>
              </div>
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : classes.length === 0 ? (
                <EmptyState label="No classes yet." />
              ) : (
                <div className="space-y-2">
                  {classes.map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <GraduationCap className="h-5 w-5 shrink-0 text-blue-500" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{cls.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Grade {cls.grade || "—"} · {cls.student_count ?? 0} students · {cls.teacher_name || "Unassigned"}
                          </p>
                        </div>
                      </div>
                      <RowActions onEdit={() => setEditor({ kind: "class", editing: cls })} onDelete={() => void removeClass(cls.id)} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="subjects" className="mt-4">
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditor({ kind: "subject" })}>
                  <Plus className="mr-1 h-4 w-4" /> Add subject
                </Button>
              </div>
              {loading ? (
                <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : subjects.length === 0 ? (
                <EmptyState label="No subjects yet." />
              ) : (
                <div className="space-y-2">
                  {subjects.map((subject) => (
                    <div key={subject.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <BookMarked className="h-5 w-5 shrink-0 text-green-500" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{subject.name}</p>
                          <p className="text-sm text-muted-foreground">{subject.code || "—"} · Grade {subject.grade || "—"}</p>
                        </div>
                      </div>
                      <RowActions onEdit={() => setEditor({ kind: "subject", editing: subject })} onDelete={() => void removeSubject(subject.id)} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="years" className="mt-4">
              <div className="mb-3 flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setEditor({ kind: "year" })}>
                  <Plus className="mr-1 h-4 w-4" /> Add year
                </Button>
              </div>
              {loading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
              ) : years.length === 0 ? (
                <EmptyState label="No academic years yet." />
              ) : (
                <div className="space-y-2">
                  {years.map((year) => (
                    <div key={year.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {year.name} {year.is_active && <span className="ml-1 text-xs text-green-600">(Active)</span>}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {year.start_date || "—"} to {year.end_date || "—"}
                          </p>
                        </div>
                      </div>
                      <RowActions onEdit={() => setEditor({ kind: "year", editing: year })} onDelete={() => void removeYear(year.id)} />
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}

      <AcademicEditorDialog
        editor={editor}
        onClose={() => setEditor(null)}
        saving={saving}
        onSave={async (payload) => {
          setSaving(true);
          try {
            if (editor?.kind === "class") {
              if (editor.editing) await updateAcademicClass(editor.editing.id, payload as any);
              else await createAcademicClass(schoolId, payload as any);
            } else if (editor?.kind === "subject") {
              if (editor.editing) await updateAcademicSubject(editor.editing.id, payload as any);
              else await createAcademicSubject(schoolId, payload as any);
            } else if (editor?.kind === "year") {
              if (editor.editing) await updateAcademicYear(editor.editing.id, payload as any);
              else await createAcademicYear(schoolId, payload as any);
            }
            setEditor(null);
            await load();
            toast({ title: "Saved" });
          } catch (error) {
            toast({
              title: "Save failed",
              description: getErrorMessage(error, "Unable to save."),
              variant: "destructive",
            });
          } finally {
            setSaving(false);
          }
        }}
      />
    </Card>
  );

  async function removeClass(id: string) {
    try {
      await deleteAcademicClass(id);
      setClasses((c) => c.filter((x) => x.id !== id));
    } catch (error) {
      toast({ title: "Delete failed", description: getErrorMessage(error, "Unable to delete class."), variant: "destructive" });
    }
  }
  async function removeSubject(id: string) {
    try {
      await deleteAcademicSubject(id);
      setSubjects((c) => c.filter((x) => x.id !== id));
    } catch (error) {
      toast({ title: "Delete failed", description: getErrorMessage(error, "Unable to delete subject."), variant: "destructive" });
    }
  }
  async function removeYear(id: string) {
    try {
      await deleteAcademicYear(id);
      setYears((c) => c.filter((x) => x.id !== id));
    } catch (error) {
      toast({ title: "Delete failed", description: getErrorMessage(error, "Unable to delete year."), variant: "destructive" });
    }
  }
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" variant="ghost" size="icon" aria-label="Edit" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" aria-label="Delete" onClick={onDelete}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

function AcademicEditorDialog({
  editor,
  onClose,
  saving,
  onSave,
}: {
  editor: EditorState;
  onClose: () => void;
  saving: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [code, setCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [studentCount, setStudentCount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!editor) return;
    setName("");
    setGrade("");
    setCode("");
    setTeacherName("");
    setStudentCount("");
    setStartDate("");
    setEndDate("");
    setIsActive(false);
    if (editor.kind === "class" && editor.editing) {
      setName(editor.editing.name);
      setGrade(editor.editing.grade || "");
      setTeacherName(editor.editing.teacher_name || "");
      setStudentCount(editor.editing.student_count?.toString() || "");
    } else if (editor.kind === "subject" && editor.editing) {
      setName(editor.editing.name);
      setCode(editor.editing.code || "");
      setGrade(editor.editing.grade || "");
    } else if (editor.kind === "year" && editor.editing) {
      setName(editor.editing.name);
      setStartDate(editor.editing.start_date || "");
      setEndDate(editor.editing.end_date || "");
      setIsActive(editor.editing.is_active);
    }
  }, [editor]);

  const title =
    editor?.kind === "class" ? "Class" : editor?.kind === "subject" ? "Subject" : "Academic year";

  const submit = () => {
    if (!name.trim()) return;
    if (editor?.kind === "class") {
      void onSave({ name: name.trim(), grade: grade || null, teacher_name: teacherName || null, student_count: studentCount === "" ? null : Number(studentCount) });
    } else if (editor?.kind === "subject") {
      void onSave({ name: name.trim(), code: code || null, grade: grade || null });
    } else if (editor?.kind === "year") {
      void onSave({ name: name.trim(), start_date: startDate || null, end_date: endDate || null, is_active: isActive });
    }
  };

  return (
    <Dialog open={!!editor} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editor?.editing ? `Edit ${title.toLowerCase()}` : `Add ${title.toLowerCase()}`}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Class 10A" />
          </div>
          {(editor?.kind === "class" || editor?.kind === "subject") && (
            <div className="space-y-2">
              <Label>Grade</Label>
              <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="10" />
            </div>
          )}
          {editor?.kind === "subject" && (
            <div className="space-y-2">
              <Label>Code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="MATH" />
            </div>
          )}
          {editor?.kind === "class" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teacher</Label>
                <Input value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Mrs. Williams" />
              </div>
              <div className="space-y-2">
                <Label>Students</Label>
                <Input type="number" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} placeholder="32" />
              </div>
            </div>
          )}
          {editor?.kind === "year" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="year-active" checked={isActive} onCheckedChange={setIsActive} />
                <Label htmlFor="year-active">Active year</Label>
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
