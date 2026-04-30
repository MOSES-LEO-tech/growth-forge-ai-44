import { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ExpandableWidgetProps {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  expandedContent: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  onExpandChange?: (expanded: boolean) => void;
}

export function ExpandableWidget({
  title,
  icon,
  children,
  expandedContent,
  className,
  defaultExpanded = false,
  expanded: controlledExpanded,
  onExpandedChange,
  onExpandChange,
}: ExpandableWidgetProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isControlled = controlledExpanded !== undefined;
  const isExpanded = isControlled ? controlledExpanded : internalExpanded;
  const setIsExpanded = isControlled ? (onExpandedChange ?? (() => {})) : setInternalExpanded;

  const handleToggle = (open: boolean) => {
    setIsExpanded(open);
    onExpandChange?.(open);
  };

  return (
    <>
      <Card className={cn("luxury-card flex h-full min-h-[190px] flex-col overflow-hidden", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/20 px-4 py-3">
          <CardTitle className="flex min-w-0 items-center gap-2 text-sm font-semibold">
            {icon}
            <span className="truncate">{title}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => handleToggle(true)}
          >
            <Maximize2 className="h-4 w-4" />
            <span className="sr-only">Expand {title}</span>
          </Button>
        </CardHeader>
        <CardContent className="flex-1 p-4">{children}</CardContent>
      </Card>

      <Dialog open={isExpanded} onOpenChange={handleToggle}>
        <DialogContent className="flex h-[90vh] max-h-[90vh] w-[95vw] max-w-[95vw] flex-col items-stretch p-5 sm:rounded-lg">
          <DialogHeader className="mb-4 flex shrink-0 flex-row items-center justify-between border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-2xl font-semibold">
              {icon}
              {title}
            </DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="ml-auto h-8 w-8">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-1">{expandedContent}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
