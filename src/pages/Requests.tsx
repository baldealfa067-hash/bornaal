import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { MapPin, MessageCircle, Plus, Tag, Clock, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { StarRating } from "@/components/StarRating";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { useRequests, useCreateRequest } from "@/hooks/useRequests";
import { useCategories } from "@/hooks/useProviders";
import { useProposals } from "@/hooks/useProposals";
import { formatCFA } from "@/lib/format";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const schema = z.object({
  requester_name: z.string().trim().min(2, "Nome obrigatório").max(80),
  requester_phone: z
    .string()
    .trim()
    .min(7, "Telefone inválido")
    .max(25)
    .regex(/^[+\d\s()-]+$/, "Telefone inválido"),
  category: z.string().min(1, "Selecione uma categoria"),
  location: z.string().trim().min(2, "Localização obrigatória").max(80),
  description: z.string().trim().min(10, "Descreva o pedido (mín. 10 caracteres)").max(500),
});

const Requests = () => {
  const { data: requests = [], isLoading } = useRequests();
  const { data: proposals = [], isLoading: loadingProposals } = useProposals();
  const { data: categories = [] } = useCategories();
  const create = useCreateRequest();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"pedidos" | "propostas">("propostas");
  const [form, setForm] = useState({
    requester_name: "",
    requester_phone: "",
    category: "",
    location: "",
    description: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast({
        title: "Erro de validação",
        description: parsed.error.issues[0].message,
        variant: "destructive",
      });
      return;
    }
    try {
      await create.mutateAsync(parsed.data as Required<typeof form>);
      toast({ title: "Pedido publicado!", description: "Os prestadores podem agora contactá-lo." });
      setOpen(false);
      setForm({ requester_name: "", requester_phone: "", category: "", location: "", description: "" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message ?? "Tente novamente", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold">Pedidos & Propostas</h1>
          <p className="text-xs text-muted-foreground">Veja propostas de prestadores ou publique o que precisa.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> Pedido
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Publicar pedido</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <Input
                placeholder="O seu nome"
                value={form.requester_name}
                onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                maxLength={80}
              />
              <Input
                placeholder="Telefone (WhatsApp), ex: +245 955 000 000"
                value={form.requester_phone}
                onChange={(e) => setForm({ ...form, requester_phone: e.target.value })}
                maxLength={25}
              />
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger><SelectValue placeholder="Categoria do serviço" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Localização (ex: Bissau, Bafatá...)"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                maxLength={80}
              />
              <Textarea
                placeholder="Descreva o que precisa..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={500}
                rows={4}
              />
              <DialogFooter>
                <Button type="submit" disabled={create.isPending} className="w-full">
                  {create.isPending ? "A publicar..." : "Publicar pedido"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="propostas">Propostas ({proposals.length})</TabsTrigger>
          <TabsTrigger value="pedidos">Pedidos ({requests.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="propostas" className="mt-4">
          {loadingProposals ? (
            <p className="text-sm text-muted-foreground">A carregar...</p>
          ) : proposals.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Ainda não existem propostas publicadas.
              <div className="mt-4">
                <Link to="/login?tab=registar">
                  <Button size="sm" variant="outline">Sou prestador — cadastrar</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {proposals.map((p) => {
                const phone = (p.provider?.phone ?? "").replace(/\D/g, "");
                const wa = phone
                  ? `https://wa.me/${phone}?text=${encodeURIComponent(
                      `Olá ${p.provider?.name ?? ""}, vi a sua proposta "${p.title}" no Nó Tarbadja e tenho interesse.`,
                    )}`
                  : null;
                return (
                  <Card key={p.id} className="border-border/60">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Link to={`/prestador/${p.provider_id}`}>
                          <Avatar className="h-11 w-11 rounded-lg">
                            {p.provider?.photo_url ? (
                              <AvatarImage src={p.provider.photo_url} alt={p.provider.name} className="object-cover" />
                            ) : null}
                            <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-semibold">
                              {p.provider?.name?.charAt(0) ?? "?"}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link to={`/prestador/${p.provider_id}`} className="font-semibold text-sm hover:underline flex items-center gap-1">
                            {p.provider?.name ?? "Prestador"}
                            {p.provider?.is_verified && (
                              <BadgeCheck className="h-4 w-4 text-primary" />
                            )}
                          </Link>
                          <div className="flex items-center gap-2">
                            <StarRating rating={Math.round(p.avgRating)} />
                            <span className="text-[11px] text-muted-foreground">({p.reviewCount})</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-muted-foreground uppercase">{p.price_type}</div>
                          <div className="text-sm font-bold text-primary">{formatCFA(p.price)}</div>
                        </div>
                      </div>
                      <h3 className="font-semibold text-foreground mb-1">{p.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{p.category}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</span>
                      </div>
                      <p className="text-sm text-foreground/90 mb-3 whitespace-pre-wrap">{p.description}</p>
                      {wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="block">
                          <Button className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
                            <MessageCircle className="h-4 w-4" /> Contactar via WhatsApp
                          </Button>
                        </a>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="pedidos" className="mt-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">A carregar...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Ainda não existem pedidos. Seja o primeiro a publicar!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {requests.map((r) => {
            const phone = (r.requester_phone ?? "").replace(/\D/g, "");
            const whatsappUrl = phone
              ? `https://wa.me/${phone}?text=${encodeURIComponent(
                  `Olá ${r.requester_name ?? ""}, vi o seu pedido (${r.category}) no Nó Tarbadja e posso ajudar.`,
                )}`
              : null;
            return (
              <Card key={r.id} className="border-border/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{r.requester_name ?? "Cliente"}</h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{r.category}</span>
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                          {new Date(r.created_at).toLocaleDateString("pt")}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{r.status}</Badge>
                  </div>
                  <p className="text-sm text-foreground/90 mb-3 whitespace-pre-wrap">{r.description}</p>
                  {whatsappUrl && (
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <Button className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Aceitar e contactar via WhatsApp
                      </Button>
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Requests;