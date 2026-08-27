import PDFDocument from "pdfkit";
import type { DaycarePickupAuthorizationPayload } from "../types/daycarePickupAuthorization";
import {
    applyDaycarePdfChrome,
    createDaycarePdfDocument,
    DAYCARE_PDF_TYPOGRAPHY,
    prepareDaycareMixedRtlText,
    writeDaycareRtl,
} from "./daycarePdfLayout";

type SignedInput = { documentId: string; revision: number; schoolYear: string; childName: string; payload: DaycarePickupAuthorizationPayload; contentHash: string; signatureImage: Buffer; submittedAt: Date };
type BlankInput = { schoolYear: string; childName: string; guardians: DaycarePickupAuthorizationPayload["guardians"] };

const prepareMixedRtlText = prepareDaycareMixedRtlText;
const rtl = writeDaycareRtl;
const roleLabels = { mother: "אם", father: "אב", guardian: "אפוטרופוס/ית" } as const;

const setup = (title: string) => createDaycarePdfDocument({ title });

const finish = (document: PDFKit.PDFDocument, chunks: Buffer[], resolve: (value: Buffer) => void, footer: string) => {
    applyDaycarePdfChrome(document, (pageIndex, pageCount) => `${footer} | עמוד ${pageIndex + 1} מתוך ${pageCount}`);
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.end();
};

const guardianText = (guardian: DaycarePickupAuthorizationPayload["guardians"][number]) => `${guardian.fullName} | ${guardian.roleDetails || roleLabels[guardian.role as keyof typeof roleLabels] || guardian.role} | ${guardian.phone}`;

export const createSignedPickupAuthorizationPdf = (input: SignedInput) => new Promise<Buffer>((resolve, reject) => {
    const document = setup(`מורשי איסוף - ${input.childName}`); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("error", reject);
    document.font("AssistantBold").fontSize(18).fillColor("#0b3158"); rtl(document, "מורשי איסוף לילד/ה");
    document.moveDown(.12).font("Assistant").fontSize(14).fillColor("#526174"); rtl(document, `שם הילד/ה: ${input.childName} | שנת לימודים: ${input.schoolYear} | גרסה: ${input.revision}`);
    document.moveDown(.35).font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "הורים ואפוטרופוסים המורשים לאסוף");
    document.moveDown(.15).font("Assistant").fontSize(14).fillColor("#172033");
    input.payload.guardians.forEach((guardian) => { rtl(document, `• ${guardianText(guardian)}`); document.moveDown(.2); });
    document.moveDown(.3).font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "מורשי איסוף נוספים"); document.moveDown(.15);
    if (input.payload.collectors.length === 0) { document.font("Assistant").fontSize(14).fillColor("#526174"); rtl(document, "לא נוספו מורשי איסוף נוספים."); }
    input.payload.collectors.forEach((collector, index) => {
        if (document.y > 680) document.addPage();
        const y = document.y; document.roundedRect(54, y, 487, 62, 6).fill("#f4f7fa");
        document.font("AssistantBold").fontSize(14).fillColor("#0b3158"); document.text(prepareMixedRtlText(`${index + 1}. ${collector.fullName}`), 70, y + 7, { width: 455, align: "right", features: ["rtla"] });
        document.font("Assistant").fontSize(14).fillColor("#172033"); document.text(prepareMixedRtlText(`קרבה: ${collector.relationship} | טלפון: ${collector.phone} | ת״ז: ${collector.israeliId}`), 70, y + 31, { width: 455, align: "right", features: ["rtla"] });
        document.y = y + 68;
    });
    if (document.y > 590) document.addPage();
    document.moveDown(.3).font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "הצהרה וחתימה");
    document.moveDown(.15).font("Assistant").fontSize(14).fillColor("#172033"); rtl(document, "אני מאשר/ת כי האנשים המפורטים במסמך זה מורשים לאסוף את הילד/ה מהמעון, וכי אעדכן את צוות המעון בכל שינוי.", { lineGap: 2 });
    document.moveDown(.65); rtl(document, `שם החותם/ת: ${input.payload.signedBy} | תפקיד: ${roleLabels[input.payload.signerRole]}`);
    rtl(document, `מועד החתימה: ${new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(input.submittedAt)}`);
    const signatureY = document.y + 8; document.image(input.signatureImage, 341, signatureY, { fit: [200, 70] }); document.rect(341, signatureY, 200, 70).strokeColor("#c7d1da").stroke(); document.y = signatureY + 80;
    document.font("Assistant").fontSize(DAYCARE_PDF_TYPOGRAPHY.technicalFooter).fillColor("#64748b"); rtl(document, `מזהה מסמך: ${input.documentId}`); rtl(document, `טביעת תוכן SHA-256: ${input.contentHash}`);
    finish(document, chunks, resolve, "מורשי איסוף");
});

export const createBlankPickupAuthorizationPdf = (input: BlankInput) => new Promise<Buffer>((resolve, reject) => {
    const document = setup(`מורשי איסוף למילוי - ${input.childName}`); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("error", reject);
    document.font("AssistantBold").fontSize(18).fillColor("#0b3158"); rtl(document, "מורשי איסוף - למילוי ידני");
    document.moveDown(.12).font("Assistant").fontSize(14).fillColor("#526174"); rtl(document, `שם הילד/ה: ${input.childName} | שנת לימודים: ${input.schoolYear}`);
    document.moveDown(.35).font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "הורים ואפוטרופוסים המורשים לאסוף");
    document.moveDown(.15).font("Assistant").fontSize(14).fillColor("#172033"); input.guardians.forEach((guardian) => { rtl(document, `• ${guardianText(guardian)}`); document.moveDown(.1); });
    document.moveDown(.3).font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "מורשי איסוף נוספים"); document.moveDown(.15);
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "שם מלא | קרבה לילד/ה | טלפון | מספר תעודת זהות");
    for (let index = 0; index < 5; index += 1) { const y = document.y + 5; document.roundedRect(54, y, 487, 45, 5).strokeColor("#aab7c4").stroke(); document.y = y + 54; }
    document.moveDown(.2).font("AssistantBold").fontSize(14).fillColor("#0b3158"); rtl(document, "הצהרה וחתימה");
    document.moveDown(.12).font("Assistant").fontSize(14).fillColor("#172033"); rtl(document, "אני מאשר/ת כי האנשים המפורטים במסמך זה מורשים לאסוף את הילד/ה מהמעון, וכי אעדכן את צוות המעון בכל שינוי.", { lineGap: 2 });
    document.moveDown(.55); rtl(document, "שם החותם/ת: ____________________   תפקיד: ______________"); document.moveDown(.45); rtl(document, "תאריך: ____________________   חתימה: ____________________");
    finish(document, chunks, resolve, "מורשי איסוף למילוי ידני");
});

export const convertPickupImageUploadToPdf = (image: Buffer) => new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margins: { top: 24, right: 24, bottom: 24, left: 24 }, info: { Title: "מורשי איסוף חתום ידנית", Author: "מעון חב״ד יפו" } }); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("error", reject); document.on("end", () => resolve(Buffer.concat(chunks)));
    document.image(image, 24, 24, { fit: [547, 794], align: "center", valign: "center" }); document.end();
});
