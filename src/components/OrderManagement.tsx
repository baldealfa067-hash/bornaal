import { useState, useEffect } from "react";
import {
  Package,
  Clock,
  CheckCircle2,
  ChefHat,
  UtensilsCrossed,
  Loader2,
  Eye,
  MessageSquare,
  Timer,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBusinessOrders, useUpdateOrderStatus, type Order } from "@/hooks/useOrders";
import { useTranslation } from "react-i18next";
import { formatCFA } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

const STATUS_TABS = [
  { value: "novo", label: "orderStatus.new", icon: Package, color: "text-blue-600" },
  { value: "confirmado", label: "orderStatus.confirmed", icon: CheckCircle2, color: "text-green-600" },
  { value: "em_preparacao", label: "orderStatus.preparing", icon: ChefHat, color: "text-yellow-600" },
  { value: "pronto", label: "orderStatus.ready", icon: UtensilsCrossed, color: "text-green-600" },
  { value: "entregue", label: "orderStatus.delivered", icon: CheckCircle2, color: "text-green-600" },
  { value: "cancelado", label: "orderStatus.cancelled", icon: XCircle, color: "text-red-600" },
];

const NEXT_STATUS: Record<string, string[]> = {
  novo: ["confirmado", "cancelado"],
  confirmado: ["em_preparacao", "cancelado"],
  em_preparacao: ["pronto"],
  pronto: ["aguardando_motorista"],
  aguardando_motorista: [],
  motorista_encontrado: ["pedido_recolhido"],
  pedido_recolhido: ["a_caminho"],
  a_caminho: ["entregue"],
  entregue: ["concluido"],
};

interface OrderManagementProps {
  businessId: string;
}

const OrderManagement = ({ businessId }: OrderManagementProps) => {
  const { t } = useTranslation();
  const { data: allOrders = [], isLoading, refetch } = useBusinessOrders(businessId);
  const updateStatus = useUpdateOrderStatus();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [prepTimeDialogOpen, setPrepTimeDialogOpen] = useState(false);
  const [prepTimeInput, setPrepTimeInput] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");

  useEffect(() => {
    const interval = setInterval(() => refetch(), 10000);
    return () => clearInterval(interval);
  }, [refetch]);

  const getOrdersByStatus = (status: string) =>
    allOrders.filter((o) => o.status === status);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (newStatus === "em_preparacao") {
      setSelectedOrder(allOrders.find((o) => o.id === orderId) ?? null);
      setPendingStatus(newStatus);
      setPrepTimeInput("");
      setPrepTimeDialogOpen(true);
      return;
    }
    try {
      await updateStatus.mutateAsync({ orderId, newStatus });
    } catch (err) {
      console.error("[order] status update error:", err);
    }
  };

  const confirmPrepTime = async () => {
    if (!selectedOrder) return;
    const time = parseInt(prepTimeInput) || 30;
    try {
      await updateStatus.mutateAsync({
        orderId: selectedOrder.id,
        newStatus: pendingStatus,
        preparationTime: time,
      });
      setPrepTimeDialogOpen(false);
      setSelectedOrder(null);
    } catch (err) {
      console.error("[order] status update error:", err);
    }
  };

  return (
    <div>
      <Tabs defaultValue="novo">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50">
          {STATUS_TABS.map((tab) => {
            const count = getOrdersByStatus(tab.value).length;
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-1.5 text-xs data-[state=active]:bg-background"
              >
                <Icon className={`h-3.5 w-3.5 ${tab.color}`} />
                {t(tab.label)}
                {count > 0 && (
                  <Badge className="ml-1 h-4 min-w-[16px] text-[9px] px-1">{count}</Badge>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {STATUS_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : getOrdersByStatus(tab.value).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("orderManagement.noOrders")}
              </div>
            ) : (
              <div className="flex flex-col gap-3 mt-3">
                {getOrdersByStatus(tab.value).map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onView={() => {
                      setSelectedOrder(order);
                      setDetailOpen(true);
                    }}
                    onStatusChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                    nextStatuses={NEXT_STATUS[order.status] ?? []}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  #{selectedOrder.order_number}
                  <Badge variant="secondary">{t(`orderStatus.${selectedOrder.status}`, selectedOrder.status)}</Badge>
                </DialogTitle>
                <DialogDescription>
                  {new Date(selectedOrder.created_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("orderManagement.customer")}</p>
                  <p className="text-sm font-medium">{selectedOrder.customer_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customer_phone}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("orderTracking.orderDetails")}</p>
                  <div className="space-y-1 mt-1">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.name} x{item.qty}</span>
                        <span className="font-medium">{formatCFA(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm font-bold border-t pt-1 mt-1">
                      <span>{t("orderTracking.total")}</span>
                      <span>{formatCFA(selectedOrder.total)}</span>
                    </div>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground">{t("orderTracking.notes")}</p>
                    <p className="text-sm mt-0.5">{selectedOrder.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs font-medium text-muted-foreground">{t("orderTracking.deliveryAddress")}</p>
                  <p className="text-sm">{selectedOrder.address ?? t("orderManagement.notDelivery")}</p>
                </div>

                {selectedOrder.preparation_time && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{t("orderManagement.prepTime")}</p>
                    <p className="text-sm">{selectedOrder.preparation_time} min</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-row gap-2 flex-wrap">
                {NEXT_STATUS[selectedOrder.status]?.map((newStatus) => (
                  <Button
                    key={newStatus}
                    size="sm"
                    variant={newStatus === "cancelado" ? "destructive" : "default"}
                    onClick={() => {
                      setDetailOpen(false);
                      handleStatusChange(selectedOrder.id, newStatus);
                    }}
                    disabled={updateStatus.isPending}
                  >
                    {t(`orderStatus.${newStatus}`, newStatus)}
                  </Button>
                ))}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Prep Time Dialog */}
      <Dialog open={prepTimeDialogOpen} onOpenChange={setPrepTimeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("orderManagement.prepTimeTitle")}</DialogTitle>
            <DialogDescription>{t("orderManagement.prepTimeDesc")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="prep-time">{t("orderManagement.prepTimeMinutes")}</Label>
              <Input
                id="prep-time"
                type="number"
                min="5"
                max="180"
                placeholder="30"
                value={prepTimeInput}
                onChange={(e) => setPrepTimeInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrepTimeDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={confirmPrepTime} disabled={updateStatus.isPending} className="gap-2">
              <Timer className="h-4 w-4" />
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const OrderCard = ({
  order,
  onView,
  onStatusChange,
  nextStatuses,
}: {
  order: Order;
  onView: () => void;
  onStatusChange: (status: string) => void;
  nextStatuses: string[];
}) => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-bold">#{order.order_number}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm font-medium">{order.customer_name}</p>
            <p className="text-xs text-muted-foreground truncate">
              {order.items.map((i) => `${i.name} x${i.qty}`).join(", ")}
            </p>
            <p className="text-sm font-bold text-primary mt-1">{formatCFA(order.total)}</p>
          </div>
          <div className="flex flex-col gap-1.5 shrink-0">
            <Button size="sm" variant="outline" onClick={onView} className="gap-1">
              <Eye className="h-3.5 w-3.5" />
              {t("common.view")}
            </Button>
            {nextStatuses.length > 0 && nextStatuses[0] !== "cancelado" && (
              <Button
                size="sm"
                onClick={() => onStatusChange(nextStatuses[0])}
                disabled={false}
                className="gap-1"
              >
                {t(`orderStatus.${nextStatuses[0]}`, nextStatuses[0])}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderManagement;
