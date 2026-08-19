import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, MessageCircle, Plus, Tag, Clock, ChevronDown, ChevronUp, Users, CheckCircle2, XCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/Pagination";
import { useAuth } from "@/hooks/useAuth";
import { useMyProvider } from "@/hooks/useMyProvider";
import { useCategories } from "@/hooks/useProviders";
import { useBairros } from "@/hooks/useBairros";
import { BAIRROS_FILTER } from "@/lib/locations";
import { formatCFA } from "@/lib/format";
import { getPageCount, paginateArray } from "@/lib/pagination";
import {
  useRequests, useCreateRequest,
  useBidsForRequest, useBidOnRequest, useUpdateBidStatus, useMyBidOnRequest,
  useMarkRequestCompleted, useSubmitReview,
  type ServiceRequest, type RequestBidWithProvider,
} from "@/hooks/useRequests";
import { StarRating } from "@/components/StarRating";
import { toast } from "sonner";

const PAGE_SIZE = 10;

const DEADLINE_OPTIONS = [
  { value: "urgente", label: "Urgente" },
  { value: "hoje", label: "Hoje" },
  { value: "esta_semana", label: "Esta semana" },
  { value: "proxima_semana", label: "Próxima semana" },
  { value: "flexivel", label: "Flexível" },
];

const BUDGET_OPTIONS = [
  { value: "fixo", label: "Valor fixo" },
  { value: "negociavel", label: "Negociável" },
  { value: "combinar", label: "A combinar" },
];

