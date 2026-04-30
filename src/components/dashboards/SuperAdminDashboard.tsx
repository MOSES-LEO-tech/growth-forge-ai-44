import { Profile } from "@/integrations/supabase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, School, FolderRoot, Compass, Activity, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SuperAdminDashboardProps {
  profile: Profile;
}

const SuperAdminDashboard = ({ profile }: SuperAdminDashboardProps) => {
  return (
    <div className="container mx-auto px-4 py-8">
      <section className="dashboard-hero flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="editorial-kicker mb-2">Platform workspace</p>
          <h1 className="text-3xl md:text-4xl">Platform Mission Control</h1>
          <p className="mt-2 text-sm text-muted-foreground">Global overview and management for the Milestone platform.</p>
        </div>
        <div className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
          <ShieldAlert className="w-4 h-4" />
          Super Admin Access
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="luxury-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Active across all roles</p>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partner Schools</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Registered institutions</p>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderRoot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Student portfolios</p>
          </CardContent>
        </Card>
        <Card className="luxury-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Guidance Requests</CardTitle>
            <Compass className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">SmartBuddy & Recommendations</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Platform Overview</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="content">Content Moderation</TabsTrigger>
          <TabsTrigger value="ai">Guidance Usage</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="col-span-1 luxury-card">
              <CardHeader>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>Live telemetry across the platform</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Activity className="w-8 h-8 animate-pulse" />
                  <p>Real-time analytics loading...</p>
                </div>
              </CardContent>
            </Card>
            <Card className="col-span-1 luxury-card">
              <CardHeader>
                <CardTitle>Top Performing Schools</CardTitle>
                <CardDescription>Schools with highest engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Connect to live Supabase project to view metrics.</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schools">
          <Card className="luxury-card">
            <CardHeader>
              <CardTitle>Institutional Management</CardTitle>
              <CardDescription>Onboard, verify, and manage school accounts.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="py-8 text-center border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">School directory is empty or inaccessible.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="luxury-card">
            <CardHeader>
              <CardTitle>Guidance Usage Governance</CardTitle>
              <CardDescription>Monitor LLM usage and API costs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Compass className="w-5 h-5 text-primary" />
                    <div>
                    <p className="font-medium">Total Guidance Consumption</p>
                      <p className="text-xs text-muted-foreground">Aggregated across all schools</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">0 Tokens</p>
                    <p className="text-xs text-green-600">Within budget</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SuperAdminDashboard;
