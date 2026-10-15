import type { ReactNode } from 'react';
import styles from './AdminPageHeader.module.scss';
export default function AdminPageHeader({ title, description, actions, breadcrumb, id }: { title: string; description?: ReactNode; actions?: ReactNode; breadcrumb?: ReactNode; id?: string }) {
    return <header className={styles.header}>
        <div className={styles.copy}>{breadcrumb && <div className={styles.breadcrumb}>{breadcrumb}</div>}<h1 id={id}>{title}</h1>{description && <div className={styles.description}>{description}</div>}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
    </header>;
}
