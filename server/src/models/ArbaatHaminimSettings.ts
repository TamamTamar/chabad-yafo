import { Schema, model } from 'mongoose';
import type { SaleContent } from '../types/arbaatHaminim';

const settingsSchema = new Schema({
    _id: { type: String, default: 'current' },
    revision: { type: Number, required: true, default: 0 },
    content: { type: Schema.Types.Mixed, required: true },
}, { timestamps: true });
// Retain any previously saved public content without copying or deleting data.
export const ArbaatHaminimSettings = model<{ _id: string; revision: number; content: SaleContent }>(
    'ArbaatHaminimSettings', settingsSchema, 'arbaathaminimpublications'
);
