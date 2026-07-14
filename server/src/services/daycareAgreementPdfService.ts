import PDFDocument from "pdfkit";
import path from "node:path";
import type { IDaycareAgreementContentSnapshot, DaycareAgreementSignerRole } from "../types/daycareAgreement";

type AgreementPdfInput = {
    version: string;
    schoolYear: string;
    contentSnapshot: IDaycareAgreementContentSnapshot;
};

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
};

const ROLE_LABELS: Record<DaycareAgreementSignerRole, string> = {
    mother: "אם",
    father: "אב",
    guardian: "אפוטרופוס/ית",
};

const regularFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Regular.ttf");
const boldFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Bold.ttf");
const letterheadLogoPath = path.resolve(__dirname, "..", "..", "assets", "logo-maon.png");
// PDFKit lays out Hebrew right-to-left but reverses most embedded ASCII runs.
// Email addresses behave better when isolated with an LTR mark; other mixed
// runs are reversed before layout so dates, hashes and IDs remain readable.
const prepareMixedRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9._:/@+-]*/g, (run) =>
        run.includes("@") ? `\u200E${run}\u200E` : [...run].reverse().join("")
    );

const rtlText = (document: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) =>
    document.text(prepareMixedRtlText(text), { ...options, align: "right", features: ["rtla"] });

const registerFonts = (document: PDFKit.PDFDocument) => {
    document.registerFont("Assistant", regularFontPath);
    document.registerFont("AssistantBold", boldFontPath);
};

const addLetterhead = (document: PDFKit.PDFDocument) => {
    const contentY = document.y;
    document.rect(0, 0, document.page.width, 110).fill("#ffffff");
    document.image(letterheadLogoPath, 469, 16, { fit: [72, 72] });
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("מעון חב״ד יפו"), 54, 27, {
        align: "right",
        width: 394,
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("Assistant").fontSize(9.5).fillColor("#334155");
    document.text(prepareMixedRtlText("יוסי בן יוסי 1, יפו | 054-219-3770"), 250, 50, {
        align: "right",
        width: 198,
        lineBreak: false,
        features: ["rtla"],
    });
    document.text("LchabadYaffo@gmail.com", 54, 50, {
        align: "left",
        width: 186,
        lineBreak: false,
    });
    document
        .strokeColor("#c69b2d")
        .lineWidth(1.2)
        .moveTo(54, 98)
        .lineTo(541, 98)
        .stroke();
    document.y = contentY;
};

const addHeader = (document: PDFKit.PDFDocument, input: AgreementPdfInput) => {
    document.font("AssistantBold").fontSize(20).fillColor("#0b3158");
    rtlText(document, input.contentSnapshot.title);
    if (input.contentSnapshot.subtitle) {
        document.moveDown(0.25).font("Assistant").fontSize(11.5).fillColor("#24364b");
        input.contentSnapshot.subtitle.split("\n").forEach((line) => {
            if (/^[0-9.–-]+$/.test(line.trim())) {
                document.text(line.trim(), { align: "right" });
            } else {
                rtlText(document, line);
            }
        });
    }
    document.moveDown(0.35).font("Assistant").fontSize(10).fillColor("#405064");
    rtlText(document, `שנת לימודים ${input.schoolYear} | גרסה ${input.version}`);
    document.moveDown(0.8).strokeColor("#c69b2d").lineWidth(1.2).moveTo(54, document.y).lineTo(541, document.y).stroke();
    document.moveDown(0.9);
};

const renderAgreement = (document: PDFKit.PDFDocument, input: AgreementPdfInput) => {
    addHeader(document, input);
    const renderBlock = (block: IDaycareAgreementContentSnapshot["intro"][number]) => {
        document.font("Assistant").fontSize(11).fillColor("#111827");
        if (block.type === "paragraph") rtlText(document, block.text, { lineGap: 4.5 });
        else block.items.forEach((item, index) => rtlText(document, `${block.type === "numberedList" ? `${index + 1}.` : "•"} ${item.text}`, { indent: 12, lineGap: 3.5 }));
        document.moveDown(0.6);
    };
    input.contentSnapshot.intro.forEach(renderBlock);
    input.contentSnapshot.sections.forEach((section, index) => {
        document.font("AssistantBold").fontSize(13).fillColor("#0b3158");
        rtlText(document, `${index + 1}. ${section.title}`, { lineGap: 3 });
        document.moveDown(0.35);
        section.blocks.forEach(renderBlock);
    });
};

const renderManualSignaturePage = (document: PDFKit.PDFDocument) => {
    document.addPage();
    document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
    rtlText(document, "חתימה ידנית על ההסכם");
    document.moveDown(0.8).font("Assistant").fontSize(11).fillColor("#24364b");
    rtlText(document, "בחתימתם מאשרים ההורים כי קראו את ההסכם, הבינו את תוכנו והם מסכימים לתנאיו.");
    document.moveDown(1.5).fontSize(11.5).fillColor("#111827");
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
    footer: (pageIndex: number, pageCount: number) => string
) => {
    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
        document.switchToPage(index);
        addLetterhead(document);
        document.font("Assistant").fontSize(8.5).fillColor("#4b5563");
        document.text(
            prepareMixedRtlText(footer(index, range.count)),
            54,
            790,
            { align: "right", width: 487, height: 18, lineBreak: false, features: ["rtla"] }
        );
    }
    document.end();
};

