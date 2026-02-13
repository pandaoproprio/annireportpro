import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoGira from '@/assets/logo-gira-relatorios.png';

export const PrivacyPolicy = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <img src={logoGira} alt="GIRA Relatórios" className="h-8 w-8 object-contain" />
          <h1 className="text-lg font-bold text-foreground">Política de Privacidade</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-card rounded-2xl border border-border p-8 lg:p-12 space-y-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Última atualização: Janeiro de {currentYear}</p>
            <h2 className="text-2xl font-bold text-foreground">Política de Privacidade — GIRA Relatórios</h2>
            <p className="text-muted-foreground">
              Esta política descreve como coletamos, usamos e protegemos seus dados pessoais em conformidade com a
              Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">1. Controlador dos Dados</h3>
            <p className="text-muted-foreground leading-relaxed">
              O controlador dos dados pessoais é a <strong className="text-foreground">AnnITech IT Solutions</strong>,
              responsável pelo desenvolvimento e operação do sistema GIRA Relatórios. Para contato relacionado à
              proteção de dados, utilize o e-mail disponível na plataforma.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">2. Dados Coletados</h3>
            <p className="text-muted-foreground leading-relaxed">Coletamos os seguintes dados pessoais:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong className="text-foreground">Dados de identificação:</strong> nome, e-mail, função/cargo</li>
              <li><strong className="text-foreground">Dados de acesso:</strong> credenciais de login, logs de sessão</li>
              <li><strong className="text-foreground">Dados de projeto:</strong> informações de projetos sociais, atividades, relatórios e fotos</li>
              <li><strong className="text-foreground">Dados de navegação:</strong> endereço IP, tipo de navegador, horários de acesso</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">3. Finalidade do Tratamento</h3>
            <p className="text-muted-foreground leading-relaxed">Os dados são tratados para:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Autenticação e controle de acesso ao sistema</li>
              <li>Gestão de projetos sociais e geração de relatórios</li>
              <li>Registro de atividades e prestação de contas</li>
              <li>Comunicação entre membros da equipe</li>
              <li>Melhoria contínua da plataforma</li>
              <li>Cumprimento de obrigações legais e regulatórias</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">4. Base Legal</h3>
            <p className="text-muted-foreground leading-relaxed">
              O tratamento dos dados pessoais é realizado com base nas seguintes hipóteses legais previstas na LGPD:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong className="text-foreground">Execução de contrato</strong> (Art. 7º, V): para prestação dos serviços contratados</li>
              <li><strong className="text-foreground">Legítimo interesse</strong> (Art. 7º, IX): para melhoria do sistema e segurança</li>
              <li><strong className="text-foreground">Cumprimento de obrigação legal</strong> (Art. 7º, II): quando exigido por lei</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">5. Compartilhamento de Dados</h3>
            <p className="text-muted-foreground leading-relaxed">
              Seus dados não são vendidos ou compartilhados com terceiros para fins comerciais. O compartilhamento
              ocorre apenas quando necessário para a operação do sistema (provedores de infraestrutura e hospedagem)
              ou quando exigido por lei.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">6. Armazenamento e Segurança</h3>
            <p className="text-muted-foreground leading-relaxed">
              Os dados são armazenados em servidores seguros com criptografia em trânsito e em repouso.
              Implementamos medidas técnicas e organizacionais para proteger seus dados contra acesso não
              autorizado, perda ou destruição, incluindo:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Criptografia TLS/SSL em todas as comunicações</li>
              <li>Controle de acesso baseado em papéis (RBAC)</li>
              <li>Políticas de segurança em nível de linha (RLS)</li>
              <li>Logs de auditoria para rastreabilidade</li>
              <li>Exclusão lógica (soft delete) para proteção contra perda acidental</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">7. Direitos do Titular</h3>
            <p className="text-muted-foreground leading-relaxed">
              Conforme a LGPD, você tem direito a:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Confirmar a existência de tratamento de dados</li>
              <li>Acessar seus dados pessoais</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários</li>
              <li>Solicitar a portabilidade dos dados</li>
              <li>Revogar o consentimento, quando aplicável</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Para exercer seus direitos, entre em contato com o administrador do sistema ou com o
              encarregado de proteção de dados.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">8. Retenção de Dados</h3>
            <p className="text-muted-foreground leading-relaxed">
              Os dados pessoais são mantidos pelo período necessário para o cumprimento das finalidades descritas
              nesta política. Dados de projetos encerrados são mantidos pelo prazo legal aplicável para prestação
              de contas a órgãos financiadores.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">9. Alterações nesta Política</h3>
            <p className="text-muted-foreground leading-relaxed">
              Esta política pode ser atualizada periodicamente. Alterações significativas serão comunicadas
              aos usuários através da plataforma.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <p><strong className="text-foreground">GIRA Relatórios</strong> © {currentYear} — AnnITech IT Solutions</p>
      </footer>
    </div>
  );
};
