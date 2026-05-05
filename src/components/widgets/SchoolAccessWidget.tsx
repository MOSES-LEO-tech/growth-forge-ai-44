import { useCallback, useEffect, useState } from "react";
import { Check, Copy, KeyRound, Loader2, RotateCw, UserCheck, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  approveSchoolConnection,
  getActiveSchoolJoinCode,
  getSchoolConnectionRequests,
  rejectSchoolConnection,
  rotateSchoolJoinCode,
  type SchoolConnectionRequestWithProfile,
} from "@/lib/supabase/schoolSystem";
import type { SchoolJoinCode } from "@/integrations/supabase/types";

interface SchoolAccessWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
  canManage?: boolean;
}

const getErrorMessage = (error: unknown, fallback: string) => (error instanceof Error ? error.message : fallback);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function SchoolAccessWidget({ className = "", defaultExpanded = false, schoolId, canManage = true }: SchoolAccessWidgetProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<SchoolJoinCode | null>(null);
  const [requests, setRequests] = useState<SchoolConnectionRequestWithProfile[]>([]);

  const loadAccessData = useCallback(async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const loadCode = async () => {
        const code = await getActiveSchoolJoinCode(schoolId);
        if (code || canManage) return code;

        await wait(400);
        return getActiveSchoolJoinCode(schoolId);
      };

      const [code, pendingRequests] = await Promise.all([
        loadCode(),
        canManage ? getSchoolConnectionRequests(schoolId) : Promise.resolve([] as SchoolConnectionRequestWithProfile[]),
      ]);
      setJoinCode(code);
      setRequests(pendingRequests);
    } catch (error) {
      toast({
        title: "Access data failed",
        description: getErrorMessage(error, "Unable to load school access data."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canManage, schoolId, toast]);

  useEffect(() => {
    void loadAccessData();
  }, [loadAccessData]);

  const handleRotate = async () => {
    if (!schoolId || !canManage) return;

    setLoading(true);
    try {
      const result = await rotateSchoolJoinCode(schoolId);
      await loadAccessData();
      toast({ title: "School code ready", description: `New code: ${result.code}` });
    } catch (error) {
      toast({
        title: "Code update failed",
        description: getErrorMessage(error, "Unable to generate school code."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!joinCode?.code) return;
    await navigator.clipboard?.writeText(joinCode.code);
    toast({
      title: "Code copied",
      description: canManage
        ? "Share it with teachers or students who should join this school."
        : "Share it with students who should request to join this school.",
    });
  };

  const handleDecision = async (requestId: string, action: "approve" | "reject") => {
    if (!canManage) return;

    setActionId(requestId);
    try {
      if (action === "approve") {
        await approveSchoolConnection(requestId);
        toast({ title: "Connection approved" });
      } else {
        await rejectSchoolConnection(requestId);
        toast({ title: "Connection rejected" });
      }
      await loadAccessData();
    } catch (error) {
      toast({
        title: "Request update failed",
        description: getErrorMessage(error, "Unable to update this request."),
        variant: "destructive",
      });
    } finally {
      setActionId(null);
    }
  };

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {canManage ? "School Access" : "School Code"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {canManage ? "No approved school is assigned to this admin account yet." : "No approved school is assigned to this teacher account yet."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            {canManage ? "School Access" : "School Code"}
          </span>
          {canManage ? <Badge variant={requests.length ? "destructive" : "secondary"}>{requests.length} pending</Badge> : null}
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-5">
          <div className="flex flex-col justify-between gap-3 rounded-md border bg-muted/20 p-4 md:flex-row md:items-center">
            <div>
              <p className="text-sm font-medium">School code</p>
              <p className="mt-1 font-mono text-2xl tracking-wide">{joinCode?.code || "No active code"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {canManage
                  ? "Teachers and students use this code to request access."
                  : "Share this with students who should request to join your school."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handleCopy} disabled={!joinCode?.code || loading}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              {canManage ? (
                <Button type="button" onClick={handleRotate} disabled={loading}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}
                  Generate
                </Button>
              ) : null}
            </div>
          </div>

          {canManage ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-semibold">
                <UserCheck className="h-4 w-4" />
                Pending connections
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={loadAccessData} disabled={loading}>
                Refresh
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                No teacher or student connection requests are waiting.
              </div>
            ) : (
              <div className="space-y-2">
                {requests.map((request) => (
                  <div key={request.id} className="flex flex-col justify-between gap-3 rounded-md border p-3 md:flex-row md:items-center">
                    <div>
                      <p className="font-medium">{request.profile?.full_name || request.profile?.email || "Unnamed user"}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.profile?.email || request.user_id} · {request.role}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(request.id, "approve")}
                        disabled={actionId === request.id}
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecision(request.id, "reject")}
                        disabled={actionId === request.id}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
