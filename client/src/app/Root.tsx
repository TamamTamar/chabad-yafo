import { Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";

const Root = () => {
    const location = useLocation();
    const { pathname, hash } = location;

    useEffect(() => {
        if (hash) {
            const timer = setTimeout(() => {
                const element = document.querySelector(hash);

                element?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }, 100);

            return () => clearTimeout(timer);
        }

        window.scrollTo(0, 0);
    }, [pathname, hash]);

    return (
        <div className="app-root">
            <Header />
            <main>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
};

export default Root;