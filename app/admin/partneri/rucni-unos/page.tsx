import { Suspense } from "react";
import ManualImportScreen from "../../../../components/admin/screens/manual-import";

export default function Page() {
  return (
    <Suspense>
      <ManualImportScreen />
    </Suspense>
  );
}
