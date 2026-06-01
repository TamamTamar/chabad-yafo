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

            navigate("/admin/families");
        } catch {
            setError("סיסמה שגויה");
        }
    };

    return (
        <main className={styles.page}>
            <div className={styles.card}>
                <h1>מערכת ניהול</h1>

                <p>
                    הזדהות מנהל מערכת
                </p>

                <input
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

                <button onClick={handleLogin}>
                    כניסה למערכת
                </button>
            </div>
        </main>
    );
};

export default AdminLogin;