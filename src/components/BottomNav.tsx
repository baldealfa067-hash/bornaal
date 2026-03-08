import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useUnreadCount } from "@/hooks/useMessages";

const items = [
  { to: "/inicio", icon: Home, label: "Início" },
  { to: "/explorar", icon: Search, label: "Explorar" },
  { to: "/publicar", icon: PlusCircle, label: "Publicar" },
  { to: "/mensagens", icon: MessageCircle, label: "Mensagens" },
  { to: "/perfil", icon: User, label: "Perfil" },
];

export const BottomNav = () => {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md safe-area-bottom">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className="relative flex flex-col items-center gap-0.5 px-2 py-2 text-muted-foreground transition-colors"
            activeClassName="text-primary"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-medium">{label}</span>
            {to === "/mensagens" && unreadCount > 0 && (
              <span className="absolute -top-0.5 right-0.5 h-4 min-w-[16px] rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
