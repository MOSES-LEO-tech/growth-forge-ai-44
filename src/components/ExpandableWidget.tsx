import { useState, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Maximize2, X, Minimize2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ExpandableWidgetProps {
    title: string;
    icon?: ReactNode;
    children: ReactNode; // Content for the collapsed/summary view
    expandedContent: ReactNode; // Content for the expanded/full view
    className?: string;
    defaultExpanded?: boolean;
    onExpandChange?: (expanded: boolean) => void;
}

export function ExpandableWidget({
    title,
    icon,
    children,
    expandedContent,
    className,
    defaultExpanded = false,
    onExpandChange,
}: ExpandableWidgetProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    const handleToggle = (open: boolean) => {
        setIsExpanded(open);
        onExpandChange?.(open);
    };

    return (
        <>
            <Card className={cn("flex flex-col h-full transition-all duration-300 hover:shadow-md", className)}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {icon}
                        {title}
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleToggle(true)}>
                        <Maximize2 className="h-4 w-4" />
                        <span className="sr-only">Expand {title}</span>
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 pt-2">
                    {children}
                </CardContent>
            </Card>

            <Dialog open={isExpanded} onOpenChange={handleToggle}>
                <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] flex flex-col p-6 items-stretch sm:rounded-xl">
                    <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between border-b pb-4 mb-4">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            {icon}
                            {title}
                        </DialogTitle>
                        <DialogClose asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto">
                                <X className="h-4 w-4" />
                                <span className="sr-only">Close</span>
                            </Button>
                        </DialogClose>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto px-1">
                        {expandedContent}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
