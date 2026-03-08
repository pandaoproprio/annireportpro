import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Search, X, CalendarRange } from 'lucide-react';
import { ActivityType, Project } from '@/types';

interface ActivityFiltersProps {
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filterType: string;
  setFilterType: (v: string) => void;
  filterGoal: string;
  setFilterGoal: (v: string) => void;
  filterDraft: string;
  setFilterDraft: (v: string) => void;
  filterAuthor: string;
  setFilterAuthor: (v: string) => void;
  filterDateStart: string;
  setFilterDateStart: (v: string) => void;
  filterDateEnd: string;
  setFilterDateEnd: (v: string) => void;
  draftCount: number;
  uniqueAuthors: { key: string; name: string }[];
  project: Project;
}

export const ActivityFilters: React.FC<ActivityFiltersProps> = ({
  searchTerm, setSearchTerm,
  filterType, setFilterType,
  filterGoal, setFilterGoal,
  filterDraft, setFilterDraft,
  filterAuthor, setFilterAuthor,
  filterDateStart, setFilterDateStart,
  filterDateEnd, setFilterDateEnd,
  draftCount, uniqueAuthors, project,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input 
          placeholder="Buscar atividades..." 
          value={searchTerm} 
          onChange={e => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={filterType} onValueChange={setFilterType}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Tipos</SelectItem>
          {Object.values(ActivityType).map(t => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterGoal} onValueChange={setFilterGoal}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Meta" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Metas</SelectItem>
          {project.goals.map(g => (
            <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filterDraft} onValueChange={setFilterDraft}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Status</SelectItem>
          <SelectItem value="draft">Rascunhos {draftCount > 0 ? `(${draftCount})` : ''}</SelectItem>
          <SelectItem value="final">Finalizadas</SelectItem>
        </SelectContent>
      </Select>
      {uniqueAuthors.length > 1 && (
        <Select value={filterAuthor} onValueChange={setFilterAuthor}>
          <SelectTrigger className="w-full md:w-48">
            <SelectValue placeholder="Autor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Autores</SelectItem>
            {uniqueAuthors.map(a => (
              <SelectItem key={a.key} value={a.key}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex items-center gap-2 w-full md:w-auto">
        <CalendarRange className="w-4 h-4 text-muted-foreground shrink-0 hidden md:block" />
        <Input
          type="date"
          value={filterDateStart}
          onChange={e => setFilterDateStart(e.target.value)}
          className="w-full md:w-40"
        />
        <span className="text-muted-foreground text-sm">a</span>
        <Input
          type="date"
          value={filterDateEnd}
          onChange={e => setFilterDateEnd(e.target.value)}
          className="w-full md:w-40"
          min={filterDateStart || undefined}
        />
        {(filterDateStart || filterDateEnd) && (
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); }}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
