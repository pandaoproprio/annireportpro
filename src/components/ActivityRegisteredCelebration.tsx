import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, BookOpen } from 'lucide-react';

interface ActivityRegisteredCelebrationProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  isDraft?: boolean;
  totalActivities: number;
}

/**
 * Toca um pequeno acorde "ding" usando Web Audio API.
 * Não depende de arquivos externos. Silencioso se o navegador bloquear áudio.
 */
function playSuccessSound() {
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(ctx.destination);

      const start = ctx.currentTime + i * 0.08;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);

      osc.start(start);
      osc.stop(start + 0.5);
    });

    setTimeout(() => ctx.close().catch(() => {}), 1200);
  } catch {
    /* silencioso */
  }
}

function fireConfetti() {
  const duration = 1200;
  const end = Date.now() + duration;
  const colors = ['#7c3aed', '#22c55e', '#facc15', '#ec4899'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();

  confetti({
    particleCount: 80,
    spread: 90,
    startVelocity: 35,
    origin: { y: 0.6 },
    colors,
  });
}

export const ActivityRegisteredCelebration: React.FC<
  ActivityRegisteredCelebrationProps
> = ({ open, onClose, userName, isDraft, totalActivities }) => {
  useEffect(() => {
    if (!open) return;
    fireConfetti();
    playSuccessSound();
    const t = setTimeout(onClose, 2600);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!open) return null;

  const xpGain = isDraft ? 0 : 10;
  const firstName = (userName || '').trim().split(' ')[0] || 'você';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="pointer-events-auto animate-scale-in">
        <div className="relative rounded-2xl bg-card border border-border shadow-2xl px-8 py-6 flex flex-col items-center gap-3 min-w-[280px]">
          <div className="absolute -top-5 -right-5 bg-primary text-primary-foreground rounded-full p-3 shadow-lg animate-fade-in">
            {isDraft ? (
              <BookOpen className="w-6 h-6" />
            ) : (
              <Trophy className="w-6 h-6" />
            )}
          </div>

          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">
              {isDraft ? 'Rascunho salvo' : 'Atividade registrada'}
            </span>
            <Sparkles className="w-5 h-5" />
          </div>

          <h2 className="text-2xl font-bold text-foreground">
            Boa, {firstName}! 🎉
          </h2>

          {!isDraft && xpGain > 0 && (
            <div className="flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 font-semibold animate-fade-in">
              +{xpGain} XP
            </div>
          )}

          <p className="text-sm text-muted-foreground text-center">
            {isDraft
              ? 'Volte quando puder concluir o registro.'
              : `Você já tem ${totalActivities} atividade${
                  totalActivities !== 1 ? 's' : ''
                } no diário.`}
          </p>
        </div>
      </div>
    </div>
  );
};
