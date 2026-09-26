import { useState } from 'react';
import { useI18n } from '../../i18n';
import { cx } from './primitives';

interface HelpProps {
  titleKey: string;
  descKey: string;
  size?: 'sm' | 'md';
}

export function HelpButton({ titleKey, descKey, size = 'sm' }: HelpProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('a11y.help')}
        title={t('a11y.info')}
        className={cx(
          'inline-flex items-center justify-center rounded-full border border-border text-text-muted hover:text-text hover:border-accent/40 transition',
          size === 'sm' ? 'h-5 w-5 text-[11px]' : 'h-6 w-6 text-xs',
        )}
      >
        ?
      </button>
      {open && (
        <HelpDialog title={t(titleKey as any)} description={t(descKey as any)} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

export function HelpDialog({ title, description, onClose }: { title: string; description: string; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-sm font-semibold text-text">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('a11y.closeDialog')}
            className="rounded-lg border border-border px-2 py-1 text-xs text-text-muted hover:text-text"
          >
            {t('common.close')}
          </button>
        </div>
        <p className="mt-3 text-sm leading-6 text-text-muted">{description}</p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
          >
            {t('common.understand')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExplainableSection({
  why,
  evidence,
  recommendation,
  children,
}: {
  why?: string;
  evidence?: string;
  recommendation?: string;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-3 rounded-xl bg-surface-sunken p-3">
      {why && (
        <div>
          <p className="text-xs font-semibold text-text">{t('explain.why')}</p>
          <p className="mt-1 text-xs leading-5 text-text-muted">{why}</p>
        </div>
      )}
      {evidence && (
        <div>
          <p className="text-xs font-semibold text-text">{t('common.evidence')}</p>
          <p className="mt-1 text-[11px] leading-5 text-text-muted">{evidence}</p>
        </div>
      )}
      {recommendation && (
        <div>
          <p className="text-xs font-semibold text-text">{t('common.recommendation')}</p>
          <p className="mt-1 text-xs leading-5 text-text">{recommendation}</p>
        </div>
      )}
      {children}
    </div>
  );
}
