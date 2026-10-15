// Existing website contact, shared with the header; no separate activity number.
const WHATSAPP_PHONE = '972537700339';
export function contactWhatsAppLink(message = 'שלום, הגעתי מהאתר של בית חב״ד יפו ורציתי ליצור קשר.') {
    return `https://wa.me/${WHATSAPP_PHONE}?text=${encodeURIComponent(message)}`;
}
