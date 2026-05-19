import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Share2,
  Copy,
  Check,
  Mail,
  MessageCircle,
  MessageSquare,
  Twitter,
  Facebook,
  Linkedin,
  QrCode,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

interface ShareCompetitionMenuProps {
  competitionId: string;
  competitionName?: string;
  startDate?: string | null;
  venue?: string | null;
}

export function ShareCompetitionMenu({
  competitionId,
  competitionName = "this competition",
  startDate,
  venue,
}: ShareCompetitionMenuProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const link = `${window.location.origin}/event/${competitionId}`;
  const registerLink = `${link}?register=1`;

  const message = useMemo(() => {
    const dateStr = startDate
      ? new Date(startDate).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "";
    const parts = [
      `Join ${competitionName}`,
      dateStr && `on ${dateStr}`,
      venue && `at ${venue}`,
    ]
      .filter(Boolean)
      .join(" ");
    return `${parts}. Register here: ${link}`;
  }, [competitionName, startDate, venue, link]);

  const supportsNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  const handleCopy = async (url: string = link, label = "Link") => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: competitionName,
        text: message,
        url: link,
      });
      toast.success("Shared!");
    } catch (err) {
      // User cancelled — silently ignore
      if ((err as Error).name !== "AbortError") {
        toast.error("Could not open share sheet");
      }
    }
  };

  const openWindow = (url: string, channel: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
    toast.success(`Opened ${channel}`);
  };

  const encoded = encodeURIComponent(message);
  const encodedLink = encodeURIComponent(link);
  const encodedTitle = encodeURIComponent(competitionName);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" className="bg-primary text-primary-foreground gap-1.5">
            <Share2 className="h-4 w-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {supportsNativeShare && (
            <>
              <DropdownMenuItem onClick={handleNativeShare}>
                <Smartphone className="h-4 w-4 mr-2 text-primary" />
                Share via device…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}

          <DropdownMenuItem onClick={() => handleCopy(link, "Link")}>
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy link"}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => handleCopy(registerLink, "Registration link")}>
            <Copy className="h-4 w-4 mr-2 text-primary" />
            Copy registration link
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              openWindow(`mailto:?subject=${encodedTitle}&body=${encoded}`, "Email")
            }
          >
            <Mail className="h-4 w-4 mr-2 text-blue-600" />
            Email
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => openWindow(`https://wa.me/?text=${encoded}`, "WhatsApp")}
          >
            <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
            WhatsApp
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => openWindow(`sms:?&body=${encoded}`, "SMS")}>
            <MessageSquare className="h-4 w-4 mr-2 text-purple-600" />
            SMS
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() =>
              openWindow(
                `https://twitter.com/intent/tweet?text=${encoded}`,
                "X / Twitter",
              )
            }
          >
            <Twitter className="h-4 w-4 mr-2" />
            X / Twitter
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              openWindow(
                `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,
                "Facebook",
              )
            }
          >
            <Facebook className="h-4 w-4 mr-2 text-blue-700" />
            Facebook
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              openWindow(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodedLink}`,
                "LinkedIn",
              )
            }
          >
            <Linkedin className="h-4 w-4 mr-2 text-blue-800" />
            LinkedIn
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => {
              setShowQR(true);
              toast.success("QR code ready to scan");
            }}
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Scan to register</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={link} size={220} level="M" includeMargin={false} />
            </div>
            <p className="text-xs text-muted-foreground text-center break-all px-2">
              {link}
            </p>
            <Button variant="outline" size="sm" onClick={handleCopy} className="w-full">
              {copied ? (
                <Check className="h-4 w-4 mr-2 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
