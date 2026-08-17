import { Outlet } from "react-router-dom";
import { Link } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { NotificationBell } from "./NotificationBell";

export const Layout = () => (
  <div className="min-h-screen bg-background pb-20">
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-md">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/inicio" className="font-bold text-lg tracking-tight">
          Bissau<span className="text-primary">Service</span>
        </Link>
        <NotificationBell />
      </div>
    </header>
    <Outlet />
    <BottomNav />
  </div>
);
