import { Schema } from "mongoose";
import type { IDaycareAgreementVersion, IDaycareDocumentBlock, IDaycareDocumentListItem, IDaycareDocumentSection } from "../types/daycareAgreement";

const listItemSchema = new Schema<IDaycareDocumentListItem>({ id: { type: String, required: true }, text: { type: String, required: true, maxlength: 5000 } }, { _id: false });
const blockSchema = new Schema<IDaycareDocumentBlock>({
    id: { type: String, required: true },
    type: { type: String, enum: ["paragraph", "bulletList", "numberedList"], required: true },
    text: { type: String, maxlength: 50000 },
    items: { type: [listItemSchema], default: undefined },
}, { _id: false });
const sectionSchema = new Schema<IDaycareDocumentSection>({
    id: { type: String, required: true }, title: { type: String, required: true, maxlength: 500 }, blocks: { type: [blockSchema], required: true },
}, { _id: false });

export const daycareAgreementVersionSchema = new Schema<IDaycareAgreementVersion>({
    documentKey: { type: String, enum: ["daycareAgreement"], default: "daycareAgreement", immutable: true },
    version: { type: String, required: true, trim: true, maxlength: 60, immutable: true },
    schoolYear: { type: String, required: true, match: /^\d{4}-\d{4}$/, index: true, immutable: true },
    format: { type: String, enum: ["structured-v1"], required: true, default: "structured-v1", immutable: true },
    title: { type: String, required: true, trim: true, maxlength: 240 },
    subtitle: { type: String, trim: true, maxlength: 500 },
    intro: { type: [blockSchema], default: [] },
    sections: { type: [sectionSchema], required: true },
    contentHash: { type: String, required: true, match: /^[a-f0-9]{64}$/ },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    effectiveFrom: Date,
    publishedAt: Date,
}, { timestamps: true });

daycareAgreementVersionSchema.index({ documentKey: 1, schoolYear: 1 }, { unique: true });
