import { AdminDesignScope } from "../../../../components/AdminUI";
import DaycareDonationsAdminView from "./DaycareDonationsAdminView";
import { useDaycareDonationsAdmin } from "./useDaycareDonationsAdmin";

const DaycareDonationsAdmin = () => {
    const model = useDaycareDonationsAdmin();
    return <AdminDesignScope><DaycareDonationsAdminView model={model} /></AdminDesignScope>;
};

export default DaycareDonationsAdmin;
