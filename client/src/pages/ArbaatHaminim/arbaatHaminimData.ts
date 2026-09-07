// Initial preview only. Published content is managed in /admin/arbaat-haminim.
import type { SaleContent, SaleItem } from "../../types/arbaatHaminim";
export const sets: SaleItem[] = [
    { id: 'regular', name: 'סט רגיל', price: null, description: 'תיאור הסט יעודכן בהמשך.', included: 'פירוט תכולת הסט יעודכן בהמשך.' },
    { id: 'mehudar', name: 'סט מהודר', price: null, description: 'תיאור הסט יעודכן בהמשך.', included: 'פירוט תכולת הסט יעודכן בהמשך.' },
    { id: 'selected', name: 'סט מובחר', price: null, description: 'תיאור הסט יעודכן בהמשך.', included: 'פירוט תכולת הסט יעודכן בהמשך.' },
];
// Preview semantics: one unit of each selected extra per order.
export const extras: { id: string; name: string; price: number | null }[] = [
    { id: 'holder', name: 'קוישיקלך', price: null },
    { id: 'rings', name: 'טבעות ללולב', price: null },
    { id: 'willows', name: 'ערבות נוספות', price: null },
    { id: 'case', name: 'נרתיק', price: null },
];
export const fulfillmentOptions = [{ id: 'pickup', name: 'איסוף עצמי', details: 'פרטי האיסוף יפורסמו בהמשך.' }];
export const saleDetails = [
    { label: 'כתובת', value: 'כתובת המכירה תפורסם בהמשך' },
    { label: 'תאריכי המכירה', value: 'תאריכי המכירה יעודכנו בהמשך' },
    { label: 'שעות', value: 'שעות המכירה יעודכנו בהמשך' },
    { label: 'תיאום מראש', value: 'פרטי הצורך בתיאום יעודכנו בהמשך' },
    { label: 'טלפון / WhatsApp לשאלות', value: 'פרטי הקשר יפורסמו בהמשך' },
];
export const faq = [
    { question: 'עד מתי אפשר להזמין?', answer: 'מועד סיום ההזמנות יעודכן בהמשך.' },
    { question: 'מתי אוספים את ההזמנה?', answer: 'מועדי האיסוף ומיקומו יפורסמו בהמשך.' },
    { question: 'אפשר להגיע ולבחור במקום?', answer: 'כן. אפשר להגיע לבית חב״ד ולבחור במקום, ללא הזמנת סט אונליין. פרטי המכירה והתיאום יעודכנו בהמשך.' },
    { question: 'אפשר להזמין יותר מסט אחד?', answer: 'הטופס מאפשר לבחור כמות של סטים מהסוג שנבחר. פרטי הזמינות יעודכנו לקראת פתיחת ההזמנות.' },
    { question: 'למי פונים במקרה של שאלה?', answer: 'פרטי הטלפון וה־WhatsApp לשאלות יפורסמו בהמשך.' },
];
export const heroImage = { src: '/arbaat-haminim/hero.jpg', alt: 'אתרוג, לולב, הדסים וערבות על רקע אבן בהירה — תמונת המחשה' };
export const defaultSaleContent: SaleContent = {
    year: 'תשפ״ז',
    heroSubtitle: 'הזמנת ארבעת המינים דרך בית חב״ד יפו',
    seoDescription: 'הזמנת ארבעת המינים מראש בבית חב״ד יפו או הגעה ובחירה במקום. פרטי המכירה והאיסוף יעודכנו בהמשך.',
    catalogIntro: 'שלושה סוגי סטים לדוגמה. התכולה וההבדלים בין הסטים יעודכנו בהמשך.',
    extrasIntro: 'לבחירתכם בלבד · תוספות לדוגמה, יחידה אחת מכל תוספת שנבחרה להזמנה כולה.',
    visitIntro: 'במקום תוכלו לראות את הסטים ולבחור את מה שמתאים לכם. אין צורך להזמין סט אונליין כדי לבחור במקום.',
    sets, extras, fulfillmentOptions, saleDetails, faq, heroImage,
};
export const formatPrice = (price: number | null) => price === null ? 'מחיר יעודכן' : new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(price);
