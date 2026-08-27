import PDFDocument from "pdfkit";
import path from "node:path";
import type { IDaycareAgreementContentSnapshot, DaycareAgreementSignerRole } from "../types/daycareAgreement";
import { createDaycarePdfDocument, prepareDaycareMixedRtlText } from "./daycarePdfLayout";

export { createParentDocumentPdf } from "./daycareParentDocumentPdfService";

type AgreementPdfInput = {
    version: string;
    schoolYear: string;
    contentSnapshot: IDaycareAgreementContentSnapshot;
};

export type AgreementPdfMode = "standard" | "review";

type SignedAgreementPdfInput = AgreementPdfInput & {
    documentId: string;
    documentKey: "daycareAgreement";
    contentHash: string;
    signedBy: string;
    signerRole: DaycareAgreementSignerRole;
    signerIsraeliId: string;
    signatureImage: Buffer;
    acceptedStatement: string;
    signedAt: Date;
    parentDocumentsVersion?: string;
    parentDocumentsHash?: string;
};

const ROLE_LABELS: Record<DaycareAgreementSignerRole, string> = {
    mother: "אם",
    father: "אב",
    guardian: "אפוטרופוס/ית",
};

const letterheadLogoPath = path.resolve(__dirname, "..", "..", "assets", "logo-maon.png");
// PDFKit lays out Hebrew right-to-left but reverses most embedded ASCII runs.
// Email addresses behave better when isolated with an LTR mark; other mixed
// runs are reversed before layout so dates, hashes and IDs remain readable.
const prepareMixedRtlText = prepareDaycareMixedRtlText;

// Agreement prose contains full LTR values (email addresses, dates and time
// ranges) inside Hebrew sentences. Reverse each complete value before PDFKit's
// RTL layout so its visual result remains exactly as entered.
const prepareAgreementMixedRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9.,_:/@+\-\u2013\u2014]*/g, (run) => [...run].reverse().join(""));

const rtlText = (document: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) =>
    document.text(prepareAgreementMixedRtlText(text), { ...options, align: "right", features: ["rtla"] });

const addLetterhead = (document: PDFKit.PDFDocument, contactFontSize = 9.5, compact = false) => {
    const contentY = document.y;
    document.rect(0, 0, document.page.width, compact ? 84 : 110).fill("#ffffff");
    document.image(letterheadLogoPath, compact ? 491 : 469, compact ? 9 : 16, { fit: compact ? [50, 50] : [72, 72] });
    document.font("AssistantBold").fontSize(compact ? 12 : 14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("מעון חב״ד יפו"), 54, compact ? 15 : 27, { align: "right", width: compact ? 416 : 394, lineBreak: false, features: ["rtla"] });
    document.font("Assistant").fontSize(contactFontSize).fillColor("#334155");
    document.text(prepareMixedRtlText("יוסי בן יוסי 1, יפו | 054-219-3770"), 250, compact ? 35 : 50, { align: "right", width: compact ? 220 : 198, lineBreak: false, features: ["rtla"] });
    document.text("LchabadYaffo@gmail.com", 250, compact ? 50 : 68, { align: "right", width: compact ? 220 : 198, lineBreak: false });
    document.strokeColor("#c69b2d").lineWidth(1.2).moveTo(54, compact ? 72 : 98).lineTo(541, compact ? 72 : 98).stroke();
    document.y = contentY;
};

const addHeader = (document: PDFKit.PDFDocument, input: AgreementPdfInput) => {
    document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
    rtlText(document, input.contentSnapshot.title);
    if (input.contentSnapshot.subtitle) {
        document.moveDown(0.12).font("Assistant").fontSize(14).fillColor("#24364b");
        input.contentSnapshot.subtitle.split("\n").forEach((line) => {
            if (/^[0-9.–-]+$/.test(line.trim())) {
                document.text(line.trim(), { align: "right" });
            } else {
                rtlText(document, line);
            }
        });
    }
    document.moveDown(0.18).font("Assistant").fontSize(14).fillColor("#405064");
    rtlText(document, `שנת לימודים ${input.schoolYear}`);
    document.moveDown(0.4).strokeColor("#c69b2d").lineWidth(1.2).moveTo(54, document.y).lineTo(541, document.y).stroke();
    document.moveDown(0.45);
};

const startAgreementPage = (document: PDFKit.PDFDocument, addPage = false) => {
    if (addPage) document.addPage();
    document.x = 54;
    document.y = 82;
    addLetterhead(document, 9.5, true);
    document.x = 54;
    document.y = 82;
};

