import { Link } from "react-router-dom";
import ChabadHousesCards from "../../components/ChabadHousesCards/ChabadHousesCards";
import Hero from "../../components/Hero/Hero";
import OurService from "../../components/OurService/OurService";
import ShabbatCTA from "../../components/ShabbatCTA/ShabbatCTA";
import { chabadCards } from "../../data/chabadCardsData";
import styles from "./Home.module.scss";
import { useEffect, useState } from "react";


const Home = () => {
    const [activeSlide, setActiveSlide] = useState(0);

    // רשימת הקמפיינים להצגה
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

    // לוגיקה להחלפה אוטומטית
    useEffect(() => {
        const timer = setInterval(() => {
            setActiveSlide((prev) => (prev + 1) % slides.length);
        }, 5000); // החלפה כל 4 שניות
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className={styles.page}>
            {/* קרוסלה עליונה מתחלפת */}
            <div className={styles.heroCarousel}>
                {slides.map((slide, index) => (
                    <div 
                        key={slide.id} 
                        className={`${styles.slide} ${index === activeSlide ? styles.active : ""}`}
                    >
                        <div className={styles.slideContent}>
                            <span className={styles.slideIcon}>{slide.icon}</span>
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
                
                {/* נקודות אינדיקציה בתחתית */}
                <div className={styles.dots}>
                    {slides.map((_, i) => (
                        <span 
                            key={i} 
                            className={`${styles.dot} ${i === activeSlide ? styles.activeDot : ""}`} 
                            onClick={() => setActiveSlide(i)}
                        />
                    ))}
                </div>
            </div>

            <main>
                <Hero />
                <OurService />
                <ChabadHousesCards cards={chabadCards} />
                <ShabbatCTA />
            </main>
        </div>
    );
};

export default Home;