import PDFDocument from "pdfkit";
import type { DaycareHealthDeclarationPayload } from "../types/daycareHealthDeclaration";
import {
    applyDaycarePdfChrome,
    createDaycarePdfDocument,
    DAYCARE_PDF_TYPOGRAPHY,
    prepareDaycareMixedRtlText,
    writeDaycareRtl,
} from "./daycarePdfLayout";

type HealthDeclarationPdfInput = {
    documentId: string;
    revision: number;
    schoolYear: string;
    childName: string;
    payload: DaycareHealthDeclarationPayload;
    contentHash: string;
    signatureImage: Buffer;
    submittedAt: Date;
};

type BlankHealthDeclarationPdfInput = {
    schoolYear: string;
    childName: string;
};

const prepareMixedRtlText = prepareDaycareMixedRtlText;
const rtl = writeDaycareRtl;

const roleLabels = { mother: "אם", father: "אב", guardian: "אפוטרופוס/ית" } as const;

const field = (document: PDFKit.PDFDocument, label: string, value: string) => {
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    rtl(document, label);
    document.moveDown(0.08).font("Assistant").fontSize(14).fillColor("#172033");
    const text = value.trim() || "לא צוין";
    const height = Math.max(36, document.heightOfString(prepareMixedRtlText(text), { width: 455, features: ["rtla"] }) + 12);
    const y = document.y;
    document.roundedRect(54, y, 487, height, 6).fill("#f4f7fa");
    document.fillColor("#172033");
    document.text(prepareMixedRtlText(text), 70, y + 7, { width: 455, align: "right", features: ["rtla"], lineGap: 2 });
    document.y = y + height + 6;
};

export const createSignedHealthDeclarationPdf = (input: HealthDeclarationPdfInput) =>
    new Promise<Buffer>((resolve, reject) => {
        const document = createDaycarePdfDocument({
            title: `הצהרת בריאות - ${input.childName}`,
            subject: input.documentId,
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
        rtl(document, "הצהרת בריאות לילד/ה");
        document.moveDown(0.12).font("Assistant").fontSize(14).fillColor("#526174");
        rtl(document, `שם הילד/ה: ${input.childName} | שנת לימודים: ${input.schoolYear} | גרסה: ${input.revision}`);
        document.moveDown(0.35);

        field(document, "מצב בריאותי", input.payload.healthCondition);
        field(document, "רגישויות לתרופות", input.payload.medicationSensitivities);
        field(document, "קופת חולים", input.payload.healthFund);

        document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
        rtl(document, "אלרגיות ורגישויות");
        document.moveDown(0.2);
        field(document, "האם קיימת אלרגיה או רגישות כלשהי, כולל למזון?", input.payload.hasAllergies ? "כן" : "לא");
        if (input.payload.hasAllergies) {
            field(document, "פירוט האלרגיה או הרגישות", input.payload.allergyDetails ?? "");
            field(document, "הנחיות במקרה של חשיפה", input.payload.exposureInstructions ?? "");
        }

        if (document.y > 575) document.addPage();
        document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
        rtl(document, "הצהרה ואישור");
        document.moveDown(0.2).font("Assistant").fontSize(14).fillColor("#172033");
        rtl(document, "אני מאשר/ת שהמידע שמסרתי נכון ומלא ומתחייב/ת לעדכן את המעון בכל שינוי במצב הבריאותי של הילד/ה.", { lineGap: 4 });
        document.moveDown(0.35);
        rtl(document, "ידוע לי כי האחריות למסירת מידע מלא ועדכני ולהשלכות הנובעות מאי-מסירתו חלה עליי.", { lineGap: 4 });
        document.moveDown(0.4);
        rtl(document, `שם החותם/ת: ${input.payload.signedBy} | תפקיד: ${roleLabels[input.payload.signerRole]}`);
        rtl(document, `מועד החתימה: ${new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jerusalem" }).format(input.submittedAt)}`);
        const signatureY = document.y + 8;
        document.image(input.signatureImage, 341, signatureY, { fit: [200, 70] });
        document.rect(341, signatureY, 200, 70).strokeColor("#c7d1da").stroke();
        document.y = signatureY + 82;
        // Audit identifiers are technical footer metadata, so they use the
        // compact footer size and stay with the signed declaration.
        document.font("Assistant").fontSize(DAYCARE_PDF_TYPOGRAPHY.technicalFooter).fillColor("#64748b");
        rtl(document, `מזהה מסמך: ${input.documentId}`);
        rtl(document, `טביעת תוכן SHA-256: ${input.contentHash}`);

        applyDaycarePdfChrome(document, (pageIndex, pageCount) => `הצהרת בריאות | עמוד ${pageIndex + 1} מתוך ${pageCount}`);
        document.end();
    });

const blankLine = (document: PDFKit.PDFDocument, label: string, height = 34) => {
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    rtl(document, label);
    const y = document.y + 5;
    document.roundedRect(54, y, 487, height, 5).strokeColor("#aab7c4").stroke();
    document.y = y + height + 6;
};

export const createBlankHealthDeclarationPdf = (input: BlankHealthDeclarationPdfInput) =>
    new Promise<Buffer>((resolve, reject) => {
        const document = createDaycarePdfDocument({ title: `הצהרת בריאות למילוי - ${input.childName}` });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
        rtl(document, "הצהרת בריאות לילד/ה - למילוי ידני");
        document.moveDown(0.12).font("Assistant").fontSize(14).fillColor("#526174");
        rtl(document, `שם הילד/ה: ${input.childName} | שנת לימודים: ${input.schoolYear}`);
        document.moveDown(0.35);
        blankLine(document, "מצב בריאותי", 52);
        blankLine(document, "רגישויות לתרופות");
        blankLine(document, "קופת חולים");
        blankLine(document, "האם קיימת אלרגיה או רגישות כלשהי, כולל למזון? כן / לא");
        blankLine(document, "אם כן - פירוט האלרגיה או הרגישות", 48);
        blankLine(document, "הנחיות במקרה של חשיפה", 48);

        document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
        rtl(document, "הצהרה ואישור");
        document.moveDown(0.15).font("Assistant").fontSize(14).fillColor("#172033");
        rtl(document, "אני מאשר/ת שהמידע שמסרתי נכון ומלא ומתחייב/ת לעדכן את המעון בכל שינוי במצב הבריאותי של הילד/ה.", { lineGap: 3 });
        document.moveDown(0.25);
        rtl(document, "ידוע לי כי האחריות למסירת מידע מלא ועדכני ולהשלכות הנובעות מאי-מסירתו חלה עליי.", { lineGap: 3 });
        document.moveDown(0.3);
        rtl(document, "שם החותם/ת: ____________________   תפקיד: ______________");
        document.moveDown(0.5);
        rtl(document, "תאריך: ____________________   חתימה: ____________________");

        applyDaycarePdfChrome(document, (pageIndex, pageCount) => `הצהרת בריאות למילוי ידני | עמוד ${pageIndex + 1} מתוך ${pageCount}`);
        document.end();
    });

export const convertHealthImageUploadToPdf = (image: Buffer, mimeType: "image/png" | "image/jpeg") =>
    new Promise<Buffer>((resolve, reject) => {
        const document = new PDFDocument({ size: "A4", margins: { top: 24, right: 24, bottom: 24, left: 24 }, info: { Title: "הצהרת בריאות חתומה ידנית", Author: "מעון חב״ד יפו" } });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        document.image(image, 24, 24, { fit: [547, 794], align: "center", valign: "center" });
        document.end();
    });
