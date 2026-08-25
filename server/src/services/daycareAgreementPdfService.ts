import PDFDocument from "pdfkit";
import path from "node:path";
import type { IDaycareAgreementContentSnapshot, DaycareAgreementSignerRole } from "../types/daycareAgreement";
import type { DaycareParentDocument, DaycareParentDocumentBundle, DaycareParentDocumentKey } from "../config/daycareParentDocuments";

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

const regularFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Regular.ttf");
const boldFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Bold.ttf");
const letterheadLogoPath = path.resolve(__dirname, "..", "..", "assets", "logo-maon.png");
const whatsappQrPath = path.resolve(__dirname, "..", "..", "assets", "whatsapp-qr.png");
// PDFKit lays out Hebrew right-to-left but reverses most embedded ASCII runs.
// Email addresses behave better when isolated with an LTR mark; other mixed
// runs are reversed before layout so dates, hashes and IDs remain readable.
const prepareMixedRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9._:/@+-]*/g, (run) =>
        run.includes("@") ? `\u200E${run}\u200E` : [...run].reverse().join("")
    );

const prepareWelcomeMixedRtlText = (text: string) =>
    text
        .replace(/[A-Za-z][A-Za-z0-9._:/@+-]*/g, (run) => `\u200E${run}\u200E`)
        .replace(/[0-9][0-9._:/+-]*/g, (run) => [...run].reverse().join(""));

const prepareLtrRunsInRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9.,_:/@+\-\u2013\u2014]*/g, (run) => `\u200E${run}\u200E`);

// Agreement prose contains full LTR values (email addresses, dates and time
// ranges) inside Hebrew sentences. Reverse each complete value before PDFKit's
// RTL layout so its visual result remains exactly as entered.
const prepareAgreementMixedRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9.,_:/@+\-\u2013\u2014]*/g, (run) => [...run].reverse().join(""));

const rtlText = (document: PDFKit.PDFDocument, text: string, options: PDFKit.Mixins.TextOptions = {}) =>
    document.text(prepareAgreementMixedRtlText(text), { ...options, align: "right", features: ["rtla"] });

const registerFonts = (document: PDFKit.PDFDocument) => {
    document.registerFont("Assistant", regularFontPath);
    document.registerFont("AssistantBold", boldFontPath);
};

