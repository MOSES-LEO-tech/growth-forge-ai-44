import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Plus, Edit, Trash2, Award, Users, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface AchievementControlWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: number;
}

interface AchievementRecord {
  id: number;
  title: string;
  description: string;
  criteria: string;
  type: string;
  recipients: number;
}

export function AchievementControlWidget({ className = "", defaultExpanded = false, schoolId }: AchievementControlWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        setAchievements([
          { id: 1, title: "Science Fair Winner", description: "First place in annual science fair", criteria: "Score 90+ in science projects", type: "competition", recipients: 5 },
          { id: 2, title: "Creative Writer", description: "Excellence in creative writing", criteria: "Publish 3+ creative writing pieces", type: "academic", recipients: 12 },
          { id: 3, title: "Community Service", description: "Outstanding community service", criteria: "Complete 50+ hours of volunteering", type: "service", recipients: 8 },
          { id: 4, title: "Tech Innovator", description: "Innovation in technology", criteria: "Create and submit 2+ tech projects", type: "innovation", recipients: 6 },
        ]);
        setLoading(false);
      }, 500);
    };

    fetchAchievements();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievement Control
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
            <Trophy className="h-5 w-5" />
            Achievement Control
          </div>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
            <Plus className="h-4 w-4 mr-1" /> Create
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {achievements.map(achievement => (
                <div key={achievement.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                      <Award className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{achievement.title}</p>
                      <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">Criteria: {achievement.criteria}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          achievement.type === 'competition' ? 'bg-purple-100 text-purple-800' :
                          achievement.type === 'academic' ? 'bg-blue-100 text-blue-800' :
                          achievement.type === 'service' ? 'bg-green-100 text-green-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {achievement.type}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="h-3 w-3" /> {achievement.recipients} recipients
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