const keepAgreementPageMargins = (document: PDFKit.PDFDocument) => {
    document.on("pageAdded", () => {
        document.page.margins.top = 82;
        document.x = 54;
        document.y = 82;
    });
};

const ensureAgreementSpace = (document: PDFKit.PDFDocument, requiredHeight: number) => {
    if (document.y + requiredHeight > 770) startAgreementPage(document, true);
    document.x = 54;
};

const renderReviewBanner = (document: PDFKit.PDFDocument) => {
    const y = document.y;
    const height = 78;
    document.roundedRect(54, y, 487, height, 8).fill("#fbf5e5");
    document.rect(537, y, 4, height).fill("#c69b2d");
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.x = 70;
    document.y = y + 10;
    rtlText(document, "עותק לעיון בלבד", { width: 455, lineBreak: false });
    document.font("Assistant").fontSize(14).fillColor("#243447");
    document.x = 70;
    document.y = y + 32;
    rtlText(document, "ההרשמה והחתימה על ההסכם מתבצעות באופן מקוון באמצעות קישור אישי שיישלח על ידי המעון.", {
        width: 455,
        lineGap: 2,
    });
    document.y = y + height + 12;
    document.x = 54;
};

const renderReviewClosing = (document: PDFKit.PDFDocument) => {
    const height = 56;
    if (document.y + height + 12 > 770) startAgreementPage(document, true);
    const y = document.y + 4;
    document.roundedRect(54, y, 487, height, 8).fill("#fbf5e5");
    document.rect(537, y, 4, height).fill("#c69b2d");
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.x = 70;
    document.y = y + 17;
    rtlText(document, "אין לחתום על עותק זה. החתימה מתבצעת באופן מקוון בלבד.", {
        width: 455,
        lineBreak: false,
    });
    document.y = y + height + 8;
    document.x = 54;
};

const renderAgreement = (document: PDFKit.PDFDocument, input: AgreementPdfInput, mode: AgreementPdfMode = "standard") => {
    addHeader(document, input);
    if (mode === "review") renderReviewBanner(document);
    const renderBlock = (block: IDaycareAgreementContentSnapshot["intro"][number]) => {
        document.font("Assistant").fontSize(14).fillColor("#111827");
        const lines = block.type === "paragraph"
            ? [{ text: block.text, lineGap: 2, indent: 0 }]
            : block.items.map((item, index) => ({
                text: `${block.type === "numberedList" ? `${index + 1}.` : "•"} ${item.text}`,
                lineGap: 2,
                indent: 12,
            }));
        const blockHeight = lines.reduce((height, line) => height + document.heightOfString(
            prepareAgreementMixedRtlText(line.text),
            { width: 487, align: "right", features: ["rtla"], lineGap: line.lineGap, indent: line.indent }
        ), 0) + 10;
        ensureAgreementSpace(document, blockHeight);
        lines.forEach((line) => rtlText(document, line.text, { width: 487, indent: line.indent, lineGap: line.lineGap }));
        document.y += 6;
    };
    input.contentSnapshot.intro.forEach(renderBlock);
    input.contentSnapshot.sections.forEach((section, index) => {
        document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
        ensureAgreementSpace(document, 100);
        rtlText(document, `${index + 1}. ${section.title}`, { width: 487, lineGap: 2 });
        document.y += 5;
        section.blocks.forEach(renderBlock);
    });
    if (mode === "review") renderReviewClosing(document);
};

const renderManualSignaturePage = (document: PDFKit.PDFDocument) => {
    startAgreementPage(document, true);
    document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
    rtlText(document, "חתימה ידנית על ההסכם");
    document.moveDown(0.8).font("Assistant").fontSize(14).fillColor("#24364b");
    rtlText(document, "בחתימתם מאשרים ההורים כי קראו את ההסכם, הבינו את תוכנו והם מסכימים לתנאיו.");
    document.moveDown(1.5).fontSize(14).fillColor("#111827");
    rtlText(document, "שם הילד: __________________________________________");
    document.moveDown(1.2);
    rtlText(document, "שם הורה 1: ________________________________________");
    rtlText(document, "תעודת זהות: ________________________________________");
    rtlText(document, "חתימה: ____________________________________________");
    document.moveDown(1.2);
    rtlText(document, "שם הורה 2: ________________________________________");
    rtlText(document, "תעודת זהות: ________________________________________");
    rtlText(document, "חתימה: ____________________________________________");
    document.moveDown(1.2);
    rtlText(document, "תאריך: _____________________________________________");
    document.moveDown(1.2);
    rtlText(document, "מטעם מעון חב״ד יפו: _________________________________");
    rtlText(document, "חתימה: ____________________________________________");
};

