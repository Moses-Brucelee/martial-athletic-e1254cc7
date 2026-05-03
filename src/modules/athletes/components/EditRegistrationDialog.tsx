import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUpdateRegistrationDetails } from "@/modules/athletes/hooks";
import { athleteNameSchema, emailSchema } from "@/lib/validation";
import type { AthleteRegistration } from "@/domain/competition";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  reg: AthleteRegistration | null;
  competitionId: string;
}

export function EditRegistrationDialog({ open, onOpenChange, reg, competitionId }: Props) {
  const update = useUpdateRegistrationDetails();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!reg) return;
    setName(reg.athlete_name ?? "");
    setEmail(reg.email ?? "");
    setPhone(reg.phone ?? "");
    setGender(reg.gender ?? "");
    setDob(reg.date_of_birth ?? "");
    setNotes(reg.notes ?? "");
  }, [reg]);

  if (!reg) return null;

  const handleSave = async () => {
    const nameOk = athleteNameSchema.safeParse(name);
    if (!nameOk.success) { toast.error(nameOk.error.issues[0].message); return; }
    if (email) {
      const e = emailSchema.safeParse(email);
      if (!e.success) { toast.error(e.error.issues[0].message); return; }
    }
    try {
      await update.mutateAsync({
        id: reg.id,
        competitionId,
        updates: {
          athlete_name: name.trim(),
          email: email || null,
          phone: phone || null,
          gender: gender || null,
          date_of_birth: dob || null,
          notes: notes || null,
        },
      });
      toast.success("Athlete updated");
      onOpenChange(false);
    } catch {
      toast.error("Failed to update athlete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Athlete</DialogTitle>
          <DialogDescription>Update profile information for this registration.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs font-medium">Name *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" maxLength={255} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs font-medium">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium">Gender</Label>
              <Select value={gender || "__none__"} onValueChange={(v) => setGender(v === "__none__" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Date of Birth</Label>
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label className="text-xs font-medium">Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={update.isPending} className="flex-1 bg-accent text-accent-foreground">
              {update.isPending ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
