import { CHABAD_YAFO_KNOWLEDGE as knowledge } from '../config/assistantKnowledge';
import { halachicReply } from './assistantGrounding';
import type { SuggestedAction } from '../config/assistantPrompts';

// Deterministic FAQ rules, not semantic AI. Facts and destinations come only from knowledge.
export function localAssistant(message: string): { reply: string; suggestedActions: SuggestedAction[] } {
    const q = message.normalize('NFKC').replace(/[״׳"']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
    const org = knowledge.organization;
    const contact: SuggestedAction = { type: 'whatsapp', label: 'פנייה בוואטסאפ', url: org.whatsAppUrl };
    const answer = (reply: string, actions: SuggestedAction[] = [contact]) => ({ reply, suggestedActions: actions });
    const page = (path: string) => knowledge.pagesAndFeatures.find(p => p.path === path)!;
    const link = (path: string): SuggestedAction => ({ type: 'link', label: page(path).title, url: page(path).path });
    const unknown = (detail = 'על כך', actions = [contact]) => answer(`אין לי כרגע מידע ${detail}. אפשר לברר איתנו בוואטסאפ.`, actions);
    const halacha = /הלכ|מה הדין|האם כשר|שאלת רב|פסק|דיני /.test(q) ||
        /מותר|אסור/.test(q) || (/אפשר|מותר|צריך|איך/.test(q) && /להדליק אש|לחמם|לבשל|לנסוע|להדליק אור/.test(q) && /שבת|חג/.test(q));
    if (halacha) return answer(halachicReply());

    const branch = knowledge.branches.find(b => q.includes(b.shaliach.replace(/^הרב /, '')) ||
        q.includes(b.address.replace(/[״׳"']/g, '')) ||
        (b.id === 'center' && /סניף מרכזי|סניף המרכזי|מרכז הראשי|שוק הפשפשים|עולי ציון|לוי.*תמם/.test(q)) ||
        (b.id === 'tzahalon' && /צהלון|חבקין|מענדי|מיכאלאנגלו/.test(q)) ||
        (b.id === 'kampus' && /קמפוס|מכללה|שמוליק|קפלן/.test(q)));
    if (branch) {
        if (/שעות|פתוח|פתיחה|מתי|מחיר|כמה עולה/.test(q)) return unknown('על הפרט המבוקש בסניף');
        if (/טלפון|מספר|להתקשר/.test(q)) return answer(`הטלפון של ${branch.shaliach}: ${branch.phone}.`, []);
        if (/מי הרב|מי השליח/.test(q)) return answer(`השליח ב${branch.title} הוא ${branch.shaliach}.`, []);
        return answer(`${branch.title} נמצא ב${branch.address}.`, []);
    }
    if (/מספר.*עמותה|עמותה.*מספר|מספר.*ע.?ר|מה.*עמותה/.test(q)) return answer(`${org.name}, מספר עמותה: ${org.npoNumber}.`);

    const servicePatterns: Record<string, RegExp> = {
        'tefillin-mezuzot': /תפילין|מזוז/,
        'kosher-kitchen': /הכשרת מטבח|מכשירים.*מטבח|להכשיר.*מטבח|מטבח.*כשר/,
        'bar-mitzvah': /בר מצוו?ה|עלי[יה]ה לתורה/,
        judaica: /יודאיקה/,
        mothers: /יולדת|יולדות/,
        'home-store': /חנות הבית/,
    };
    const service = knowledge.services.find(s => servicePatterns[s.id]?.test(q));
    if (service) {
        if (/כמה|מחיר|עלות|שעות|מתי|פתוח/.test(q)) return unknown(`על המחיר או המועד המבוקש עבור ${service.title}`);
        return answer(`${service.title} — לפרטים ולתיאום אפשר לפנות אלינו בוואטסאפ.`,
            [{ ...contact, url: service.actionUrl }]);
    }
    const pagePatterns: [string, RegExp][] = [
        ['/daycare-parent-info', /מידע להורים|נהלים|הורי.*מעון|מעון.*הורים/],
        ['/daycare-registration', /מעון|פעוטון/],
        ['/gallery', /תמונות|גלריה/],
        ['/write-to-rebbe', /לרבי|מליובאוויטש|בקשת ברכה|כתיבה.*רבי/],
        ['/donate', /תרומ|לתרום/],
        ['/families', /משפחות|משפחה צעירה/],
        ['/about', /אודות|פעילות|מי אתם|מה אתם עושים/],
        ['/', /זמני.*שבת|נכנסת שבת|יוצאת שבת|כניסת שבת|צאת שבת|הדלקת נרות|פרשת השבוע/],
    ];
    const matchedPage = pagePatterns.find(([, pattern]) => pattern.test(q));
    if (matchedPage) {
        const p = page(matchedPage[0]);
        if (/מחיר|כמה עולה|עלות|תשלום חודשי/.test(q)) return unknown('על המחיר');
        if (/שעות פתיחה|פתוח|גיל|מקומות פנויים|כתובת|טלפון/.test(q)) return unknown('על הפרט המבוקש', [link(p.path), contact]);
        return answer(`${p.description}`, [link(p.path)]);
    }
    if (/כתובת האתר|מה האתר|האתר שלכם/.test(q)) return answer(org.websiteUrl);
    if (/סניפים|שלוחים|שלוחי|סניף|כתובת|איך מגיעים|איפה.*בית חבד|היכן.*בית חבד/.test(q)) {
        return answer(knowledge.branches.map(b => `${b.title}: ${b.address}. ${b.shaliach}, טלפון: ${b.phone}.`).join('\n'));
    }
    if (/טלפון|וואטסאפ|צור קשר|יצירת קשר|פרטי קשר|אימייל|דואר|מייל/.test(q)) {
        if (/הרב|של הרב/.test(q)) return unknown('על האדם המבוקש');
        return answer(`${org.name}\nטלפון: ${org.mainPhone}\nדוא״ל: ${org.mainEmail}\nכתובת: ${org.mainAddress}\nאתר: ${org.websiteUrl}`);
    }
    if (/^(שלום|היי|בוקר טוב|ערב טוב|שלום עליכם)[!?. ]*$/.test(q)) return answer(`שלום! אפשר לשאול אותי על בית חב״ד יפו. במה אפשר לעזור?`);
    return unknown();
}
