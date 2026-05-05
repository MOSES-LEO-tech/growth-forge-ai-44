import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clampPageSize = (value: unknown, fallback = 12, max = 50) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), 1), max);
};

const clampPage = (value: unknown) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(Math.trunc(parsed), 0);
};

const normalizeSearch = (value: unknown) => {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text.slice(0, 120) : null;
};

const addSchoolStudentCounts = async (schools: any[]) => {
  const rows = await Promise.all(
    schools.map(async (school) => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("school_id", school.id)
        .eq("role", "student")
        .eq("account_status", "approved");

      return { ...school, student_count: count ?? 0 };
    }),
  );

  return rows;
};

const getSchoolStats = async (schoolId: string) => {
  const { data: students, error: studentsError, count: studentCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact" })
    .eq("school_id", schoolId)
    .eq("role", "student")
    .eq("account_status", "approved");

  if (studentsError) throw studentsError;

  const studentIds = (students ?? []).map((student) => student.id);
  const [achievementsResult, scholarshipsResult] = await Promise.all([
    studentIds.length > 0
      ? supabase.from("achievements").select("id", { count: "exact", head: true }).in("user_id", studentIds).eq("verified", true)
      : Promise.resolve({ count: 0, error: null }),
    supabase.from("scholarships").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
  ]);

  if (achievementsResult.error) throw achievementsResult.error;
  if (scholarshipsResult.error) throw scholarshipsResult.error;

  return {
    total_students: studentCount ?? 0,
    total_achievements: achievementsResult.count ?? 0,
    total_scholarships_won: scholarshipsResult.count ?? 0,
  };
};

const loadMediaForEvents = async (eventIds: string[]) => {
  if (eventIds.length === 0) return new Map<string, any[]>();

  const { data, error } = await supabase
    .from("gallery_media")
    .select("id,event_id,url,type,created_at,deleted_at")
    .in("event_id", eventIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? []).reduce((map, media) => {
    if (!media.event_id) return map;
    const list = map.get(media.event_id) ?? [];
    list.push(media);
    map.set(media.event_id, list);
    return map;
  }, new Map<string, any[]>());
};

const withEventMedia = async (events: any[]) => {
  const mediaByEvent = await loadMediaForEvents(events.map((event) => event.id));

  return events.map((event) => {
    const media = mediaByEvent.get(event.id) ?? [];
    const primary = media[0];
    return {
      ...event,
      gallery_media: media,
      media,
      media_count: media.length,
      media_type: primary?.type ?? "image",
      media_url: primary?.url ?? "",
      thumbnail_url: primary?.url ?? undefined,
      visibility: event.is_public ? "public" : "private",
    };
  });
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Public data service is not configured." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const params = body.params ?? {};
    const page = clampPage(params.page);
    const pageSize = clampPageSize(params.pageSize);
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const search = normalizeSearch(params.search);

    switch (action) {
      case "platform_stats": {
        const [students, projects, schools, achievements] = await Promise.all([
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "student")
            .eq("account_status", "approved"),
          supabase.from("projects").select("id", { count: "exact", head: true }).is("deleted_at", null),
          supabase.from("schools").select("id", { count: "exact", head: true }).eq("approval_status", "approved"),
          supabase.from("achievements").select("id", { count: "exact", head: true }).eq("verified", true),
        ]);

        const failed = [students, projects, schools, achievements].find((result) => result.error);
        if (failed?.error) throw failed.error;

        return jsonResponse({
          studentPortfolios: students.count ?? 0,
          projectsRecorded: projects.count ?? 0,
          partnerSchools: schools.count ?? 0,
          awardsVerified: achievements.count ?? 0,
        });
      }

      case "schools": {
        let query = supabase
          .from("schools")
          .select("id,name,location,country,description,logo_url,created_at,updated_at", { count: "exact" })
          .eq("approval_status", "approved");

        if (search) query = query.ilike("name", `%${search}%`);
        if (params.country) query = query.eq("country", params.country);

        const { data, error, count } = await query.order("name").range(from, to);
        if (error) throw error;

        return jsonResponse({
          schools: await addSchoolStudentCounts(data ?? []),
          count: count ?? 0,
          page,
          pageSize,
        });
      }

      case "school_detail": {
        const id = String(params.id ?? "");
        const { data, error } = await supabase
          .from("schools")
          .select("id,name,location,country,description,logo_url,created_at,updated_at")
          .eq("id", id)
          .eq("approval_status", "approved")
          .maybeSingle();

        if (error) throw error;
        if (!data) return jsonResponse({ error: "School not found." }, 404);

        const [school] = await addSchoolStudentCounts([data]);
        return jsonResponse({ school });
      }

      case "school_stats": {
        const id = String(params.id ?? "");
        return jsonResponse(await getSchoolStats(id));
      }

      case "scholarships": {
        let query = supabase
          .from("scholarships")
          .select("id,title,amount,deadline,requirements,school_id,created_at", { count: "exact" });

        if (search) query = query.or(`title.ilike.%${search}%,requirements.ilike.%${search}%`);

        const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
        if (error) throw error;

        return jsonResponse({ scholarships: data ?? [], count: count ?? 0, page, pageSize });
      }

      case "scholarship_detail": {
        const id = String(params.id ?? "");
        const { data, error } = await supabase
          .from("scholarships")
          .select("id,title,amount,deadline,requirements,school_id,created_at")
          .eq("id", id)
          .maybeSingle();

        if (error) throw error;
        if (!data) return jsonResponse({ error: "Scholarship not found." }, 404);

        return jsonResponse({ scholarship: data });
      }

      case "gallery_events": {
        let query = supabase
          .from("gallery_events")
          .select("id,user_id,title,description,location,event_date,is_public,created_at,deleted_at", { count: "exact" })
          .eq("is_public", true)
          .is("deleted_at", null);

        if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

        const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
        if (error) throw error;

        return jsonResponse({
          events: await withEventMedia(data ?? []),
          count: count ?? 0,
          page,
          pageSize,
        });
      }

      case "gallery_event_detail": {
        const id = String(params.id ?? "");
        const { data: event, error } = await supabase
          .from("gallery_events")
          .select("id,user_id,title,description,location,event_date,is_public,created_at,deleted_at")
          .eq("id", id)
          .eq("is_public", true)
          .is("deleted_at", null)
          .maybeSingle();

        if (error) throw error;
        if (!event) return jsonResponse({ error: "Event not found." }, 404);

        const [withMedia] = await withEventMedia([event]);
        const { data: owner } = event.user_id
          ? await supabase.from("profiles").select("full_name,school_id").eq("id", event.user_id).maybeSingle()
          : { data: null };
        const { data: school } = owner?.school_id
          ? await supabase.from("schools").select("name").eq("id", owner.school_id).maybeSingle()
          : { data: null };

        return jsonResponse({
          event: {
            ...withMedia,
            school_name: school?.name ?? "No school",
            profiles: owner ? { full_name: owner.full_name, schools: { name: school?.name ?? "No school" } } : null,
          },
        });
      }

      default:
        return jsonResponse({ error: "Unknown public data action." }, 400);
    }
  } catch (error) {
    console.error("public-data error", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
