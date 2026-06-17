import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginAdmin } from "../../services/adminAuthService";
import styles from "./AdminLogin.module.scss";

const AdminLogin = () => {
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            setError("");

            const data = await loginAdmin(password);

            localStorage.setItem("adminToken", data.token);

            navigate("/admin/dashboard");
        } catch {
            setError("סיסמה שגויה");
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
                >
                    כניסה למערכת
                </button>
            </section>
        </main>
    );
};

export default AdminLogin;