import PDFDocument from "pdfkit";
import path from "node:path";
import type { DaycarePickupAuthorizationPayload } from "../types/daycarePickupAuthorization";

type SignedInput = { documentId: string; revision: number; schoolYear: string; childName: string; payload: DaycarePickupAuthorizationPayload; contentHash: string; signatureImage: Buffer; submittedAt: Date };
type BlankInput = { schoolYear: string; childName: string; guardians: DaycarePickupAuthorizationPayload["guardians"] };

const regularFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Regular.ttf");
const boldFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Bold.ttf");
const logoPath = path.resolve(__dirname, "..", "..", "assets", "logo-maon.png");
const prepareMixedRtlText = (text: string) => text.replace(/[A-Za-z0-9][A-Za-z0-9._:/@+-]*/g, (run) => [...run].reverse().join(""));
const rtl = (document: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) => document.text(prepareMixedRtlText(text), { ...options, align: "right", features: ["rtla"] });
const roleLabels = { mother: "אם", father: "אב", guardian: "אפוטרופוס/ית" } as const;

const addLetterhead = (document: PDFKit.PDFDocument) => {
    document.image(logoPath, 469, 16, { fit: [72, 72] });
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("מעון חב״ד יפו"), 54, 27, { align: "right", width: 394, features: ["rtla"] });
    document.font("Assistant").fontSize(9.5).fillColor("#334155");
    document.text(prepareMixedRtlText("יוסי בן יוסי 1, יפו | 054-219-3770"), 250, 50, { align: "right", width: 198, features: ["rtla"] });
    document.strokeColor("#c69b2d").lineWidth(1.2).moveTo(54, 98).lineTo(541, 98).stroke();
};

const setup = (title: string) => {
    const document = new PDFDocument({ size: "A4", margins: { top: 116, right: 54, bottom: 54, left: 54 }, bufferPages: true, info: { Title: title, Author: "מעון חב״ד יפו" } });
    document.registerFont("Assistant", regularFontPath);
    document.registerFont("AssistantBold", boldFontPath);
    return document;
};

const finish = (document: PDFKit.PDFDocument, chunks: Buffer[], resolve: (value: Buffer) => void, footer: string) => {
    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
        document.switchToPage(index); addLetterhead(document);
        document.font("Assistant").fontSize(8.5).fillColor("#4b5563");
        document.text(prepareMixedRtlText(`${footer} | עמוד ${index + 1} מתוך ${range.count}`), 54, 790, { width: 487, height: 18, align: "right", lineBreak: false, features: ["rtla"] });
    }
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.end();
};

const guardianText = (guardian: DaycarePickupAuthorizationPayload["guardians"][number]) => `${guardian.fullName} | ${guardian.roleDetails || roleLabels[guardian.role as keyof typeof roleLabels] || guardian.role} | ${guardian.phone}`;

