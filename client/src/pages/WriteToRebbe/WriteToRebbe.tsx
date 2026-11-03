import { useState } from "react";
import Container from "../../components/Container/Container";
import styles from "./WriteToRebbe.module.scss";
import RebbeLetterInfo from "./components/RebbeLetterInfo/RebbeLetterInfo";
import RebbeLetterForm from "./components/RebbeLetterForm/RebbeLetterForm";
import RebbeLetterSuccessModal from "./components/RebbeLetterSuccessModal/RebbeLetterSuccessModal";
import RebbeLetterHero from "./components/RebbeLetterHero/RebbeLetterHero";


import { getWriteToRebbeConfig } from "./writeToRebbeConfig";

const WriteToRebbe = () => {
    const config = getWriteToRebbeConfig();
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

    return (
        <main className={styles.page}>
            <RebbeLetterHero config={config} />

            <Container>
                <section className={styles.section}>
                    <RebbeLetterInfo config={config} />

                    <RebbeLetterForm
                        config={config}
                        onSuccess={() => setIsSuccessModalOpen(true)}
                    />
                </section>
            </Container>

            {isSuccessModalOpen && (
                <RebbeLetterSuccessModal
                    config={config}
                    onClose={() => setIsSuccessModalOpen(false)}
                />
            )}
        </main>
    );
};

export default WriteToRebbe;