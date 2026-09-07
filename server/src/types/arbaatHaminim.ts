export type SaleItem = { id: string; name: string; price: number | null; description: string; included: string };
export type SaleContent = {
    year: string;
    heroSubtitle: string;
    seoDescription: string;
    catalogIntro: string;
    extrasIntro: string;
    visitIntro: string;
    heroImage: { src: string; alt: string } | null;
    sets: SaleItem[];
    extras: { id: string; name: string; price: number | null }[];
    fulfillmentOptions: { id: string; name: string; details: string }[];
    saleDetails: { label: string; value: string }[];
    faq: { question: string; answer: string }[];
};
export type SaleSeason = { _id: string; content: SaleContent; revision: number; updatedAt: string };
export type SalePublication = { seasonId: string; revision: number; content: SaleContent };
