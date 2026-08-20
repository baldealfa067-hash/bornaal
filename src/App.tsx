import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Explore = lazy(() => import("./pages/Explore"));
const ProviderDetail = lazy(() => import("./pages/ProviderDetail"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const BusinessDashboard = lazy(() => import("./pages/BusinessDashboard"));
const Requests = lazy(() => import("./pages/Requests"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Models = lazy(() => import("./pages/Models"));
const Profile = lazy(() => import("./pages/Profile"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const LANDING_VISITED_KEY = "ja_visitou_landing";

const HomeRoute = () => {
  const [hasVisited, setHasVisited] = useState(() => {
    try {
      return localStorage.getItem(LANDING_VISITED_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!hasVisited) {
      try {
        localStorage.setItem(LANDING_VISITED_KEY, "1");
      } catch {
        // localStorage indisponível (modo privado) — mostra sempre a landing
      }
    }
  }, [hasVisited]);

  if (hasVisited) return <Navigate to="/explorar" replace />;
  return <Landing />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ErrorBoundary>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/landing" element={<Landing />} />
              <Route path="/sobre" element={<About />} />
              <Route path="/termos" element={<Terms />} />
              <Route path="/privacidade" element={<Privacy />} />
              <Route path="/login" element={<Login />} />
              <Route path="/esqueci-senha" element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin-moderacao" element={<AdminDashboard />} />
              <Route path="/models" element={<Models />} />
              <Route path="/painel" element={<ProviderDashboard />} />
              <Route path="/painel-loja" element={<BusinessDashboard />} />
              <Route element={<Layout />}>
                <Route path="/inicio" element={<Index />} />
                <Route path="/explorar" element={<Explore />} />
                <Route path="/pedidos" element={<Requests />} />
                <Route path="/perfil" element={<Profile />} />
                <Route path="/prestador/:id" element={<ProviderDetail />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
