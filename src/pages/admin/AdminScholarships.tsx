import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import SchoolAdminLayout from "@/components/SchoolAdminLayout";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { formatAward, publishReadiness } from "@/lib/scholarshipAdmin";
import { listScholarshipsAdmin, setScholarshipStatus } from "@/lib/supabase/scholarshipsAdmin";
import { formatNullable } from "@/lib/numeric";
import { AlertTriangle, CheckCircle2, ExternalLink, Plus, Search, ShieldAlert } from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  published: "bg-success-soft text-success-ink",
  draft: "bg-warning-soft text-warning-ink",
  archived: "bg-muted text-muted-foreground",
};

const formatDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/**
 * Catalog console. Publishing is enforced in the database; this screen surfaces
 * the same blockers before the request so failures are explained, not mysterious.
 */
const AdminScholarships = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, userRole } = useAuth();
  const isPlatformAdmin = userRole === "super_admin";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("all");

  const { data: scholarships, isLoading, error } = useQuery({
    queryKey: ["scholarships", "admin"],
    queryFn: listScholarshipsAdmin,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "draft" | "published" | "archived" }) =>
      setScholarshipStatus(id, status, user?.id ?? null),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["scholarships"] });
      queryClient.invalidateQueries({ queryKey: ["scholarships", "admin"] });
      toast({ title: variables.status === "published" ? "Published" : `Moved to ${variables.status}` });
    },
    onError: (error) => {
      toast({
        title: "Could not change status",
        description: getErrorMessage(error, "The database refused the change."),
        variant: "destructive",
      });
    },
  });

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (scholarships ?? []).filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!term) return true;
      return `${row.title} ${row.provider_name ?? ""}`.toLowerCase().includes(term);
    });
  }, [scholarships, search, statusFilter]);

  const counts = useMemo(() => {
    const all = scholarships ?? [];
    return {
      total: all.length,
      published: all.filter((row) => row.status === "published").length,
      draft: all.filter((row) => row.status === "draft").length,
      blocked: all.filter((row) => row.status === "published" && publishReadiness(row).length > 0).length,
    };
  }, [scholarships]);

  return (
    <SchoolAdminLayout>
      <AdminPageHeader
        kicker="Scholarships"
        title="Catalog"
        description="Every listing needs a cited source, a provider contact, a closing date and a stated award before it can be published."
        actions={
          isPlatformAdmin ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" className="gap-2">
                <Link to="/admin/scholarships/candidates">
                  <Search className="h-4 w-4" />
                  Found online
                </Link>
              </Button>
              <Button onClick={() => navigate("/admin/scholarships/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                New scholarship
              </Button>
            </div>
          ) : undefined
        }
      />

      {!isPlatformAdmin && (
        <Card className="mb-6 border-warning/30 bg-warning-soft">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-warning-ink">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The catalog is managed by the platform team. You can read it here; creating and publishing
              is restricted to a platform admin.
            </span>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or provider"
            className="w-64 pl-9"
            aria-label="Search scholarships"
          />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
        <span className="text-sm text-muted-foreground">
          {formatNullable(counts.total)} total · {formatNullable(counts.published)} published ·{" "}
          {formatNullable(counts.draft)} draft
          {counts.blocked > 0 && (
            <span className="ml-2 inline-flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              {counts.blocked} published listing{counts.blocked === 1 ? "" : "s"} missing evidence
            </span>
          )}
        </span>
      </div>

      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading catalog…</p>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="p-6 text-sm text-destructive">
            {getErrorMessage(error, "The catalog could not be loaded.")}
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
            <p className="text-lg font-medium">
              {counts.total === 0 ? "No scholarships yet" : "Nothing matches this filter"}
            </p>
            <p className="max-w-md text-sm text-muted-foreground">
              {counts.total === 0
                ? "Add the first listing once you have a provider's terms and a source you can cite. Drafts are invisible to students."
                : "Clear the search or switch the status filter."}
            </p>
            {isPlatformAdmin && counts.total === 0 && (
              <Button onClick={() => navigate("/admin/scholarships/new")} className="gap-2">
                <Plus className="h-4 w-4" />
                New scholarship
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Scholarship</th>
                <th className="px-4 py-3">Award</th>
                <th className="px-4 py-3">Closes</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const blockers = publishReadiness(row);
                return (
                  <tr key={row.id} className="border-t align-top">
                    <td className="px-4 py-3">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.provider_name ?? "No provider"} · {row.category}
                      </p>
                      {row.status === "published" && blockers.length > 0 && (
                        <p className="mt-1 text-xs text-destructive">{blockers[0]}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatAward(row)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.closes_at)}</td>
                    <td className="px-4 py-3">
                      {row.source_url ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          verified {formatDate(row.verified_at)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          no source
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_STYLE[row.status] ?? ""}>{row.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/admin/scholarships/${row.id}/edit`}>Edit</Link>
                        </Button>
                        {isPlatformAdmin && row.status !== "published" && (
                          <Button
                            size="sm"
                            disabled={blockers.length > 0 || statusMutation.isPending}
                            title={blockers[0]}
                            onClick={() => statusMutation.mutate({ id: row.id, status: "published" })}
                          >
                            Publish
                          </Button>
                        )}
                        {isPlatformAdmin && row.status === "published" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: row.id, status: "draft" })}
                          >
                            Unpublish
                          </Button>
                        )}
                        {isPlatformAdmin && row.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={statusMutation.isPending}
                            onClick={() => statusMutation.mutate({ id: row.id, status: "archived" })}
                          >
                            Archive
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </SchoolAdminLayout>
  );
};

export default AdminScholarships;
