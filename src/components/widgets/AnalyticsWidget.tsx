import { useState } from "react";
import { BarChart3, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalyticsWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

export function AnalyticsWidget({
  className = "",
  defaultExpanded = false,
  schoolId,
}: AnalyticsWidgetProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Analytics & Reports
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
            <BarChart3 className="h-5 w-5" />
            Analytics & Reports
          </div>
          <Button size="sm" variant="outline" disabled onClick={(e) => e.stopPropagation()}>
            <Download className="mr-1 h-4 w-4" /> Export
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
            <BarChart3 className="mx-auto mb-3 h-8 w-8" />
            Analytics and reports are coming soon.
          </div>
        </CardContent>
      )}
    </Card>
  );
}
