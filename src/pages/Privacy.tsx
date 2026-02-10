import { MessageSquare } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => (
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
        <h1 className="text-3xl font-extrabold text-foreground">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: February 10, 2026</p>

        <h2 className="text-xl font-bold text-foreground mt-8">1. Information We Collect</h2>
        <p className="text-muted-foreground">We collect information you provide directly, including your name, email address, phone number, clinic details, and any messages you send through our contact forms. When you use our platform, we also collect usage data, device information, and log data.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">2. How We Use Your Information</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>To provide and maintain our healthcare engagement platform</li>
          <li>To communicate with you about your account, updates, and support</li>
          <li>To send appointment reminders and health program notifications via WhatsApp</li>
          <li>To improve our services and develop new features</li>
          <li>To comply with legal obligations and protect our rights</li>
        </ul>

        <h2 className="text-xl font-bold text-foreground mt-8">3. Data Security</h2>
        <p className="text-muted-foreground">We implement industry-standard security measures including encryption at rest and in transit, access controls, and regular security audits. All patient health data is stored in compliance with applicable healthcare data protection regulations.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">4. Data Sharing</h2>
        <p className="text-muted-foreground">We do not sell your personal information. We may share data with healthcare providers you are connected with on the platform, service providers who assist in operating our platform (under strict confidentiality agreements), and when required by law.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">5. Patient Health Data</h2>
        <p className="text-muted-foreground">Patient health records, vitals, lab results, and medical documents are treated with the highest level of confidentiality. Access is restricted to authorized healthcare providers and the patients themselves.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">6. Your Rights</h2>
        <p className="text-muted-foreground">You have the right to access, correct, or delete your personal data. You may also request data portability or withdraw consent for data processing. Contact us at privacy@mediimate.com to exercise these rights.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">7. Cookies</h2>
        <p className="text-muted-foreground">We use essential cookies for authentication and session management. Analytics cookies help us understand how our platform is used. You can manage cookie preferences through your browser settings.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">8. Changes to This Policy</h2>
        <p className="text-muted-foreground">We may update this Privacy Policy from time to time. We will notify you of any material changes via email or through the platform.</p>

        <h2 className="text-xl font-bold text-foreground mt-8">9. Contact Us</h2>
        <p className="text-muted-foreground">If you have any questions about this Privacy Policy, please contact us at privacy@mediimate.com.</p>
      </div>
    </main>
  </div>
);

export default Privacy;
