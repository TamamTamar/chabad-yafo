export type Currency = "1" | "2"; // 1=ILS, 2=USD

export type BuildNedarimPayloadArgs = {
  Mosad: string;
  ApiValid: string;
  Amount: number;
  Tashlumim: number;
  Currency: Currency;
  Description: string;

  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  PaymentType: string
  Comment: string
  CallBack?: string;
  CallBackMailError?: string;

};

export const getNedarimCallbackUrl = () => {
  if (import.meta.env.VITE_NEDARIM_CALLBACK) {
    return import.meta.env.VITE_NEDARIM_CALLBACK;
  }

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
  return `${apiUrl.replace(/\/$/, "")}/payment/payment-callback`;
};

export const buildNedarimPayload = (args: BuildNedarimPayloadArgs) => {
  // מבנה payload תואם למה שאת כבר עובדת איתו ב-Nedarim (FinishTransaction2)
  // אם בנדרים אצלך יש שדות נוספים (City וכו') - אפשר להרחיב כאן פעם אחת לכל הקמפיינים.
  return {
    Mosad: args.Mosad,
    ApiValid: args.ApiValid,
    Amount: args.Amount,
    Tashlumim: args.Tashlumim,
    Currency: args.Currency,
    Description: args.Description,
    FirstName: args.firstName ?? "",
    LastName: args.lastName ?? "",
    Phone: args.phone ?? "",
    Email: args.email ?? "",
    Comment: args.Comment ?? "",
    PaymentType: args.PaymentType ?? "",
    CallBack: args.CallBack ?? getNedarimCallbackUrl(),
    CallBackMailError: args.CallBackMailError ?? "lchabadyaffo@gmail.com",
  };
};
