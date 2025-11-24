import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
    password: string;
}

export const calculatePasswordStrength = (password: string) => {
    let strength = 0;
    const checks = {
        minLength: password.length >= 6,
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    if (checks.minLength) strength++;
    if (checks.hasUppercase) strength++;
    if (checks.hasNumber) strength++;
    if (checks.hasSpecial) strength++;

    return { strength, checks };
};

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
    if (!password) return null;

    const { strength, checks } = calculatePasswordStrength(password);

    const getStrengthLabel = () => {
        if (strength <= 1) return { label: "Weak", color: "text-red-500" };
        if (strength === 2) return { label: "Fair", color: "text-orange-500" };
        if (strength === 3) return { label: "Good", color: "text-yellow-500" };
        return { label: "Strong", color: "text-green-500" };
    };

    const { label, color } = getStrengthLabel();

    return (
        <div className="space-y-2 mt-2">
            {/* Strength Meter */}
            <div className="space-y-1">
                <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground">Password strength:</span>
                    <span className={cn("font-medium", color)}>{label}</span>
                </div>
                <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                        <div
                            key={level}
                            className={cn(
                                "h-1 flex-1 rounded-full transition-colors",
                                level <= strength
                                    ? strength <= 1
                                        ? "bg-red-500"
                                        : strength === 2
                                            ? "bg-orange-500"
                                            : strength === 3
                                                ? "bg-yellow-500"
                                                : "bg-green-500"
                                    : "bg-muted"
                            )}
                        />
                    ))}
                </div>
            </div>

            {/* Requirements Checklist */}
            <div className="space-y-1 text-xs">
                <RequirementItem met={checks.minLength} text="At least 6 characters" />
                <RequirementItem met={checks.hasUppercase} text="Contains uppercase letter" />
                <RequirementItem met={checks.hasNumber} text="Contains number" />
                <RequirementItem met={checks.hasSpecial} text="Contains special character" />
            </div>
        </div>
    );
};

const RequirementItem = ({ met, text }: { met: boolean; text: string }) => (
    <div className={cn("flex items-center gap-1.5", met ? "text-green-600" : "text-muted-foreground")}>
        {met ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
        <span>{text}</span>
    </div>
);
