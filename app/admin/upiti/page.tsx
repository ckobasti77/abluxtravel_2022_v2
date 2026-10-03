import { Suspense } from "react";
import InboxScreen from "../../../components/admin/screens/inbox";

export default function Page() {
  return (
    <Suspense>
      <InboxScreen />
    </Suspense>
  );
}
