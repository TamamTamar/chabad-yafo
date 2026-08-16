import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import styles from "./RouteErrorPage.module.scss";

const RouteErrorPage = () => {
    const error = useRouteError();
    const isNotFound = isRouteErrorResponse(error) && error.status === 404;

    return (
        <main className={styles.page}>
            <section className={styles.card} role="alert">
                <p className={styles.eyebrow}>בית חב״ד יפו</p>
                <h1>{isNotFound ? "העמוד לא נמצא" : "משהו השתבש בטעינת העמוד"}</h1>
                <p>
                    {isNotFound
                        ? "ייתכן שהכתובת השתנתה או שהעמוד הוסר."
                        : "יכול להיות שהאתר עודכן בזמן שהעמוד היה פתוח. רענון קצר אמור לפתור את הבעיה."}
                </p>
                <div className={styles.actions}>
                    <button type="button" onClick={() => window.location.reload()}>
                        רענון העמוד
                    </button>
                    <Link to="/">חזרה לעמוד הבית</Link>
                </div>
            </section>
        </main>
    );
};

export default RouteErrorPage;
