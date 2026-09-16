import mongoose from 'mongoose';

const schema = new mongoose.Schema({
    auctionId: { type: String, required: true, index: true },
    firstName: { type: String, required: true, maxlength: 50 },
    lastName: { type: String, required: true, maxlength: 50 },
    phone: { type: String, required: true },
    amount: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    receivedAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'invalid'], default: 'active', required: true },
    ipHash: { type: String, required: true, select: false },
    requestId: { type: String, required: true, select: false },
    invalidatedAt: Date,
    invalidatedBy: String,
});
schema.index({ auctionId: 1, requestId: 1 }, { unique: true });
schema.index({ auctionId: 1, status: 1, amount: -1, receivedAt: 1 });
schema.index({ auctionId: 1, receivedAt: -1 });
export const MaftirYonaBid = mongoose.model('MaftirYonaBid', schema);

// Shared across server processes; TTL removes abuse counters, not bids.
const limitSchema = new mongoose.Schema({
    _id: String,
    count: { type: Number, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
});
export const MaftirYonaRateLimit = mongoose.model('MaftirYonaRateLimit', limitSchema);
