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
      gradient: "from-yellow-400 to-orange-500" 
    },
    { 
      label: "Active Projects", 
      value: projects, 
      icon: FolderKanban,
      gradient: "from-blue-500 to-cyan-500" 
    },
    { 
      label: "Events Attended", 
      value: events, 
      icon: Calendar,
      gradient: "from-purple-500 to-pink-500" 
    },
    { 
      label: "Growth Score", 
      value: `${growthScore}%`, 
      icon: TrendingUp,
      gradient: "from-green-500 to-emerald-500" 
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, i) => {
        const Icon = stat.icon;
        return (
          <Card key={i} className="hover:scale-105 transition-transform duration-300">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
