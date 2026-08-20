import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, BellRing } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useNotifications";
import {
  enablePush,
  getPermission,
  hasAsked,
  isStandalone,
  isPushSupported,
  markAsked,
  JUST_SIGNED_UP_KEY,
} from "@/lib/push";

const PushPrompt = () => {
  const { user } = useAuth();
  const { data: unread = 0 } = useUnreadCount(user?.id ?? null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!isPushSupported() || isStandalone()) return;
    if (hasAsked()) return;
    if (getPermission() !== "default") return;

    const justSignedUp = sessionStorage.getItem(JUST_SIGNED_UP_KEY) === "1";
    const hasActivity = unread > 0;

    // Mostra discretamente quando o utilizador já está a usar a plataforma:
    // logo após o registo, quando já tem notificações por ler, ou após ~15s
    // numa página da app. Nunca ao abrir o site pela primeira vez na landing.
    const delay = justSignedUp ? 800 : hasActivity ? 1500 : 15000;
    const t = setTimeout(() => setOpen(true), delay);
    return () => clearTimeout(t);
  }, [user, unread]);

  const handleEnable = async () => {
    setBusy(true);
    try {
      await enablePush();
      sessionStorage.removeItem(JUST_SIGNED_UP_KEY);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  const handleLater = () => {
    markAsked();
    sessionStorage.removeItem(JUST_SIGNED_UP_KEY);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-1">
            <BellRing className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Receber notificações?</DialogTitle>
          <DialogDescription className="text-center">
            Recebe um alerta no telemóvel quando alguém vê o teu perfil, te contacta
            ou responde ao teu pedido — mesmo com a app fechada.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleEnable} disabled={busy} className="w-full">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Ativar notificações
          </Button>
          <Button variant="outline" onClick={handleLater} disabled={busy} className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PushPrompt;