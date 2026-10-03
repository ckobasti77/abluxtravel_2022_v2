import { Suspense } from "react";
import PartnersScreen from "../../../components/admin/screens/partners";

export default function Page() {
  return (
    <Suspense>
      <PartnersScreen />
    </Suspense>
  );
}
