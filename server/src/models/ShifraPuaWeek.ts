import mongoose from 'mongoose';
const entry = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true, maxlength: 200 },
    quantity: { type: String, default: '', maxlength: 40 },
    unit: { type: String, default: '', maxlength: 40 },
    done: { type: Boolean, required: true },
}, { _id: false });
const schema = new mongoose.Schema({
    date: { type: String, required: true, unique: true },
    revision: { type: Number, required: true, default: 0 },
    shopping: { type: [entry], default: [] },
    tasks: { type: [entry], default: [] },
    menu: { type: mongoose.Schema.Types.Mixed, default: null },
    generation: { type: mongoose.Schema.Types.Mixed, default: null },
    menuHistory: { type: [mongoose.Schema.Types.Mixed], default: [] },
}, { timestamps: true });
export const ShifraPuaWeek = mongoose.model('ShifraPuaWeek', schema);
