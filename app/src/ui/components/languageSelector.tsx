import { useI18n } from '../../i18n';
import { cx } from './primitives';

export function LanguageSelector({ variant = 'header' }: { variant?: 'header' | 'settings' | 'full' }) {
  const { lang, setLang, t } = useI18n();

  const baseBtn = 'inline-flex items-center justify-center rounded-lg border text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent';

  if (variant === 'header') {
    return (
      <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-raised p-0.5" role="group" aria-label={t('a11y.languageSelector')}>
        <button
          type="button"
          onClick={() => setLang('en')}
          aria-pressed={lang === 'en'}
          className={cx('px-2.5 py-1 text-xs', lang === 'en' ? 'bg-accent text-on-accent shadow-sm rounded-lg' : 'text-text-muted hover:text-text')}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang('ar')}
          aria-pressed={lang === 'ar'}
          className={cx('px-2.5 py-1 text-xs font-medium', lang === 'ar' ? 'bg-accent text-on-accent shadow-sm rounded-lg' : 'text-text-muted hover:text-text')}
        >
          العربية
        </button>
      </div>
    );
  }

  if (variant === 'settings') {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-text-muted">{t('settings.languageDesc')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={cx(baseBtn, 'px-4 py-2', lang === 'en' ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted')}
            aria-pressed={lang === 'en'}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={cx(baseBtn, 'px-4 py-2', lang === 'ar' ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted')}
            aria-pressed={lang === 'ar'}
          >
            العربية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">{t('header.language')}:</span>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setLang('en')}
          className={cx(baseBtn, 'px-3 py-1.5', lang === 'en' ? 'bg-accent text-on-accent' : 'border-border')}
        >
          English
        </button>
        <button
          type="button"
          onClick={() => setLang('ar')}
          className={cx(baseBtn, 'px-3 py-1.5', lang === 'ar' ? 'bg-accent text-on-accent' : 'border-border')}
        >
          العربية
        </button>
      </div>
    </div>
  );
}
