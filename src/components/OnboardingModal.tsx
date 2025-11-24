import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Award, FolderKanban, TrendingUp, Sparkles } from "lucide-react";

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps) => {
    const [step, setStep] = useState(0);

    const steps = [
        {
            title: "Welcome to StudentHub! 🎉",
            description: "Your personal platform for tracking achievements, managing projects, and showcasing your growth journey.",
            icon: GraduationCap,
            color: "from-primary to-secondary"
        },
        {
            title: "Track Your Achievements",
            description: "Document your accomplishments, certifications, and milestones. Build a verified portfolio that showcases your growth.",
            icon: Award,
            color: "from-amber-500 to-orange-500"
        },
        {
            title: "Manage Your Projects",
            description: "Keep track of your ongoing work, showcase completed projects, and demonstrate your skills to the world.",
            icon: FolderKanban,
            color: "from-blue-500 to-cyan-500"
        },
        {
            title: "Monitor Your Growth",
            description: "View your progress with detailed analytics, get personalized recommendations, and discover scholarship opportunities.",
            icon: TrendingUp,
            color: "from-green-500 to-emerald-500"
        }
    ];

    const currentStep = steps[step];
    const Icon = currentStep.icon;
    const isLastStep = step === steps.length - 1;

    const handleNext = () => {
        if (isLastStep) {
            onClose();
        } else {
            setStep(step + 1);
        }
    };

    const handleSkip = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className="sm:max-w-md"
                aria-describedby="onboarding-description"
            >
                <DialogHeader>
                    <div className="flex justify-center mb-4">
                        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${currentStep.color} flex items-center justify-center shadow-lg animate-scaleIn`}>
                            <Icon className="w-10 h-10 text-white" aria-hidden="true" />
                        </div>
                    </div>
                    <DialogTitle className="text-center text-2xl">{currentStep.title}</DialogTitle>
                    <DialogDescription id="onboarding-description" className="text-center text-base pt-2">
                        {currentStep.description}
                    </DialogDescription>
                </DialogHeader>

                {/* Progress Indicator */}
                <div className="flex justify-center gap-2 py-4">
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            className={`h-2 rounded-full transition-all duration-300 ${index === step ? 'w-8 bg-primary' : 'w-2 bg-muted'
                                }`}
                            aria-label={`Step ${index + 1} of ${steps.length}${index === step ? ' (current)' : ''}`}
                        />
                    ))}
                </div>

                <DialogFooter className="flex-row gap-2 sm:gap-0">
                    {!isLastStep && (
                        <Button
                            variant="ghost"
                            onClick={handleSkip}
                            className="flex-1 sm:flex-none"
                        >
                            Skip
                        </Button>
                    )}
                    <Button
                        onClick={handleNext}
                        className="flex-1 sm:flex-none bg-gradient-to-r from-primary to-secondary"
                    >
                        {isLastStep ? (
                            <>
                                <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                                Get Started
                            </>
                        ) : (
                            'Next'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