const Requests = () => {
  const { user } = useAuth();
  const { data: providerProfile } = useMyProvider(user?.id ?? null);
  const { data: requests = [], isLoading } = useRequests();
  const { data: categories = [] } = useCategories();
  const { data: bairros = [] } = useBairros();
  const bairroOptions = bairros.length ? bairros : BAIRROS_FILTER.slice(1);
  const create = useCreateRequest();
  const bidOnRequest = useBidOnRequest();
  const updateBid = useUpdateBidStatus();

  const [tab, setTab] = useState<"disponiveis" | "publicar" | "meus">("disponiveis");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterLocation, setFilterLocation] = useState("all");
  const [expandedRequest, setExpandedRequest] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const [form, setForm] = useState({
    requester_name: "",
    requester_phone: "",
    category: "",
    location: "",
    description: "",
    deadline: "",
    budget_type: "combinar",
    budget_amount: "",
  });

  const [bidForm, setBidForm] = useState<{ requestId: string; message: string; requesterPhone: string | null; requesterName: string | null; category: string } | null>(null);

  const markCompleted = useMarkRequestCompleted();
  const submitReview = useSubmitReview();
  const [reviewDialog, setReviewDialog] = useState<{ requestId: string; providerId: string; providerName: string } | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewName, setReviewName] = useState("");

  const openRequests = requests.filter((r) => r.status === "open");
  const myRequests = user ? requests.filter((r) => r.user_id === user.id) : [];

  const filtered = openRequests.filter((r) => {
    if (filterCategory !== "all" && r.category !== filterCategory) return false;
    if (filterLocation !== "all" && !r.location.toLowerCase().includes(filterLocation.toLowerCase())) return false;
    return true;
  });

  const pageCount = getPageCount(filtered.length, PAGE_SIZE);
  const paginatedRequests = paginateArray(filtered, page, PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [filterCategory, filterLocation]);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.category) return toast.error("Selecione uma categoria");
    if (!form.description.trim()) return toast.error("Descreva o pedido");
    try {
      await create.mutateAsync({
        category: form.category,
        description: form.description.trim(),
        location: form.location.trim() || "Bissau",
        requester_name: form.requester_name.trim() || "Cliente",
        requester_phone: form.requester_phone.trim(),
        user_id: user?.id,
        deadline: form.deadline || null,
        budget_type: form.budget_type,
        budget_amount: form.budget_amount ? Number(form.budget_amount) : null,
      });
      toast.success("Pedido publicado!");
      setForm({ requester_name: "", requester_phone: "", category: "", location: "", description: "", deadline: "", budget_type: "combinar", budget_amount: "" });
      setTab("meus");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Tente novamente";
      toast.error(msg);
    }
  };

  const handleBid = async () => {
    if (!bidForm || !providerProfile) return;
    try {
      await bidOnRequest.mutateAsync({
        request_id: bidForm.request_id,
        provider_id: providerProfile.id,
        message: bidForm.message || undefined,
      });
      toast.success("Candidatura enviada!");
      // Open WhatsApp to client
      if (bidForm.requesterPhone) {
        const phone = bidForm.requesterPhone.replace(/[^\d+]/g, "");
        const msg = `Ola ${bidForm.requesterName ?? "Cliente"}, sou ${providerProfile.name ?? "um prestador"}, vi o seu pedido "${bidForm.category}" no BissauService e tenho interesse! ${bidForm.message ? "\n\nMensagem: " + bidForm.message : ""}`;
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      setBidForm(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Já se candidatou a este pedido";
      toast.error(msg);
    }
  };

  const handleBidStatus = async (bidId: string, status: "aceite" | "recusado") => {
    try {
      await updateBid.mutateAsync({ id: bidId, status });
      toast.success(status === "aceite" ? "Candidatura aceite!" : "Candidatura recusada");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro";
      toast.error(msg);
    }
  };

  const handleMarkCompleted = async (requestId: string) => {
    try {
      await markCompleted.mutateAsync(requestId);
      toast.success("Serviço marcado como concluído! Agora pode avaliar o prestador.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao marcar como concluído";
      toast.error(msg);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewDialog || !user) return;
    if (reviewRating < 1) {
      toast.error("Selecione uma avaliação em estrelas");
      return;
    }
    if (!reviewName.trim()) {
      toast.error("Indique o seu nome");
      return;
    }
    try {
      await submitReview.mutateAsync({
        provider_id: reviewDialog.providerId,
        request_id: reviewDialog.requestId,
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        reviewer_name: reviewName.trim(),
        user_id: user.id,
      });
      toast.success("Avaliação enviada com sucesso e será exibida após validação.");
      setReviewDialog(null);
      setReviewRating(0);
      setReviewComment("");
      setReviewName("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao enviar avaliação";
      toast.error(msg);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-6">
      <h1 className="text-xl font-bold mb-4">Pedidos de Serviço</h1>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="disponiveis" className="whitespace-nowrap">Disponíveis</TabsTrigger>
          <TabsTrigger value="publicar" className="whitespace-nowrap">Publicar</TabsTrigger>
          <TabsTrigger value="meus" className="whitespace-nowrap">Os Meus</TabsTrigger>
        </TabsList>

        {/* ─── TAB: Disponíveis (feed) ─── */}
        <TabsContent value="disponiveis">
          <div className="flex flex-col gap-3 mb-3">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-9 text-sm bg-card">
                <SelectValue placeholder="Todas as categorias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterLocation} onValueChange={setFilterLocation}>
              <SelectTrigger className="h-9 text-sm bg-card">
                <SelectValue placeholder="Todas as localizações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as localizações</SelectItem>
                {bairroOptions.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">A carregar...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              {openRequests.length === 0
                ? "Ainda não há pedidos publicados."
                : "Nenhum pedido para estes filtros."}
            </p>
          ) : (
            <>
            <div className="flex flex-col gap-3">
              {paginatedRequests.map((r) => (
                <RequestCard
                  key={r.id}
                  request={r}
                  providerProfile={providerProfile}
                  expanded={expandedRequest === r.id}
                  onToggle={() => setExpandedRequest(expandedRequest === r.id ? null : r.id)}
                  onBid={() => setBidForm({ requestId: r.id, message: "", requesterPhone: r.requester_phone, requesterName: r.requester_name, category: r.category })}
                  bidOnRequest={bidOnRequest}
                />
              ))}
            </div>
            <Pagination page={page} pageCount={pageCount} total={filtered.length} onPageChange={setPage} />
            </>
          )}
        </TabsContent>

        {/* ─── TAB: Publicar ─── */}
        <TabsContent value="publicar">
          <form onSubmit={handlePublish} className="flex flex-col gap-3">
            <Input
              placeholder="O seu nome (opcional)"
              value={form.requester_name}
              onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
              maxLength={80}
            />
            <Input
              placeholder="Telefone (WhatsApp)"
              value={form.requester_phone}
              onChange={(e) => setForm({ ...form, requester_phone: e.target.value })}
              maxLength={25}
            />
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue placeholder="Categoria do serviço *" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.location} onValueChange={(v) => setForm({ ...form, location: v })}>
              <SelectTrigger><SelectValue placeholder="Localização / Bairro" /></SelectTrigger>
              <SelectContent>
                {bairroOptions.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Descreva o que precisa (mín. 10 caracteres)..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              maxLength={500}
              rows={4}
            />

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Prazo</p>
              <div className="flex flex-wrap gap-2">
                {DEADLINE_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={form.deadline === opt.value ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-xs"
                    onClick={() => setForm({ ...form, deadline: form.deadline === opt.value ? "" : opt.value })}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Orçamento</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {BUDGET_OPTIONS.map((opt) => (
                  <Badge
                    key={opt.value}
                    variant={form.budget_type === opt.value ? "default" : "outline"}
                    className="cursor-pointer px-3 py-1.5 text-xs"
                    onClick={() => setForm({ ...form, budget_type: opt.value, budget_amount: opt.value === "fixo" ? form.budget_amount : "" })}
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
              {form.budget_type === "fixo" && (
                <Input
                  type="number"
                  min="0"
                  placeholder="Valor em CFA (ex: 15000)"
                  value={form.budget_amount}
                  onChange={(e) => setForm({ ...form, budget_amount: e.target.value })}
                />
              )}
            </div>

            <Button type="submit" disabled={create.isPending} className="w-full mt-2">
              {create.isPending ? "A publicar..." : "Publicar Pedido"}
            </Button>
          </form>
        </TabsContent>

        {/* ─── TAB: Os Meus (pedidos que publiquei) ─── */}
        <TabsContent value="meus">
          {!user ? (
            <div className="text-center py-12">
              <p className="text-sm text-muted-foreground mb-4">Faça login para ver os seus pedidos.</p>
              <Link to="/login">
                <Button size="sm">Entrar</Button>
              </Link>
            </div>
          ) : myRequests.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              Ainda não publicou nenhum pedido.
              <div className="mt-4">
                <Button size="sm" onClick={() => setTab("publicar")}>
                  <Plus className="h-4 w-4 mr-1" /> Publicar pedido
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {myRequests.map((r) => (
                <MyRequestCard
                  key={r.id}
                  request={r}
                  expanded={expandedRequest === r.id}
                  onToggle={() => setExpandedRequest(expandedRequest === r.id ? null : r.id)}
                  onBidStatus={handleBidStatus}
                  onMarkCompleted={handleMarkCompleted}
                  onReview={(requestId, providerId, providerName) =>
                    setReviewDialog({ requestId, providerId, providerName })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Dialog: Candidatar-se ─── */}
      <Dialog open={!!bidForm} onOpenChange={(open) => { if (!open) setBidForm(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Candidatar-se ao pedido</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Mensagem opcional: explique porquê deve escolhê-lo..."
            value={bidForm?.message ?? ""}
            onChange={(e) => setBidForm(bidForm ? { ...bidForm, message: e.target.value } : null)}
            rows={3}
          />
          <DialogFooter>
            <Button onClick={handleBid} disabled={bidOnRequest.isPending} className="w-full">
              {bidOnRequest.isPending ? "A enviar..." : "Enviar candidatura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Dialog: Avaliar prestador ─── */}
      <Dialog open={!!reviewDialog} onOpenChange={(open) => { if (!open) setReviewDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Avaliar {reviewDialog?.providerName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">A sua avaliação será publicada após validação pela nossa equipa.</p>
            <div className="flex items-center gap-2">
              <StarRating rating={reviewRating} onChange={setReviewRating} size="md" />
            </div>
            <Input
              placeholder="O seu nome"
              value={reviewName}
              onChange={(e) => setReviewName(e.target.value)}
            />
            <Textarea
              placeholder="Comentário (opcional)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleSubmitReview} disabled={submitReview.isPending} className="w-full">
              {submitReview.isPending ? "A enviar..." : "Enviar avaliação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ─── Card de pedido disponível (feed para prestadores) ─── */
function RequestCard({
  request: r,
  providerProfile,
  expanded,
  onToggle,
  onBid,
  bidOnRequest,
}: {
  request: ServiceRequest;
  providerProfile: { id: string } | null;
  expanded: boolean;
  onToggle: () => void;
  onBid: () => void;
  bidOnRequest: { isPending: boolean };
}) {
  const { data: myBid } = useMyBidOnRequest(r.id, providerProfile?.id ?? null);
  const deadlineLabel = DEADLINE_OPTIONS.find((d) => d.value === r.deadline)?.label;

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">{r.requester_name ?? "Cliente"}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{r.category}</span>
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
              {deadlineLabel && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{deadlineLabel}</span>
              )}
            </div>
          </div>
          <Badge variant={r.budget_type === "fixo" ? "default" : "secondary"} className="text-[10px] shrink-0">
            {r.budget_type === "fixo" && r.budget_amount
              ? formatCFA(r.budget_amount)
              : BUDGET_OPTIONS.find((b) => b.value === r.budget_type)?.label ?? r.budget_type}
          </Badge>
        </div>

        <p className="text-sm text-foreground/90 mb-3 whitespace-pre-wrap">{r.description}</p>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
          <span>Publicado {new Date(r.created_at).toLocaleDateString("pt")}</span>
        </div>

        {providerProfile ? (
          myBid ? (
            <div className={`flex items-center gap-2 text-sm font-medium py-2 px-3 rounded-lg ${
              myBid.status === "aceite"
                ? "bg-green-500/10 text-green-600"
                : myBid.status === "recusado"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-muted text-muted-foreground"
            }`}>
              {myBid.status === "aceite" ? <CheckCircle2 className="h-4 w-4" /> : myBid.status === "recusado" ? <XCircle className="h-4 w-4" /> : null}
              {myBid.status === "pendente" ? "Candidatura enviada — aguarde resposta" : myBid.status === "aceite" ? "Candidatura aceite!" : "Candidatura recusada"}
              {myBid.status === "aceite" && r.requester_phone && (
                <a
                  href={`https://wa.me/${r.requester_phone.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(`Ola ${r.requester_name ?? "Cliente"}, sou ${providerProfile.name ?? "um prestador"}, o seu pedido "${r.category}" foi aceite no BissauService!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="ml-2 bg-[#25D366] hover:bg-[#1ebe57] text-white gap-1 h-7 text-[11px]">
                    <MessageCircle className="h-3 w-3" /> WhatsApp
                  </Button>
                </a>
              )}
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={onBid}
                disabled={bidOnRequest.isPending}
                className="flex-1"
                variant="outline"
              >
                Tenho interesse
              </Button>
              {r.requester_phone && (
                <a
                  href={`https://wa.me/${r.requester_phone.replace(/[^\d+]/g, "")}?text=${encodeURIComponent(`Ola ${r.requester_name ?? "Cliente"}, sou um prestador de ${r.category}, vi o seu pedido no BissauService e tenho interesse!`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="bg-[#25D366] hover:bg-[#1ebe57] text-white gap-1">
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </Button>
                </a>
              )}
            </div>
          )
        ) : (
          <Link to="/login" className="block">
            <Button variant="outline" className="w-full" size="sm">Faça login para se candidatar</Button>
          </Link>
        )}

        <button onClick={onToggle} className="flex items-center gap-1 text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Recolher" : "Mais detalhes"}
        </button>
        {expanded && (
          <div className="mt-2 text-xs text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Categoria:</span> {r.category}</p>
            <p><span className="font-medium text-foreground">Localização:</span> {r.location}</p>
            {deadlineLabel && <p><span className="font-medium text-foreground">Prazo:</span> {deadlineLabel}</p>}
            <p><span className="font-medium text-foreground">Orçamento:</span>{" "}
              {r.budget_type === "fixo" && r.budget_amount ? formatCFA(r.budget_amount) : BUDGET_OPTIONS.find((b) => b.value === r.budget_type)?.label}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Card de pedido meu (cliente vê quem se candidatou) ─── */
function MyRequestCard({
  request: r,
  expanded,
  onToggle,
  onBidStatus,
  onMarkCompleted,
  onReview,
}: {
  request: ServiceRequest;
  expanded: boolean;
  onToggle: () => void;
  onBidStatus: (bidId: string, status: "aceite" | "recusado") => void;
  onMarkCompleted: (requestId: string) => void;
  onReview: (requestId: string, providerId: string, providerName: string) => void;
}) {
  const { data: bids = [], isLoading: loadingBids } = useBidsForRequest(r.id);
  const deadlineLabel = DEADLINE_OPTIONS.find((d) => d.value === r.deadline)?.label;
  const acceptedBid = bids.find((b) => b.status === "aceite");
  const isConcluded = r.status === "concluido";
  const isClosed = r.status === "closed";

  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <h3 className="font-semibold text-sm">{r.category}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.location}</span>
              {deadlineLabel && (
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{deadlineLabel}</span>
              )}
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {isConcluded && (
              <Badge variant="default" className="text-[10px] bg-green-600">Concluído</Badge>
            )}
            {isClosed && !isConcluded && (
              <Badge variant="destructive" className="text-[10px]">Fechado</Badge>
            )}
            <Badge variant="secondary" className="text-[10px]">
              {bids.length} {bids.length === 1 ? "candidatura" : "candidaturas"}
            </Badge>
          </div>
        </div>

        <p className="text-sm text-foreground/90 mb-2 whitespace-pre-wrap">{r.description}</p>

        <button onClick={onToggle} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Recolher" : `Ver candidaturas (${bids.length})`}
        </button>

        {expanded && (
          <div className="mt-3 border-t border-border pt-3">
            {loadingBids ? (
              <p className="text-xs text-muted-foreground">A carregar candidaturas...</p>
            ) : bids.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhuma candidatura ainda.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {bids.map((bid) => {
                  const phone = (bid.provider?.phone ?? "").replace(/[^\d+]/g, "");
                  const waMsg = `Ola ${bid.provider?.name ?? ""}, o seu pedido "${r.category}" foi aceite no BissauService!`;
                  const wa = phone
                    ? `https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`
                    : null;
                  return (
                    <div key={bid.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Avatar className="h-9 w-9 rounded-lg shrink-0">
                        {bid.provider?.photo_url ? (
                          <AvatarImage src={bid.provider.photo_url} alt={bid.provider.name} className="object-cover" />
                        ) : null}
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                          {bid.provider?.name?.charAt(0) ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{bid.provider?.name ?? "Prestador"}</p>
                        <p className="text-[11px] text-muted-foreground">{bid.provider?.category}</p>
                        {bid.message && <p className="text-xs text-muted-foreground mt-0.5 italic">"{bid.message}"</p>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {bid.status === "pendente" && !isConcluded ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => onBidStatus(bid.id, "aceite")}
                              className="h-7 text-[11px] bg-green-600 hover:bg-green-700 text-white gap-1"
                            >
                              <CheckCircle2 className="h-3 w-3" /> Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onBidStatus(bid.id, "recusado")}
                              className="h-7 text-[11px] gap-1"
                            >
                              <XCircle className="h-3 w-3" /> Recusar
                            </Button>
                          </>
                        ) : (
                          <Badge variant={bid.status === "aceite" ? "default" : "secondary"} className="text-[10px]">
                            {bid.status === "aceite" ? "Aceite" : "Recusado"}
                          </Badge>
                        )}
                      </div>
                      {bid.status === "aceite" && wa && (
                        <a href={wa} target="_blank" rel="noopener noreferrer" className="block mt-1">
                          <Button size="sm" className="w-full bg-[#25D366] hover:bg-[#1ebe57] text-white gap-1 h-7 text-[11px]">
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botões de ação pós-aceite */}
            {acceptedBid && !isConcluded && (
              <Button
                onClick={() => onMarkCompleted(r.id)}
                className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white gap-2"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4" /> Marcar como concluído
              </Button>
            )}

            {isConcluded && acceptedBid && (
              <Button
                onClick={() => onReview(r.id, acceptedBid.provider_id, acceptedBid.provider?.name ?? "Prestador")}
                className="w-full mt-3 gap-2"
                size="sm"
                variant="outline"
              >
                <Star className="h-4 w-4" /> Avaliar prestador
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default Requests;
