import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Save, Building, Bell, Shield, Palette, Calendar, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SchoolSettingsWidgetProps {
  className?: string;
  defaultExpanded?: boolean;
  schoolId?: string | null;
}

interface SchoolSettings {
  name: string;
  logoUrl: string;
  themeColor: string;
  parentAccessEnabled: boolean;
  aiFeaturesEnabled: boolean;
  emailNotifications: boolean;
}

export function SchoolSettingsWidget({ className = "", defaultExpanded = false, schoolId }: SchoolSettingsWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!schoolId) {
        setLoading(false);
        return;
      }
      
      setTimeout(() => {
        setSettings({
          name: "Greenfield International Academy",
          logoUrl: "/placeholder.svg",
          themeColor: "#2563eb",
          parentAccessEnabled: true,
          aiFeaturesEnabled: true,
          emailNotifications: true,
        });
        setLoading(false);
      }, 500);
    };

    fetchSettings();
  }, [schoolId]);

  if (!schoolId) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            School Settings
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
            <Settings className="h-5 w-5" />
            School Settings
          </div>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); }}>
            <Save className="h-4 w-4 mr-1" /> Save
          </Button>
        </CardTitle>
      </CardHeader>
      {expanded && (
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-24" />
            </div>
          ) : settings ? (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full grid grid-cols-4">
                <TabsTrigger value="general" className="flex items-center gap-1">
                  <Building className="h-4 w-4" /> General
                </TabsTrigger>
                <TabsTrigger value="permissions" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Permissions
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center gap-1">
                  <Bell className="h-4 w-4" /> Notifications
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex items-center gap-1">
                  <Palette className="h-4 w-4" /> Appearance
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4 space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">School Name</label>
                    <input 
                      type="text" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.name}
                      readOnly
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Logo URL</label>
                    <input 
                      type="text" 
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={settings.logoUrl}
                      readOnly
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" /> Academic Calendar
                    </label>
                    <Button variant="outline" size="sm">Configure Calendar</Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="permissions" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Parent Access</p>
                      <p className="text-sm text-muted-foreground">Allow parents to view student progress</p>
                    </div>
                    <Button variant={settings.parentAccessEnabled ? "default" : "outline"} size="sm">
                      {settings.parentAccessEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Guidance Features</p>
                      <p className="text-sm text-muted-foreground">Enable personalized guidance features for students</p>
                    </div>
                    <Button variant={settings.aiFeaturesEnabled ? "default" : "outline"} size="sm">
                      {settings.aiFeaturesEnabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notifications" className="mt-4 space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Send email notifications for important updates</p>
                    </div>
                    <Button variant={settings.emailNotifications ? "default" : "outline"} size="sm">
                      {settings.emailNotifications ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="mt-4 space-y-4">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Theme Color</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        className="h-10 w-10 rounded cursor-pointer"
                        value={settings.themeColor}
                        readOnly
                      />
                      <span className="text-sm text-muted-foreground">{settings.themeColor}</span>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            <p className="text-muted-foreground">Unable to load settings.</p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
