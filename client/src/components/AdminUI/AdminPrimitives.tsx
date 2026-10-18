import type { ComponentProps, ReactNode } from 'react';
import styles from './AdminPrimitives.module.scss';

type Tone = 'neutral' | 'info' | 'success' | 'warning';
const classes = (...values: (string | undefined)[]) => values.filter(Boolean).join(' ');
export function AdminButton({ variant = 'secondary', className, type = 'button', ...props }: ComponentProps<'button'> & { variant?: 'primary' | 'secondary' | 'navigation' | 'danger' }) {
    return <button {...props} type={type} className={classes(styles[variant], className)} />;
}
// Native inputs: labels, validation, handlers and refs are supplied by the caller.
export function AdminInput(props: ComponentProps<'input'>) { return <span className={classes(styles.fields, styles.controlScope)}><input {...props} /></span>; }
export function AdminSelect(props: ComponentProps<'select'>) { return <span className={classes(styles.fields, styles.controlScope)}><select {...props} /></span>; }
export function AdminTextarea(props: ComponentProps<'textarea'>) { return <span className={classes(styles.fields, styles.controlScope)}><textarea {...props} /></span>; }
export function AdminBadge({ tone = 'neutral', className, ...props }: ComponentProps<'span'> & { tone?: Tone }) { return <span {...props} data-tone={tone} className={classes(styles.badge, className)} />; }
export function AdminCard({ className, ...props }: ComponentProps<'div'>) { return <div {...props} className={classes(styles.surface, styles.card, className)} />; }
export function AdminTable({ className, ...props }: ComponentProps<'table'>) { return <div className={styles.tableViewport}><table {...props} className={classes(styles.table, className)} /></div>; }
export function AdminStatCard({ label, value, tone = 'neutral', className, ...props }: Omit<ComponentProps<'div'>, 'children'> & { label: ReactNode; value: ReactNode; tone?: Tone }) {
    return <div {...props} data-tone={tone} className={classes(styles.surface, styles.stat, className)}><span className={styles.statLabel}>{label}</span><strong className={styles.statValue}>{value}</strong></div>;
}

export function AdminDesignScope({ className, ...props }: ComponentProps<'div'>) { return <div {...props} dir={props.dir || 'rtl'} className={classes(styles.scope, className)} />; }

export function AdminLink({ className, ...props }: ComponentProps<'a'>) { return <a {...props} className={classes(styles.secondary, styles.link, className)} />; }
