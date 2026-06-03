import { Home, Search, Info } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const items = [
  { to: "/inicio", icon: Home, label: "Início" },
  { to: "/explorar", icon: Search, label: "Explorar" },
  { to: "/sobre", icon: Info, label: "Sobre" },
];

export const BottomNav = () => {
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
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
