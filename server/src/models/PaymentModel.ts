import mongoose from "mongoose";
import { PaymentSchema } from "../schemas/PaymentSchema";


export const Payment = mongoose.model("Payment", PaymentSchema);