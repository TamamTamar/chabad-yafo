import mongoose from 'mongoose';
import { statuses } from '../services/shifraPuaValidation';

const mealSchema = new mongoose.Schema({
    deliveryDate: { type: String, required: true },
    address: { type: String, required: true },
    recordedAt: { type: Date, required: true },
    recordedBy: { type: String, required: true },
}, { _id: false });
const schema = new mongoose.Schema({
    motherName: { type: String, required: true, maxlength: 120 },
    phone: { type: String, required: true },
    address: { type: String, required: true, maxlength: 300 },
    birthDate: { type: String, required: true },
    dietaryNotes: { type: String, default: '', maxlength: 2000 },
    filledBy: { type: String, enum: ['mother', 'other'], required: true },
    contactName: { type: String, default: '' },
    contactPhone: { type: String, default: '' },
    consent: { type: Boolean, default: false },
    status: { type: String, enum: statuses, default: 'new', required: true },
    deliveryDate: { type: String, required: true },
    adminNotes: { type: String, default: '', maxlength: 3000 },
    revision: { type: Number, default: 0, required: true },
    mealHistory: { type: [mealSchema], default: [] },
    updatedBy: { type: String, default: '' },
}, { timestamps: true });
schema.index({ phone: 1, birthDate: 1 }, { unique: true, name: 'unique_mother_birth' });
schema.index({ status: 1, deliveryDate: 1 });
schema.index({ createdAt: -1, _id: -1 });
export const ShifraPuaRegistration = mongoose.model('ShifraPuaRegistration', schema);
