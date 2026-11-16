import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, Link2, UserPlus } from "lucide-react";
import { availableActions, describeAction, type LinkAction } from "@/lib/linkActions";
import { linkExpiry, linkStatusLabel } from "@/lib/linkPresentation";
import { inviteParentLink, listParentLinks, requestParentLink, runLinkAction, type ParentLinkRow } from "@/lib/supabase/links";

/**
 * The link RPCs live in migrations that may not be applied yet. PostgREST then
 * answers "Could not find the function …", which reads like a bug to a user.
 */
function friendlyLinkError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/could not find the function|PGRST202|does not exist/i.test(message)) {
    return "Account linking is not enabled on this database yet. Apply supabase/scripts/apply/01_schema_pending.sql and the 20261110* migrations.";
  }
  return message || "Something went wrong.";
}

interface ParentLinkPanelProps {
  /** Which side is looking: a student invites a parent, a parent requests a child. */
  viewer: "student" | "parent";
  className?: string;
}

export function ParentLinkPanel({ viewer, className }: ParentLinkPanelProps) {
  const [rows, setRows] = useState<ParentLinkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await listParentLinks());
    } catch (e) {
      setError(friendlyLinkError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitInvite = async () => {
    const value = email.trim();
    if (!value) return;
    setBusy("invite");
    setNotice(null);
    try {
      const result = viewer === "parent" ? await requestParentLink(value) : await inviteParentLink(value);
      setEmail("");
      setNotice(
        result?.status === "active"
          ? "Connected immediately — this student is a minor, so the guardian link is active."
          : "Request sent. The other person has to accept.",
      );
      await load();
    } catch (e) {
      setError(friendlyLinkError(e));
    } finally {
      setBusy(null);
    }
  };

  const act = async (action: LinkAction, row: ParentLinkRow) => {
    if (describeAction(action).destructive && !window.confirm(describeAction(action).confirmText)) return;
    setBusy(linkId);
    setError(null);
    try {
      await runLinkAction(action, row);
      await load();
    } catch (e) {
      setError(friendlyLinkError(e));
    } finally {
      setBusy(null);
    }
  };

  const title = viewer === "parent" ? "Your children" : "Your guardian";
  const blurb =
    viewer === "parent"
      ? "Connect to your child's account. They are asked to accept, unless they are a minor."
      : "Invite a parent or guardian. They will be able to follow your portfolio.";

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Link2 className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription>{blurb}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={viewer === "parent" ? "student@example.com" : "parent@example.com"}
            aria-label={viewer === "parent" ? "Child's email" : "Parent's email"}
            disabled={busy === "invite"}
          />
          <Button onClick={submitInvite} disabled={!email.trim() || busy === "invite"} className="gap-2">
            {busy === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
            {viewer === "parent" ? "Request" : "Invite"}
          </Button>
        </div>

        {notice && <p className="text-sm text-muted-foreground">{notice}</p>}

        {loading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading links…
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            No links yet. {viewer === "parent" ? "Request your child above." : "Invite a guardian above."}
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map((row) => {
              const expiry = linkExpiry(row);
              const actions = availableActions(row);
              return (
                <li key={row.link_id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.counterparty_name || row.counterparty_email || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.direction === "child" ? "Your child" : "Your guardian"}
                      {expiry.label ? ` · ${expiry.label}` : ""}
                      {row.reason ? ` · ${row.reason}` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={row.state === "active" ? "default" : "secondary"}>{linkStatusLabel(row.state)}</Badge>
                    {actions.map((action) => {
                      const meta = describeAction(action);
                      return (
                        <Button
                          key={action}
                          size="sm"
                          variant={meta.destructive ? "outline" : "default"}
                          disabled={busy === row.link_id}
                          onClick={() => void act(action, row)}
                        >
                          {meta.label}
                        </Button>
                      );
                    })}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default ParentLinkPanel;
