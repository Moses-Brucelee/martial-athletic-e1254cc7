import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitionManager } from "@/components/super/CompetitionManager";
import { SeasonManager } from "@/components/super/SeasonManager";
import { AuditLog } from "@/components/super/AuditLog";
import { ScoreOverride } from "@/components/super/ScoreOverride";
import { Shield } from "lucide-react";

export default function SuperDashboard() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground uppercase tracking-tight">Platform Administration</h1>
        </div>
      </header>

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
