import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Store, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { linkShopSponsor } from "@/lib/posterAssets";

interface Shop { id: string; shop_name: string; category: string | null; logo_url: string | null; website_url: string | null }

export function ShopSponsorPicker({ competitionId, linkedShopIds, disabled, onLinked }: {
  competitionId: string; linkedShopIds: string[]; disabled?: boolean; onLinked: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase.from("shop_profiles")
      .select("id, shop_name, category, logo_url, website_url")
      .eq("available_for_sponsorship", true)
      .order("shop_name")
      .then(({ data }) => { setShops((data ?? []) as Shop[]); setLoading(false); });
  }, [open]);

  const filtered = shops.filter((s) =>
    !q || s.shop_name.toLowerCase().includes(q.toLowerCase()) || (s.category ?? "").toLowerCase().includes(q.toLowerCase()));

  const pick = async (s: Shop) => {
    if (!s.logo_url) { toast.error("This shop hasn't added a logo yet"); return; }
    setBusyId(s.id);
    try {
      await linkShopSponsor(competitionId, s);
      toast.success(`${s.shop_name} added as a sponsor`);
      onLinked();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Couldn't add that shop");
    } finally { setBusyId(null); }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled} onClick={() => setOpen(true)}>
        <Store className="h-4 w-4 mr-2" /> Pick a shop on Martial Athletic
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Shops open to sponsoring</DialogTitle>
            <DialogDescription>Their logo and store link come straight from their shop profile.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name or category" className="pl-8" />
          </div>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {loading ? <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : filtered.length === 0 ? <p className="text-sm text-muted-foreground py-6 text-center">No shops have switched on sponsorship yet.</p>
              : filtered.map((s) => {
                const linked = linkedShopIds.includes(s.id);
                return (
                  <button key={s.id} type="button" disabled={linked || busyId === s.id} onClick={() => pick(s)}
                    className="w-full flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/50 disabled:opacity-50 text-left">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {s.logo_url ? <img src={s.logo_url} alt="" className="max-h-full max-w-full object-contain" /> : <Store className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.shop_name}</p>
                      <p className="text-xs text-muted-foreground">{s.category ?? "Shop"}{linked ? " · already a sponsor" : ""}</p>
                    </div>
                    {busyId === s.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
