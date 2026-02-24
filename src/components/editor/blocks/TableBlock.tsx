import React from 'react';
import { TableBlock as TableBlockType } from '@/types/document';

interface TableBlockProps {
  block: TableBlockType;
  isActive: boolean;
  onSelect: () => void;
  onUpdate: (updates: Partial<TableBlockType>) => void;
}

export const TableBlockComponent: React.FC<TableBlockProps> = ({ block, isActive, onSelect, onUpdate }) => {
  const handleCellChange = (row: number, col: number, value: string) => {
    const newData = block.data.map((r, ri) =>
      r.map((c, ci) => (ri === row && ci === col ? value : c))
    );
    onUpdate({ data: newData });
  };

  return (
    <div
      className={`relative group transition-all ${isActive ? 'ring-2 ring-primary ring-offset-1' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        marginTop: `${block.marginTop}mm`,
        marginBottom: `${block.marginBottom}mm`,
        padding: `${block.padding}mm`,
        width: `${block.width}%`,
      }}
      onClick={onSelect}
    >
      <table className="w-full border-collapse" style={{ borderColor: block.borderColor }}>
        <tbody>
          {block.data.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`p-1 ${block.headerRow && ri === 0 ? 'font-bold bg-muted/50' : ''}`}
                  style={{
                    border: `${block.borderWidth}px solid ${block.borderColor}`,
                    width: block.colWidths[ci] ? `${block.colWidths[ci]}%` : 'auto',
                  }}
                >
                  <input
                    type="text"
                    value={cell}
                    onChange={(e) => handleCellChange(ri, ci, e.target.value)}
                    className="w-full bg-transparent outline-none text-sm"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
