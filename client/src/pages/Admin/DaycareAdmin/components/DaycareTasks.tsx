import DaycareTasksView from "./DaycareTasksView";
import { useDaycareTasks } from "./useDaycareTasks";

type DaycareTasksProps = {
    onChanged: () => void;
    onFinanceChanged?: () => void;
};

const DaycareTasks = (props: DaycareTasksProps) => {
    const model = useDaycareTasks(props);
    return <DaycareTasksView model={model} />;
};

export default DaycareTasks;
