import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const About = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-bold mb-6">Sobre o BissauService</h1>

      <section className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold">A nossa missão</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          O <strong className="text-foreground">BissauService</strong> nasceu com uma missão simples: conectar pessoas que precisam de serviços com prestadores de confiança na Guiné-Bissau. Acreditamos que todos merecem acesso fácil a profissionais qualificados, sem intermediários e sem complicações.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold">A nossa visão</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Queremos ser a principal plataforma de serviços da Guiné-Bissau, promovendo a economia local e criando oportunidades para prestadores de serviços em todo o país. Valorizamos a transparência, a confiança e a comunidade.
        </p>
      </section>

      <section className="space-y-4 mb-10">
        <h2 className="text-lg font-semibold">Como funciona</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Pesquise por categoria ou localização para encontrar prestadores.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>Contacte directamente via WhatsApp ou mensagem interna.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>Avalie o serviço e ajude a comunidade a crescer.</span>
          </li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Contacto</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <Mail className="h-4 w-4 text-primary" />
            <span>contacto@bissauservice.gw</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <Phone className="h-4 w-4 text-primary" />
            <span>+245 955 000 000</span>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            <span>Bissau, Guiné-Bissau</span>
          </div>
        </div>
      </section>
    </div>
  </div>
);

export default About;
