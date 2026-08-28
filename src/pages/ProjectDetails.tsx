import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectDetails, verifyProject, uploadProjectMedia, deleteProject } from '@/lib/supabase/projects';
import { postProjectComment } from '@/lib/supabase/parent';
import {
  getProjectTasks, createProjectTask, updateProjectTask, deleteProjectTask, computeTaskProgress,
} from '@/lib/supabase/projectTasks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import AddProjectModal from '@/components/AddProjectModal';
import ProjectFilesPanel from '@/components/ProjectFilesPanel';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
  Loader2, Plus, CheckCircle, FileText, Star, Pencil, Trash2,
  ListChecks, CalendarDays,
} from 'lucide-react';
import { MediaDisplay } from '@/components/MediaDisplay';
import type { ProjectTask } from '@/integrations/supabase/types';

interface ProjectMedia {
  id: number | string;
  media_type: 'image' | 'video' | 'pdf';
  media_url: string;
  thumbnail_url?: string;
  file_name: string;
}

interface Feedback {
  id: number | string;
  reviewer_name: string;
  reviewer_avatar?: string;
  comment: string;
  rating: number;
  created_at: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  status: string;
  start_date: string;
  end_date?: string;
  verified: boolean;
  owner_id?: string | null;
  user_id?: string | null;
  tags?: string[] | null;
  media: ProjectMedia[];
  feedback: Feedback[];
}

const TASK_STATUS_LABEL: Record<ProjectTask['status'], string> = {
  todo: 'To do',
  in_progress: 'In progress',
  done: 'Done',
};

