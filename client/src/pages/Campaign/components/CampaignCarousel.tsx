import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "../DonationCampaignPage.module.scss";

const slides = [
    {
        id: 'purim',
        title: "מתנות לאביונים - פורים תשפ\"ו",
        subtitle: "מקיימים את מצוות היום בו ביום עבור תושבי יפו",
        btnText: "לתרומה עכשיו",
        link: "/purim",
        icon: "🎭"
    },
    {
        id: 'machatzit',
        title: "זכר למחצית השקל",
        subtitle: "חישוב מהיר לפי מנהגנו ותרומה למוסדות חב\"ד",
        btnText: "למחשבון ותרומה",
        link: "/machatzit-hashekel",
        icon: "💰"
    }
];

const CampaignCarousel: React.FC = () => {
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    return (
        <header className={styles.heroCarousel}>
            {slides.map((slide, index) => (
                <div 
                    key={slide.id} 
                    className={`${styles.slide} ${index === activeSlide ? styles.active : ""}`}
                >
                    <div className={styles.slideContent}>
                        <div className={styles.slideText}>
                            <h2>{slide.title}</h2>
                            <p>{slide.subtitle}</p>
                        </div>
                        <Link to={slide.link} className={styles.slideBtn}>
                            {slide.btnText}
                        </Link>
                    </div>
                </div>
            ))}
            
            {/* הנקודות המעודכנות */}
            <div className={styles.dots}>
                {slides.map((_, i) => (
                    <button 
                        key={i} 
                        className={`${styles.dot} ${i === activeSlide ? styles.activeDot : ""}`} 
                        onClick={() => setActiveSlide(i)}
                        title={`עבור לסלייד ${i + 1}`}
                        aria-label={`עבור לסלייד ${i + 1}`}
                    />
                ))}
            </div>
        </header>
    );
};

export default CampaignCarousel;