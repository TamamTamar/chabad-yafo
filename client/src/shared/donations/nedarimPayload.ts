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
};

export const buildNedarimPayload = (args: BuildNedarimPayloadArgs) => {
  // מבנה payload תואם למה שאת כבר עובדת איתו ב-Nedarim (FinishTransaction2)
  // אם בנדרים אצלך יש שדות נוספים (City וכו') – אפשר להרחיב כאן פעם אחת לכל הקמפיינים.
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
  };
};