import mongoose from 'mongoose';
// Snapshots are parsed by the planning validator before every mutation.
const schema = new mongoose.Schema({
    _id: { type: String, required: true },
    revision: { type: Number, required: true },
    active: { type: Boolean, required: true, default: true },
    recipe: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true });
export const ShifraPuaRecipe = mongoose.model('ShifraPuaRecipe', schema);
const menuSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true, maxlength: 120 },
    recipes: { type: [mongoose.Schema.Types.Mixed], required: true },
}, { timestamps: true });
export const ShifraPuaSavedMenu = mongoose.model('ShifraPuaSavedMenu', menuSchema);
