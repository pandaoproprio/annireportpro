import React, { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Database, LogOut } from 'lucide-react';

export const Settings: React.FC = () => {
  const { signOut } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Tem certeza que deseja sair da sua conta?')) {
      await signOut();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Configurações do Sistema</h2>
        <p className="text-muted-foreground">Gerencie sua conta e preferências.</p>
      </div>

      <Card className="border-l-4 border-l-info">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-info/10 p-3 rounded-full">
              <Database className="w-6 h-6 text-info" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Armazenamento de Dados</h3>
              <p className="text-sm text-muted-foreground mb-4 mt-1">
                Seus dados estão armazenados de forma segura no banco de dados. Você pode acessá-los de qualquer dispositivo após fazer login.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-l-4 border-l-warning">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-warning/10 p-3 rounded-full">
              <LogOut className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Sessão</h3>
              <p className="text-sm text-muted-foreground mb-4 mt-1">
                Encerre sua sessão atual. Você precisará fazer login novamente para acessar o sistema.
              </p>
              
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" /> Sair da Conta
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground mt-8">
        <p>Os dados são armazenados de forma segura com Lovable Cloud.</p>
        <p>Seus dados estão sincronizados entre todos os dispositivos.</p>
      </div>
    </div>
  );
};
