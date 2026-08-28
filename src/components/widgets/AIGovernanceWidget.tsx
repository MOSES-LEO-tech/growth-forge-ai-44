import { useState } from "react";
import { Compass, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIGovernanceWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

export function AIGovernanceWidget({
  className = "",
  defaultExpanded = false,
  schoolId,
}: AIGovernanceWidgetProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Guidance Governance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Guidance Governance
          </div>
          <Button size="sm" variant="outline" disabled onClick={(e) => e.stopPropagation()}>
            <Settings className="mr-1 h-4 w-4" /> Configure
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            <Compass className="mx-auto mb-3 h-8 w-8" />
            Guidance governance is coming soon.
          </div>
        </CardContent>
      )}
    </Card>
  );
}
