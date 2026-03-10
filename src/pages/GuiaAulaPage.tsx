import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check, Printer } from 'lucide-react';
import { toast } from 'sonner';

export default function GuiaAulaPage() {
  const [mdContent, setMdContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/GUIA_AULA_GIRA.md')
      .then(res => res.text())
      .then(text => {
        setMdContent(text);
        setLoading(false);
      })
      .catch(() => {
        setMdContent('Erro ao carregar o guia.');
        setLoading(false);
      });
  }, []);

  const handleDownloadMd = () => {
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Guia_Aula_GIRA_Relatorios.md';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Download iniciado!');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(mdContent);
    setCopied(true);
    toast.success('Conteúdo copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between print:hidden">
        <h1 className="text-xl font-bold text-foreground">📘 Guia de Aula — GIRA Relatórios</h1>
        <div className="flex gap-2">
          <Button onClick={handleCopy} size="sm" variant="outline">
            {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
            {copied ? 'Copiado!' : 'Copiar MD'}
          </Button>
          <Button onClick={handleDownloadMd} size="sm">
            <Download className="w-4 h-4 mr-2" />
            Baixar .MD
          </Button>
          <Button onClick={() => window.print()} variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-foreground bg-muted/30 p-8 rounded-lg border border-border select-all">
            {mdContent}
          </pre>
        )}
      </div>
    </div>
  );
}
