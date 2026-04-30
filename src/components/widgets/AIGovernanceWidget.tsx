import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Compass, Settings, Users, Activity, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AIGovernanceWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface GuidanceUsageStats {
  dailyRequests: number;
  totalCredits: number;
  usedCredits: number;
  topUsers: { name: string; requests: number }[];
  features: { name: string; enabled: boolean }[];
}

export function AIGovernanceWidget({ className = "", defaultExpanded = false, schoolId }: AIGovernanceWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [stats, setStats] = useState<GuidanceUsageStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        setStats({
          dailyRequests: 156,
          totalCredits: 10000,
          usedCredits: 4250,
          topUsers: [
            { name: "John Smith", requests: 45 },
            { name: "Jane Doe", requests: 38 },
            { name: "Mike Johnson", requests: 29 },
          ],
          features: [
            { name: "Smart Buddy Chat", enabled: true },
            { name: "Project Recommendations", enabled: true },
            { name: "Achievement Analysis", enabled: true },
            { name: "Essay Review", enabled: false },
          ],
        });
        setLoading(false);
      }, 500);
    };

    fetchStats();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Guidance Governance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No school assigned to your account.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader 
        className="cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            Guidance Governance
          </div>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
            <Settings className="h-4 w-4 mr-1" /> Configure
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-16" />
            </div>
          ) : stats ? (
            <div className="space-y-4">
              {/* Usage Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg text-center">
                  <Activity className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.dailyRequests}</p>
                  <p className="text-xs text-muted-foreground">Daily Requests</p>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg text-center">
                  <Compass className="h-6 w-6 mx-auto text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{stats.totalCredits}</p>
                  <p className="text-xs text-muted-foreground">Total Credits</p>
                </div>
                <div className="p-4 bg-purple-50 dark:bg-purple-950 rounded-lg text-center">
                  <Activity className="h-6 w-6 mx-auto text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{Math.round((stats.usedCredits / stats.totalCredits) * 100)}%</p>
                  <p className="text-xs text-muted-foreground">Credits Used</p>
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <h4 className="text-sm font-medium mb-2">Guidance Features</h4>
                <div className="space-y-2">
                  {stats.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded-lg">
                      <span className="text-sm">{feature.name}</span>
                      <Button variant="ghost" size="sm">
                        {feature.enabled ? (
                          <ToggleRight className="h-5 w-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Users */}
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Top Guidance Users
                </h4>
                <div className="space-y-2">
                  {stats.topUsers.map((user, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <span className="text-sm">{user.name}</span>
                      <span className="text-sm font-medium">{user.requests} requests</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Unable to load guidance usage data.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
