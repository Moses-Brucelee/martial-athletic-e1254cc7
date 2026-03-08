import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitionManager } from "@/components/super/CompetitionManager";
import { SeasonManager } from "@/components/super/SeasonManager";
import { AuditLog } from "@/components/super/AuditLog";
import { ScoreOverride } from "@/components/super/ScoreOverride";
import { AppHeader } from "@/components/AppHeader";

export default function SuperDashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Platform Administration" />

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Tabs defaultValue="competitions" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="competitions">Competitions</TabsTrigger>
            <TabsTrigger value="seasons">Seasons</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
            <TabsTrigger value="overrides">Overrides</TabsTrigger>
          </TabsList>

          <TabsContent value="competitions">
            <CompetitionManager />
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
        </Tabs>
      </main>
    </div>
  );
}
