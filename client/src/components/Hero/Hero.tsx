import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Swiper as SwiperType } from "swiper";
import { A11y, Autoplay, Keyboard } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";

import daycareDesktop from "../../assets/families-hero.webp";
import daycareMobile from "../../assets/families-hero-mobile.webp";
import mainDesktop from "../../assets/hero-desktop.webp";
import mainMobile from "../../assets/hero-mobile.webp";
import taanitImage from "../../assets/taanit-hero.png";
import Container from "../Container/Container";
import styles from "./Hero.module.scss";

type HeroSlide = {
    id: string;
    eyebrow?: string;
    title: string;
    description?: string;
    desktopImage: string;
    mobileImage: string;
    imagePosition?: string;
    actions: Array<{
        label: string;
        to: string;
        variant: "primary" | "secondary";
    }>;
};

const slides: HeroSlide[] = [
    {
        id: "main",
        title: "בית חב״ד יפו\nהכתובת שלך לכל עניין יהודי",
        desktopImage: mainDesktop,
        mobileImage: mainMobile,
        actions: [
            { label: "סעודות שבת", to: "/shabbat", variant: "primary" },
            {
                label: "לקחת חלק בפעילות",
                to: "/donate#donate-form",
                variant: "secondary",
            },
        ],
    },
    {
        id: "taanit",
        eyebrow: "יום צום • מוסיפים בצדקה",
        title: "אגרא דתעניתא – צדקתא",
        description:
            "את עלות הארוחות שנחסכו ביום הצום הופכים לצדקה, חסד ואור למשפחות ביפו.",
        desktopImage: taanitImage,
        mobileImage: taanitImage,
        imagePosition: "center",
        actions: [
            { label: "לתרומה ליום התענית", to: "/taanit", variant: "primary" },
        ],
    },
    {
        id: "daycare",
        eyebrow: "הרישום המקדים נפתח",
        title: "מעון חדש בצפון יפו",
        description:
            "מעון חם ומקצועי לילדים בגילאי שנה עד שלוש. מספר המקומות מוגבל.",
        desktopImage: daycareDesktop,
        mobileImage: daycareMobile,
        imagePosition: "center",
        actions: [
            {
                label: "לרישום מקדים למעון",
                to: "/daycare-registration",
                variant: "primary",
            },
        ],
    },
];

const Hero = () => {
    const swiperRef = useRef<SwiperType | null>(null);
    const [activeSlide, setActiveSlide] = useState(0);
    const [reduceMotion] = useState(
        () => window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );

    return (
        <section className={styles.hero} aria-label="תכנים נבחרים מבית חב״ד יפו">
            <Swiper
                modules={[A11y, Autoplay, Keyboard]}
                className={styles.swiper}
                loop
                keyboard={{ enabled: true }}
                speed={reduceMotion ? 0 : 700}
                autoplay={
                    reduceMotion
                        ? false
                        : {
                              delay: 1500,
                              disableOnInteraction: false,
                              pauseOnMouseEnter: true,
                          }
                }
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                onRealIndexChange={(swiper) => setActiveSlide(swiper.realIndex)}
            >
                {slides.map((slide, index) => (
                    <SwiperSlide key={slide.id} className={styles.slide}>
                        <picture className={styles.background} aria-hidden="true">
                            <source media="(max-width: 767px)" srcSet={slide.mobileImage} />
                            <img
                                src={slide.desktopImage}
                                alt=""
                                fetchPriority={index === 0 ? "high" : "auto"}
                                style={{ objectPosition: slide.imagePosition }}
                            />
                        </picture>
                        <div className={styles.overlay} aria-hidden="true" />

                        <Container className={styles.inner}>
                            <div className={styles.card}>
                                {slide.eyebrow && (
                                    <span className={styles.eyebrow}>{slide.eyebrow}</span>
                                )}

                                {index === 0 ? (
                                    <h1 className={styles.title}>
                                        {slide.title.split("\n").map((line) => (
                                            <span key={line}>{line}</span>
                                        ))}
                                    </h1>
                                ) : (
                                    <h2 className={styles.title}>{slide.title}</h2>
                                )}

                                {slide.description && (
                                    <p className={styles.description}>{slide.description}</p>
                                )}

                                <div className={styles.actions}>
                                    {slide.actions.map((action) => (
                                        <Link
                                            key={action.to}
                                            to={action.to}
                                            className={styles[action.variant]}
                                        >
                                            {action.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </Container>
                    </SwiperSlide>
                ))}
            </Swiper>

            <div className={styles.controls} aria-label="ניווט בין תכני הפתיח">
                <button
                    type="button"
                    className={styles.arrow}
                    onClick={() => swiperRef.current?.slidePrev()}
                    aria-label="לתוכן הקודם"
                >
                    <ChevronRight aria-hidden="true" size={22} />
                </button>

                <div className={styles.dots}>
                    {slides.map((slide, index) => (
                        <button
                            key={slide.id}
                            type="button"
                            className={`${styles.dot} ${
                                activeSlide === index ? styles.dotActive : ""
                            }`}
                            onClick={() => swiperRef.current?.slideToLoop(index)}
                            aria-label={`מעבר לתוכן ${index + 1} מתוך ${slides.length}`}
                            aria-current={activeSlide === index ? "true" : undefined}
                        />
                    ))}
                </div>

                <button
                    type="button"
                    className={styles.arrow}
                    onClick={() => swiperRef.current?.slideNext()}
                    aria-label="לתוכן הבא"
                >
                    <ChevronLeft aria-hidden="true" size={22} />
                </button>
            </div>
        </section>
    );
};

export default Hero;
