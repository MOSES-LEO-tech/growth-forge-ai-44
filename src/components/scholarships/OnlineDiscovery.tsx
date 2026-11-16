import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/errors";
import { discoverScholarships, reportOnlineLead, type OnlineLead } from "@/lib/supabase/scholarshipDiscovery";
import { filterCandidates } from "@/lib/scholarshipDiscovery";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, ExternalLink, Loader2, Search } from "lucide-react";

type Props = {
  /** Search only once the student has actually opened the widget. */
  enabled: boolean;
};

/**
 * "Found online" strip.
 *
 * These are leads from a web search, not scholarships. They carry no match
 * score, no eligibility claim and no deadline — only a title, a domain and a
 * snippet, with the student sent to the provider's own page.
 */
const OnlineDiscovery = ({ enabled }: Props) => {
  const { toast } = useToast();
  const { profile } = useAuth();
  // Defence in depth: the edge function filters too, but the deployed version can
  // lag behind this build. Re-filtering here means a Masters link or a company
  // directory never reaches a student in the meantime.
  const level = profile?.grade_level ?? "S6";
  const [leads, setLeads] = useState<OnlineLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const [reported, setReported] = useState<string[]>([]);
  // Guards a single run per mount. `loading`/`loaded` must NOT be dependencies:
  // setting them inside the effect re-runs it, whose cleanup cancelled the
  // in-flight request and left the widget stuck on "Searching…" forever.
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const { results, unavailable } = await discoverScholarships();
        if (!cancelled) {
          if (unavailable) {
            setUnconfigured(true);
          } else {
            setLeads(results ?? []);
          }
          setLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setFailed(true);
          console.warn("Online discovery unavailable:", getErrorMessage(error));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  const report = async (lead: OnlineLead) => {
    setReported((current) => [...current, lead.url]);
    try {
      await reportOnlineLead(lead.url, "reported from widget");
      toast({ title: "Thanks — flagged", description: "An admin will review this link." });
    } catch {
      toast({ title: "Could not send the report", variant: "destructive" });
    }
  };

  const visibleLeads = filterCandidates(leads, [], level);

  if (!enabled) return null;

  return (
    <section className="rounded-lg border border-dashed bg-muted/30 p-4" aria-label="Scholarships found online">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Search className="h-4 w-4 text-muted-foreground" />
            Found online
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Web results, <strong>not checked by Milestone</strong>. Open the provider's page and confirm the
            deadline and who can apply before you spend time on it.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px] uppercase tracking-wide">
          Unverified
        </Badge>
      </div>

      {loading && (
        <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Searching the web for open calls…
        </p>
      )}

      {!loading && unconfigured && (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          Web search isn't switched on yet. Your verified matches above are unaffected.
        </p>
      )}

      {!loading && failed && (
        <p className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4" />
          Web search is unavailable right now. Your verified matches above are unaffected.
        </p>
      )}

      {!loading && !failed && loaded && visibleLeads.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Nothing new surfaced for your profile today. The catalog above is still worth a look.
        </p>
      )}

      {!loading && visibleLeads.length > 0 && (
        <ul className="grid gap-2">
          {visibleLeads.map((lead) => (
            <li key={lead.url} className="rounded-md border bg-card p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="line-clamp-2 text-sm font-medium hover:underline"
                  >
                    {lead.title || lead.domain}
                  </a>
                  <p className="mt-0.5 text-xs text-muted-foreground">{lead.domain}</p>
                  {lead.snippet && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{lead.snippet}</p>
                  )}
                </div>
                <Button asChild size="sm" variant="outline" className="shrink-0 gap-1">
                  <a href={lead.url} target="_blank" rel="noreferrer noopener">
                    Open
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  disabled={reported.includes(lead.url)}
                  onClick={() => void report(lead)}
                >
                  {reported.includes(lead.url) ? "Reported" : "Looks wrong"}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default OnlineDiscovery;
