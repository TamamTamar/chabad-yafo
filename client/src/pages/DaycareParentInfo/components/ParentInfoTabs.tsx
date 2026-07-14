import { useEffect, useRef, type KeyboardEvent } from "react";
import { tabs, type ParentInfoSectionId } from "../parentInfoConfig";
import styles from "../DaycareParentInfo.module.scss";

interface ParentInfoTabsProps {
    activeTab: ParentInfoSectionId;
    onChange: (tab: ParentInfoSectionId) => void;
}

const ParentInfoTabs = ({ activeTab, onChange }: ParentInfoTabsProps) => {
    const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

    useEffect(() => {
        const activeIndex = tabs.findIndex((tab) => tab.id === activeTab);
        const activeButton = tabRefs.current[activeIndex];
        const pageScrollTop = window.scrollY;

        activeButton?.scrollIntoView({
            behavior: "auto",
            block: "nearest",
            inline: "center",
        });

        window.scrollTo({ top: pageScrollTop, behavior: "auto" });
    }, [activeTab]);

    const focusTab = (index: number) => {
        const normalizedIndex = (index + tabs.length) % tabs.length;
        const nextTab = tabs[normalizedIndex];
        onChange(nextTab.id);
        tabRefs.current[normalizedIndex]?.focus();
    };

    const handleKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number
    ) => {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            focusTab(index + 1);
        } else if (event.key === "ArrowRight") {
            event.preventDefault();
            focusTab(index - 1);
        } else if (event.key === "Home") {
            event.preventDefault();
            focusTab(0);
        } else if (event.key === "End") {
            event.preventDefault();
            focusTab(tabs.length - 1);
        }
    };

    return (
        <div className={styles.tabsSticky}>
            <nav className={styles.tabsShell} aria-label="קטגוריות מידע להורים">
                <div className={styles.tabsList} role="tablist" aria-orientation="horizontal">
                    {tabs.map((tab, index) => {
                        const isActive = tab.id === activeTab;

                        return (
                            <button
                                className={`${styles.tabButton} ${
                                    isActive ? styles.tabButtonActive : ""
                                }`}
                                id={`parent-tab-${tab.id}`}
                                key={tab.id}
                                ref={(element) => {
                                    tabRefs.current[index] = element;
                                }}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                aria-controls={`parent-panel-${tab.id}`}
                                tabIndex={isActive ? 0 : -1}
                                onClick={() => onChange(tab.id)}
                                onKeyDown={(event) => handleKeyDown(event, index)}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
};

export default ParentInfoTabs;
