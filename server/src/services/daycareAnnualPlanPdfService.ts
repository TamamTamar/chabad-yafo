import type { DaycareAnnualPlanDocument } from "../config/daycareAnnualPlan";
import { applyDaycarePdfChrome, createDaycarePdfDocument, prepareDaycareMixedRtlText } from "./daycarePdfLayout";

const CONTENT_LEFT = 54;
const CONTENT_WIDTH = 487;
const CONTENT_BOTTOM = 770;
const displayDate = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? `${Number(match[3])}.${Number(match[2])}.${match[1]}` : value;
};

const startPage = (document: PDFKit.PDFDocument) => {
    document.addPage();
    document.x = CONTENT_LEFT;
    document.y = 82;
    return 82;
};

const textHeight = (document: PDFKit.PDFDocument, text: string, width: number, bold = false, ltr = false) => {
    document.font(bold ? "AssistantBold" : "Assistant").fontSize(13);
    return document.heightOfString(ltr ? `\u200E${text}\u200E` : prepareDaycareMixedRtlText(text), {
        width: width - 16,
        align: ltr ? "center" : "right",
        features: ltr ? [] : ["rtla"],
        lineGap: 1,
    });
};

const drawCellText = (document: PDFKit.PDFDocument, text: string, x: number, y: number, width: number, height: number, options: { bold?: boolean; ltr?: boolean; color?: string } = {}) => {
    const prepared = options.ltr ? `\u200E${text}\u200E` : prepareDaycareMixedRtlText(text);
    const settings: PDFKit.Mixins.TextOptions = { width: width - 16, align: options.ltr ? "center" : "right", features: options.ltr ? [] : ["rtla"], lineGap: 1 };
    document.font(options.bold ? "AssistantBold" : "Assistant").fontSize(13).fillColor(options.color ?? "#243447");
    const heightOfText = document.heightOfString(prepared, settings);
    document.text(prepared, x + 8, y + Math.max(4, (height - heightOfText) / 2), settings);
};

const drawTableHeader = (document: PDFKit.PDFDocument, y: number) => {
    const columns = [{ text: "אירוע / מועד מיוחד", width: 124 }, { text: "תאריך", width: 101 }, { text: "נושא השבוע", width: 262 }];
    document.roundedRect(CONTENT_LEFT, y, CONTENT_WIDTH, 31, 6).fill("#143a63");
    let x = CONTENT_LEFT;
    columns.forEach((column, index) => {
        drawCellText(document, column.text, x, y, column.width, 31, { bold: true, color: "#ffffff" });
        x += column.width;
        if (index < columns.length - 1) document.save().opacity(.22).strokeColor("#ffffff").moveTo(x, y + 7).lineTo(x, y + 24).stroke().restore();
    });
    return y + 31;
};

const drawRow = (document: PDFKit.PDFDocument, item: DaycareAnnualPlanDocument["items"][number], y: number, height: number, alternate: boolean) => {
    const fill = alternate ? "#f5f8fa" : "#ffffff";
    document.rect(CONTENT_LEFT, y, CONTENT_WIDTH, height).fill(fill);
    drawCellText(document, item.specialEvent ?? "", 54, y, 124, height);
    drawCellText(document, item.dateRange, 178, y, 101, height, { bold: true, ltr: true, color: "#0b3158" });
    drawCellText(document, item.topic, 279, y, 262, height, { bold: true, color: "#0b3158" });
    if (item.specialEvent) document.rect(CONTENT_LEFT, y, 3, height).fill("#d7b75e");
    document.strokeColor("#dce6ed").lineWidth(.45).moveTo(CONTENT_LEFT, y + height).lineTo(541, y + height).stroke();
};

export const createDaycareAnnualPlanPdf = (source: DaycareAnnualPlanDocument) => new Promise<Buffer>((resolve, reject) => {
    const document = createDaycarePdfDocument({ title: source.title });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));

    document.font("AssistantBold").fontSize(14).fillColor("#b7791f");
    document.text(prepareDaycareMixedRtlText("מסמך ניהולי"), CONTENT_LEFT, 82, { width: CONTENT_WIDTH, align: "right", lineBreak: false, features: ["rtla"] });
    document.font("AssistantBold").fontSize(20).fillColor("#0b3158");
    document.text(prepareDaycareMixedRtlText(source.title), CONTENT_LEFT, 104, { width: CONTENT_WIDTH, align: "right", lineBreak: false, features: ["rtla"] });
    document.font("Assistant").fontSize(14).fillColor("#8a5a12");
    document.text(prepareDaycareMixedRtlText(`${source.schoolYearLabel} | ${displayDate(source.startDate)}-${displayDate(source.endDate)}`), CONTENT_LEFT, 134, { width: CONTENT_WIDTH, align: "right", lineBreak: false, features: ["rtla"] });
    let y = 164;

    const groups: Array<{ month: string; items: DaycareAnnualPlanDocument["items"] }> = [];
    source.items.forEach((item) => {
        const last = groups.at(-1);
        if (last?.month === item.month) last.items.push(item);
        else groups.push({ month: item.month, items: [item] });
    });

    groups.forEach((group) => {
        const heights = group.items.map((item) => Math.max(38, textHeight(document, item.specialEvent ?? "", 124) + 12, textHeight(document, item.dateRange, 101, true, true) + 12, textHeight(document, item.topic, 262, true) + 12));
        const required = 34 + 31 + heights.reduce((sum, height) => sum + height, 0) + 12;
        if (y + required > CONTENT_BOTTOM && y > 120) y = startPage(document);
        document.roundedRect(CONTENT_LEFT, y, CONTENT_WIDTH, 30, 7).fill("#edf3f7");
        document.rect(537, y, 4, 30).fill("#c69b2d");
        document.font("AssistantBold").fontSize(15).fillColor("#0b3158");
        document.text(prepareDaycareMixedRtlText(group.month), 68, y + 5, { width: 455, align: "right", features: ["rtla"], lineBreak: false });
        y = drawTableHeader(document, y + 34);
        group.items.forEach((item, index) => { drawRow(document, item, y, heights[index], index % 2 === 1); y += heights[index]; });
        y += 12;
    });

    applyDaycarePdfChrome(document, (pageIndex, pageCount) => `${source.title} | עמוד ${pageIndex + 1} מתוך ${pageCount}`);
    document.end();
});
