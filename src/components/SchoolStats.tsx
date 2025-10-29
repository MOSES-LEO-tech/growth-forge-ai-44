import { Card, CardContent } from "@/components/ui/card";
import { Users, GraduationCap, Activity } from "lucide-react";

interface SchoolStatsProps {
  studentCount: number;
  teacherCount: number;
  activeUsers: number;
  isInView: boolean;
}

const SchoolStats = ({ studentCount, teacherCount, activeUsers, isInView }: SchoolStatsProps) => {
  const stats = [
    {
      icon: Users,
      label: "Total Students",
      value: studentCount.toLocaleString(),
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: GraduationCap,
      label: "Teachers",
      value: teacherCount.toLocaleString(),
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: Activity,
      label: "Active Users",
      value: activeUsers.toLocaleString(),
      color: "from-green-500 to-emerald-500"
    }
  ];

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className={`transition-all duration-700 ${
              isInView 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
            style={{ 
              transitionDelay: isInView ? `${index * 150}ms` : '0ms'
            }}
          >
            <CardContent className="p-6">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default SchoolStats;
