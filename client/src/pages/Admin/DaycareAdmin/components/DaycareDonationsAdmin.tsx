import DaycareDonationsAdminView from "./DaycareDonationsAdminView";
import { useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";

const DaycareDonationsAdmin = () => {
    const model = useDaycareDonationsAdmin();
    return <DaycareDonationsAdminView model={model} />;
};

export default DaycareDonationsAdmin;
