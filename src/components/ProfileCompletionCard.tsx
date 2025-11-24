import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileCompletionCardProps {
    profile: any;
    achievements: number;
    projects: number;
}

export const ProfileCompletionCard = ({ profile, achievements, projects }: ProfileCompletionCardProps) => {
    const tasks = [
        {
            label: "Complete your profile",
            completed: profile?.full_name && profile?.email,
            description: "Add your name and email"
        },
        {
            label: "Add your first achievement",
            completed: achievements > 0,
            description: "Document your accomplishments"
        },
        {
            label: "Create a project",
            completed: projects > 0,
            description: "Showcase your work"
        },
        {
            label: "Upload profile photo",
            completed: false, // TODO: Check if profile photo exists
            description: "Personalize your account"
        }
    ];

    const completedTasks = tasks.filter(t => t.completed).length;
    const progress = (completedTasks / tasks.length) * 100;
    const isComplete = progress === 100;

    if (isComplete) return null; // Hide when profile is complete

    return (
        <Card className="border-l-4 border-l-primary animate-slideUp">
            <CardHeader>
                <CardTitle className="text-xl">Complete Your Profile</CardTitle>
                <CardDescription>
                    {completedTasks} of {tasks.length} tasks completed
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" aria-label={`Profile completion: ${Math.round(progress)}%`} />
                </div>

                <ul className="space-y-3" role="list">
                    {tasks.map((task, index) => (
                        <li
                            key={index}
                            className="flex items-start gap-3"
                        >
                            <div className={cn(
                                "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                                task.completed ? "bg-green-500" : "bg-muted"
                            )}>
                                {task.completed ? (
                                    <Check className="w-3 h-3 text-white" aria-hidden="true" />
                                ) : (
                                    <Circle className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={cn(
                                    "text-sm font-medium",
                                    task.completed && "text-muted-foreground line-through"
                                )}>
                                    {task.label}
                                </p>
                                <p className="text-xs text-muted-foreground">{task.description}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
};
