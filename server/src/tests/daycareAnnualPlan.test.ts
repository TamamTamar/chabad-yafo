import assert from "node:assert/strict";
import test from "node:test";
import { DAYCARE_ANNUAL_PLAN_2026_2027 } from "../config/daycareAnnualPlan";
import { DAYCARE_PARENT_DOCUMENTS_2026_2027 } from "../config/daycareParentDocuments";
import { createDaycareAnnualPlanPdf } from "../services/daycareAnnualPlanPdfService";
import { parseVacationDatesForAnnualPlan } from "../services/daycareAnnualPlanService";

test("annual curriculum seed contains the complete 2026-2027 editable template", () => {
    const plan = DAYCARE_ANNUAL_PLAN_2026_2027;
    assert.equal(plan.title, "תוכנית נושאי לימוד שנתית");
    assert.equal(plan.schoolYearLabel, "שנת הלימודים תשפ״ז");
    assert.equal(plan.startDate, "2026-09-01");
    assert.equal(plan.endDate, "2027-08-09");
    assert.equal(plan.calendar.vacations.length, 9);
    assert.equal(plan.calendar.anchors.length, 8);
    assert.equal(plan.calendar.specialEvents.length, 4);
    assert.equal(plan.items.length, 51);
    assert.deepEqual([...new Set(plan.items.map((item) => item.month))], ["ספטמבר", "אוקטובר", "נובמבר", "דצמבר", "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט"]);
    assert.deepEqual(plan.items.find((item) => item.dateRange === "11-16.7"), { month: "יולי", dateRange: "11-16.7", topic: "מים בקיץ", specialEvent: "י״ב-י״ג תמוז" });
});

test("annual curriculum stays outside the public parent-document bundle", () => {
    assert.equal("annualPlan" in DAYCARE_PARENT_DOCUMENTS_2026_2027.documents, false);
});

test("annual curriculum produces a printable multi-page PDF", async () => {
    const pdf = await createDaycareAnnualPlanPdf(DAYCARE_ANNUAL_PLAN_2026_2027);
    assert.equal(pdf.subarray(0, 5).toString("ascii"), "%PDF-");
    assert.ok(pdf.length > 5000);
    assert.ok((pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length >= 4);
});

test("holiday calendar date text synchronizes into structured vacation ranges", () => {
    assert.deepEqual(parseVacationDatesForAnnualPlan("יום שישי-ראשון, 11-13.9.2026"), { startDate: "2026-09-11", endDate: "2026-09-13" });
    assert.deepEqual(parseVacationDatesForAnnualPlan("יום שישי-ראשון, 25.9-4.10.2026"), { startDate: "2026-09-25", endDate: "2026-10-04" });
    assert.deepEqual(parseVacationDatesForAnnualPlan("יום רביעי, 12.5.2027"), { startDate: "2027-05-12", endDate: "2027-05-12" });
});
