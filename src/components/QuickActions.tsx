import { useState } from "react";
import { Plus, Award, FolderPlus, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/contexts/DashboardContext";

export const QuickActions = () => {
    const { openAchievementModal, openProjectModal, openEventModal } = useDashboard();
    const [isOpen, setIsOpen] = useState(false);

    const actions = [
        {
            label: "Add Achievement",
            icon: Award,
            className: "bg-accent text-accent-foreground hover:bg-accent/90",
            onClick: () => { openAchievementModal(); setIsOpen(false); }
        },
        {
            label: "Add Project",
            icon: FolderPlus,
            className: "bg-primary text-primary-foreground hover:bg-primary/90",
            onClick: () => { openProjectModal(); setIsOpen(false); }
        },
        {
            label: "Add Event",
            icon: Image,
            className: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
            onClick: () => { openEventModal(); setIsOpen(false); }
        }
    ];

    const handleAction = (action: typeof actions[0]) => {
        action.onClick();
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-end gap-3">
            {/* Action Buttons */}
            {isOpen && (
                <div className="flex flex-col-reverse gap-3 animate-slideUp">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        return (
                            <Button
                                key={action.label}
                                onClick={() => handleAction(action)}
                                className={cn(
                                    "h-12 rounded-full px-4 shadow-lg hover-lift elevation-md",
                                    action.className
                                )}
                                style={{ animationDelay: `${index * 0.05}s` }}
                                aria-label={action.label}
                            >
                                <Icon className="w-5 h-5 mr-2" aria-hidden="true" />
                                <span className="font-medium">{action.label}</span>
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* Main FAB */}
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl hover-lift elevation-lg transition-transform duration-200",
                    isOpen && "rotate-45"
                )}
                aria-label={isOpen ? "Close quick actions menu" : "Open quick actions menu"}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {isOpen ? (
                    <X className="w-6 h-6" aria-hidden="true" />
                ) : (
                    <Plus className="w-6 h-6" aria-hidden="true" />
                )}
            </Button>
        </div>
    );
};