const addLetterhead = (document: PDFKit.PDFDocument, contactFontSize = 9.5, compact = false) => {
    const contentY = document.y;
    document.rect(0, 0, document.page.width, compact ? 84 : 110).fill("#ffffff");
    document.image(letterheadLogoPath, compact ? 491 : 469, compact ? 9 : 16, { fit: compact ? [50, 50] : [72, 72] });
    document.font("AssistantBold").fontSize(compact ? 12 : 14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("מעון חב״ד יפו"), 54, compact ? 15 : 27, {
        align: "right",
        width: compact ? 416 : 394,
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("Assistant").fontSize(contactFontSize).fillColor("#334155");
    document.text(prepareMixedRtlText("יוסי בן יוסי 1, יפו | 054-219-3770"), 250, compact ? 35 : 50, {
        align: "right",
        width: compact ? 220 : 198,
        lineBreak: false,
        features: ["rtla"],
    });
    document.text("LchabadYaffo@gmail.com", 250, compact ? 50 : 68, {
        align: "right",
        width: compact ? 220 : 198,
        lineBreak: false,
    });
    document
        .strokeColor("#c69b2d")
        .lineWidth(1.2)
        .moveTo(54, compact ? 72 : 98)
        .lineTo(541, compact ? 72 : 98)
        .stroke();
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
    if (document.y + height + 12 > document.page.height - document.page.margins.bottom) startAgreementPage(document, true);
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
    addLetterhead(document, 11.5);
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
        const footerFontSize = typography.footerFontSize ?? 8.5;
        const useLargeFooter = footerFontSize >= 14;
        document.font("Assistant").fontSize(footerFontSize).fillColor("#4b5563");
        document.text(
            prepareMixedRtlText(footer(index, range.count)),
            54,
            useLargeFooter ? 780 : 790,
            { align: "right", width: 487, height: useLargeFooter ? 42 : 18, lineBreak: useLargeFooter, features: ["rtla"] }
        );
    }
    document.end();
};

const renderParentDocumentTitle = (document: PDFKit.PDFDocument, source: DaycareParentDocument, y: number, compact = false) => {
    document.font("AssistantBold").fontSize(14).fillColor("#b7791f");
    document.text(prepareMixedRtlText("מסמך מידע להורים"), 54, y, {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("AssistantBold").fontSize(compact ? 18 : 22).fillColor("#0b3158");
    document.text(prepareMixedRtlText(source.title), 54, y + (compact ? 20 : 24), {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("Assistant").fontSize(14).fillColor("#8a5a12");
    document.text(prepareMixedRtlText(source.subtitle), 54, y + (compact ? 44 : 56), {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    return y + (compact ? 66 : 84);
};

const PARENT_CONTENT_BOTTOM = 770;

const startParentDocumentPage = (document: PDFKit.PDFDocument) => {
    document.addPage();
    document.x = 54;
    document.y = 82;
    addLetterhead(document, 9.5, true);
    document.x = 54;
    document.y = 82;
    return 82;
};

const ensureParentSpace = (document: PDFKit.PDFDocument, y: number, requiredHeight: number) =>
    y + requiredHeight > PARENT_CONTENT_BOTTOM ? startParentDocumentPage(document) : y;

const drawCellText = (
    document: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    bold = false,
    color = "#243447",
    fontSize = 14,
    direction: "auto" | "ltr" | "mixed-ltr" | "holiday-date" = "auto"
) => {
    if (direction === "holiday-date") {
        const match = text.match(/^(.*?),\s*([0-9].*)$/);
        if (match) {
            document.font(bold ? "AssistantBold" : "Assistant").fontSize(fontSize).fillColor(color);
            const firstLineY = y + Math.max(3, (height - 34) / 2);
            document.text(prepareMixedRtlText(`${match[1]},`), x + 8, firstLineY, {
                width: width - 16,
                align: "right",
                features: ["rtla"],
                lineBreak: false,
            });
            document.text(`\u200E${match[2]}\u200E`, x + 8, firstLineY + 18, {
                width: width - 16,
                align: "center",
                lineBreak: false,
            });
            return;
        }
    }
    const isLtr = direction === "ltr" || /^[0-9:.-]+$/.test(text);
    const preparedText = isLtr
        ? `\u200E${text}\u200E`
        : direction === "mixed-ltr"
            ? prepareLtrRunsInRtlText(text)
            : prepareMixedRtlText(text);
    const textOptions: PDFKit.Mixins.TextOptions = {
        width: width - 16,
        align: isLtr ? "center" : "right",
        features: isLtr ? [] : ["rtla"],
        lineGap: 1.5,
    };
    document.font(bold ? "AssistantBold" : "Assistant").fontSize(fontSize).fillColor(color);
    const textHeight = document.heightOfString(preparedText, textOptions);
    document.text(preparedText, x + 8, y + Math.max(4, (height - textHeight) / 2), textOptions);
};

const drawTableRow = (
    document: PDFKit.PDFDocument,
    cells: Array<{ text: string; width: number; bold?: boolean; direction?: "ltr" | "mixed-ltr" | "holiday-date" }>,
    y: number,
    height: number,
    fill: string,
    fontSize = 14,
    boldFontSize = fontSize
) => {
    let x = 54;
    cells.forEach((cell) => {
        document.rect(x, y, cell.width, height).fill(fill);
        drawCellText(
            document,
            cell.text,
            x,
            y,
            cell.width,
            height,
            cell.bold,
            cell.bold ? "#0b3158" : "#243447",
            cell.bold ? boldFontSize : fontSize,
            cell.direction ?? "auto"
        );
        x += cell.width;
    });
    document.strokeColor("#dce6ed").lineWidth(0.45).moveTo(54, y + height).lineTo(541, y + height).stroke();
};

const drawTableHeader = (
    document: PDFKit.PDFDocument,
    cells: Array<{ text: string; width: number }>,
    y: number,
    height = 30,
    fontSize = 14
) => {
    document.roundedRect(54, y, 487, height, 6).fill("#143a63");
    let x = 54;
    cells.forEach((cell, index) => {
        drawCellText(document, cell.text, x, y, cell.width, height, true, "#ffffff", fontSize);
        x += cell.width;
        if (index < cells.length - 1) {
            document.save().opacity(0.22).strokeColor("#ffffff").lineWidth(0.6).moveTo(x, y + 7).lineTo(x, y + height - 7).stroke().restore();
        }
    });
    return y + height;
};

const drawWelcomeSectionTitle = (document: PDFKit.PDFDocument, title: string, y: number) => {
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText(title), 54, y, {
        width: 487,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
    document.strokeColor("#c69b2d").lineWidth(1).moveTo(54, y + 19).lineTo(541, y + 19).stroke();
    return y + 25;
};

const drawWelcomeParagraphs = (
    document: PDFKit.PDFDocument,
    paragraphs: string[],
    y: number,
    options: { width?: number; x?: number; fontSize?: number; lineGap?: number; gap?: number; color?: string; paginate?: boolean } = {}
) => {
    const x = options.x ?? 54;
    const width = options.width ?? 487;
    const fontSize = Math.max(14, options.fontSize ?? 14);
    const lineGap = options.lineGap ?? 3;
    const gap = options.gap ?? 7;
    document.font("Assistant").fontSize(fontSize).fillColor(options.color ?? "#243447");
    paragraphs.forEach((paragraph) => {
        const prepared = prepareWelcomeMixedRtlText(paragraph);
        const textOptions: PDFKit.Mixins.TextOptions = { width, align: "right", features: ["rtla"], lineGap };
        const paragraphHeight = document.heightOfString(prepared, textOptions);
        if (options.paginate && y + paragraphHeight + gap > PARENT_CONTENT_BOTTOM) y = startParentDocumentPage(document);
        document.text(prepared, x, y, textOptions);
        y += paragraphHeight + gap;
    });
    return y;
};

const renderWelcomeDocument = (document: PDFKit.PDFDocument, source: Extract<DaycareParentDocument, { key: "welcome" }>, startY: number) => {
    let y = drawWelcomeParagraphs(document, source.intro, startY, { fontSize: 14, lineGap: 0.5, gap: 2 });

    y = drawWelcomeSectionTitle(document, "שעות הפעילות", y + 1);
    const hoursBoxHeight = 58;
    document.roundedRect(54, y, 487, hoursBoxHeight, 8).fill("#f1f6f9");
    document.rect(537, y, 4, hoursBoxHeight).fill("#c69b2d");
    document.font("AssistantBold").fontSize(14).fillColor("#143a63");
    document.text(prepareMixedRtlText(source.hours.weekdays), 300, y + 7, { width: 225, align: "right", features: ["rtla"] });
    document.text(prepareMixedRtlText(source.hours.friday), 70, y + 7, { width: 215, align: "right", features: ["rtla"] });
    document.font("Assistant").fontSize(14).fillColor("#243447");
    document.text(prepareMixedRtlText(source.hours.address), 70, y + 32, { width: 455, align: "right", features: ["rtla"], lineBreak: false });
    y += hoursBoxHeight + 3;

    y = drawWelcomeSectionTitle(document, "היום שלנו", y);
    y = drawWelcomeParagraphs(document, source.day, y, { fontSize: 14, lineGap: 0.5, gap: 2 });

    y = drawWelcomeSectionTitle(document, "קשר עם ההורים", y + 1);
    y = drawWelcomeParagraphs(document, source.parents, y, { fontSize: 14, lineGap: 0.5, gap: 2 });
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText(`${source.contactName} | ${source.contactPhone}`), 54, y, { width: 487, align: "right", features: ["rtla"], lineBreak: false });
    y += 20;

    const joinTextX = 176;
    const joinTextWidth = 349;
    const joinTextOptions: PDFKit.Mixins.TextOptions = { width: joinTextWidth, align: "right", features: ["rtla"], lineGap: 0.5 };
    document.font("Assistant").fontSize(14);
    const joinTextHeight = source.join.reduce((sum, paragraph) => sum + document.heightOfString(prepareWelcomeMixedRtlText(paragraph), joinTextOptions) + 2, 0);
    const joinBoxHeight = Math.max(132, 48 + joinTextHeight);
    document.roundedRect(54, y, 487, joinBoxHeight, 9).fill("#fbf5e5");
    document.rect(537, y, 4, joinBoxHeight).fill("#c69b2d");
    document.image(whatsappQrPath, 78, y + 12, { fit: [70, 70] });
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("סרקו לשיחה בוואטסאפ"), 62, y + 86, {
        width: 102,
        align: "center",
        features: ["rtla"],
    });
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("רוצים להצטרף אלינו?"), joinTextX, y + 10, { width: joinTextWidth, align: "right", features: ["rtla"], lineBreak: false });
    let joinY = y + 34;
    joinY = drawWelcomeParagraphs(document, source.join, joinY, { x: joinTextX, width: joinTextWidth, fontSize: 14, lineGap: 0.5, gap: 2, color: "#243447" });
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText(`${source.contactName} | ${source.contactPhone}`), joinTextX, joinY, { width: joinTextWidth, align: "right", features: ["rtla"], lineBreak: false });
    document.y = y + joinBoxHeight + 8;
};

const renderParentDocument = (document: PDFKit.PDFDocument, source: DaycareParentDocument) => {
    let y = renderParentDocumentTitle(document, source, 82, true);
    if (source.key === "welcome") {
        renderWelcomeDocument(document, source, y);
        return;
    }
    if (source.key === "routine") {
        const headerHeight = 40;
        const noteGap = 10;
        const noteHeight = 64;
        const contentBottom = 760;
        y = drawTableHeader(document, [{ text: "פעילות", width: 365 }, { text: "שעה", width: 122 }], y, headerHeight, 14);
        const availableRowsHeight = contentBottom - y - noteGap - noteHeight;
        // Preserve the 14pt type even for an unusually long routine. Tighten
        // vertical padding first so the complete routine remains on one A4 page.
        const rowHeight = Math.max(26, Math.min(40, Math.floor(availableRowsHeight / Math.max(1, source.items.length))));
        source.items.forEach((item, index) => {
            drawTableRow(document, [
                { text: item.activity, width: 365 },
                { text: item.time, width: 122, bold: true, direction: "ltr" },
            ], y, rowHeight, index % 2 ? "#f1f6f9" : "#ffffff", 14, 14);
            y += rowHeight;
        });
        y += noteGap;
        document.roundedRect(54, y, 487, noteHeight, 7).fill("#fbf5e5");
        document.rect(537, y, 4, noteHeight).fill("#c69b2d");
        drawCellText(document, source.note, 54, y, 487, noteHeight, true, "#143a63", 14);
        document.y = y + noteHeight + 10;
        return;
    }

    if (source.key === "menu") {
        const menuColumns = [
            { text: "מנחה", width: 102 },
            { text: "צהריים", width: 133 },
            { text: "בוקר", width: 157 },
            { text: "יום", width: 95 },
        ];
        const drawMenuHeader = (headerY: number) => drawTableHeader(document, menuColumns, headerY, 40, 14);
        const menuTextHeight = (text: string, width: number) => {
            document.font("Assistant").fontSize(14);
            return document.heightOfString(prepareMixedRtlText(text), {
                width: width - 16,
                align: "right",
                features: ["rtla"],
                lineGap: 1.5,
            });
        };
        y = drawMenuHeader(y);
        source.items.forEach((item, index) => {
            const rowHeight = Math.max(
                54,
                menuTextHeight(item.afternoon ?? "", 102) + 18,
                menuTextHeight(item.lunch ?? "", 133) + 18,
                menuTextHeight(item.breakfast, 157) + 18,
                menuTextHeight(item.day, 95) + 18
            );
            if (y + rowHeight > PARENT_CONTENT_BOTTOM) y = drawMenuHeader(startParentDocumentPage(document));
            drawTableRow(document, [
                { text: item.afternoon ?? "", width: 102 },
                { text: item.lunch ?? "", width: 133 },
                { text: item.breakfast, width: 157 },
                { text: item.day, width: 95, bold: true },
            ], y, rowHeight, index % 2 ? "#f1f6f9" : "#ffffff", 14, 14);
            y += rowHeight;
        });
        if (source.note) {
            const noteHeight = Math.max(64, menuTextHeight(source.note, 487) + 22);
            y = ensureParentSpace(document, y + 14, noteHeight);
            document.roundedRect(54, y, 487, noteHeight, 7).fill("#fbf5e5");
            drawCellText(document, source.note, 54, y, 487, noteHeight, true, "#143a63", 14);
            y += noteHeight + 10;
        }
        document.y = y;
        return;
    }

    if (source.key === "equipment") {
        const equipmentTextHeight = (text: string, width: number, bold = false) => {
            document.font(bold ? "AssistantBold" : "Assistant").fontSize(14);
            return document.heightOfString(prepareMixedRtlText(text), { width, align: "right", features: ["rtla"], lineGap: 0.5 });
        };
        source.items.forEach((item, index) => {
            const textHeight = equipmentTextHeight(item, 425);
            const rowHeight = Math.max(44, textHeight + 10);
            y = ensureParentSpace(document, y, rowHeight);
            document.roundedRect(54, y, 487, rowHeight - 4, 7).fill(index % 2 ? "#f1f6f9" : "#ffffff");
            document.circle(521, y + (rowHeight - 4) / 2, 11).fill("#c69b2d");
            document.font("AssistantBold").fontSize(14).fillColor("#ffffff");
            document.text(String(index + 1), 510, y + (rowHeight - 4) / 2 - 8, { width: 22, align: "center", lineBreak: false });
            document.font("Assistant").fontSize(14).fillColor("#243447");
            document.text(prepareMixedRtlText(item), 72, y + Math.max(3, (rowHeight - 4 - textHeight) / 2), { width: 425, align: "right", features: ["rtla"], lineGap: 0.5 });
            y += rowHeight;
        });
        const importantHeight = Math.max(56, equipmentTextHeight(source.important, 455, true) + 16);
        y = ensureParentSpace(document, y + 8, importantHeight);
        document.roundedRect(54, y, 487, importantHeight, 8).fill("#fbf5e5");
        document.rect(537, y, 4, importantHeight).fill("#c69b2d");
        drawCellText(document, source.important, 54, y, 487, importantHeight, true, "#143a63", 14);
        y += importantHeight + 8;
        const noteTextHeight = equipmentTextHeight(source.note, 455);
        const noteHeight = Math.max(64, noteTextHeight + 18);
        y = ensureParentSpace(document, y, noteHeight);
        document.roundedRect(54, y, 487, noteHeight, 8).fill("#f1f6f9");
        document.font("Assistant").fontSize(14).fillColor("#243447");
        document.text(prepareMixedRtlText(source.note), 70, y + Math.max(7, (noteHeight - noteTextHeight) / 2), { width: 455, align: "right", features: ["rtla"], lineGap: 0.5 });
        document.y = y + noteHeight + 10;
        return;
    }

    const holidayColumns = [
        { text: "תאריכי החופשה", width: 145 },
        { text: "תאריך עברי", width: 157 },
        { text: "מועד", width: 185 },
    ];
    const drawHolidayHeader = (headerY: number) => drawTableHeader(document, holidayColumns, headerY, 36, 14);
    const holidayTextHeight = (text: string, width: number, bold = false) => {
        document.font(bold ? "AssistantBold" : "Assistant").fontSize(14);
        return document.heightOfString(prepareMixedRtlText(text), {
            width: width - 16,
            align: "right",
            features: ["rtla"],
            lineGap: 1.5,
        });
    };
    y = drawHolidayHeader(y);
    source.items.forEach((item, index) => {
        const rowHeight = Math.max(
            48,
            holidayTextHeight(item.vacationDates, 145) + 12,
            holidayTextHeight(item.hebrewDate, 157) + 12,
            holidayTextHeight(item.occasion, 185, true) + 12
        );
        if (y + rowHeight > PARENT_CONTENT_BOTTOM) y = drawHolidayHeader(startParentDocumentPage(document));
        drawTableRow(document, [
            { text: item.vacationDates, width: 145, direction: "holiday-date" },
            { text: item.hebrewDate, width: 157 },
            { text: item.occasion, width: 185, bold: true },
        ], y, rowHeight, index % 2 ? "#f1f6f9" : "#ffffff", 14, 14);
        y += rowHeight;
    });
    y += 6;
    document.font("Assistant").fontSize(14);
    const clarificationHeights = source.clarifications.map((item, index) => document.heightOfString(
        prepareMixedRtlText(`${index + 1}. ${item}`),
        { width: 455, align: "right", features: ["rtla"], lineGap: 0.5 }
    ));
    const clarificationBoxHeight = 30 + clarificationHeights.reduce((sum, height) => sum + height + 1, 0);
    y = ensureParentSpace(document, y, clarificationBoxHeight);
    document.roundedRect(54, y, 487, clarificationBoxHeight, 8).fill("#fbf5e5");
    document.rect(537, y, 4, clarificationBoxHeight).fill("#c69b2d");
    document.font("AssistantBold").fontSize(14).fillColor("#0b3158");
    document.text(prepareMixedRtlText("הבהרות חשובות"), 68, y + 5, { width: 455, align: "right", features: ["rtla"] });
    document.font("Assistant").fontSize(14).fillColor("#243447");
    let clarificationY = y + 25;
    source.clarifications.forEach((item, index) => {
        document.text(prepareMixedRtlText(`${index + 1}. ${item}`), 68, clarificationY, {
            width: 455,
            align: "right",
            lineGap: 0.5,
            features: ["rtla"],
        });
        clarificationY += clarificationHeights[index] + 1;
    });
    document.y = y + clarificationBoxHeight + 10;
};

export const createParentDocumentPdf = (bundle: DaycareParentDocumentBundle, key: DaycareParentDocumentKey) =>
    new Promise<Buffer>((resolve, reject) => {
        const source: DaycareParentDocument = bundle.documents[key];
        const document = new PDFDocument({
            size: "A4",
            margins: { top: 82, right: 54, bottom: 62, left: 54 },
            bufferPages: true,
            info: { Title: source.title, Author: "מעון חב״ד יפו" },
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        registerFonts(document);
        addLetterhead(document, 9.5, true);
        renderParentDocument(document, source);
        finishPdf(
            document,
            (pageIndex, pageCount) => pageCount === 1
                ? "מעון חב״ד יפו | מידע להורים"
                : `${source.title} | עמוד ${pageIndex + 1} מתוך ${pageCount}`,
            true,
            { contactFontSize: 9.5, footerFontSize: 10.5, compactLetterhead: true }
        );
    });

export const createAgreementPdf = (input: AgreementPdfInput, mode: AgreementPdfMode = "standard") =>
    new Promise<Buffer>((resolve, reject) => {
        const document = new PDFDocument({
            size: "A4",
            margins: { top: 116, right: 54, bottom: 62, left: 54 },
            bufferPages: true,
            info: { Title: mode === "review" ? `${input.contentSnapshot.title} - עותק לעיון בלבד` : input.contentSnapshot.title, Author: "מעון חב״ד יפו" },
        });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        registerFonts(document);
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
        const document = new PDFDocument({ size: "A4", margins: { top: 82, right: 54, bottom: 62, left: 54 }, bufferPages: true, info: { Title: input.contentSnapshot.title, Author: "מעון חב״ד יפו", Subject: `מסמך ${input.documentId}` } });
        const chunks: Buffer[] = [];
        document.on("data", (chunk: Buffer) => chunks.push(chunk));
        document.on("error", reject);
        document.on("end", () => resolve(Buffer.concat(chunks)));
        registerFonts(document);
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
