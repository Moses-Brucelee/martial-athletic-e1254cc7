import { useEffect, useState } from "react";
import { z } from "zod";
import { AppHeader } from "@/components/AppHeader";
import { SEO } from "@/components/SEO";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Loader2, Plus, Store, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { validateImageType } from "@/lib/validation";
import { resizeImage } from "@/lib/imageResize";

const CATEGORIES = ["Apparel", "Gear & Protection", "Nutrition & Supplements", "Recovery", "Footwear", "Accessories", "Services"];
const MAX_PRODUCTS = 4;

type Product = { title: string; price: string; url: string; image_url: string };

const urlOrEmpty = z.string().trim().max(300).refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Use a full link starting with https://");
const shopSchema = z.object({
  shop_name: z.string().trim().min(2, "Shop name needs at least 2 characters").max(80),
  website_url: urlOrEmpty,
  bio: z.string().max(600),
  products: z.array(z.object({ title: z.string().trim().min(1, "Each product needs a name").max(80), price: z.string().max(20), url: urlOrEmpty, image_url: z.string() })).max(MAX_PRODUCTS),
});

export default function ShopProfileEditor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [website, setWebsite] = useState("");
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [available, setAvailable] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("shop_profiles").select("*").eq("owner_user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setShopId(data.id); setName(data.shop_name); setCategory(data.category ?? ""); setWebsite(data.website_url ?? "");
        setLogo(data.logo_url); setBanner(data.banner_url); setBio(data.bio ?? ""); setAvailable(data.available_for_sponsorship);
        setProducts(Array.isArray(data.featured_products) ? (data.featured_products as Product[]) : []);
      }
      setLoading(false);
    });
  }, [user]);

  const upload = async (file: File, kind: string): Promise<string | null> => {
    const err = validateImageType(file);
    if (err) { toast.error(err); return null; }
    setUploading(kind);
    try {
      const blob = await resizeImage(file, { maxDim: kind === "banner" ? 1920 : 800, maxBytes: 1.8 * 1024 * 1024 });
      const path = `${user!.id}/shop/${kind}-${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: blob.type || "image/jpeg" });
      if (error) throw error;
      return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    } catch (e: any) { toast.error(e.message || "Upload failed"); return null; }
    finally { setUploading(null); }
  };

  const save = async () => {
    const parsed = shopSchema.safeParse({ shop_name: name, website_url: website, bio, products });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (available && !logo) { toast.error("Add a logo before switching on sponsorship — hosts show it on their event page"); return; }
    setSaving(true);
    const row = {
      owner_user_id: user!.id, shop_name: name.trim(), category: category || null, website_url: website.trim() || null,
      logo_url: logo, banner_url: banner, bio: bio.trim() || null, featured_products: products, available_for_sponsorship: available,
    };
    const res = shopId
      ? await supabase.from("shop_profiles").update(row).eq("id", shopId).select("id").maybeSingle()
      : await supabase.from("shop_profiles").insert(row).select("id").maybeSingle();
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    if (res.data) setShopId(res.data.id);
    toast.success("Shop saved");
  };

  const setProduct = (i: number, patch: Partial<Product>) => setProducts((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="min-h-screen bg-background pb-24">
      <SEO title="My shop | Martial Athletic" description="Set up your shop and let competition hosts pick you as a sponsor." path="/shop/edit" noindex />
      <AppHeader title="My shop" />
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {loading ? <Skeleton className="h-96 w-full" /> : (
          <>
            {/* Banner + logo */}
            <section className="relative">
              <label className="block aspect-[16/5] rounded-lg overflow-hidden border border-border bg-muted cursor-pointer group">
                {banner ? <img src={banner} alt="Shop banner" className="w-full h-full object-cover" />
                  : <span className="h-full flex items-center justify-center text-sm text-muted-foreground gap-2"><ImagePlus className="h-4 w-4" />Add a banner</span>}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const u = await upload(f, "banner"); if (u) setBanner(u); } e.target.value = ""; }} />
              </label>
              <label className="absolute -bottom-8 left-4 h-20 w-20 rounded-full border-4 border-background bg-card overflow-hidden cursor-pointer flex items-center justify-center">
                {uploading === "logo" ? <Loader2 className="h-5 w-5 animate-spin" />
                  : logo ? <img src={logo} alt="Shop logo" className="w-full h-full object-contain" /> : <Store className="h-6 w-6 text-muted-foreground" />}
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const u = await upload(f, "logo"); if (u) setLogo(u); } e.target.value = ""; }} />
              </label>
            </section>
            <p className="text-xs text-muted-foreground pl-28 -mt-4">Tap the circle to change your logo.</p>

            <section className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2"><Label>Shop name</Label><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Iron Lane Supply" /></div>
              <div className="space-y-1.5"><Label>What you sell</Label>
                <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1.5"><Label>Website</Label><Input type="url" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
            </section>

            <section className="flex items-start justify-between gap-4 rounded-lg border border-accent/40 bg-accent/5 p-4">
              <div>
                <p className="font-heading uppercase tracking-wide text-sm">Available for sponsorship</p>
                <p className="text-xs text-muted-foreground mt-1">Hosts can find you when they set up a competition and put your logo on their event page.</p>
              </div>
              <Switch checked={available} onCheckedChange={setAvailable} aria-label="Available for sponsorship" />
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-heading uppercase tracking-wide text-sm">Featured products <span className="text-muted-foreground">{products.length}/{MAX_PRODUCTS}</span></h2>
                {products.length < MAX_PRODUCTS && <Button size="sm" variant="outline" onClick={() => setProducts((p) => [...p, { title: "", price: "", url: "", image_url: "" }])}><Plus className="h-4 w-4 mr-1" />Add</Button>}
              </div>
              {products.length === 0 && <p className="text-sm text-muted-foreground">Nothing here yet. Add up to four things you want athletes to see.</p>}
              <div className="grid sm:grid-cols-2 gap-3">
                {products.map((p, i) => (
                  <div key={i} className="flex gap-3 rounded-lg border border-border p-3">
                    <label className="h-16 w-16 shrink-0 rounded-md bg-muted overflow-hidden flex items-center justify-center cursor-pointer">
                      {uploading === `p${i}` ? <Loader2 className="h-4 w-4 animate-spin" /> : p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="h-4 w-4 text-muted-foreground" />}
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const u = await upload(f, `p${i}`); if (u) setProduct(i, { image_url: u }); } e.target.value = ""; }} />
                    </label>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input className="h-8 text-sm" placeholder="Product name" value={p.title} onChange={(e) => setProduct(i, { title: e.target.value })} />
                      <div className="flex gap-1.5">
                        <Input className="h-8 text-sm w-24" placeholder="Price" value={p.price} onChange={(e) => setProduct(i, { price: e.target.value })} />
                        <Input className="h-8 text-sm" placeholder="Link" value={p.url} onChange={(e) => setProduct(i, { url: e.target.value })} />
                      </div>
                    </div>
                    <button type="button" aria-label="Remove product" className="text-muted-foreground hover:text-destructive self-start" onClick={() => setProducts((x) => x.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-1.5">
              <div className="flex justify-between"><Label>About the shop</Label><span className="text-xs text-muted-foreground">{bio.length}/600</span></div>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 600))} className="min-h-[110px]" placeholder="Who you are, what you make, why athletes like you." />
            </section>

            <div className="sticky bottom-16 md:bottom-0 bg-background/95 py-3 border-t border-border flex justify-end">
              <Button onClick={save} disabled={saving || !!uploading} className="min-h-[44px] px-8">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save shop"}</Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
