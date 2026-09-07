import { Schema, model } from 'mongoose';
import type { SaleContent } from '../types/arbaatHaminim';

const seasonSchema = new Schema({
    content: { type: Schema.Types.Mixed, required: true },
    revision: { type: Number, required: true, default: 0 },
}, { timestamps: true });
export const ArbaatHaminimSeason = model<{ content: SaleContent; revision: number; updatedAt: Date }>('ArbaatHaminimSeason', seasonSchema);
// One atomic published snapshot. Draft saves never change public content.
const publicationSchema = new Schema({
    _id: { type: String, default: 'current' },
    seasonId: { type: String, required: true },
    revision: { type: Number, required: true },
    content: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });
export const ArbaatHaminimPublication = model<{ _id: string; seasonId: string; revision: number; content: SaleContent }>('ArbaatHaminimPublication', publicationSchema);
