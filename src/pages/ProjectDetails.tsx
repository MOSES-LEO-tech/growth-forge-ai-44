import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getProjectDetails, verifyProject, uploadProjectMedia } from '@/lib/supabase/projects';
import { postProjectComment } from '@/lib/supabase/parent';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, CheckCircle, FileText, ArrowLeft, Star } from 'lucide-react';
import { MediaDisplay } from '@/components/MediaDisplay';

interface ProjectMedia {
    id: number;
    media_type: 'image' | 'video' | 'pdf'; // Added PDF manually for internal logic, backend stores 'pdf' or mimetype
    media_url: string;
    thumbnail_url?: string;
    file_name: string;
}

interface Feedback {
    id: number;
    reviewer_name: string;
    reviewer_avatar?: string;
    comment: string;
    rating: number;
    created_at: string;
}

interface Project {
    id: number;
    title: string;
    description: string;
    status: string;
    start_date: string;
    end_date?: string;
    verified: boolean;
    verified_by?: number;
    media: ProjectMedia[];
    feedback: Feedback[];
}

const ProjectDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
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

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            if (!id) return;
            const data = await getProjectDetails(id);
            setProject(data as any);
        } catch (error) {
            console.error('Error fetching project:', error);
            toast({ title: "Error", description: "Failed to load project", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

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

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    if (!project) return <div className="p-8 text-center">Project not found</div>;

    const images = project.media?.filter(m => m.media_type === 'image' || !m.media_type); // Default to image if undefined
    const videos = project.media?.filter(m => m.media_type === 'video');
    const pdfs = project.media?.filter(m => m.media_type === 'pdf');

    return (
        <div className="container mx-auto py-8 text-foreground">
            <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
            </Button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Header */}
                    <div>
                        <div className="flex justify-between items-start">
                            <h1 className="text-4xl font-bold">{project.title}</h1>
                            {project.verified && (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                    <CheckCircle className="mr-1 h-3 w-3" /> Verified
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground mt-2">{project.description}</p>
                    </div>

                    {/* Media Gallery */}
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
                            {(user?.role === 'student' /* Add check for ownership if possible */ || user?.role === 'teacher' || user?.role === 'admin') && (
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

                                    {(user?.role === 'teacher' || user?.role === 'admin') && !project.verified && (
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
                            {(user?.role === 'teacher' || user?.role === 'parent' || user?.role === 'admin') && (
                                <form onSubmit={handleFeedback} className="space-y-3 pt-4 border-t">
                                    <h4 className="font-medium text-sm">Leave Feedback</h4>
                                    <div className="flex gap-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button key={star} type="button" onClick={() => setRating(star)} className={`text-yellow-500 focus:outline-none`}>
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
        </div>
    );
};

export default ProjectDetails;
