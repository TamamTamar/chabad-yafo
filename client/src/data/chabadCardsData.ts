import type { ChabadHouseCard } from "../types/chabad";

import tzahalon from "../assets/chabad-houses/tzahalon.jpeg";
import center from "../assets/chabad-houses/center.jpeg";
import kampus from "../assets/chabad-houses/kampus.jpeg";


export const chabadCards: ChabadHouseCard[] = [
    {
        id: "tzahalon",
        title: "בית חב״ד שכונת צהלון",
        shaliach: "הרב מענדי חבקין",
        address: "מיכאלאנגלו 31, יפו",
        phone: "054-626-4195",
        imageSrc: tzahalon,
        imageAlt: "בית חב״ד שכונת צהלון יפו",
    },
    {
        id: "center",
        title: "בית חב״ד המרכזי",
        shaliach: "הרב לוי יצחק תמם",
        address: "עולי ציון 30, שוק הפשפשים",
        phone: "053-770-0339",
        imageSrc: center,
        imageAlt: "בית חב״ד המרכזי בשוק הפשפשים יפו",
        featured: true,
    },
    {
        id: "kampus",
        title: "חב״ד בקמפוס",
        shaliach: "הרב שמוליק קפלן",
        address: "המכללה האקדמית יפו",
        phone: "053-302-4315",
        imageSrc: kampus,
        imageAlt: "חב״ד בקמפוס המכללה האקדמית יפו",
    },
];
