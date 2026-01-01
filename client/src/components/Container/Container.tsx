import React from "react";
import styles from "./Container.module.scss";

type Props = {
    children: React.ReactNode;
    className?: string;
};

const Container = ({ children, className }: Props) => {
    return (
        <div className={`${styles.container} ${className ?? ""}`}>
            {children}
        </div>
    );
};

export default Container;
