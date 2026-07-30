import { Outlet, useLocation } from "react-router-dom";
import { Suspense, useEffect, useRef } from "react";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import FloatingSocials from "../components/FloatingSocials/FloatingSocials";
import { trackPageView } from "../services/metaPixelService";

const Root = () => {
    const location = useLocation();
    const { pathname, hash, search } = location;
    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    const previousPagePath = useRef(`${pathname}${search}`);

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

    useEffect(() => {
        const currentPagePath = `${pathname}${search}`;

        if (previousPagePath.current === currentPagePath) {
            return;
        }

        previousPagePath.current = currentPagePath;
        trackPageView();
    }, [pathname, search]);

    return (
        <div className="app-root">
            <a className="skip-link" href="#main-content">
                דילוג לתוכן המרכזי
            </a>
            {isAdminPath ? null : <Header />}
            <div id="main-content" tabIndex={-1}>
                <Suspense fallback={<div aria-live="polite">טוען...</div>}>
                    <Outlet />
                </Suspense>
            </div>
            {isAdminPath ? null : <Footer />}
            {isAdminPath ? null : <FloatingSocials />}
        </div>
    );
};

export default Root;
