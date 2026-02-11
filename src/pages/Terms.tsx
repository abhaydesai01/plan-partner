import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-xl font-heading font-bold text-foreground">Mediimate</span>
        </Link>
        <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">← Back to Home</Link>
      </div>
    </nav>

    <main className="pt-28 pb-20 px-4">
      <div className="container mx-auto max-w-3xl prose prose-headings:font-heading prose-headings:text-foreground prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
        <h1 className="text-3xl font-extrabold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 10, 2026</p>

        <h2 className="text-xl font-bold text-foreground mt-8">1. Acceptance of Terms</h2>
        <p className="text-muted-foreground">By accessing or using Mediimate's platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">2. Description of Service</h2>
        <p className="text-muted-foreground">Mediimate provides a WhatsApp-first patient engagement platform for healthcare clinics, including appointment management, care program automation, patient communication, vitals tracking, and clinical analytics.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">3. User Accounts</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>You must provide accurate and complete registration information</li>
          <li>You are responsible for maintaining the confidentiality of your credentials</li>
          <li>You must notify us immediately of any unauthorized access</li>
          <li>One person may not maintain more than one account</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground mt-8">4. Healthcare Disclaimer</h2>
        <p className="text-muted-foreground">Mediimate is a technology platform and does not provide medical advice, diagnosis, or treatment. All clinical decisions remain the responsibility of licensed healthcare providers. Our AI-powered features are designed to assist, not replace, medical judgment.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">5. Acceptable Use</h2>
        <p className="text-muted-foreground">You agree not to misuse the platform, including but not limited to: uploading malicious content, attempting unauthorized access, using the platform for purposes other than healthcare management, or violating any applicable laws or regulations.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">6. Subscription & Billing</h2>
        <p className="text-muted-foreground">Paid plans are billed monthly or annually as selected. You may cancel at any time; access continues until the end of the billing period. Refunds are handled on a case-by-case basis. We reserve the right to change pricing with 30 days' notice.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">7. Data Ownership</h2>
        <p className="text-muted-foreground">You retain ownership of all data you upload to the platform. We do not claim any intellectual property rights over your content. Upon account termination, you may request export of your data within 30 days.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">8. Limitation of Liability</h2>
        <p className="text-muted-foreground">To the maximum extent permitted by law, Mediimate shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">9. Termination</h2>
        <p className="text-muted-foreground">We may suspend or terminate your account if you violate these terms. You may terminate your account at any time by contacting support.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">10. Governing Law</h2>
        <p className="text-muted-foreground">These terms are governed by the laws of India. Any disputes shall be resolved in the courts of New Delhi, India.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">11. Contact</h2>
        <p className="text-muted-foreground">For questions about these Terms, contact us at legal@mediimate.com.</p>
      </div>
    </main>
  </div>
);

export default Terms;
