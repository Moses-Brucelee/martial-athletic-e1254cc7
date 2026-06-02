import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ExternalLink, ShieldAlert } from "lucide-react";

interface ExternalLinkDialogProps {
  url: string | null;
  onClose: () => void;
  onConfirm?: () => void;
}

/**
 * Confirmation modal before sending the user to an external URL.
 * Opens the destination in a new tab on confirm; keeps the current tab on the platform.
 */
export function ExternalLinkDialog({ url, onClose, onConfirm }: ExternalLinkDialogProps) {
  let host = "";
  try {
    host = url ? new URL(url).hostname : "";
  } catch {
    host = "";
  }

  return (
    <AlertDialog open={!!url} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-5 w-5 text-accent" />
            <AlertDialogTitle>You're leaving Martial Athletic</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-3">
            <span className="block">
              You're about to visit an external sponsor website. We can't vouch for the content or security of pages outside Martial Athletic.
            </span>
            <span className="block rounded-md border border-border bg-muted/40 px-3 py-2 text-xs font-mono break-all text-foreground">
              {host || url}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (url) {
                window.open(url, "_blank", "noopener,noreferrer");
                onConfirm?.();
              }
              onClose();
            }}
            className="bg-accent text-accent-foreground hover:bg-accent/90 gap-1.5"
          >
            <ExternalLink className="h-4 w-4" /> Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
