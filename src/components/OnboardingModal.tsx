import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GraduationCap, Award, FolderKanban, TrendingUp, ArrowRight } from "lucide-react";
import { brand } from "@/lib/brand";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal = ({ isOpen, onClose }: OnboardingModalProps) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: `Welcome to ${brand.name}`,
      description: "Your personal platform for tracking achievements, managing projects, and showcasing your growth journey.",
      icon: GraduationCap,
      className: "bg-primary text-primary-foreground",
    },
    {
      title: "Track Your Achievements",
      description: "Document accomplishments, certifications, and milestones in a verified portfolio.",
      icon: Award,
      className: "bg-accent text-accent-foreground",
    },
    {
      title: "Manage Your Projects",
      description: "Keep track of ongoing work, completed projects, and the skills behind each piece.",
      icon: FolderKanban,
      className: "bg-secondary text-secondary-foreground",
    },
    {
      title: "Monitor Your Growth",
      description: "View progress, receive recommendations, and discover scholarship opportunities.",
      icon: TrendingUp,
      className: "bg-primary text-primary-foreground",
    },
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" aria-describedby="onboarding-description">
        <DialogHeader>
          <div className="mb-4 flex justify-center">
            <div className={`flex h-20 w-20 animate-scaleIn items-center justify-center rounded-lg shadow-lg ${currentStep.className}`}>
              <Icon className="h-10 w-10" aria-hidden="true" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">{currentStep.title}</DialogTitle>
          <DialogDescription id="onboarding-description" className="pt-2 text-center text-base">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${index === step ? "w-8 bg-primary" : "w-2 bg-muted"}`}
              aria-label={`Step ${index + 1} of ${steps.length}${index === step ? " (current)" : ""}`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-0">
          {!isLastStep && (
            <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-none">
              Skip
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1 sm:flex-none">
            {isLastStep ? (
              <>
                <ArrowRight className="mr-2 h-4 w-4" aria-hidden="true" />
                Get Started
              </>
            ) : (
              "Next"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
