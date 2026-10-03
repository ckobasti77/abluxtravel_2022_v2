import { Suspense } from "react";
import OffersScreen from "../../../components/admin/screens/offers";

export default function Page() {
  return (
    <Suspense>
      <OffersScreen />
    </Suspense>
  );
}
