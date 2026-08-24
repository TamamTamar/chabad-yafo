import PDFDocument from "pdfkit";
import path from "node:path";
import type { IDaycareAgreementContentSnapshot, DaycareAgreementSignerRole } from "../types/daycareAgreement";
import type { DaycareParentDocument, DaycareParentDocumentBundle } from "../config/daycareParentDocuments";

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
    parentDocumentsVersion?: string;
    parentDocumentsHash?: string;
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
    footer: (pageIndex: number, pageCount: number) => string,
    includeLetterhead = true
) => {
    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
        document.switchToPage(index);
        document.y = 116;
        if (includeLetterhead) addLetterhead(document);
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

const renderParentDocumentTitle = (document: PDFKit.PDFDocument, source: DaycareParentDocument, y: number) => {
    document.font("AssistantBold").fontSize(8.8).fillColor("#b7791f");
    document.text(prepareMixedRtlText("מסמך מידע להורים"), 54, y, {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("AssistantBold").fontSize(20).fillColor("#0b3158");
    document.text(prepareMixedRtlText(source.title), 54, y + 18, {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("Assistant").fontSize(10.8).fillColor("#8a5a12");
    document.text(prepareMixedRtlText(source.subtitle), 54, y + 47, {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    return y + 69;
};

const drawCellText = (
    document: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    bold = false,
    color = "#243447"
) => {
    const isAsciiTime = /^[0-9:.-]+$/.test(text);
    const preparedText = isAsciiTime ? text : prepareMixedRtlText(text);
    const textOptions: PDFKit.Mixins.TextOptions = {
        width: width - 16,
        align: isAsciiTime ? "center" : "right",
        features: isAsciiTime ? [] : ["rtla"],
        lineGap: 1.5,
    };
    document.font(bold ? "AssistantBold" : "Assistant").fontSize(8.7).fillColor(color);
    const textHeight = document.heightOfString(preparedText, textOptions);
    document.text(preparedText, x + 8, y + Math.max(4, (height - textHeight) / 2), textOptions);
};

const drawTableRow = (
    document: PDFKit.PDFDocument,
    cells: Array<{ text: string; width: number; bold?: boolean }>,
    y: number,
    height: number,
    fill: string
) => {
    let x = 54;
    cells.forEach((cell) => {
        document.rect(x, y, cell.width, height).fill(fill);
        drawCellText(document, cell.text, x, y, cell.width, height, cell.bold, cell.bold ? "#0b3158" : "#243447");
        x += cell.width;
    });
    document.strokeColor("#dce6ed").lineWidth(0.45).moveTo(54, y + height).lineTo(541, y + height).stroke();
};

const drawTableHeader = (document: PDFKit.PDFDocument, cells: Array<{ text: string; width: number }>, y: number) => {
    const height = 30;
    document.roundedRect(54, y, 487, height, 6).fill("#143a63");
    let x = 54;
    cells.forEach((cell, index) => {
        drawCellText(document, cell.text, x, y, cell.width, height, true, "#ffffff");
        x += cell.width;
        if (index < cells.length - 1) {
            document.save().opacity(0.22).strokeColor("#ffffff").lineWidth(0.6).moveTo(x, y + 7).lineTo(x, y + height - 7).stroke().restore();
        }
    });
    return y + height;
};

const renderParentDocument = (document: PDFKit.PDFDocument, source: DaycareParentDocument) => {
    let y = renderParentDocumentTitle(document, source, 116);
    if (source.key === "routine") {
        y = drawTableHeader(document, [{ text: "פעילות", width: 365 }, { text: "שעה", width: 122 }], y);
        source.items.forEach((item, index) => {
            const rowHeight = 24;
            drawTableRow(document, [
                { text: item.activity, width: 365 },
                { text: item.time, width: 122, bold: true },
            ], y, rowHeight, index % 2 ? "#f1f6f9" : "#ffffff");
            y += rowHeight;
        });
        y += 14;
        document.roundedRect(54, y, 487, 46, 7).fill("#fbf5e5");
        document.rect(537, y, 4, 46).fill("#c69b2d");
        drawCellText(document, source.note, 54, y, 487, 46, true, "#143a63");
        document.y = y + 56;
        return;
    }

    if (source.key === "menu") {
        y = drawTableHeader(document, [{ text: "תיאור", width: 347 }, { text: "ארוחה", width: 140 }], y);
        source.items.forEach((item, index) => {
            const rowHeight = item.description.length > 70 ? 46 : 34;
            drawTableRow(document, [
                { text: item.description, width: 347 },
                { text: item.meal, width: 140, bold: true },
            ], y, rowHeight, index % 2 ? "#f1f6f9" : "#ffffff");
            y += rowHeight;
        });
        if (source.note) {
            y += 16;
            document.roundedRect(54, y, 487, 44, 7).fill("#fbf5e5");
            drawCellText(document, source.note, 54, y, 487, 44, true, "#143a63");
            y += 54;
        }
        document.y = y;
        return;
    }

    y = drawTableHeader(document, [
        { text: "תאריכי החופשה", width: 145 },
        { text: "תאריך עברי", width: 157 },
        { text: "מועד", width: 185 },
    ], y);
    source.items.forEach((item, index) => {
        const rowHeight = item.occasion.length > 24 || item.vacationDates.length > 25 ? 44 : 40;
        drawTableRow(document, [
            { text: item.vacationDates, width: 145 },
            { text: item.hebrewDate, width: 157 },
            { text: item.occasion, width: 185, bold: true },
        ], y, rowHeight, index % 2 ? "#f1f6f9" : "#ffffff");
        y += rowHeight;
    });
    y += 14;
    document.roundedRect(54, y, 487, 104, 8).fill("#fbf5e5");
    document.rect(537, y, 4, 104).fill("#c69b2d");
    document.font("AssistantBold").fontSize(11.5).fillColor("#0b3158");
    document.text(prepareMixedRtlText("הבהרות חשובות"), 68, y + 10, { width: 455, align: "right", features: ["rtla"] });
    document.font("Assistant").fontSize(8.6).fillColor("#243447");
    source.clarifications.forEach((item, index) => {
        document.text(prepareMixedRtlText(`${index + 1}. ${item}`), 68, y + 34 + index * 16, {
            width: 455,
            height: 16,
            align: "right",
            lineBreak: false,
            features: ["rtla"],
        });
    });
    document.y = y + 114;
};

export const createParentDocumentPdf = (bundle: DaycareParentDocumentBundle, key: DaycareParentDocument["key"]) =>
    new Promise<Buffer>((resolve, reject) => {
        const source = bundle.documents[key];
        const document = new PDFDocument({
            size: "A4",
            margins: { top: 116, right: 54, bottom: 62, left: 54 },
            bufferPages: true,
            info: { Title: source.title, Author: "מעון חב״ד יפו" },
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        registerFonts(document);
        addLetterhead(document);
        renderParentDocument(document, source);
        finishPdf(
            document,
            (pageIndex, pageCount) => pageCount === 1
                ? "מעון חב״ד יפו | מידע להורים"
                : `${source.title} | עמוד ${pageIndex + 1} מתוך ${pageCount}`,
            false
        );
    });

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
        if (input.parentDocumentsVersion && input.parentDocumentsHash) {
            rtlText(document, `גרסת מסמכי הורים: ${input.parentDocumentsVersion}`);
            rtlText(document, `טביעת מסמכי הורים SHA-256: ${input.parentDocumentsHash}`, { characterSpacing: 0.2 });
        }
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
