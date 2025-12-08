import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { schoolGallery } from '../services/api';
import { useToast } from '../components/ui/use-toast';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Calendar, MapPin, Plus, School } from 'lucide-react';

interface SchoolEvent {
    id: number;
    title: string;
    description: string;
    event_date: string;
    location: string;
    school_name: string;
    school_logo?: string;
    cover_image?: string;
}

const SchoolGallery = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Create Event State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        eventDate: '',
        location: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, [user]);

    const fetchEvents = async () => {
        try {
            const response = await schoolGallery.getAll();
            setEvents(response.data);
        } catch (error) {
            console.error('Fetch events error:', error);
            toast({ title: "Error", description: "Failed to load events", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await schoolGallery.create(formData);
            toast({ title: "Success", description: "Event created successfully" });
            setIsCreateOpen(false);
            setFormData({ title: '', description: '', eventDate: '', location: '' });
            fetchEvents();
        } catch (error) {
            toast({ title: "Error", description: "Failed to create event", variant: "destructive" });
        } finally {
            setCreating(false);
        }
    };

    const canCreate = user?.role === 'teacher' || user?.role === 'admin';

    return (
        <div className="container mx-auto py-8">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">School Gallery</h1>
                    <p className="text-muted-foreground">Recent events and highlights from our schools</p>
                </div>
                {canCreate && (
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" /> Create Event
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Create New Event</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Event Title</Label>
                                    <Input
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="e.g. Annual Sports Day"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="datetime-local"
                                        value={formData.eventDate}
                                        onChange={e => setFormData({ ...formData, eventDate: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Input
                                        value={formData.location}
                                        onChange={e => setFormData({ ...formData, location: e.target.value })}
                                        placeholder="e.g. Main Stadium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        placeholder="What happened at this event?"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Event'}</Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {loading ? (
                <div className="text-center py-12">Loading events...</div>
            ) : events.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No events found.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map(event => (
                        <Card key={event.id} className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden" onClick={() => navigate(`/school/gallery/${event.id}`)}>
                            <div className="h-48 bg-muted relative">
                                {event.cover_image ? (
                                    <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-secondary/20">
                                        <School className="h-12 w-12 text-muted-foreground/50" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 bg-background/90 px-2 py-1 rounded text-xs font-semibold shadow-sm">
                                    {event.school_name}
                                </div>
                            </div>
                            <CardHeader>
                                <CardTitle className="line-clamp-1">{event.title}</CardTitle>
                                <CardDescription className="flex items-center gap-2 text-xs">
                                    <Calendar className="h-3 w-3" /> {new Date(event.event_date).toLocaleDateString()}
                                    {event.location && <span className="flex items-center gap-1 ml-2"><MapPin className="h-3 w-3" /> {event.location}</span>}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SchoolGallery;
