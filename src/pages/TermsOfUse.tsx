import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logoGira from '@/assets/logo-gira-relatorios.png';

export const TermsOfUse = () => {
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
          <h1 className="text-lg font-bold text-foreground">Termos de Uso</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="bg-card rounded-2xl border border-border p-8 lg:p-12 space-y-8">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Última atualização: Janeiro de {currentYear}</p>
            <h2 className="text-2xl font-bold text-foreground">Termos de Uso — GIRA Relatórios</h2>
            <p className="text-muted-foreground">
              Ao utilizar o sistema GIRA Relatórios, você concorda com os seguintes termos e condições.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">1. Aceitação dos Termos</h3>
            <p className="text-muted-foreground leading-relaxed">
              O acesso e uso do GIRA Relatórios estão condicionados à aceitação destes Termos de Uso.
              Ao acessar o sistema, o usuário declara ter lido, compreendido e concordado com todas as
              disposições aqui estabelecidas.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">2. Descrição do Serviço</h3>
            <p className="text-muted-foreground leading-relaxed">
              O GIRA Relatórios é um módulo do GIRA ERP destinado ao gerenciamento de projetos sociais,
              registro de atividades, geração de relatórios e gestão de equipes. O sistema é oferecido
              como serviço (SaaS) pela AnnITech IT Solutions.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">3. Cadastro e Acesso</h3>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>O cadastro é realizado exclusivamente por administradores do sistema</li>
              <li>Cada usuário recebe credenciais individuais e intransferíveis</li>
              <li>O usuário é responsável pela confidencialidade de suas credenciais</li>
              <li>O compartilhamento de contas é expressamente proibido</li>
              <li>Em caso de suspeita de uso indevido, o usuário deve notificar o administrador imediatamente</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">4. Responsabilidades do Usuário</h3>
            <p className="text-muted-foreground leading-relaxed">O usuário compromete-se a:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Utilizar o sistema de forma ética e em conformidade com a legislação vigente</li>
              <li>Não inserir conteúdo ilícito, ofensivo ou que viole direitos de terceiros</li>
              <li>Manter seus dados cadastrais atualizados</li>
              <li>Não tentar acessar áreas ou funcionalidades não autorizadas</li>
              <li>Não realizar engenharia reversa, descompilar ou modificar o sistema</li>
              <li>Zelar pela veracidade das informações inseridas nos relatórios e atividades</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">5. Propriedade Intelectual</h3>
            <p className="text-muted-foreground leading-relaxed">
              Todo o conteúdo do sistema, incluindo código-fonte, design, marca, logotipos e documentação,
              é propriedade da AnnITech IT Solutions e está protegido por leis de propriedade intelectual.
              O conteúdo inserido pelos usuários (dados de projetos, relatórios, fotos) permanece de
              propriedade dos respectivos titulares.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">6. Disponibilidade do Serviço</h3>
            <p className="text-muted-foreground leading-relaxed">
              A AnnITech empenha-se em manter o sistema disponível 24/7, porém não garante disponibilidade
              ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível.
              A AnnITech não se responsabiliza por indisponibilidades causadas por fatores externos.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">7. Limitação de Responsabilidade</h3>
            <p className="text-muted-foreground leading-relaxed">
              A AnnITech não se responsabiliza por danos indiretos, incidentais ou consequentes resultantes
              do uso ou impossibilidade de uso do sistema. A responsabilidade total da AnnITech está
              limitada ao valor pago pelo serviço no período relevante.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">8. Suspensão e Encerramento</h3>
            <p className="text-muted-foreground leading-relaxed">
              A AnnITech reserva-se o direito de suspender ou encerrar o acesso de qualquer usuário que
              viole estes Termos de Uso, sem aviso prévio, garantindo o acesso aos dados conforme
              previsto na legislação.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">9. Alterações nos Termos</h3>
            <p className="text-muted-foreground leading-relaxed">
              Estes termos podem ser atualizados a qualquer momento. Alterações significativas serão
              comunicadas aos usuários. O uso continuado do sistema após a publicação de alterações
              constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">10. Legislação Aplicável</h3>
            <p className="text-muted-foreground leading-relaxed">
              Estes Termos de Uso são regidos pelas leis da República Federativa do Brasil. Qualquer
              disputa será submetida ao foro da comarca da sede da AnnITech IT Solutions.
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
