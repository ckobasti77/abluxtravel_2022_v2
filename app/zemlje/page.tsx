import { permanentRedirect } from "next/navigation";

// Old URL: the country directory is /destinacije.
export default function ZemljeRedirectPage() {
  permanentRedirect("/destinacije");
}
