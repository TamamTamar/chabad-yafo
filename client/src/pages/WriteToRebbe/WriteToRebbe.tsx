import { useState } from "react";
import Container from "../../components/Container/Container";
import styles from "./WriteToRebbe.module.scss";
import RebbeLetterInfo from "./components/RebbeLetterInfo/RebbeLetterInfo";
import RebbeLetterForm from "./components/RebbeLetterForm/RebbeLetterForm";
import RebbeLetterSuccessModal from "./components/RebbeLetterSuccessModal/RebbeLetterSuccessModal";
import RebbeLetterHero from "./components/RebbeLetterHero/RebbeLetterHero";


const WriteToRebbe = () => {
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    return (
        <main className={styles.page}>
            <RebbeLetterHero />

            <Container>
                <section className={styles.section}>
                    <RebbeLetterInfo />

                    <RebbeLetterForm
                        onSuccess={() => setIsSuccessModalOpen(true)}
                    />
                </section>
            </Container>

            {isSuccessModalOpen && (
                <RebbeLetterSuccessModal
                    onClose={() => setIsSuccessModalOpen(false)}
                />
            )}
        </main>
    );
};

export default WriteToRebbe;