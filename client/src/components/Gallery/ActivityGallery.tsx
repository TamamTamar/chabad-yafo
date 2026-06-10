import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import type { Swiper as SwiperType } from "swiper";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";

import { homepageGalleryImages } from "../../data/homepageGalleryData";

import Container from "../Container/Container";
import styles from "./ActivityGallery.module.scss";

const ActivityGallery = () => {
    const swiperRef = useRef<SwiperType | null>(null);

    const randomImages = useMemo(() => {
        return [...homepageGalleryImages].sort(() => Math.random() - 0.5);
    }, []);

    return (
        <div className={styles.section}>
            <Container className={styles.inner}>
                <div className={styles.header}>
                    <p className={styles.eyebrow}>רגעים מהשטח</p>

                    <h2 className={styles.title}>ככה נראית שליחות ביפו</h2>

                    <p className={styles.description}>
                        מחגים ושבתות ועד פעילות רחוב, חסד וחיבור יהודי בלב יפו.
                    </p>
                </div>

                <div className={styles.sliderWrapper}>
                    <button
                        type="button"
                        className={styles.sideArrow}
                        onClick={() => swiperRef.current?.slidePrev()}
                        aria-label="תמונה קודמת"
                    >
                        ‹
                    </button>

                    <Swiper
                        modules={[Autoplay]}
                        loop
                        autoplay={{
                            delay: 2500,
                            disableOnInteraction: false,
                            pauseOnMouseEnter: true,
                        }}
                        speed={800}
                        spaceBetween={20}
                        slidesPerView={1}
                        breakpoints={{
                            640: {
                                slidesPerView: 2,
                            },
                            1024: {
                                slidesPerView: 3,
                            },
                        }}
                        onSwiper={(swiper) => {
                            swiperRef.current = swiper;
                        }}
                        className={styles.swiper}
                    >
                        {randomImages.map((image, index) => (
                            <SwiperSlide key={index}>
                                <div className={styles.card}>
                                    <img
                                        src={image}
                                        alt="פעילות בית חב״ד יפו"
                                        className={styles.image}
                                        loading="lazy"
                                    />
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>

                    <button
                        type="button"
                        className={styles.sideArrow}
                        onClick={() => swiperRef.current?.slideNext()}
                        aria-label="תמונה הבאה"
                    >
                        ›
                    </button>
                </div>

                <div className={styles.footer}>
                    <Link to="/gallery" className={styles.galleryLink}>
                        עוד רגעים של עשייה
                    </Link>
                </div>
            </Container>
        </div>
    );
};

export default ActivityGallery;