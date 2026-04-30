import type { Metadata } from "next";
import { StadiumCanvas } from "./StadiumCanvas";

export const metadata: Metadata = {
  title: "Stadium · BWF Virtual Seats",
  description: "Pick a seat at Edgbaston for the Bob Willis Fund.",
};

export default function StadiumPage() {
  return <StadiumCanvas />;
}
