import { useState, useEffect, useCallback } from "react";
import { getPlan } from "@/lib/supabase/parent";
import { useAuth } from "@/contexts/AuthContext";
import { ExpandableWidget } from "@/components/ExpandableWidget";
import { Crown, Check, Zap, Star, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SubscriptionWidgetProps {
    className?: string;
    defaultExpanded?: boolean;
}

type PlanData = { tier: string; features: string[]; updatedAt: string | null };

const PLAN_CONFIG = {
    basic: {
        label: "Basic",
        color: "text-slate-600",
        bg: "bg-slate-50 dark:bg-slate-900/30",
        border: "border-slate-200 dark:border-slate-700",
        icon: Shield,
        gradient: "from-slate-400 to-slate-600",
        badgeVariant: "secondary" as const,
    },
    plus: {
        label: "Plus",
        color: "text-blue-600",
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        icon: Zap,
        gradient: "from-blue-400 to-indigo-600",
        badgeVariant: "default" as const,
    },
    pro: {
        label: "Pro",
        color: "text-amber-600",
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-200 dark:border-amber-800",
        icon: Crown,
        gradient: "from-amber-400 to-orange-500",
        badgeVariant: "default" as const,
    },
};

const ALL_PLAN_FEATURES = [
    { label: "View child overview", plans: ["basic", "plus", "pro"] },
    { label: "Monitor projects (read-only)", plans: ["basic", "plus", "pro"] },
    { label: "View achievements", plans: ["basic", "plus", "pro"] },
    { label: "School notifications", plans: ["basic", "plus", "pro"] },
    { label: "AI Guidance chat", plans: ["plus", "pro"] },
    { label: "Send messages to teachers", plans: ["plus", "pro"] },
    { label: "Basic analytics", plans: ["plus", "pro"] },
    { label: "Advanced analytics", plans: ["pro"] },
    { label: "Export reports", plans: ["pro"] },
    { label: "Priority support", plans: ["pro"] },
];

export function SubscriptionWidget({ className, defaultExpanded }: SubscriptionWidgetProps) {
    const { user } = useAuth();
    const [plan, setPlan] = useState<PlanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPlan = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError(null);
            const data = await getPlan(user.id);
            setPlan(data as PlanData);
        } catch (err: any) {
            setError(err?.message || "Failed to load plan.");
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { fetchPlan(); }, [fetchPlan]);

    const config = plan?.tier ? PLAN_CONFIG[plan.tier as keyof typeof PLAN_CONFIG] ?? PLAN_CONFIG.basic : PLAN_CONFIG.basic;
    const Icon = config.icon;

    const CollapsedContent = () => (
        <div className="flex flex-col h-full gap-3">
            {loading ? <Skeleton className="h-16 w-full" /> : error ? <p className="text-sm text-destructive">{error}</p> : plan ? (
                <div className={`flex items-center gap-3 p-3 rounded-xl border ${config.border} ${config.bg}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br ${config.gradient}`}>
                        <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <div className={`font-bold text-lg ${config.color}`}>{config.label} Plan</div>
                        <div className="text-xs text-muted-foreground">{plan.features.length} features included</div>
                    </div>
                </div>
            ) : null}
        </div>
    );

    const ExpandedContent = () => (
        <div className="flex flex-col gap-6 p-2">
            {loading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : error ? (
                <div className="text-center py-8 text-destructive">{error}<button onClick={fetchPlan} className="block mt-2 mx-auto text-sm text-primary underline">Retry</button></div>
            ) : plan ? (
                <>
                    {/* Current plan badge */}
                    <div className={`p-6 rounded-2xl border ${config.border} ${config.bg} text-center`}>
                        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gradient-to-br ${config.gradient} shadow-lg mb-4`}>
                            <Icon className="w-8 h-8 text-white" />
                        </div>
                        <Badge variant={config.badgeVariant} className="text-base px-4 py-1 mb-2">{config.label} Plan</Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                            {plan.updatedAt ? `Active since ${new Date(plan.updatedAt).toLocaleDateString()}` : 'Active'}
                        </p>
                    </div>

                    {/* Feature comparison */}
                    <div>
                        <h4 className="font-semibold mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-amber-500" />Feature Comparison</h4>
                        <div className="space-y-2">
                            {ALL_PLAN_FEATURES.map(({ label, plans }) => {
                                const included = plans.includes(plan.tier);
                                return (
                                    <div key={label} className="flex items-center gap-3 text-sm">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${included ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                                            <Check className={`w-3 h-3 ${included ? 'text-emerald-600' : 'text-muted-foreground opacity-30'}`} />
                                        </div>
                                        <span className={included ? 'font-medium' : 'text-muted-foreground line-through text-xs'}>{label}</span>
                                        {!included && (
                                            <span className="text-[10px] text-muted-foreground ml-auto">
                                                {plans[0] === 'plus' ? 'Plus+' : 'Pro only'}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Upgrade CTA */}
                    {plan.tier !== 'pro' && (
                        <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-center">
                            <Crown className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                            <p className="text-sm font-semibold mb-1">
                                {plan.tier === 'basic' ? 'Unlock AI Guidance & Messaging' : 'Get Full Analytics & Reports'}
                            </p>
                            <p className="text-xs text-muted-foreground mb-3">
                                Upgrade to {plan.tier === 'basic' ? 'Plus' : 'Pro'} for more features
                            </p>
                            <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100">
                                Upgrade Now
                            </Button>
                        </div>
                    )}
                </>
            ) : null}
        </div>
    );

    return (
        <ExpandableWidget
            title="Subscription"
            icon={<Crown className="w-5 h-5 text-amber-500" />}
            className={className}
            defaultExpanded={defaultExpanded}
            expandedContent={<ExpandedContent />}
        >
            <CollapsedContent />
        </ExpandableWidget>
    );
}
