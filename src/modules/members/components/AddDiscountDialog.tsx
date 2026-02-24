import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useCreateDiscount } from "../hooks";
import type { CreateMemberDiscountInput } from "../types";
import { toast } from "sonner";

const DISCOUNT_TYPES = [
  { value: "subscription", label: "Subscription" },
  { value: "competition_entry", label: "Competition Entry" },
  { value: "vendor", label: "Vendor" },
  { value: "promotional", label: "Promotional" },
  { value: "reward", label: "Reward" },
  { value: "manual_override", label: "Manual Override" },
];

const SOURCE_TYPES = [
  { value: "gym_subscription", label: "Gym Subscription" },
  { value: "affiliation", label: "Affiliation" },
  { value: "vendor", label: "Vendor" },
  { value: "tournament_result", label: "Tournament Result" },
  { value: "admin", label: "Admin" },
  { value: "system", label: "System" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gymMemberId: string;
}

export function AddDiscountDialog({ open, onOpenChange, gymMemberId }: Props) {
  const createDiscount = useCreateDiscount(gymMemberId);

  const [discountType, setDiscountType] = useState("manual_override");
  const [sourceType, setSourceType] = useState("admin");
  const [mode, setMode] = useState<"percentage" | "amount">("percentage");
  const [value, setValue] = useState("");
  const [priority, setPriority] = useState("100");
  const [stackable, setStackable] = useState(false);
  const [validUntil, setValidUntil] = useState("");

  const reset = () => {
    setDiscountType("manual_override");
    setSourceType("admin");
    setMode("percentage");
    setValue("");
    setPriority("100");
    setStackable(false);
    setValidUntil("");
  };

  const handleSubmit = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error("Enter a valid positive number");
      return;
    }
    if (mode === "percentage" && numValue > 100) {
      toast.error("Percentage cannot exceed 100");
      return;
    }

    const input: CreateMemberDiscountInput = {
      gym_member_id: gymMemberId,
      discount_type: discountType,
      source_type: sourceType,
      discount_percentage: mode === "percentage" ? numValue : null,
      discount_amount: mode === "amount" ? numValue : null,
      is_stackable: stackable,
      priority: parseInt(priority) || 100,
      valid_until: validUntil || null,
    };

    createDiscount.mutate(input, {
      onSuccess: () => {
        toast.success("Discount added");
        reset();
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Discount</DialogTitle>
          <DialogDescription>Add a discount for this member.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Discount Type</Label>
            <Select value={discountType} onValueChange={setDiscountType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Discount Mode</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as "percentage" | "amount")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Percentage (%)</SelectItem>
                <SelectItem value="amount">Fixed Amount</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{mode === "percentage" ? "Percentage" : "Amount"}</Label>
            <Input
              type="number"
              min="0"
              max={mode === "percentage" ? "100" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={mode === "percentage" ? "e.g. 25" : "e.g. 50"}
            />
          </div>

          <div className="space-y-2">
            <Label>Priority (lower = higher)</Label>
            <Input
              type="number"
              min="1"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Stackable</Label>
            <Switch checked={stackable} onCheckedChange={setStackable} />
          </div>

          <div className="space-y-2">
            <Label>Expires (optional)</Label>
            <Input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={createDiscount.isPending}
          >
            {createDiscount.isPending ? "Adding..." : "Add Discount"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