export const createAgreementPdf = (input: AgreementPdfInput) =>
    new Promise<Buffer>((resolve, reject) => {
        const document = new PDFDocument({
            size: "A4",
            margins: { top: 116, right: 54, bottom: 62, left: 54 },
            bufferPages: true,
            info: { Title: input.contentSnapshot.title, Author: "מעון חב״ד יפו" },
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        registerFonts(document);

        renderAgreement(document, input);
        renderManualSignaturePage(document);
        finishPdf(document, (pageIndex, pageCount) => `הסכם התקשרות | עמוד ${pageIndex + 1} מתוך ${pageCount}`);
    });

export const createSignedAgreementPdf = (input: SignedAgreementPdfInput) =>
    new Promise<Buffer>((resolve, reject) => {
        const document = new PDFDocument({ size: "A4", margins: { top: 116, right: 54, bottom: 62, left: 54 }, bufferPages: true, info: { Title: input.contentSnapshot.title, Author: "מעון חב״ד יפו", Subject: `מסמך ${input.documentId}` } });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        registerFonts(document);

        renderAgreement(document, input);

        document.addPage();
        document.font("AssistantBold").fontSize(18).fillColor("#0b3158");
        rtlText(document, "אישור וחתימה מקוונת");
        document.moveDown(1).font("Assistant").fontSize(11).fillColor("#111827");
        rtlText(document, `שם החותם/ת: ${input.signedBy}`);
        rtlText(document, `תפקיד: ${ROLE_LABELS[input.signerRole]}`);
        rtlText(document, `מספר תעודת זהות: ${input.signerIsraeliId}`);
        rtlText(document, `מועד האישור: ${new Intl.DateTimeFormat("he-IL", { dateStyle: "long", timeStyle: "medium", timeZone: "Asia/Jerusalem" }).format(input.signedAt)}`);
        rtlText(document, `מזהה מסמך: ${input.documentId}`);
        rtlText(document, `גרסה: ${input.version}`);
        rtlText(document, `טביעת תוכן SHA-256: ${input.contentHash}`, { characterSpacing: 0.2 });
        document.moveDown(1);
        const signatureY = document.y;
        document.image(input.signatureImage, 341, signatureY, { fit: [200, 80], align: "right", valign: "center" });
        document.rect(341, signatureY, 200, 80).strokeColor("#c7d1da").stroke();
        document.y = signatureY + 90;
        document.font("Assistant").fontSize(9.5).fillColor("#405064");
        rtlText(document, "ציור החתימה שנמסר בעת האישור");
        document.moveDown(1).fontSize(10.5).fillColor("#24364b");
        rtlText(document, input.acceptedStatement, { lineGap: 5 });

        finishPdf(document, (pageIndex, pageCount) => `מסמך ${input.documentId} | עמוד ${pageIndex + 1} מתוך ${pageCount}`);
    });
