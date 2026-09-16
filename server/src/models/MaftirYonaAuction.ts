import mongoose from 'mongoose';

export const AUCTION_ID = 'maftir-yona-2026';
export const INITIAL_END = new Date('2026-09-20T14:18:00+03:00');
const schema = new mongoose.Schema({
    _id: { type: String, default: AUCTION_ID },
    name: { type: String, default: 'מכירת זכות מפטיר יונה', required: true },
    openingPrice: { type: Number, default: 1800, required: true },
    minimumIncrement: { type: Number, default: 180, required: true },
    opensAt: { type: Date, default: () => new Date(), required: true },
    endsAt: { type: Date, default: () => INITIAL_END, required: true },
    extensionMs: { type: Number, default: 120000, required: true },
    extensionWindowMs: { type: Number, default: 120000, required: true },
    status: { type: String, enum: ['scheduled', 'open', 'paused', 'ended'], default: 'scheduled', required: true },
    leadingBidId: { type: mongoose.Schema.Types.ObjectId, default: null },
    winnerBidId: { type: mongoose.Schema.Types.ObjectId, default: null },
    revision: { type: Number, default: 0, required: true },
}, { timestamps: true });
export const MaftirYonaAuction = mongoose.model('MaftirYonaAuction', schema);