const TASK_STATUS_BADGE: Record<ProjectTask['status'], string> = {
  todo: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  in_progress: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  done: 'bg-green-100 text-green-700 hover:bg-green-100',
};

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);

  // Upload State
  const [file, setFile] = useState<File | null>(null);

  // Feedback State
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Verification State
  const [verifying, setVerifying] = useState(false);

  // Edit / Delete state
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Tasks state
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      if (!id) return;
      const data = await getProjectDetails(id);
      setProject(data as Project);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({ title: "Error", description: "Failed to load project", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    if (!id) return;
    setTasksLoading(true);
    try {
      setTasks(await getProjectTasks(id));
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({ title: "Error", description: error.message || "Failed to load tasks", variant: "destructive" });
    } finally {
      setTasksLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [id]);

  const canEdit = !!user && !!project && (project.user_id === user.id || project.owner_id === user.id);

  const taskStats = {
    total: tasks.length,
    done: tasks.filter((t) => t.status === 'done').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
  };
  const progress = computeTaskProgress(taskStats);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !id) return;

    setUploading(true);
    try {
      await uploadProjectMedia(id, file);
      toast({ title: "Success", description: "Media added to project" });
      setOpenUpload(false);
      setFile(null);
      fetchProject();
    } catch (error) {
      console.error('Upload failed:', error);
      toast({ title: "Error", description: "Failed to upload media", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleVerify = async () => {
    if (!id || !confirm("Verify this project? This confirms authentication by a teacher.")) return;
    setVerifying(true);
    try {
      await verifyProject(id);
      toast({ title: "Verified", description: "Project marked as verified" });
      fetchProject();
    } catch (error) {
      toast({ title: "Error", description: "Failed to verify", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const handleFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSubmittingFeedback(true);
    try {
      await postProjectComment(id, comment);
      toast({ title: "Feedback Added", description: "Thank you for your review" });
      setComment('');
      setRating(5);
      fetchProject();
    } catch (error) {
      toast({ title: "Error", description: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await deleteProject(id);
      toast({ title: "Project deleted", description: "The project was moved to the archive." });
      navigate('/projects');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete project", variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const task = await createProjectTask(id, { title: newTaskTitle, due_date: newTaskDue || null });
      setTasks([...tasks, task]);
      setNewTaskTitle('');
      setNewTaskDue('');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to add task", variant: "destructive" });
    } finally {
      setAddingTask(false);
    }
  };

  const cycleTaskStatus = async (task: ProjectTask) => {
    const next: ProjectTask['status'] =
      task.status === 'todo' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'todo';
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status: next } : t)));
    try {
      const updated = await updateProjectTask(task.id, { status: next });
      setTasks(tasks.map((t) => (t.id === task.id ? updated : t)));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update task", variant: "destructive" });
      setTasks(tasks.map((t) => (t.id === task.id ? task : t)));
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const prev = tasks;
    setTasks(tasks.filter((t) => t.id !== taskId));
    try {
      await deleteProjectTask(taskId);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete task", variant: "destructive" });
      setTasks(prev);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (!project) return <div className="p-8 text-center">Project not found</div>;

  const images = project.media?.filter(m => m.media_type === 'image' || !m.media_type);
  const videos = project.media?.filter(m => m.media_type === 'video');
  const pdfs = project.media?.filter(m => m.media_type === 'pdf');

  return (
    <div className="container mx-auto py-8 text-foreground">
      <Breadcrumb
        to="/dashboard"
        label="Back to Dashboard"
        items={[{ label: "Projects", to: "/projects" }]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-4xl font-bold break-words">{project.title}</h1>
              <div className="flex items-center gap-2 shrink-0">
                {project.verified && (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                  </Badge>
                )}
                {canEdit && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-muted-foreground mt-2">{project.description}</p>
            {project.tags && project.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {project.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            )}
          </div>

          {/* Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <ListChecks className="h-5 w-5 text-primary" /> Tasks
                </CardTitle>
                <div className="text-right">
                  <span className="text-2xl font-bold">{progress}%</span>
                  <p className="text-xs text-muted-foreground">{taskStats.done} of {taskStats.total} done</p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {canEdit && (
                <form onSubmit={handleAddTask} className="flex gap-2">
                  <Input
                    placeholder="Add a task..."
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={newTaskDue}
                    onChange={(e) => setNewTaskDue(e.target.value)}
                    className="w-40"
                    title="Due date (optional)"
                  />
                  <Button type="submit" disabled={addingTask || !newTaskTitle.trim()}>
                    {addingTask ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  </Button>
                </form>
              )}

              {tasksLoading ? (
                <div className="text-center py-6 text-muted-foreground">Loading tasks...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  No tasks yet. {canEdit && 'Break your project into checkable steps to track progress.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 rounded-lg border px-3 py-2.5 hover:bg-muted/40"
                    >
                      <Checkbox
                        checked={task.status === 'done'}
                        onCheckedChange={() => cycleTaskStatus(task)}
                        aria-label={`Mark ${task.title} done`}
                      />
                      <span
                        className={`flex-1 text-sm min-w-0 ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {task.title}
                      </span>
                      {task.due_date && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        type="button"
                        className="shrink-0"
                        onClick={() => cycleTaskStatus(task)}
                        title="Change status"
                      >
                        <Badge className={TASK_STATUS_BADGE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-muted-foreground hover:text-destructive shrink-0"
                          title="Delete task"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents (project files) */}
          <ProjectFilesPanel projectId={project.id} canEdit={canEdit} />

          {/* Gallery */}
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Gallery</h2>
            {images && images.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {images.map(img => (
                  <div key={img.id} className="rounded-lg overflow-hidden border bg-muted aspect-video relative">
                    <MediaDisplay
                      src={img.media_url}
                      alt={img.file_name}
                      kind="image"
                      fit="cover"
                      fallbackLabel={img.file_name}
                    />
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground italic">No images yet.</p>}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Videos</h2>
            {videos && videos.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {videos.map(vid => (
                  <div key={vid.id} className="rounded-lg overflow-hidden border bg-black aspect-video">
                    <MediaDisplay
                      src={vid.media_url}
                      alt={vid.file_name}
                      kind="video"
                      fit="contain"
                      controls
                      muted={false}
                      fallbackLabel={vid.file_name}
                    />
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground italic">No videos yet.</p>}
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Documents</h2>
            {pdfs && pdfs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pdfs.map(pdf => (
                  <a key={pdf.id} href={pdf.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <FileText className="h-8 w-8 text-blue-500 mr-3" />
                    <div className="truncate">
                      <p className="font-medium truncate">{pdf.file_name}</p>
                      <p className="text-xs text-muted-foreground">PDF Document</p>
                    </div>
                  </a>
                ))}
              </div>
            ) : <p className="text-muted-foreground italic">No documents attached.</p>}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Status</Label>
                <div className="capitalize font-medium">{project.status}</div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground uppercase">Date</Label>
                <div className="font-medium">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'No start date'}
                  {project.end_date ? ` - ${new Date(project.end_date).toLocaleDateString()}` : ' - Present'}
                </div>
              </div>

              {/* Actions */}
              {(userRole === 'student' || userRole === 'teacher' || userRole === 'admin' || userRole === 'super_admin') && (
                <div className="pt-4 space-y-2">
                  <Dialog open={openUpload} onOpenChange={setOpenUpload}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Plus className="mr-2 h-4 w-4" /> Add Media
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Add Media</DialogTitle></DialogHeader>
                      <form onSubmit={handleUpload} className="space-y-4">
                        <Label>Select File (Image, Video, PDF)</Label>
                        <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} required />
                        <DialogFooter><Button type="submit" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</Button></DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>

                  {(userRole === 'teacher' || userRole === 'super_admin') && !project.verified && (
                    <Button variant="outline" className="w-full border-green-600 text-green-600 hover:bg-green-50" onClick={handleVerify} disabled={verifying}>
                      <CheckCircle className="mr-2 h-4 w-4" /> Verify Project
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Feedback Section */}
          <Card>
            <CardHeader>
              <CardTitle>Feedback</CardTitle>
              <CardDescription>Reviews from teachers and peers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {project.feedback && project.feedback.length > 0 ? (
                <div className="space-y-4">
                  {project.feedback.map(f => (
                    <div key={f.id} className="border-b pb-4 last:border-0 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-sm">{f.reviewer_name}</span>
                        <div className="flex text-yellow-500">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3 w-3 ${i < f.rating ? 'fill-current' : 'text-gray-300'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">{f.comment}</p>
                      <div className="text-xs text-muted-foreground mt-1">{new Date(f.created_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-center text-muted-foreground">No feedback yet.</p>}

              {/* Add Feedback Form */}
              {(userRole === 'teacher' || userRole === 'parent' || userRole === 'admin') && (
                <form onSubmit={handleFeedback} className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-sm">Leave Feedback</h4>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button key={star} type="button" onClick={() => setRating(star)} className="text-yellow-500 focus:outline-none">
                        <Star className={`h-5 w-5 ${star <= rating ? 'fill-current' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                  <Textarea placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)} required className="min-h-[80px]" />
                  <Button type="submit" size="sm" className="w-full" disabled={submittingFeedback}>Submit Feedback</Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      {canEdit && (
        <AddProjectModal
          userId={user!.id}
          project={{
            id: project.id,
            title: project.title,
            description: project.description,
            start_date: project.start_date,
            end_date: project.end_date,
            tags: project.tags ?? [],
            status: project.status,
          }}
          open={editOpen}
          onOpenChange={setEditOpen}
          onProjectAdded={fetchProject}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              "{project.title}" will be moved to the archive and hidden from all views. This can be restored by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProjectDetails;
