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
            color: "from-amber-500 to-orange-500",
            onClick: () => { openAchievementModal(); setIsOpen(false); }
        },
        {
            label: "Add Project",
            icon: FolderPlus,
            color: "from-blue-500 to-cyan-500",
            onClick: () => { openProjectModal(); setIsOpen(false); }
        },
        {
            label: "Add Event",
            icon: Image,
            color: "from-purple-500 to-pink-500",
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
                                    "h-12 px-4 rounded-full shadow-lg hover-lift elevation-md bg-gradient-to-r text-white",
                                    action.color
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
                    "h-14 w-14 rounded-full shadow-xl hover-lift elevation-lg bg-gradient-to-br from-primary to-secondary transition-transform duration-200",
                    isOpen && "rotate-45"
                )}
                aria-label={isOpen ? "Close quick actions menu" : "Open quick actions menu"}
                aria-expanded={isOpen}
                aria-haspopup="true"
            >
                {isOpen ? (
                    <X className="w-6 h-6 text-white" aria-hidden="true" />
                ) : (
                    <Plus className="w-6 h-6 text-white" aria-hidden="true" />
                )}
            </Button>
        </div>
    );
};
