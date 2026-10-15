import type { ReactNode } from "react";
import DaycareRegistrationsView from "./DaycareRegistrationsView";
import { useDaycareRegistrations } from "./useDaycareRegistrations";

type DaycareRegistrationsProps = { onChanged: () => void; openingSummary?: ReactNode };

const DaycareRegistrations = (props: DaycareRegistrationsProps) => {
    const model = useDaycareRegistrations(props);
    return <DaycareRegistrationsView model={model} openingSummary={props.openingSummary} />;
};

export default DaycareRegistrations;
