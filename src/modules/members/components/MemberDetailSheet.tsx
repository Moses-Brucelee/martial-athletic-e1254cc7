import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Layers, Tag } from "lucide-react";
import { useMemberDiscounts, useDeleteDiscount, useResolvedDiscount } from "../hooks";
import { AddDiscountDialog } from "./AddDiscountDialog";
import type { GymMember } from "../types";
import type { DiscountContext } from "@/utils/discountResolver.types";
import { toast } from "sonner";

interface Props {
  member: GymMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymId: string;
}

const CONTEXTS: { value: DiscountContext; label: string }[] = [
  { value: "subscription", label: "Subscription" },
  { value: "competition_entry", label: "Competition Entry" },
  { value: "vendor_purchase", label: "Vendor Purchase" },
];

export function MemberDetailSheet({ member, open, onOpenChange, gymId }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [previewCtx, setPreviewCtx] = useState<DiscountContext>("subscription");

  const { data: discounts } = useMemberDiscounts(member?.id);
  const deleteDiscount = useDeleteDiscount(member?.id);
  const { data: resolved } = useResolvedDiscount(member?.id, gymId, previewCtx);

  if (!member) return null;

  const initials = (member.display_name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const now = new Date();
  const active = (discounts ?? []).filter((d) => {
    if (d.valid_until && new Date(d.valid_until) <= now) return false;
    return true;
  });
  const expired = (discounts ?? []).filter((d) => d.valid_until && new Date(d.valid_until) <= now);

  const handleDelete = (id: string) => {
    deleteDiscount.mutate(id, {
      onSuccess: () => toast.success("Discount removed"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Member Detail</SheetTitle>
            <SheetDescription>Membership information and discounts</SheetDescription>
          </SheetHeader>

          {/* Profile Section */}
          <div className="flex items-center gap-4 mt-6">
            <Avatar className="h-14 w-14">
              <AvatarImage src={member.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-bold text-foreground">{member.display_name || member.full_name || "Unknown"}</h3>
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs capitalize">{member.role}</Badge>
                <Badge variant={member.status === "active" ? "default" : "secondary"} className="text-xs capitalize">{member.status}</Badge>
                {member.belt_rank && (
                  <Badge variant="outline" className="text-xs capitalize">{member.belt_rank}</Badge>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            <p>Joined: {new Date(member.join_date).toLocaleDateString()}</p>
            {member.team_assignment && <p>Team: {member.team_assignment}</p>}
          </div>

          <Separator className="my-6" />

          {/* Discount Preview */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
              <Tag className="h-4 w-4" /> Discount Preview
            </h4>
            <div className="flex gap-2 flex-wrap">
              {CONTEXTS.map((c) => (
                <Button
                  key={c.value}
                  size="sm"
                  variant={previewCtx === c.value ? "default" : "outline"}
                  onClick={() => setPreviewCtx(c.value)}
                  className="text-xs"
                >
                  {c.label}
                </Button>
              ))}
            </div>
            {resolved && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                <p className="text-2xl font-bold text-foreground">{resolved.finalPercentage}% off</p>
                {resolved.finalAmount > 0 && (
                  <p className="text-sm text-muted-foreground">+ ${resolved.finalAmount} fixed discount</p>
                )}
                <p className="text-xs text-muted-foreground">{resolved.appliedDiscounts.length} discount(s) applied</p>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Active Discounts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                <Layers className="h-4 w-4" /> Active Discounts ({active.length})
              </h4>
              <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
                <Plus className="h-3 w-3 mr-1" /> Add
              </Button>
            </div>
            {active.length === 0 && (
              <p className="text-sm text-muted-foreground">No active discounts</p>
            )}
            {active.map((d) => (
              <div key={d.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground capitalize">
                      {d.discount_type.replace(/_/g, " ")}
                    </span>
                    {d.is_stackable && <Badge variant="outline" className="text-[10px]">Stackable</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {d.discount_percentage != null ? `${d.discount_percentage}%` : `$${d.discount_amount}`}
                    {" · "}Source: {d.source_type.replace(/_/g, " ")}
                    {" · "}Priority: {d.priority}
                  </p>
                  {d.valid_until && (
                    <p className="text-xs text-muted-foreground">Expires: {new Date(d.valid_until).toLocaleDateString()}</p>
                  )}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(d.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Expired Discounts */}
          {expired.length > 0 && (
            <>
              <Separator className="my-6" />
              <details>
                <summary className="text-sm font-bold text-muted-foreground uppercase tracking-wide cursor-pointer">
                  Expired ({expired.length})
                </summary>
                <div className="space-y-2 mt-2">
                  {expired.map((d) => (
                    <div key={d.id} className="bg-muted/30 border border-border/50 rounded-lg p-3 opacity-60">
                      <span className="text-sm capitalize">{d.discount_type.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {d.discount_percentage != null ? `${d.discount_percentage}%` : `$${d.discount_amount}`}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AddDiscountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        gymMemberId={member.id}
      />
    </>
  );
}
