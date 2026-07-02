import React from "react";
import DonationCampaignPage from "../Campaign/DonationCampaignPage";
import { taanitConfig } from "./taanitConfig";

const Taanit: React.FC = () => {
  return <DonationCampaignPage config={taanitConfig} />;
};

export default Taanit;
