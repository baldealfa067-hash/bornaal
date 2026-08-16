import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <div className="max-w-lg mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <h1 className="text-2xl font-bold mb-6">Termos de Uso</h1>
      <p className="text-xs text-muted-foreground mb-6">Última actualização: Março 2026</p>

      <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">1. Aceitação dos Termos</h2>
          <p>Ao utilizar a plataforma BissauService, o utilizador aceita estes termos de uso na sua totalidade. Se não concordar com algum dos termos, deve cessar a utilização da plataforma.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">2. Descrição do Serviço</h2>
          <p>O BissauService é uma plataforma que conecta clientes com prestadores de serviços na Guiné-Bissau. Não somos parte em nenhuma transacção entre clientes e prestadores, servindo apenas como intermediário digital.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">3. Registo e Conta</h2>
          <p>Os utilizadores devem fornecer informações verdadeiras e actualizadas ao criar uma conta. Cada pessoa pode ter apenas uma conta. O utilizador é responsável pela segurança da sua conta e palavra-passe.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">4. Utilização Aceitável</h2>
          <p>Os utilizadores comprometem-se a não publicar conteúdo falso, ofensivo ou ilegal. As avaliações devem ser honestas e baseadas em experiências reais. É proibido o uso da plataforma para spam ou actividades fraudulentas.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">5. Responsabilidade</h2>
          <p>O BissauService não se responsabiliza pela qualidade dos serviços prestados, por disputas entre utilizadores, ou por qualquer dano resultante da utilização da plataforma. Os prestadores são profissionais independentes.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">6. Propriedade Intelectual</h2>
          <p>Todo o conteúdo da plataforma, incluindo design, logótipos e textos, é propriedade do BissauService. Os utilizadores mantêm os direitos sobre o conteúdo que publicam.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">7. Alterações aos Termos</h2>
          <p>Reservamo-nos o direito de alterar estes termos a qualquer momento. As alterações entram em vigor após a publicação na plataforma. A continuação do uso constitui aceitação dos novos termos.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">8. Contacto</h2>
          <p>Para questões sobre estes termos, contacte-nos em contacto@bissauservice.gw.</p>
        </section>
      </div>
    </div>
  </div>
);

export default Terms;
