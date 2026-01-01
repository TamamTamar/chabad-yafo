import type { ChabadHouseCard } from "../../components/ChabadHousesCards/ChabadHousesCards";

import shuk from "../../assets/chabad-houses/shuk.jpeg";
import leyafo from "../../assets/chabad-houses/leyafo.jpeg";
import jerusalem from "../../assets/chabad-houses/jerusalem.jpeg";

export const chabadCards: ChabadHouseCard[] = [
   
    {
        id: "main",
        title: "בית כנסת חב״ד נמל יפו",
        subtitle: "רח׳ מרגוזה 123, יפו",
        href: "/chabad/port",
        imageSrc: leyafo,
        imageAlt: "אירוע בבית כנסת חב״ד נמל יפו",
    },
    {
        id: "shuk",
        title: "בית חב״ד שוק הפשפשים",
        subtitle: "חוזה 13, יפו",
        href: "/chabad/shuk",
        imageSrc: shuk,
        imageAlt: "סעודת שבת בבית חב״ד שוק הפשפשים",
        featured: true, // ← זה המרכזי
    },
    {
        id: "events",
        title: "בית חב״ד אירועים וקהילה",
        subtitle: "מרכזי בעיר",
        href: "/chabad/events",
        imageSrc: jerusalem,
        imageAlt: "אירוע קהילתי בשעות ערב",
    },
];
