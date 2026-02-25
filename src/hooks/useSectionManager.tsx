import { useState } from 'react';
import { ReportSection } from '@/types';

interface UseSectionManagerOptions {
  defaultSections: ReportSection[];
  /** Key of the section before which custom sections are inserted (e.g. 'expenses', 'attachmentsSection') */
  insertBeforeKey?: string;
}

export const useSectionManager = ({ defaultSections, insertBeforeKey }: UseSectionManagerOptions) => {
  const [sections, setSections] = useState<ReportSection[]>(defaultSections);
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null);

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...sections];
    if (direction === 'up' && index > 0) {
      [newSections[index], newSections[index - 1]] = [newSections[index - 1], newSections[index]];
    } else if (direction === 'down' && index < newSections.length - 1) {
      [newSections[index], newSections[index + 1]] = [newSections[index + 1], newSections[index]];
    }
    setSections(newSections);
  };

  const toggleVisibility = (index: number) => {
    const newSections = [...sections];
    newSections[index].isVisible = !newSections[index].isVisible;
    setSections(newSections);
  };

  const updateSectionTitle = (index: number, newTitle: string) => {
    const newSections = [...sections];
    newSections[index].title = newTitle;
    setSections(newSections);
  };

  const updateCustomContent = (index: number, content: string) => {
    const newSections = [...sections];
    newSections[index].content = content;
    setSections(newSections);
  };

  const addCustomSection = () => {
    const newSection: ReportSection = {
      id: `custom_${Date.now()}`,
      type: 'custom',
      key: 'custom',
      title: 'Nova Seção',
      content: '',
      isVisible: true,
    };
    if (insertBeforeKey) {
      const idx = sections.findIndex(s => s.key === insertBeforeKey);
      if (idx !== -1) {
        const newArr = [...sections];
        newArr.splice(idx, 0, newSection);
        setSections(newArr);
        return;
      }
    }
    setSections([...sections, newSection]);
  };

  const removeSection = (index: number) => {
    setPendingRemoveIndex(index);
  };

  const confirmRemoveSection = () => {
    if (pendingRemoveIndex !== null) {
      setSections(sections.filter((_, i) => i !== pendingRemoveIndex));
      setPendingRemoveIndex(null);
    }
  };

  const cancelRemoveSection = () => {
    setPendingRemoveIndex(null);
  };

  return {
    sections,
    setSections,
    pendingRemoveIndex,
    moveSection,
    toggleVisibility,
    updateSectionTitle,
    updateCustomContent,
    addCustomSection,
    removeSection,
    confirmRemoveSection,
    cancelRemoveSection,
  };
};
