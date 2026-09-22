import { CHABAD_YAFO_KNOWLEDGE as knowledge } from '../config/assistantKnowledge';

// Derived exclusively from the approved public knowledge; never from model prose.
export function getAssistantFacts(): Record<string, string> {
    const org = knowledge.organization;
    const facts: Record<string, string> = {
        organization: `${org.name}. ${org.description}`,
        registration: `מספר העמותה: ${org.npoNumber}.`,
        phone: `הטלפון הראשי: ${org.mainPhone}.`,
        email: `דוא״ל: ${org.mainEmail}`,
        address: `הכתובת הראשית: ${org.mainAddress}.`,
        website: `האתר שלנו: ${org.websiteUrl}`,
        whatsapp: `אפשר לפנות בוואטסאפ: ${org.whatsAppUrl}`,
    };
    for (const branch of knowledge.branches) {
        facts[`${branch.id}.address`] = `${branch.title} נמצא ב${branch.address}.`;
        facts[`${branch.id}.rabbi`] = `השליח ב${branch.title} הוא ${branch.shaliach}.`;
        facts[`${branch.id}.phone`] = `הטלפון של ${branch.shaliach}: ${branch.phone}.`;
    }
    for (const service of knowledge.services) facts[`service.${service.id}`] = `${service.title} — לפרטים ולתיאום אפשר לפנות אלינו בוואטסאפ.`;
    for (const page of knowledge.pagesAndFeatures) facts[`page.${page.path}`] = `${page.description}`;
    return facts;
}

export const unknownReply = () => `אין לי כרגע מידע על כך. אפשר לברר איתנו בוואטסאפ.`;
export const halachicReply = () => `אני לא יכול לפסוק הלכה. אפשר לפנות ל${knowledge.branches[0].shaliach.replace(/^הרב /, "רב ")} בוואטסאפ.`;

export type AssistantIntent = 'location' | 'rabbi' | 'phone' | 'details' | 'hours' | 'price' | 'halacha' | 'contact' | 'gallery' | 'service' | 'unknown';
const intentTypes: Record<AssistantIntent, string[]> = {
    location: ['.address'], rabbi: ['.rabbi'], phone: ['.phone'], details: ['.address', '.rabbi', '.phone'],
    hours: [], price: [], halacha: [], contact: ['phone', 'email', 'address', 'website', 'whatsapp'],
    gallery: ['page./gallery'], service: ['service.'], unknown: [],
};

function isFactAllowed(intent: AssistantIntent, id: string): boolean {
    return intentTypes[intent].some(type => type.endsWith('.') ? id.startsWith(type) : id.endsWith(type) || id === type);
}

export function renderGroundedReply(value: unknown, facts: Record<string, string>): string {
    if (!value || typeof value !== 'object') throw new Error('INVALID_OUTPUT');
    const data = value as Record<string, unknown>;
    if (Object.keys(data).some(key => !['kind', 'intent', 'factIds'].includes(key)) ||
        typeof data.intent !== 'string' || !Object.prototype.hasOwnProperty.call(intentTypes, data.intent) ||
        !Array.isArray(data.factIds) || data.factIds.length > 3 ||
        (data.intent === 'details' && data.factIds.length === 0) ||
        (data.intent !== 'details' && data.factIds.length > 1) ||
        data.factIds.some(id => typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(facts, id) || !isFactAllowed(data.intent as AssistantIntent, id))) throw new Error('INVALID_OUTPUT');
    if (data.kind === 'halachic' || data.intent === 'halacha') return halachicReply();
    if (data.kind === 'unknown' || data.kind === 'blocked' || data.intent === 'unknown' || data.intent === 'hours' || data.intent === 'price') return unknownReply();
    if (data.kind === 'greeting') return 'שלום! במה אפשר לעזור בנוגע לבית חב״ד יפו?';
    if (data.kind !== 'answer' && data.kind !== 'partial') throw new Error('INVALID_OUTPUT');
    const answer = [...new Set(data.factIds as string[])].map(id => facts[id]).join('\n');
    return [answer, data.kind === 'partial' || !answer ? unknownReply() : ''].filter(Boolean).join('\n');
}