const finishPdf = (
    document: PDFKit.PDFDocument,
    footer: (pageIndex: number, pageCount: number) => string,
    includeLetterhead = true,
    typography: { contactFontSize?: number; footerFontSize?: number; compactLetterhead?: boolean } = {}
) => {
    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
        document.switchToPage(index);
        document.y = 116;
        if (includeLetterhead) addLetterhead(document, typography.contactFontSize, typography.compactLetterhead);
        document.font("Assistant").fontSize(typography.footerFontSize ?? 10.5).fillColor("#4b5563");
        document.text(prepareMixedRtlText(footer(index, range.count)), 54, 784, {
            align: "right",
            width: 487,
            height: 14,
            lineBreak: false,
            features: ["rtla"],
        });
    }
    document.end();
};

export const createAgreementPdf = (input: AgreementPdfInput, mode: AgreementPdfMode = "standard") =>
    new Promise<Buffer>((resolve, reject) => {
        const document = createDaycarePdfDocument({
            title: mode === "review" ? `${input.contentSnapshot.title} - עותק לעיון בלבד` : input.contentSnapshot.title,
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        keepAgreementPageMargins(document);
        startAgreementPage(document);

        renderAgreement(document, input, mode);
        if (mode === "standard") renderManualSignaturePage(document);
        finishPdf(document, (pageIndex, pageCount) => mode === "review"
            ? `הסכם התקשרות - עותק לעיון בלבד | עמוד ${pageIndex + 1} מתוך ${pageCount}`
            : `הסכם התקשרות | עמוד ${pageIndex + 1} מתוך ${pageCount}`, true, { contactFontSize: 9.5, footerFontSize: 10.5, compactLetterhead: true });
    });

export const createSignedAgreementPdf = (input: SignedAgreementPdfInput) =>
    new Promise<Buffer>((resolve, reject) => {
        const document = createDaycarePdfDocument({ title: input.contentSnapshot.title, subject: `מסמך ${input.documentId}` });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        keepAgreementPageMargins(document);
        startAgreementPage(document);

        renderAgreement(document, input);

        startAgreementPage(document, true);
        document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
        rtlText(document, "אישור וחתימה מקוונת");
        document.moveDown(1).font("Assistant").fontSize(14).fillColor("#111827");
        rtlText(document, `שם החותם/ת: ${input.signedBy}`);
        rtlText(document, `תפקיד: ${ROLE_LABELS[input.signerRole]}`);
        rtlText(document, `מספר תעודת זהות: ${input.signerIsraeliId}`);
        rtlText(document, `מועד האישור: ${new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeStyle: "medium", timeZone: "Asia/Jerusalem" }).format(input.signedAt)}`);
        rtlText(document, `מזהה מסמך: ${input.documentId}`);
        rtlText(document, `גרסה: ${input.version}`);
        rtlText(document, `טביעת תוכן SHA-256: ${input.contentHash}`, { characterSpacing: 0.2 });
        if (input.parentDocumentsVersion && input.parentDocumentsHash) {
            rtlText(document, `גרסת מסמכי הורים: ${input.parentDocumentsVersion}`);
            rtlText(document, `טביעת מסמכי הורים SHA-256: ${input.parentDocumentsHash}`, { characterSpacing: 0.2 });
        }
        document.moveDown(1);
        const signatureY = document.y;
        document.image(input.signatureImage, 341, signatureY, { fit: [200, 80], align: "right", valign: "center" });
        document.rect(341, signatureY, 200, 80).strokeColor("#c7d1da").stroke();
        document.y = signatureY + 90;
        document.font("Assistant").fontSize(14).fillColor("#405064");
        rtlText(document, "ציור החתימה שנמסר בעת האישור");
        document.moveDown(1).fontSize(14).fillColor("#24364b");
        rtlText(document, input.acceptedStatement, { lineGap: 5 });

        finishPdf(document, (pageIndex, pageCount) => `מסמך ${input.documentId} | עמוד ${pageIndex + 1} מתוך ${pageCount}`, true, { contactFontSize: 9.5, footerFontSize: 10.5, compactLetterhead: true });
    });
