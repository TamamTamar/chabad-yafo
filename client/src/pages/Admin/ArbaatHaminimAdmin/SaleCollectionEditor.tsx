import styles from './ArbaatHaminimAdmin.module.scss';

type Field = { key: string; label: string; type?: 'price' | 'textarea' };
type Row = Record<string, string | number | null>;
// The same editing controls serve the five small content collections.
export default function SaleCollectionEditor<T extends Row>({ title, rows, fields, onChange, createRow, min = 0 }: {
    title: string; rows: T[]; fields: Field[]; onChange: (rows: T[]) => void; createRow: () => T; min?: number;
}) {
    const update = (index: number, key: string, value: string | number | null) => onChange(rows.map((row, i) => i === index ? { ...row, [key]: value } : row));
    return <section className={styles.panel}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {rows.map((row, index) => <fieldset className={styles.row} key={String(row.id ?? index)}>
            <legend className={styles.legend}>{title} · {index + 1}</legend>
            {fields.map(field => <label className={styles.field} key={field.key}>{field.label}
                {field.type === 'textarea' ? <textarea className={styles.input} value={String(row[field.key] ?? '')} onChange={event => update(index, field.key, event.target.value)} rows={3} maxLength={2000} required />
                    : <input className={styles.input} type={field.type === 'price' ? 'number' : 'text'} min={field.type === 'price' ? 0 : undefined} max={field.type === 'price' ? 100000 : undefined} step={field.type === 'price' ? '.01' : undefined} inputMode={field.type === 'price' ? 'decimal' : undefined} value={row[field.key] ?? ''} onChange={event => update(index, field.key, field.type === 'price' ? event.target.value === '' ? null : Number(event.target.value) : event.target.value)} placeholder={field.type === 'price' ? 'ריק = מחיר יעודכן' : undefined} maxLength={field.key === 'name' || field.key === 'label' ? 120 : 300} required={field.type !== 'price'} />}
            </label>)}
            <div className={styles.actions}>
                <button className={styles.secondary} type="button" disabled={index === 0} onClick={() => { const next = [...rows]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>הזזה למעלה</button>
                <button className={styles.secondary} type="button" disabled={rows.length <= min} onClick={() => onChange(rows.filter((_, i) => i !== index))}>הסרת פריט {index + 1}</button>
            </div>
        </fieldset>)}
        <button type="button" className={styles.secondary} disabled={rows.length >= 50} onClick={() => onChange([...rows, createRow()])}>הוספת פריט</button>
    </section>;
}
