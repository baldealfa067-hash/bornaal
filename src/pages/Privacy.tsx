import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-bold mb-6">Política de Privacidade</h1>
      <p className="text-xs text-muted-foreground mb-6">Última actualização: Março 2026</p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Informações que Recolhemos</h2>
          <p>Recolhemos as informações que nos fornece directamente: nome, email, telefone, localização e descrição dos serviços (para prestadores). Também recolhemos dados de utilização como avaliações e mensagens enviadas através da plataforma.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Como Utilizamos as Informações</h2>
          <p>Utilizamos as suas informações para: criar e gerir a sua conta, facilitar a ligação entre clientes e prestadores, mostrar perfis de prestadores publicamente, enviar notificações sobre a sua conta e melhorar os nossos serviços.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Partilha de Informações</h2>
          <p>Os perfis dos prestadores são visíveis publicamente, incluindo nome, categoria, localização, telefone e avaliações. Não vendemos nem partilhamos os seus dados pessoais com terceiros para fins comerciais.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Segurança dos Dados</h2>
          <p>Implementamos medidas de segurança para proteger as suas informações contra acesso não autorizado. Os dados são armazenados em servidores seguros com encriptação.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Os Seus Direitos</h2>
          <p>Tem o direito de aceder, corrigir ou eliminar os seus dados pessoais. Pode solicitar a eliminação da sua conta a qualquer momento contactando-nos directamente.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Cookies e Armazenamento Local</h2>
          <p>Utilizamos armazenamento local do navegador para manter a sua sessão activa. Não utilizamos cookies de rastreamento de terceiros.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Contacto</h2>
          <p>Para questões sobre privacidade, contacte-nos em contacto@notarbadja.gw.</p>
        </section>
      </div>
    </div>
  </div>
);

export default Privacy;
