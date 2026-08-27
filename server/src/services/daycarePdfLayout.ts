import PDFDocument from "pdfkit";
import path from "node:path";

const regularFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Regular.ttf");
const boldFontPath = path.resolve(__dirname, "..", "..", "assets", "Assistant-Bold.ttf");
const logoPath = path.resolve(__dirname, "..", "..", "assets", "logo-maon.png");

export const DAYCARE_PDF_TYPOGRAPHY = {
    body: 14,
    sectionTitle: 14,
    documentTitle: 18,
    headerTitle: 12,
    headerContact: 9.5,
    footer: 10.5,
    technicalFooter: 9.5,
} as const;

export const DAYCARE_PDF_LAYOUT = {
    contentLeft: 54,
    contentWidth: 487,
    contentTop: 82,
    contentBottom: 770,
    footerY: 784,
    margins: { top: 82, right: 54, bottom: 40, left: 54 },
} as const;

export const DAYCARE_PDF_COLORS = {
    navy: "#0b3158",
    body: "#172033",
    muted: "#526174",
    footer: "#4b5563",
    gold: "#c69b2d",
} as const;

export const prepareDaycareMixedRtlText = (text: string) =>
    text.replace(/[A-Za-z0-9][A-Za-z0-9._:/@+-]*/g, (run) =>
        run.includes("@") ? `\u200E${run}\u200E` : [...run].reverse().join("")
    );

export const writeDaycareRtl = (
    document: PDFKit.PDFDocument,
    text: string,
    options: PDFKit.Mixins.TextOptions = {}
) => document.text(prepareDaycareMixedRtlText(text), { ...options, align: "right", features: ["rtla"] });

export const registerDaycarePdfFonts = (document: PDFKit.PDFDocument) => {
    document.registerFont("Assistant", regularFontPath);
    document.registerFont("AssistantBold", boldFontPath);
};

export const createDaycarePdfDocument = (options: {
    title: string;
    subject?: string;
    margins?: { top: number; right: number; bottom: number; left: number };
    bufferPages?: boolean;
}) => {
    const document = new PDFDocument({
        size: "A4",
        margins: options.margins ?? DAYCARE_PDF_LAYOUT.margins,
        bufferPages: options.bufferPages ?? true,
        info: {
            Title: options.title,
            Author: "מעון חב״ד יפו",
            ...(options.subject ? { Subject: options.subject } : {}),
        },
    });
    registerDaycarePdfFonts(document);
    return document;
};

export const drawDaycarePdfLetterhead = (document: PDFKit.PDFDocument, clearBackground = true) => {
    const contentY = document.y;
    if (clearBackground) document.rect(0, 0, document.page.width, 84).fill("#ffffff");
    document.image(logoPath, 491, 9, { fit: [50, 50] });
    document.font("AssistantBold").fontSize(DAYCARE_PDF_TYPOGRAPHY.headerTitle).fillColor(DAYCARE_PDF_COLORS.navy);
    document.text(prepareDaycareMixedRtlText("מעון חב״ד יפו"), 54, 15, {
        align: "right",
        width: 416,
        lineBreak: false,
        features: ["rtla"],
    });
    document.font("Assistant").fontSize(DAYCARE_PDF_TYPOGRAPHY.headerContact).fillColor("#334155");
    document.text(prepareDaycareMixedRtlText("יוסי בן יוסי 1, יפו | 054-219-3770"), 250, 35, {
        align: "right",
        width: 220,
        lineBreak: false,
        features: ["rtla"],
    });
    document.text("LchabadYaffo@gmail.com", 250, 50, { align: "right", width: 220, lineBreak: false });
    document.strokeColor(DAYCARE_PDF_COLORS.gold).lineWidth(1.2).moveTo(54, 72).lineTo(541, 72).stroke();
    document.y = contentY;
};

export const drawDaycarePdfFooter = (document: PDFKit.PDFDocument, text: string) => {
    document.font("Assistant").fontSize(DAYCARE_PDF_TYPOGRAPHY.footer).fillColor(DAYCARE_PDF_COLORS.footer);
    document.text(prepareDaycareMixedRtlText(text), 54, DAYCARE_PDF_LAYOUT.footerY, {
        width: DAYCARE_PDF_LAYOUT.contentWidth,
        height: 14,
        align: "right",
        lineBreak: false,
        features: ["rtla"],
    });
};

export const applyDaycarePdfChrome = (
    document: PDFKit.PDFDocument,
    footer: (pageIndex: number, pageCount: number) => string,
    includeLetterhead = true
) => {
    const range = document.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
        document.switchToPage(index);
        // Decorating happens after body layout is complete. Reset the cursor
        // first so a body ending below the printable boundary cannot influence
        // PDFKit's explicit header/footer positioning.
        document.x = DAYCARE_PDF_LAYOUT.contentLeft;
        document.y = 116;
        if (includeLetterhead) drawDaycarePdfLetterhead(document);
        drawDaycarePdfFooter(document, footer(index, range.count));
    }
};
