import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Share } from "lucide-react";
import { isIOS, isStandalone } from "@/lib/push";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const ASKED_KEY = "bornaal:install-asked";

const InstallPrompt = () => {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(ASKED_KEY)) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);

    // Mostra apenas na primeira visita, com um pequeno atraso
    const t = setTimeout(() => {
      if (localStorage.getItem(ASKED_KEY)) return;
      // Chrome/Android: espera pelo evento; iOS: mostra instruções
      if (deferred || isIOS()) setOpen(true);
    }, 2500);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      clearTimeout(t);
    };
  }, [deferred]);

  const handleInstall = async () => {
    if (!deferred) return;
    setBusy(true);
    try {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") localStorage.setItem(ASKED_KEY, "1");
    } finally {
      setBusy(false);
      setOpen(false);
    }
  };

  const handleLater = () => {
    localStorage.setItem(ASKED_KEY, "1");
    setOpen(false);
  };

  const ios = isIOS();

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleLater(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-1">
            {ios ? <Share className="h-6 w-6 text-primary" /> : <Download className="h-6 w-6 text-primary" />}
          </div>
          <DialogTitle className="text-center">
            {ios ? "Instala a app Bornaal" : "Instalar a app Bornaal"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {ios ? (
              <>
                No Safari: toca no botão{" "}
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Share className="h-3.5 w-3.5" /> Partilhar
                </span>{" "}
                e escolhe{" "}
                <span className="font-medium text-foreground">"Adicionar ao ecrã principal"</span>. A app passa
                a funcionar como uma aplicação normal, com notificações.
              </>
            ) : (
              "Adiciona a Bornaal ao ecrã principal para a usares como uma app, mais rápida e com notificações mesmo fechada."
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          {!ios && (
            <Button onClick={handleInstall} disabled={!deferred || busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Instalar
            </Button>
          )}
          <Button variant="outline" onClick={handleLater} className="w-full">
            Agora não
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InstallPrompt;