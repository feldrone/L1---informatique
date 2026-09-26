import { useState } from 'react';
import { useI18n } from '../../i18n';

interface Step {
  titleKey: string;
  descKey: string;
}

const STEPS: Step[] = [
  { titleKey: 'onboarding.step1.title', descKey: 'onboarding.step1.desc' },
  { titleKey: 'onboarding.step2.title', descKey: 'onboarding.step2.desc' },
  { titleKey: 'onboarding.step3.title', descKey: 'onboarding.step3.desc' },
  { titleKey: 'onboarding.step4.title', descKey: 'onboarding.step4.desc' },
  { titleKey: 'onboarding.step5.title', descKey: 'onboarding.step5.desc' },
  { titleKey: 'onboarding.step6.title', descKey: 'onboarding.step6.desc' },
  { titleKey: 'onboarding.step7.title', descKey: 'onboarding.step7.desc' },
  { titleKey: 'onboarding.step8.title', descKey: 'onboarding.step8.desc' },
  { titleKey: 'onboarding.step9.title', descKey: 'onboarding.step9.desc' },
  { titleKey: 'onboarding.step10.title', descKey: 'onboarding.step10.desc' },
];

export function OnboardingDialog({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const { t, markOnboardingSeen } = useI18n();
  const total = STEPS.length;
  const step = STEPS[index];

  const finish = () => {
    markOnboardingSeen();
    onClose();
  };

  const skip = () => {
    markOnboardingSeen();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={skip} aria-hidden="true" />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface-raised p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-text">{t('onboarding.title')}</h2>
            <p className="mt-1 text-xs text-text-muted">{t('onboarding.subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={skip}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-muted hover:text-text"
          >
            {t('onboarding.skip')}
          </button>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-text-muted">{t('onboarding.progress', { current: index + 1, total })}</span>
            <div className="h-1 flex-1 rounded-full bg-surface-sunken">
              <div className="h-1 rounded-full bg-accent transition-all" style={{ width: `${((index + 1) / total) * 100}%` }} />
            </div>
          </div>

          <h3 className="mt-4 text-sm font-semibold text-text">{t(step.titleKey as any)}</h3>
          <p className="mt-2 text-sm leading-6 text-text-muted">{t(step.descKey as any)}</p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="rounded-xl border border-border px-3 py-1.5 text-sm text-text-muted disabled:opacity-40 hover:text-text"
          >
            {t('common.previous')}
          </button>
          <div className="flex gap-2">
            {index < total - 1 ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="rounded-xl bg-accent px-4 py-1.5 text-sm font-medium text-on-accent"
              >
                {t('onboarding.next')}
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="rounded-xl bg-accent px-4 py-1.5 text-sm font-medium text-on-accent"
              >
                {t('onboarding.finish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useOnboarding() {
  const { hasSeenOnboarding, resetOnboarding } = useI18n();
  const [open, setOpen] = useState(false);

  const shouldShow = !hasSeenOnboarding;

  return {
    shouldShow,
    open,
    setOpen,
    resetOnboarding,
  };
}
