import PDFDocument from "pdfkit";
import path from "node:path";
import type { DaycareHealthDeclarationPayload } from "../types/daycareHealthDeclaration";

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

const regularFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Regular.ttf");
const boldFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Bold.ttf");
const logoPath = path.resolve(__dirname, "..", "..", "assets", "logo-maon.png");

const prepareMixedRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9._:/@+-]*/g, (run) => [...run].reverse().join(""));

const rtl = (document: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) =>
    document.text(prepareMixedRtlText(text), { ...options, align: "right", features: ["rtla"] });

const roleLabels = { mother: "אם", father: "אב", guardian: "אפוטרופוס/ית" } as const;

const addLetterhead = (document: PDFKit.PDFDocument) => {
    document.rect(0, 0, document.page.width, 84).fill("#ffffff");
    document.image(logoPath, 491, 9, { fit: [50, 50] });
    document.font("AssistantBold").fontSize(12).fillColor("#0b3158");
    document.text(prepareMixedRtlText("מעון חב״ד יפו"), 54, 15, { align: "right", width: 416, features: ["rtla"] });
    document.font("Assistant").fontSize(9.5).fillColor("#334155");
    document.text(prepareMixedRtlText("יוסי בן יוסי 1, יפו | 054-219-3770"), 250, 35, { align: "right", width: 220, features: ["rtla"] });
    document.strokeColor("#c69b2d").lineWidth(1.2).moveTo(54, 72).lineTo(541, 72).stroke();
};

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
        const document = new PDFDocument({
            size: "A4",
            margins: { top: 82, right: 54, bottom: 54, left: 54 },
            bufferPages: true,
            info: { Title: `הצהרת בריאות - ${input.childName}`, Author: "מעון חב״ד יפו", Subject: input.documentId },
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        document.registerFont("Assistant", regularFontPath);
        document.registerFont("AssistantBold", boldFontPath);

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
        document.font("Assistant").fontSize(9.5).fillColor("#64748b");
        rtl(document, `מזהה מסמך: ${input.documentId}`);
        rtl(document, `טביעת תוכן SHA-256: ${input.contentHash}`);

        const range = document.bufferedPageRange();
        for (let index = range.start; index < range.start + range.count; index += 1) {
            document.switchToPage(index);
            addLetterhead(document);
            document.font("Assistant").fontSize(10.5).fillColor("#4b5563");
            document.text(prepareMixedRtlText(`הצהרת בריאות | עמוד ${index + 1} מתוך ${range.count}`), 54, 790, { width: 487, height: 18, align: "right", lineBreak: false, features: ["rtla"] });
        }
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
        const document = new PDFDocument({ size: "A4", margins: { top: 82, right: 54, bottom: 54, left: 54 }, bufferPages: true, info: { Title: `הצהרת בריאות למילוי - ${input.childName}`, Author: "מעון חב״ד יפו" } });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        document.registerFont("Assistant", regularFontPath);
        document.registerFont("AssistantBold", boldFontPath);

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

        const range = document.bufferedPageRange();
        for (let index = range.start; index < range.start + range.count; index += 1) {
            document.switchToPage(index);
            addLetterhead(document);
            document.font("Assistant").fontSize(10.5).fillColor("#4b5563");
            document.text(prepareMixedRtlText(`הצהרת בריאות למילוי ידני | עמוד ${index + 1} מתוך ${range.count}`), 54, 790, { width: 487, height: 18, align: "right", lineBreak: false, features: ["rtla"] });
        }
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
