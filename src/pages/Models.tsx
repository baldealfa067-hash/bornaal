import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

const Models = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4">
    <Link to="/" className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="h-4 w-4" /> Início
    </Link>
    <div className="flex flex-col items-center gap-8">
      <img src={logo} alt="BissauService" className="w-64 md:w-80 lg:w-96 h-auto drop-shadow-2xl" />
      <div className="text-center">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">BissauService</h1>
        <p className="text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
          Conectando clientes a prestadores de serviços de confiança na Guiné-Bissau.
        </p>
      </div>
    </div>
  </div>
);

export default Models;
