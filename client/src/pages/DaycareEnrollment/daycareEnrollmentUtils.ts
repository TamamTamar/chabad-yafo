export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isValidIsraeliId = (value: string) => {
    const id = onlyDigits(value).padStart(9, "0");

    if (!/^\d{9}$/.test(id)) {
        return false;
    }

    const sum = id
        .split("")
        .map(Number)
        .reduce((total, digit, index) => {
            const multiplied = digit * ((index % 2) + 1);
            return total + (multiplied > 9 ? multiplied - 9 : multiplied);
        }, 0);

    return sum % 10 === 0;
};

export const getAgeLabel = (birthDate?: string) => {
    if (!birthDate) {
        return "-";
    }

    const birth = new Date(birthDate);

    if (Number.isNaN(birth.getTime())) {
        return "-";
    }

    const now = new Date();
    let months =
        (now.getFullYear() - birth.getFullYear()) * 12 +
        now.getMonth() -
        birth.getMonth();

    if (now.getDate() < birth.getDate()) {
        months -= 1;
    }

    if (months < 0) {
        return "-";
    }

    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;

    if (years === 0) {
        return `${remainingMonths} חודשים`;
    }

    if (remainingMonths === 0) {
        return `${years} שנים`;
    }

    return `${years} שנים ו-${remainingMonths} חודשים`;
};
