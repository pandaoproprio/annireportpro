import React, { useState, useRef } from 'react';
import { useStore } from '@/store/AppContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Upload, Trash2, AlertTriangle, Database } from 'lucide-react';

export const Settings: React.FC = () => {
  const { resetApp } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<string>('');

  const handleDownload = () => {
    const dataStr = localStorage.getItem('social_impact_app_v1');
    if (!dataStr) {
      alert('Não há dados para exportar.');
      return;
    }
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `social_impact_backup_${new Date().toISOString().slice(0,10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files.length > 0) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          
          if (!json.projects && !json.project) {
            throw new Error('Formato inválido: Propriedade de projeto não encontrada.');
          }

          if (window.confirm('ATENÇÃO: Isso irá substituir TODOS os dados atuais pelos dados do arquivo. Deseja continuar?')) {
            localStorage.setItem('social_impact_app_v1', JSON.stringify(json));
            setImportStatus('Dados importados com sucesso! Recarregando...');
            setTimeout(() => window.location.reload(), 1500);
          }
        } catch (err) {
          console.error(err);
          alert('Erro ao importar arquivo. Verifique se é um backup válido.');
        }
      };
    }
  };

  const handleReset = () => {
    if (window.confirm('TEM CERTEZA? Isso apagará todos os projetos e atividades deste navegador. Esta ação é irreversível.')) {
      if (window.confirm('Confirmação final: Todos os dados serão perdidos. Continuar?')) {
        resetApp();
        window.location.reload();
      }
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
        <p className="text-muted-foreground">Gerencie seus dados e preferências.</p>
      </div>

      <Card className="border-l-4 border-l-info">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-info/10 p-3 rounded-full">
              <Database className="w-6 h-6 text-info" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Backup e Restauração</h3>
              <p className="text-sm text-muted-foreground mb-4 mt-1">
                Como este aplicativo salva os dados apenas no seu navegador, é altamente recomendado fazer backups regulares baixando o arquivo JSON. 
                Use este arquivo para restaurar seus dados em outro computador ou navegador.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-2" /> Exportar Dados (Backup)
                </Button>
                <Button variant="outline" onClick={handleImportClick} className="flex-1">
                  <Upload className="w-4 h-4 mr-2" /> Importar Dados
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                  accept=".json"
                />
              </div>
              {importStatus && <p className="text-success font-bold mt-2 text-sm">{importStatus}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-destructive">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-destructive/10 p-3 rounded-full">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Zona de Perigo</h3>
              <p className="text-sm text-muted-foreground mb-4 mt-1">
                Ações destrutivas que não podem ser desfeitas. Cuidado.
              </p>
              
              <Button variant="destructive" onClick={handleReset}>
                <Trash2 className="w-4 h-4 mr-2" /> Apagar Todos os Dados (Reset)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground mt-8">
        <p>Os dados são armazenados localmente usando LocalStorage API.</p>
        <p>Limite de armazenamento depende do navegador (aprox. 5-10MB).</p>
      </div>
    </div>
  );
};
