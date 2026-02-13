import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title and description when open', () => {
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Excluir projeto?"
        description="Esta ação não pode ser desfeita."
        onConfirm={() => {}}
      />
    );
    expect(screen.getByText('Excluir projeto?')).toBeInTheDocument();
    expect(screen.getByText('Esta ação não pode ser desfeita.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open={true}
        onOpenChange={() => {}}
        title="Confirmar?"
        description="Tem certeza?"
        confirmLabel="Sim"
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByText('Sim'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('does not render when closed', () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Oculto"
        description="Não deve aparecer"
        onConfirm={() => {}}
      />
    );
    expect(screen.queryByText('Oculto')).not.toBeInTheDocument();
  });
});
