import { LegalPage, legalMetadata } from "@/components/legal-page";

export const generateMetadata = () => legalMetadata("terms");

export default function TermsPage() {
  return <LegalPage doc="terms" />;
}
