// src/data/galleryData.ts

// === Holidays 1-19 ===
import holiday1 from "../assets/gallery/holidays/h1.jpg";
import holiday2 from "../assets/gallery/holidays/h2.jpg";
import holiday3 from "../assets/gallery/holidays/h3.jpg";
import holiday4 from "../assets/gallery/holidays/h4.jpg";
import holiday5 from "../assets/gallery/holidays/h5.jpg";
import holiday6 from "../assets/gallery/holidays/h6.jpg";
import holiday7 from "../assets/gallery/holidays/h7.jpg";
import holiday8 from "../assets/gallery/holidays/h8.jpg";
import holiday9 from "../assets/gallery/holidays/h9.jpg";
import holiday10 from "../assets/gallery/holidays/h10.jpg";
import holiday11 from "../assets/gallery/holidays/h11.jpg";
import holiday12 from "../assets/gallery/holidays/h12.jpg";
import holiday13 from "../assets/gallery/holidays/h13.jpg";
import holiday14 from "../assets/gallery/holidays/h14.jpg";
import holiday15 from "../assets/gallery/holidays/h15.jpg";
import holiday16 from "../assets/gallery/holidays/h16.jpg";
import holiday17 from "../assets/gallery/holidays/h17.jpg";
import holiday18 from "../assets/gallery/holidays/h18.jpg";
import holiday19 from "../assets/gallery/holidays/h19.jpg";

// === Community 1-5 ===
import community1 from "../assets/gallery/community/c1.jpg";
import community2 from "../assets/gallery/community/c2.jpg";
import community3 from "../assets/gallery/community/c3.jpg";
import community4 from "../assets/gallery/community/c4.jpg";
import community5 from "../assets/gallery/community/c5.jpg";

// === Street 1-18 ===
import street1 from "../assets/gallery/street/s1.jpg";
import street2 from "../assets/gallery/street/s2.jpg";
import street3 from "../assets/gallery/street/s3.jpg";
import street4 from "../assets/gallery/street/s4.jpg";
import street5 from "../assets/gallery/street/s5.jpg";
import street6 from "../assets/gallery/street/s6.jpg";
import street7 from "../assets/gallery/street/s7.jpg";
import street8 from "../assets/gallery/street/s8.jpg";
import street9 from "../assets/gallery/street/s9.jpg";
import street10 from "../assets/gallery/street/s10.jpg";
import street11 from "../assets/gallery/street/s11.jpg";
import street12 from "../assets/gallery/street/s12.jpg";
import street13 from "../assets/gallery/street/s13.jpg";
import street14 from "../assets/gallery/street/s14.jpg";
import street15 from "../assets/gallery/street/s15.jpg";
import street16 from "../assets/gallery/street/s16.jpg";
import street17 from "../assets/gallery/street/s17.jpg";
import street18 from "../assets/gallery/street/s18.jpg";

// === light 1-28 ===

import light1 from "../assets/gallery/light/l1.jpg";
import light2 from "../assets/gallery/light/l2.jpg";
import light3 from "../assets/gallery/light/l3.jpg";
import light4 from "../assets/gallery/light/l4.jpg";
import light5 from "../assets/gallery/light/l5.jpg";
import light6 from "../assets/gallery/light/l6.jpg";
import light7 from "../assets/gallery/light/l7.jpg";
import light8 from "../assets/gallery/light/l8.jpg";
import light9 from "../assets/gallery/light/l9.jpg";
import light10 from "../assets/gallery/light/l10.jpg";
import light11 from "../assets/gallery/light/l11.jpg";
import light12 from "../assets/gallery/light/l12.jpg";
import light13 from "../assets/gallery/light/l13.jpg";
import light14 from "../assets/gallery/light/l14.jpg";
import light15 from "../assets/gallery/light/l15.jpg";
import light16 from "../assets/gallery/light/l16.jpg";
import light17 from "../assets/gallery/light/l17.jpg";
import light18 from "../assets/gallery/light/l18.jpg";
import light19 from "../assets/gallery/light/l19.jpg";
import light20 from "../assets/gallery/light/l20.jpg";
import light21 from "../assets/gallery/light/l21.jpg";
import light22 from "../assets/gallery/light/l22.jpg";
import light23 from "../assets/gallery/light/l23.jpg";
import light24 from "../assets/gallery/light/l24.jpg";
import light25 from "../assets/gallery/light/l25.jpg";
import light26 from "../assets/gallery/light/l26.jpg";
import light27 from "../assets/gallery/light/l27.jpg";


// === partnerships 1-3 ===

import partnership1 from "../assets/gallery/partnerships/p1.jpg";
import partnership2 from "../assets/gallery/partnerships/p2.jpg";
import partnership3 from "../assets/gallery/partnerships/p3.jpg";

// === support 1-8 ===
import support1 from "../assets/gallery/support/su1.jpg";
import support2 from "../assets/gallery/support/su2.jpg";
import support3 from "../assets/gallery/support/su3.jpg";
import support4 from "../assets/gallery/support/su4.jpg";
import support5 from "../assets/gallery/support/su5.jpg";
import support6 from "../assets/gallery/support/su6.jpg";
import support7 from "../assets/gallery/support/su7.jpg";
import support8 from "../assets/gallery/support/su8.jpg";


export type GalleryItem = {
  id: string;
  title: string;
  images: string[];
};

export const galleryItems: GalleryItem[] = [
  {
    id: "holidays",
    title: "החגים שחיים כל השנה",
    images: [holiday1, holiday2, holiday3, holiday4, holiday5, holiday6, holiday7, holiday8, holiday9, holiday10, holiday11, holiday12, holiday13, holiday14, holiday15, holiday16, holiday17, holiday18, holiday19],
  },
  {
    id: "community",
    title: "קהילה נפגשת – פנים אל פנים",
    images: [community1, community2, community3, community4, community5],
  },
  {
    id: "street",
    title: "נוכחות שמרגישים ברחוב",
    images: [street1, street2, street3, street4, street5, street6, street7, street8, street9, street10, street11, street12, street13, street14, street15, street16, street17, street18],
  },
    {id: "light",
    title: "אור יהודי בלב יפו",
    images: [light1, light2, light3, light4, light5, light6, light7, light8, light9, light10, light11, light12, light13, light14, light15, light16, light17, light18, light19, light20, light21, light22, light23, light24, light25, light26, light27],
  },
    {id: "partnerships",
    title: "שותפות שבונה עתיד",
    images: [partnership1, partnership2, partnership3],
  },
    {id: "support",
    title: "ליווי אישי ברגעים החשובים",
    images: [support1, support2, support3, support4, support5, support6, support7, support8],
  },
];
