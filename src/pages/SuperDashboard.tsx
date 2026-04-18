import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SuperCompetitionEditor } from "@/components/super/SuperCompetitionEditor";
import { SeasonManager } from "@/components/super/SeasonManager";
import { AuditLog } from "@/components/super/AuditLog";
import { ScoreOverride } from "@/components/super/ScoreOverride";
import { AthleteMergeManager } from "@/modules/athletes/components/AthleteMergeManager";
import { SuperUserManager } from "@/components/super/SuperUserManager";
import { FeatureFlagsManager } from "@/components/super/FeatureFlagsManager";
import { AppHeader } from "@/components/AppHeader";

export default function SuperDashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Platform Administration" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Tabs defaultValue="competitions" className="w-full">
          <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 mb-6">
            <TabsList className="inline-flex w-auto min-w-full md:w-full md:grid md:grid-cols-6 gap-1">
              <TabsTrigger value="competitions">Competitions</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="seasons">Seasons</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
              <TabsTrigger value="overrides">Overrides</TabsTrigger>
              <TabsTrigger value="athletes">Athletes</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="competitions">
            <SuperCompetitionEditor />
          </TabsContent>

          <TabsContent value="users">
            <SuperUserManager />
          </TabsContent>

          <TabsContent value="seasons">
            <SeasonManager />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLog />
          </TabsContent>

          <TabsContent value="overrides">
            <ScoreOverride />
          </TabsContent>

          <TabsContent value="athletes">
            <AthleteMergeManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
