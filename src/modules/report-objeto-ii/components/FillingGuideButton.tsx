import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { HelpCircle, Camera, FileText, Info } from 'lucide-react';
import { FILLING_GUIDE } from '../knowledgeBase';

export const FillingGuideButton: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-6 right-6 z-50 shadow-lg gap-2 bg-background border-primary/30 hover:bg-primary/5"
        >
          <HelpCircle className="w-4 h-4" />
          Como preencher
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-primary" />
            Guia de Preenchimento
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Fotos */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-base">
              <Camera className="w-4 h-4 text-primary" /> Fotos
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Sempre no formato <strong className="text-foreground">horizontal (paisagem)</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Tamanho máximo de <strong className="text-foreground">1 MB</strong> por imagem</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Resolução mínima: <strong className="text-foreground">1280×720px</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Cada foto deve ter uma <strong className="text-foreground">legenda descritiva</strong></span>
              </div>
            </div>
          </div>

          {/* Texto */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-base">
              <FileText className="w-4 h-4 text-primary" /> Texto
            </h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Linguagem <strong className="text-foreground">formal e objetiva</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Descreva ações com <strong className="text-foreground">datas, locais e resultados</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Campos obrigatórios sinalizados com <strong className="text-foreground">asterisco (*)</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-primary font-bold">•</span>
                <span>Campos com <span className="inline-flex items-center gap-0.5 text-amber-600"><strong>💡</strong></span> possuem sugestão de IA</span>
              </div>
            </div>
          </div>

          {/* Estrutura */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2 text-base">
              <Info className="w-4 h-4 text-primary" /> Estrutura do Relatório
            </h3>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              {[
                'OBJETO — Descrição do objeto do termo de fomento',
                'RESUMO — Síntese das ações realizadas no período',
                'DEMONSTRAÇÃO DO ALCANCE DAS METAS — Detalhamento meta a meta',
                'OUTRAS AÇÕES DESENVOLVIDAS — Atividades complementares',
                'PUBLICAÇÕES E DIVULGAÇÃO — Ações de comunicação',
                'GRAU DE SATISFAÇÃO — Pesquisa de satisfação',
                'AÇÕES FUTURAS — Planejamento do próximo período',
                'COMPROVAÇÃO DE DESPESAS — Documentação financeira',
                'DOCUMENTOS DE COMPROVAÇÃO — Links e anexos',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold text-xs mt-0.5">{i + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Dicas */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-semibold text-sm">💡 Dicas</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Revise cada seção antes de exportar</li>
              <li>• As fotos devem ilustrar as ações descritas no texto</li>
              <li>• Mantenha coerência entre as metas do Plano de Trabalho e o relatório</li>
              <li>• Use o botão "Sugerir com IA" para obter textos de referência</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
