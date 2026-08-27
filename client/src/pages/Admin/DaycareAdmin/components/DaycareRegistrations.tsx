import DaycareRegistrationsView from "./DaycareRegistrationsView";
import { useDaycareRegistrations } from "./useDaycareRegistrations";

type DaycareRegistrationsProps = { onChanged: () => void };

const DaycareRegistrations = (props: DaycareRegistrationsProps) => {
    const model = useDaycareRegistrations(props);
    return <DaycareRegistrationsView model={model} />;
};

export default DaycareRegistrations;
