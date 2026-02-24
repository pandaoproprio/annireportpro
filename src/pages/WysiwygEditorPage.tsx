import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WysiwygEditor } from '@/components/wysiwyg/WysiwygEditor';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const WysiwygEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  return (
    <div className="relative">
      <div className="absolute top-2 left-2 z-30">
        <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-3 w-3" /> Voltar
        </Button>
      </div>
      <WysiwygEditor documentId={id} />
    </div>
  );
};

export default WysiwygEditorPage;
