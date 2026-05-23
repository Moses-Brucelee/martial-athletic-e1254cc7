import { useState, useEffect } from "react";
import MembersPage from "@/modules/members/components/MembersPage";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Users } from "lucide-react";
import { useUserGyms, useUpdateGym } from "@/modules/members/hooks";
import { toast } from "sonner";

/**
 * Affiliation: manage your gym profile (name, description, website, logo)
 * and members. If no gym exists yet, MembersPage handles creation.
 */
export default function Affiliation() {
  const { data: gyms, isLoading } = useUserGyms();
  const gym = gyms?.[0];
  const updateGym = useUpdateGym();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState("");

  useEffect(() => {
    if (!gym) return;
    setName(gym.name ?? "");
    setDescription(gym.description ?? "");
    setWebsite(gym.website_url ?? "");
    setLogo(gym.logo_url ?? "");
  }, [gym?.id]);

  // No gym yet — show creation flow inside MembersPage
  if (isLoading || !gym) {
    return <MembersPage />;
  }

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Gym name is required");
      return;
    }
    updateGym.mutate(
      {
        gymId: gym.id,
        updates: {
          name: name.trim(),
          description: description.trim() || null,
          website_url: website.trim() || null,
          logo_url: logo.trim() || null,
        },
      },
      {
        onSuccess: () => toast.success("Affiliation updated"),
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const dirty =
    name !== (gym.name ?? "") ||
    description !== (gym.description ?? "") ||
    website !== (gym.website_url ?? "") ||
    logo !== (gym.logo_url ?? "");

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <AppHeader title="Affiliation" />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid grid-cols-2 w-full mb-4">
            <TabsTrigger value="details">
              <Building2 className="h-4 w-4 mr-1.5" /> Details
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-1.5" /> Members
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="gym-name">Affiliation Name</Label>
                  <Input id="gym-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gym-desc">Description</Label>
                  <Textarea
                    id="gym-desc"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell people about your gym..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gym-website">Website</Label>
                  <Input
                    id="gym-website"
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gym-logo">Logo URL</Label>
                  <Input
                    id="gym-logo"
                    type="url"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://.../logo.png"
                  />
                </div>
                <div className="pt-2 flex gap-2">
                  <Button onClick={handleSave} disabled={!dirty || updateGym.isPending}>
                    {updateGym.isPending ? "Saving..." : "Save changes"}
                  </Button>
                  <p className="text-xs text-muted-foreground self-center ml-auto">
                    Slug: <code className="text-foreground">{gym.slug}</code>
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="-mx-4">
            <MembersPage />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
