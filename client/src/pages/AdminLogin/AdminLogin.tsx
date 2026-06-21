import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getAdminSession,
    loginAdmin,
} from "../../services/adminAuthService";
import styles from "./AdminLogin.module.scss";

const AdminLogin = () => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async () => {
        if (isSubmitting) {
            return;
        }

        let loginSucceeded = false;

        try {
            setError("");
            setIsSubmitting(true);

            await loginAdmin(password);
            loginSucceeded = true;
            await getAdminSession();

            navigate("/admin/dashboard");
        } catch (error) {
            const status = error && typeof error === "object" && "response" in error
                ? (error as { response?: { status?: number } }).response?.status
                : undefined;

            if (!loginSucceeded && status === 401) {
                setError("סיסמה שגויה");
            } else if (loginSucceeded && status === 401) {
                setError(
                    "הסיסמה נכונה, אבל ההתחברות לא נשמרה בדפדפן. צריך לבדוק את הגדרות ה-cookie בשרת: NODE_ENV=production, CLIENT_ORIGIN, ו-VITE_API_URL."
                );
            } else {
                setError("לא הצלחנו להתחבר כרגע. בדקי את החיבור לשרת ונסי שוב.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className={styles.page}>
            <section className={styles.card}>
                <h1 className={styles.title}>
                    מערכת ניהול
                </h1>

                <p className={styles.description}>
                    הזדהות מנהל מערכת
                </p>

                <input
                    className={styles.input}
                    type="password"
                    placeholder="הקלד סיסמה"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            handleLogin();
                        }
                    }}
                />

                {error && (
                    <span className={styles.error}>
                        {error}
                    </span>
                )}

                <button
                    className={styles.button}
                    onClick={handleLogin}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? "מתחבר..." : "כניסה למערכת"}
                </button>
            </section>
        </main>
    );
};

export default AdminLogin;
