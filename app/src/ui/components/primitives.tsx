/** Shared UI primitives — calm, academic, accessible. */

import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function Card({
  children,
  className,
  title,
  subtitle,
  action,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag
      className={cx(
        'rounded-2xl border border-border bg-surface-raised p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)] sm:p-5',
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-3 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-wide text-text uppercase">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </Tag>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' | 'lg' }) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-accent text-white hover:brightness-110 border-transparent',
    secondary: 'bg-surface-sunken text-text hover:bg-accent-soft border-border',
    ghost: 'bg-transparent text-text-muted hover:text-text hover:bg-surface-sunken border-transparent',
    danger: 'bg-transparent text-danger border-danger/40 hover:bg-danger/10',
    success: 'bg-transparent text-success border-success/40 hover:bg-success/10',
  };
  const sizes = {
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  tone = 'neutral',
  className,
  title,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  className?: string;
  title?: string;
}) {
  const tones = {
    neutral: 'border-border text-text-muted',
    accent: 'border-accent/40 text-accent bg-accent-soft',
    success: 'border-success/40 text-success',
    warning: 'border-warning/40 text-warning',
    danger: 'border-danger/40 text-danger',
  };
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Data-provenance badge: never let an unverified value look official. */
export function ProvenanceBadge({ provenance }: { provenance: 'verified' | 'partial' | 'to-confirm' | 'supplementary' }) {
  const map = {
    verified: { label: 'verified', tone: 'success' as const, title: 'Read from an official UBMA source' },
    partial: { label: 'partial data', tone: 'warning' as const, title: 'Module confirmed, some metadata not published' },
    'to-confirm': { label: 'to confirm', tone: 'danger' as const, title: 'Provisional value — verify and edit' },
    supplementary: { label: 'supplementary', tone: 'neutral' as const, title: 'Repository material, not an official programme' },
  };
  const entry = map[provenance];
  return (
    <Badge tone={entry.tone} title={entry.title}>
      {entry.label}
    </Badge>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}) {
  const tones = {
    default: 'text-text',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
  };
  return (
    <div className={cx('rounded-xl border border-border bg-surface-raised p-3', className)}>
      <p className="text-[11px] font-medium tracking-wide text-text-muted uppercase">{label}</p>
      <p className={cx('tnum mt-1 text-xl font-semibold', tones[tone])}>{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface-sunken/60 p-5 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-text-muted">{description}</p>
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-text-muted">{hint}</span>}
    </label>
  );
}

const controlClass =
  'w-full rounded-xl border border-border bg-surface-sunken px-3 py-2 text-sm text-text placeholder:text-text-muted/70 focus:border-accent focus:outline-none';

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cx(controlClass, className)} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return <textarea {...rest} className={cx(controlClass, 'min-h-20', className)} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props;
  return <select {...rest} className={cx(controlClass, 'appearance-none', className)} />;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'animate-fade-in-up max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-surface-raised p-4 sm:rounded-2xl sm:p-6',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold tracking-wide text-text uppercase">{children}</h2>
      {hint && <span className="text-xs text-text-muted">{hint}</span>}
    </div>
  );
}
