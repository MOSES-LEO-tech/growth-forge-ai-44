import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createEvent } from "@/lib/supabase/gallery";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type SeedLog = {
  label: string;
  status: "ok" | "warn" | "error";
  detail: string;
};

const today = "2026-04-30";

const asset = (path: string) => `${window.location.origin}${path}`;

const sampleAssets = {
  image: asset("/qa-assets/sample-image.jpg"),
  video: asset("/qa-assets/sample-video.mp4"),
  pdf: asset("/qa-assets/sample-evidence.pdf"),
};

const statusCandidates: Record<"pending" | "ongoing" | "complete", (string | undefined)[]> = {
  pending: [undefined, "pending", "draft", "new", "not_started"],
  ongoing: [undefined, "ongoing", "in_progress", "active"],
  complete: [undefined, "complete", "completed", "done"],
};

const withTimeout = async (promise: PromiseLike<any>, label: string, timeoutMs = 7000): Promise<any> => {
  return Promise.race([
    promise,
    new Promise<any>((_, reject) => {
      window.setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
};

const isSchemaError = (error: any) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42P01" || message.includes("schema cache") || message.includes("does not exist");
};

const toFile = async (url: string, name: string, type: string) => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new File([blob], name, { type });
};

export default function StudentQaSeed() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<SeedLog[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = (log: SeedLog) => {
    setLogs((current) => [...current, log]);
  };

  const ensureProfile = async () => {
    if (!user) throw new Error("No signed-in user");

    try {
      const { data, error } = await withTimeout(
        (supabase as any)
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .limit(1),
        "Profile check",
        3500
      );

      if (error) {
        addLog({ label: "Profile", status: "warn", detail: error.message });
        return;
      }

      if (data?.length) {
        addLog({ label: "Profile", status: "ok", detail: "Found the signed-in student profile." });
        return;
      }

      const { error: insertError } = await withTimeout(
        (supabase as any)
          .from("profiles")
          .insert({
            id: user.id,
            full_name: profile?.full_name || user.user_metadata?.full_name || "QA Student",
            role: "student",
          }),
        "Profile insert",
        3500
      );

      if (insertError) {
        addLog({ label: "Profile", status: "warn", detail: insertError.message });
        return;
      }

      addLog({ label: "Profile", status: "ok", detail: "Created a student profile for the signed-in account." });
    } catch (error: any) {
      addLog({ label: "Profile", status: "warn", detail: `${error.message}; continuing with auth session.` });
    }
  };

  const uploadFixture = async (bucket: string, path: string, file: File, fallbackUrl: string) => {
    const { error } = await withTimeout(
      supabase.storage.from(bucket).upload(path, file, { upsert: true }),
      `Upload ${file.name}`,
      9000
    );

    if (error) {
      addLog({ label: `Upload ${file.name}`, status: "warn", detail: `${error.message}; using local fixture URL for display.` });
      return fallbackUrl;
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
    addLog({ label: `Upload ${file.name}`, status: "ok", detail: `Uploaded to ${bucket}.` });
    return publicUrl || path || fallbackUrl;
  };

  const createProject = async (project: {
    title: string;
    description: string;
    status: "pending" | "ongoing" | "complete";
    mediaUrls: string[];
    tags: string[];
  }) => {
    if (!user) throw new Error("No signed-in user");

    for (const ownerColumn of ["owner_id", "user_id"]) {
      const { data: existing, error: existingError } = await withTimeout(
        (supabase as any)
          .from("projects")
          .select("id")
          .eq(ownerColumn, user.id)
          .eq("title", project.title)
          .limit(1),
        `Find project ${project.title}`,
        3500
      );

      if (!existingError && existing?.[0]?.id) {
        const { error: updateError } = await withTimeout(
          (supabase as any)
            .from("projects")
            .update({ media_urls: project.mediaUrls, tags: project.tags })
            .eq("id", existing[0].id),
          `Refresh project ${project.title}`,
          5000
        );

        if (updateError) {
          addLog({ label: project.title, status: "warn", detail: `Found existing project, but media refresh failed: ${updateError.message}` });
        } else {
          addLog({ label: project.title, status: "ok", detail: "Found existing project and refreshed sample media." });
        }

        return;
      }
    }

    const buildPayload = (ownerColumn: "owner_id" | "user_id", includeMedia: boolean, status?: string) => {
      const payload: Record<string, unknown> = {
        [ownerColumn]: user.id,
        title: project.title,
        description: project.description,
      };

      if (status) payload.status = status;
      if (includeMedia) {
        payload.tags = project.tags;
        payload.media_urls = project.mediaUrls;
      }

      return payload;
    };

    const attempts = statusCandidates[project.status].flatMap((status) => [
      buildPayload("owner_id", true, status),
      buildPayload("owner_id", false, status),
      buildPayload("user_id", true, status),
      buildPayload("user_id", false, status),
    ]);

    let created: any = null;
    let lastError: any = null;

    for (const payload of attempts) {
      const { data, error } = await withTimeout(
        (supabase as any)
          .from("projects")
          .insert(payload)
          .select()
          .single(),
        `Create project ${project.title}`,
        3500
      );

      if (!error) {
        created = data;
        break;
      }

      lastError = error;
    }

    if (!created) throw lastError;

    const { error: mediaError } = await withTimeout(
      (supabase as any)
        .from("projects")
        .update({ media_urls: project.mediaUrls, tags: project.tags })
        .eq("id", created.id),
      `Attach media to ${project.title}`,
      7000
    );

    if (mediaError) {
      addLog({ label: project.title, status: "warn", detail: `Created project, but media/tag columns were unavailable: ${mediaError.message}` });
    } else {
      addLog({ label: project.title, status: "ok", detail: "Created project with attached sample media." });
    }
  };

  const createGalleryEvent = async (event: {
    title: string;
    description: string;
    type: "image" | "video";
    url: string;
    isPublic: boolean;
  }) => {
    if (!user) throw new Error("No signed-in user");

    const created = await createEvent({
      user_id: user.id,
      title: event.title,
      description: event.description,
      event_date: today,
      is_public: event.isPublic,
    } as any);

    const { error } = await withTimeout(
      (supabase as any)
        .from("gallery_media")
        .insert({
          event_id: created.id,
          url: event.url,
          type: event.type,
        }),
      `Attach media to ${event.title}`,
      7000
    );

    if (error) {
      const { data: project, error: projectError } = await withTimeout(
        (supabase as any)
          .from("projects")
          .select("media_urls")
          .eq("id", created.id)
          .single(),
        `Read project gallery fallback for ${event.title}`,
        5000
      );

      if (projectError) {
        if (!isSchemaError(error)) throw error;
        throw projectError;
      }

      const currentUrls = Array.isArray(project?.media_urls) ? project.media_urls : [];
      const nextUrls = currentUrls.includes(event.url) ? currentUrls : [...currentUrls, event.url];

      const { error: updateError } = await withTimeout(
        (supabase as any)
          .from("projects")
          .update({ media_urls: nextUrls })
          .eq("id", created.id),
        `Attach project media fallback to ${event.title}`,
        5000
      );

      if (updateError) throw updateError;

      addLog({ label: event.title, status: "warn", detail: "Gallery media insert was unavailable; added media through the project-media fallback." });
      return;
    }

    addLog({ label: event.title, status: "ok", detail: `Created ${event.type} gallery item.` });
  };

  const createAchievement = async (achievement: {
    title: string;
    description: string;
    category: string;
    verified: boolean;
    certificateUrl?: string;
  }) => {
    if (!user) throw new Error("No signed-in user");

    const attempts = [
      {
        user_id: user.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        date_earned: today,
        verified: achievement.verified,
        certificate_url: achievement.certificateUrl,
      },
      {
        user_id: user.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        date_earned: today,
        verified: achievement.verified,
      },
    ];

    let lastError: any = null;

    for (const payload of attempts) {
      const { error } = await withTimeout(
        (supabase as any).from("achievements").insert(payload),
        `Create achievement ${achievement.title}`,
        7000
      );
      if (!error) {
        addLog({ label: achievement.title, status: "ok", detail: "Created achievement claim." });
        return;
      }
      lastError = error;
    }

    throw lastError;
  };

  const seed = async () => {
    if (!user) return;
    setLogs([]);
    setRunning(true);

    try {
      await ensureProfile();

      const imageFile = await toFile(sampleAssets.image, "milestone-gallery-sample.jpg", "image/jpeg");
      const videoFile = await toFile(sampleAssets.video, "milestone-video-sample.mp4", "video/mp4");
      const pdfFile = await toFile(sampleAssets.pdf, "milestone-evidence.pdf", "application/pdf");

      const imageUrl = await uploadFixture("gallery-media", `${user.id}/qa/sample-image.jpg`, imageFile, sampleAssets.image);
      const videoUrl = await uploadFixture("gallery-media", `${user.id}/qa/sample-video.mp4`, videoFile, sampleAssets.video);
      const pdfUrl = await uploadFixture("project-media", `${user.id}/qa/sample-evidence.pdf`, pdfFile, sampleAssets.pdf);

      await createProject({
        title: "Milestone Solar Lab",
        description: "A sample STEM portfolio project tracking a student-built solar charger prototype, design notes, and evidence files.",
        status: "complete",
        tags: ["science", "energy", "prototype"],
        mediaUrls: [imageUrl, pdfUrl],
      });

      await createProject({
        title: "Campus Storytelling Film",
        description: "A sample media project used to verify video attachments, progress states, and project detail playback.",
        status: "ongoing",
        tags: ["film", "media", "communication"],
        mediaUrls: [videoUrl],
      });

      await createProject({
        title: "Community Reading Drive",
        description: "A sample service project for testing pending work, search, and dashboard recent activity.",
        status: "pending",
        tags: ["community", "leadership"],
        mediaUrls: [pdfUrl],
      });

      await createGalleryEvent({
        title: "Science Fair Gallery Sample",
        description: "Photo fixture for testing image thumbnails, public/private filters, and lightbox display.",
        type: "image",
        url: imageUrl,
        isPublic: true,
      });

      await createGalleryEvent({
        title: "Media Club Video Sample",
        description: "Video fixture for testing gallery playback and the video tab.",
        type: "video",
        url: videoUrl,
        isPublic: false,
      });

      await createAchievement({
        title: "Regional Science Fair Finalist",
        description: "Sample verified achievement for visual QA of badges and dashboard counts.",
        category: "academic",
        verified: true,
        certificateUrl: pdfUrl,
      });

      await createAchievement({
        title: "Student Media Showcase",
        description: "Sample pending achievement for testing unverified claims.",
        category: "arts",
        verified: false,
      });

      addLog({ label: "Done", status: "ok", detail: "Seed data is ready. Redirecting to dashboard." });
      setTimeout(() => navigate("/dashboard"), 1200);
    } catch (error: any) {
      addLog({ label: "Seeder failed", status: "error", detail: error.message || String(error) });
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="container mx-auto max-w-3xl px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle>Student QA Seed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            This temporary page creates sample projects, gallery items, achievements, and uploaded fixture files for the signed-in student.
          </p>
          <Button onClick={seed} disabled={running || !user}>
            {running ? "Seeding..." : "Seed Student Test Data"}
          </Button>
          <div className="space-y-2">
            {logs.map((log, index) => (
              <div key={`${log.label}-${index}`} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{log.label}</div>
                <div className={log.status === "error" ? "text-destructive" : "text-muted-foreground"}>{log.detail}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
