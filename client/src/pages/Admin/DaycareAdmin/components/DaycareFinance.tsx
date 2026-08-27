import DaycareFinanceView from "./DaycareFinanceView";
import { useDaycareFinance } from "./useDaycareFinance";

type DaycareFinanceProps = {
    onChanged: () => void;
    refreshKey?: number;
};

const DaycareFinance = (props: DaycareFinanceProps) => {
    const model = useDaycareFinance(props);
    return <DaycareFinanceView model={model} />;
};

export default DaycareFinance;
