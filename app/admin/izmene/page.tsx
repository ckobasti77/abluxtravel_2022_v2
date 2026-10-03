import { Suspense } from "react";
import ChangesScreen from "../../../components/admin/screens/changes";

export default function Page() {
  return (
    <Suspense>
      <ChangesScreen />
    </Suspense>
  );
}
