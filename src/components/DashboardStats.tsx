import { Card, CardContent } from "@/components/ui/card";
import { Trophy, FolderKanban, Calendar, TrendingUp } from "lucide-react";

interface DashboardStatsProps {
  achievements: number;
  projects: number;
  events: number;
  growthScore: number;
}

export default function DashboardStats({ achievements, projects, events, growthScore }: DashboardStatsProps) {
  const stats = [
    {
      label: "Achievements",
      value: achievements,
      icon: Trophy,
      gradient: "from-yellow-400 to-orange-500",
      bgGradient: "from-yellow-50 to-orange-50",
      darkBgGradient: "from-yellow-950/20 to-orange-950/20"
    },
    {
      label: "Active Projects",
      value: projects,
      icon: FolderKanban,
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      darkBgGradient: "from-blue-950/20 to-cyan-950/20"
    },
    {
      label: "Events Attended",
      value: events,
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      darkBgGradient: "from-purple-950/20 to-pink-950/20"
    },
    {
      label: "Growth Score",
      value: `${growthScore}%`,
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500",
      bgGradient: "from-green-50 to-emerald-50",
      darkBgGradient: "from-green-950/20 to-emerald-950/20"
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card
            key={i}
            className={`hover-lift elevation-sm overflow-hidden border-0 bg-gradient-to-br ${stat.bgGradient} dark:${stat.darkBgGradient} animate-scaleIn`}
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <CardContent className="p-6">
              <div className="flex flex-col space-y-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
