// src/types/chabad.ts
export type ChabadHouseCard = {
    id: string;
    title: string;
    shaliach: string;
    address: string;
    phone: string;
    imageSrc: string;
    imageAlt: string;
    featured?: boolean;
};
