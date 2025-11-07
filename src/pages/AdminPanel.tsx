import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;
type Achievement = Tables<"achievements">;
type Project = Tables<"projects">;
type MediaItem = Tables<"media_items">;

const AdminPanel = () => {
  const { user, profile } = useAuth();
  const adminId = profile?.id ?? user?.id ?? null;
  const [searchParams] = useSearchParams();
  const schoolId = searchParams.get("schoolId");
  const isScopedToSchool = Boolean(schoolId);

  // Users
  const [users, setUsers] = useState<Profile[]>([]);
  const [userQuery, setUserQuery] = useState("");

  // Achievements
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Projects
  const [projects, setProjects] = useState<Project[]>([]);

  // Media
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  // School member ids (when scoped)
  const [schoolMemberIds, setSchoolMemberIds] = useState<string[]>([]);

  const loadSchoolMembers = async () => {
    if (!schoolId) {
      setSchoolMemberIds([]);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("school_id", schoolId)
      .limit(500);
    if (!error && data) {
      setSchoolMemberIds((data as { id: string }[]).map((d) => d.id));
    }
  };

  const loadUsers = async () => {
    let query = supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (isScopedToSchool && schoolId) {
      query = query.eq("school_id", schoolId);
    }
    const { data, error } = await query;
    if (!error && data) setUsers(data as Profile[]);
  };

  const loadAchievements = async () => {
    let query = supabase
      .from("achievements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (isScopedToSchool && schoolMemberIds.length > 0) {
      query = query.in("user_id", schoolMemberIds);
    }
    const { data, error } = await query;
    if (!error && data) setAchievements(data as Achievement[]);
  };

  const loadProjects = async () => {
    let query = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (isScopedToSchool && schoolMemberIds.length > 0) {
      query = query.in("owner_id", schoolMemberIds);
    }
    const { data, error } = await query;
    if (!error && data) setProjects(data as Project[]);
  };

  const loadMedia = async () => {
    let query = supabase
      .from("media_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);
    if (isScopedToSchool && schoolMemberIds.length > 0) {
      query = query.in("uploaded_by", schoolMemberIds);
    }
    const { data, error } = await query;
    if (!error && data) setMediaItems(data as MediaItem[]);
  };

  useEffect(() => {
    // First load members if scoped, then load datasets
    const init = async () => {
      await loadSchoolMembers();
      await Promise.all([loadUsers(), loadAchievements(), loadProjects(), loadMedia()]);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const changeUserRole = async (id: string, role: Profile["role"]) => {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (!error) loadUsers();
  };

  const verifyAchievement = async (id: string, verified: boolean) => {
    const payload: Partial<Achievement> = { verified } as any;
    if (verified && adminId) {
      (payload as any).verified_by = adminId;
    }
    const { error } = await supabase.from("achievements").update(payload).eq("id", id);
    if (!error) loadAchievements();
  };

  const approveProject = async (id: string, verified: boolean) => {
    const { error } = await supabase.from("projects").update({ verified }).eq("id", id);
    if (!error) loadProjects();
  };

  const updateProjectStatus = async (id: string, status: Project["status"]) => {
    const { error } = await supabase.from("projects").update({ status }).eq("id", id);
    if (!error) loadProjects();
  };

  const moderateMedia = async (id: string, action: "verify" | "unverify" | "delete") => {
    if (action === "delete") {
      const { error } = await supabase.from("media_items").delete().eq("id", id);
      if (!error) loadMedia();
      return;
    }
    const verified = action === "verify";
    const { error } = await supabase.from("media_items").update({ verified }).eq("id", id);
    if (!error) loadMedia();
  };

  const filteredUsers = users.filter((u) => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.id || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>
              Admin Panel {isScopedToSchool && schoolId ? <span className="text-sm font-normal text-muted-foreground">(Scoped to school {schoolId})</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="users">
              <TabsList className="mb-4">
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="achievements">Achievements</TabsTrigger>
                <TabsTrigger value="projects">Projects</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Search users by name or ID"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                  />
                  <Button variant="secondary" onClick={loadUsers}>Refresh</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {filteredUsers.map((u) => (
                    <div key={u.id} className="p-4 border rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">ID: {u.id}</div>
                        <div className="mt-1"><Badge variant="outline">{u.role}</Badge></div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(["student","parent","teacher","admin"] as Profile["role"][]).map((r) => (
                          <Button key={r} variant={u.role === r ? "default" : "secondary"} size="sm" onClick={() => changeUserRole(u.id, r)}>
                            {r}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="achievements" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={loadAchievements}>Refresh</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {achievements.map((a) => (
                    <div key={a.id} className="p-4 border rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium">{a.title}</div>
                        <div className="text-xs text-muted-foreground">User: {a.user_id}</div>
                        <div className="text-xs text-muted-foreground">Category: {a.category}</div>
                        <div className="mt-1"><Badge variant={a.verified ? "default" : "outline"}>{a.verified ? "Verified" : "Unverified"}</Badge></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => verifyAchievement(a.id, true)}>Verify</Button>
                        <Button size="sm" variant="secondary" onClick={() => verifyAchievement(a.id, false)}>Unverify</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={loadProjects}>Refresh</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {projects.map((p) => (
                    <div key={p.id} className="p-4 border rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-muted-foreground">Owner: {p.owner_id}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <Badge variant="outline">{p.status}</Badge>
                          <Badge variant={p.verified ? "default" : "outline"}>{p.verified ? "Approved" : "Pending"}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(["pending","ongoing","complete"] as Project["status"][]).map((s) => (
                          <Button key={s} size="sm" variant={p.status === s ? "default" : "secondary"} onClick={() => updateProjectStatus(p.id, s)}>
                            {s}
                          </Button>
                        ))}
                        <Button size="sm" onClick={() => approveProject(p.id, true)}>Approve</Button>
                        <Button size="sm" variant="secondary" onClick={() => approveProject(p.id, false)}>Revoke</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={loadMedia}>Refresh</Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {mediaItems.map((m) => (
                    <div key={m.id} className="p-4 border rounded-md flex items-center justify-between">
                      <div>
                        <div className="font-medium">{m.title}</div>
                        <div className="text-xs text-muted-foreground">Type: {m.media_type}</div>
                        <div className="text-xs text-muted-foreground">Event: {m.event_id ?? "-"}</div>
                        <div className="mt-1"><Badge variant={m.verified ? "default" : "outline"}>{m.verified ? "Verified" : "Unverified"}</Badge></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => moderateMedia(m.id, "verify")}>Verify</Button>
                        <Button size="sm" variant="secondary" onClick={() => moderateMedia(m.id, "unverify")}>Unverify</Button>
                        <Button size="sm" variant="destructive" onClick={() => moderateMedia(m.id, "delete")}>Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;