export const createSignedPickupAuthorizationPdf = (input: SignedInput) => new Promise<Buffer>((resolve, reject) => {
    const document = setup(`מורשי איסוף - ${input.childName}`); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("error", reject);
    document.font("AssistantBold").fontSize(20).fillColor("#0b3158"); rtl(document, "מורשי איסוף לילד/ה");
    document.moveDown(.25).font("Assistant").fontSize(10).fillColor("#526174"); rtl(document, `שם הילד/ה: ${input.childName} | שנת לימודים: ${input.schoolYear} | גרסה: ${input.revision}`);
    document.moveDown(.8).font("AssistantBold").fontSize(13).fillColor("#0b3158"); rtl(document, "הורים ואפוטרופוסים המורשים לאסוף");
    document.moveDown(.3).font("Assistant").fontSize(10.5).fillColor("#172033");
    input.payload.guardians.forEach((guardian) => { rtl(document, `• ${guardianText(guardian)}`); document.moveDown(.2); });
    document.moveDown(.5).font("AssistantBold").fontSize(13).fillColor("#0b3158"); rtl(document, "מורשי איסוף נוספים"); document.moveDown(.35);
    if (input.payload.collectors.length === 0) { document.font("Assistant").fontSize(10.5).fillColor("#526174"); rtl(document, "לא נוספו מורשי איסוף נוספים."); }
    input.payload.collectors.forEach((collector, index) => {
        if (document.y > 680) document.addPage();
        const y = document.y; document.roundedRect(54, y, 487, 48, 6).fill("#f4f7fa");
        document.font("AssistantBold").fontSize(10.5).fillColor("#0b3158"); document.text(prepareMixedRtlText(`${index + 1}. ${collector.fullName}`), 70, y + 7, { width: 455, align: "right", features: ["rtla"] });
        document.font("Assistant").fontSize(9.5).fillColor("#172033"); document.text(prepareMixedRtlText(`קרבה: ${collector.relationship} | טלפון: ${collector.phone} | ת״ז: ${collector.israeliId}`), 70, y + 27, { width: 455, align: "right", features: ["rtla"] });
        document.y = y + 58;
    });
    if (document.y > 590) document.addPage();
    document.moveDown(.6).font("AssistantBold").fontSize(13).fillColor("#0b3158"); rtl(document, "הצהרה וחתימה");
    document.moveDown(.35).font("Assistant").fontSize(10.5).fillColor("#172033"); rtl(document, "אני מאשר/ת כי האנשים המפורטים במסמך זה מורשים לאסוף את הילד/ה מהמעון, וכי אעדכן את צוות המעון בכל שינוי.", { lineGap: 4 });
    document.moveDown(.65); rtl(document, `שם החותם/ת: ${input.payload.signedBy} | תפקיד: ${roleLabels[input.payload.signerRole]}`);
    rtl(document, `מועד החתימה: ${new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(input.submittedAt)}`);
    const signatureY = document.y + 8; document.image(input.signatureImage, 341, signatureY, { fit: [200, 70] }); document.rect(341, signatureY, 200, 70).strokeColor("#c7d1da").stroke(); document.y = signatureY + 80;
    document.font("Assistant").fontSize(8).fillColor("#64748b"); rtl(document, `מזהה מסמך: ${input.documentId}`); rtl(document, `טביעת תוכן SHA-256: ${input.contentHash}`);
    finish(document, chunks, resolve, "מורשי איסוף");
});

export const createBlankPickupAuthorizationPdf = (input: BlankInput) => new Promise<Buffer>((resolve, reject) => {
    const document = setup(`מורשי איסוף למילוי - ${input.childName}`); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("error", reject);
    document.font("AssistantBold").fontSize(20).fillColor("#0b3158"); rtl(document, "מורשי איסוף — למילוי ידני");
    document.moveDown(.25).font("Assistant").fontSize(10).fillColor("#526174"); rtl(document, `שם הילד/ה: ${input.childName} | שנת לימודים: ${input.schoolYear}`);
    document.moveDown(.75).font("AssistantBold").fontSize(13).fillColor("#0b3158"); rtl(document, "הורים ואפוטרופוסים המורשים לאסוף");
    document.moveDown(.3).font("Assistant").fontSize(10.5).fillColor("#172033"); input.guardians.forEach((guardian) => { rtl(document, `• ${guardianText(guardian)}`); document.moveDown(.2); });
    document.moveDown(.5).font("AssistantBold").fontSize(13).fillColor("#0b3158"); rtl(document, "מורשי איסוף נוספים"); document.moveDown(.35);
    document.font("AssistantBold").fontSize(9.5).fillColor("#0b3158"); rtl(document, "שם מלא | קרבה לילד/ה | טלפון | מספר תעודת זהות");
    for (let index = 0; index < 5; index += 1) { const y = document.y + 5; document.roundedRect(54, y, 487, 45, 5).strokeColor("#aab7c4").stroke(); document.y = y + 54; }
    document.moveDown(.4).font("AssistantBold").fontSize(13).fillColor("#0b3158"); rtl(document, "הצהרה וחתימה");
    document.moveDown(.3).font("Assistant").fontSize(10).fillColor("#172033"); rtl(document, "אני מאשר/ת כי האנשים המפורטים במסמך זה מורשים לאסוף את הילד/ה מהמעון, וכי אעדכן את צוות המעון בכל שינוי.", { lineGap: 3 });
    document.moveDown(.55); rtl(document, "שם החותם/ת: ____________________   תפקיד: ______________"); document.moveDown(.45); rtl(document, "תאריך: ____________________   חתימה: ____________________");
    finish(document, chunks, resolve, "מורשי איסוף למילוי ידני");
});

export const convertPickupImageUploadToPdf = (image: Buffer) => new Promise<Buffer>((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margins: { top: 24, right: 24, bottom: 24, left: 24 }, info: { Title: "מורשי איסוף חתום ידנית", Author: "מעון חב״ד יפו" } }); const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk)); document.on("error", reject); document.on("end", () => resolve(Buffer.concat(chunks)));
    document.image(image, 24, 24, { fit: [547, 794], align: "center", valign: "center" }); document.end();
});
