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
        <p className="text-sm text-muted-foreground">Effective Date: February 11, 2026 · Last Updated: February 11, 2026</p>

        <p className="text-muted-foreground mt-4">
          These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and <strong>Mediimate Health Technologies</strong> ("Mediimate," "we," "us," or "our"). By creating an account, accessing, or using our platform, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>

        {/* 1. DEFINITIONS */}
        <h2 className="text-xl font-bold text-foreground mt-10">1. Definitions</h2>
        <ul className="text-muted-foreground space-y-1">
          <li><strong>"Platform"</strong> means the Mediimate web application, mobile interfaces, APIs, AI assistants, and all related services.</li>
          <li><strong>"Health Data"</strong> means any vitals, lab results, prescriptions, clinical notes, food logs, documents, imaging reports, and other health-related information uploaded to or generated within the Platform.</li>
          <li><strong>"Provider"</strong> means any licensed healthcare professional (doctor, nurse, clinician) using Mediimate to manage patient care.</li>
          <li><strong>"Patient"</strong> means any individual who creates a patient account on the Platform, whether self-registered or enrolled by a Provider.</li>
          <li><strong>"Clinic"</strong> means any healthcare practice, hospital, or medical facility registered on the Platform.</li>
          <li><strong>"AI Assistant"</strong> means any AI-powered chatbot, copilot, or automated analysis feature provided by the Platform, including Mediimate AI for patients and Doctor Copilot for providers.</li>
        </ul>

        {/* 2. ELIGIBILITY */}
        <h2 className="text-xl font-bold text-foreground mt-10">2. Eligibility</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>You must be at least 18 years of age, or have the consent of a parent or legal guardian.</li>
          <li>If registering as a Provider, you represent and warrant that you hold a valid medical license in your jurisdiction.</li>
          <li>If registering on behalf of a Clinic, you represent that you have authority to bind that organization to these Terms.</li>
          <li>You agree to provide accurate, current, and complete registration information.</li>
        </ul>

        {/* 3. ACCOUNT REGISTRATION & SECURITY */}
        <h2 className="text-xl font-bold text-foreground mt-10">3. Account Registration & Security</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>You must verify your email address before accessing the Platform.</li>
          <li>You are solely responsible for maintaining the confidentiality of your login credentials.</li>
          <li>You must immediately notify us at <strong>security@mediimate.com</strong> of any unauthorized access to your account.</li>
          <li>Each individual must maintain only one account. Duplicate accounts may be terminated.</li>
          <li>We reserve the right to suspend or terminate accounts that violate these Terms without prior notice.</li>
        </ul>

        {/* 4. DESCRIPTION OF SERVICES */}
        <h2 className="text-xl font-bold text-foreground mt-10">4. Description of Services</h2>
        <p className="text-muted-foreground">Mediimate provides a comprehensive digital health engagement platform that includes, but is not limited to:</p>

        <h3 className="text-lg font-semibold text-foreground mt-4">4.1 For Patients</h3>
        <ul className="text-muted-foreground space-y-1">
          <li><strong>Health Records Management:</strong> Upload, view, and manage personal vitals, lab results, prescriptions, medical documents, and imaging reports.</li>
          <li><strong>AI Health Assistant (Mediimate AI):</strong> An AI-powered chatbot that provides health information, answers questions about your records, and offers general wellness guidance based on your uploaded data.</li>
          <li><strong>Self-Logging:</strong> Ability to log vitals (blood pressure, heart rate, temperature, blood sugar, weight, SpO2), lab results, and food/nutrition data directly through the chat interface or dashboard.</li>
          <li><strong>Doctor Linkage:</strong> Connect with one or more healthcare providers using a unique doctor code, enabling them to view your health records with your consent.</li>
          <li><strong>Appointment Management:</strong> View, book, and manage appointments with linked healthcare providers.</li>
          <li><strong>Health Vault:</strong> Secure, encrypted storage for sensitive medical documents with access controlled via vault codes.</li>
          <li><strong>Care Program Enrollment:</strong> Participate in structured care programs created by your healthcare provider.</li>
          <li><strong>Feedback & Reviews:</strong> Submit feedback on appointments, rate providers, and optionally publish testimonials.</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-4">4.2 For Providers & Clinics</h3>
        <ul className="text-muted-foreground space-y-1">
          <li><strong>Patient Management:</strong> Add, manage, and monitor patients individually or via bulk CSV import.</li>
          <li><strong>Clinical Dashboard:</strong> View patient vitals, lab trends, alerts, compliance reports, and enrollment metrics.</li>
          <li><strong>Doctor Copilot (AI):</strong> AI-assisted clinical insights, evidence-based suggestions, and documentation support powered by medical literature.</li>
          <li><strong>Appointment & Check-in System:</strong> Schedule appointments, manage availability, track check-ins, and handle appointment lifecycle (scheduled → completed → feedback).</li>
          <li><strong>Care Programs:</strong> Create and manage structured care programs with adherence tracking.</li>
          <li><strong>Alerts & Notifications:</strong> Automated health alerts based on patient vitals and configurable notification system.</li>
          <li><strong>Clinic Management:</strong> Multi-clinic support with role-based access control (owner, admin, doctor, nurse, staff).</li>
          <li><strong>Public Enrollment:</strong> QR-code based patient self-enrollment for clinics.</li>
          <li><strong>Document Management:</strong> Upload, categorize, and manage patient documents with access controls.</li>
          <li><strong>Feedback Collection:</strong> Automated post-appointment feedback requests with email delivery and public testimonial management.</li>
        </ul>

        {/* 5. AI DISCLAIMER */}
        <h2 className="text-xl font-bold text-foreground mt-10">5. AI-Powered Features — Important Disclaimer</h2>
        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 my-4">
          <p className="text-muted-foreground !mt-0"><strong className="text-destructive">CRITICAL NOTICE:</strong> The AI features on this Platform (including Mediimate AI for patients and Doctor Copilot for providers) are <strong>NOT</strong> a substitute for professional medical advice, diagnosis, or treatment.</p>
        </div>
        <ul className="text-muted-foreground space-y-1">
          <li>AI responses are generated based on your uploaded health data and general medical knowledge. They may be <strong>inaccurate, incomplete, or out of date</strong>.</li>
          <li>The AI does <strong>NOT</strong> perform clinical diagnosis. All clinical decisions must be made by a licensed healthcare professional.</li>
          <li>Patients must <strong>always consult their healthcare provider</strong> before acting on any AI-generated information, especially regarding medications, symptoms, or treatment plans.</li>
          <li>Providers using Doctor Copilot must exercise <strong>independent clinical judgment</strong>. AI-generated clinical evidence and suggestions are assistive tools only.</li>
          <li>Mediimate is <strong>not liable</strong> for any health outcomes resulting from reliance on AI-generated content.</li>
          <li>AI models may occasionally produce unexpected or erroneous outputs ("hallucinations"). Users must verify all AI-provided information independently.</li>
        </ul>

        {/* 6. HEALTH DATA */}
        <h2 className="text-xl font-bold text-foreground mt-10">6. Health Data — Collection, Use & Consent</h2>

        <h3 className="text-lg font-semibold text-foreground mt-4">6.1 Data You Provide</h3>
        <p className="text-muted-foreground">By using the Platform, you may upload or input the following Health Data:</p>
        <ul className="text-muted-foreground space-y-1">
          <li>Vitals (blood pressure, heart rate, temperature, SpO2, weight, blood sugar)</li>
          <li>Lab results (blood work, diagnostic tests, pathology reports)</li>
          <li>Medical documents (prescriptions, imaging, clinical notes, consent forms)</li>
          <li>Food and nutrition logs</li>
          <li>Personal health information (conditions, medications, allergies, emergency contacts)</li>
          <li>Appointment notes and clinical remarks</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-4">6.2 Consent</h3>
        <ul className="text-muted-foreground space-y-1">
          <li>By creating an account and uploading Health Data, you <strong>expressly consent</strong> to the collection, storage, processing, and display of your Health Data as described in these Terms and our Privacy Policy.</li>
          <li>When you link with a Provider, you consent to that Provider viewing your Health Data through the Platform.</li>
          <li>You may revoke Provider access at any time by unlinking from that Provider.</li>
          <li>Consent for feedback publication (testimonials) is collected separately and can be withheld or revoked.</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-4">6.3 Data Ownership</h3>
        <ul className="text-muted-foreground space-y-1">
          <li>You retain <strong>full ownership</strong> of all Health Data you upload to the Platform.</li>
          <li>Mediimate does not claim any intellectual property rights over your Health Data.</li>
          <li>You grant Mediimate a limited, non-exclusive license to process your data solely to provide the services described herein.</li>
          <li>We do <strong>not sell</strong> your Health Data to third parties. Ever.</li>
        </ul>

        <h3 className="text-lg font-semibold text-foreground mt-4">6.4 Data Retention & Deletion</h3>
        <ul className="text-muted-foreground space-y-1">
          <li>Your data is retained for as long as your account is active.</li>
          <li>Upon account deletion, your Health Data will be permanently deleted within 30 days, except where retention is required by law.</li>
          <li>You may request a full export of your data at any time by contacting <strong>privacy@mediimate.com</strong>.</li>
        </ul>

        {/* 7. SECURITY */}
        <h2 className="text-xl font-bold text-foreground mt-10">7. Data Security</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>All data is encrypted in transit (TLS 1.2+) and at rest (AES-256).</li>
          <li>Access to Health Data is controlled through Row-Level Security (RLS) policies, ensuring users can only access data they are authorized to view.</li>
          <li>The Health Vault feature provides additional encryption for sensitive documents.</li>
          <li>We conduct regular security audits, vulnerability assessments, and penetration testing.</li>
          <li>Employee access to production data is restricted to essential personnel under strict confidentiality agreements.</li>
          <li>While we implement industry-leading security measures, no system is 100% secure. You acknowledge and accept residual risk inherent in digital data storage.</li>
        </ul>

        {/* 8. PATIENT-DOCTOR RELATIONSHIP */}
        <h2 className="text-xl font-bold text-foreground mt-10">8. Patient-Doctor Linkage</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>Patients may link with Providers using a unique alphanumeric doctor code.</li>
          <li>Linking grants the Provider <strong>read access</strong> to your Health Data (vitals, labs, documents, appointments) through the Platform.</li>
          <li>You may link with <strong>multiple Providers</strong> simultaneously. Each linkage is independent.</li>
          <li>Providers must approve link requests before access is granted (pending → approved workflow).</li>
          <li>Mediimate does <strong>not</strong> verify the identity or credentials of Providers beyond the information they provide during registration. You are responsible for confirming you are linking with the correct healthcare professional.</li>
          <li>You may unlink from any Provider at any time, immediately revoking their access.</li>
        </ul>

        {/* 9. ACCEPTABLE USE */}
        <h2 className="text-xl font-bold text-foreground mt-10">9. Acceptable Use Policy</h2>
        <p className="text-muted-foreground">You agree <strong>NOT</strong> to:</p>
        <ul className="text-muted-foreground space-y-1">
          <li>Upload false, misleading, or fabricated Health Data.</li>
          <li>Impersonate another person or Provider.</li>
          <li>Use the Platform to practice medicine without a valid license.</li>
          <li>Attempt to access another user's data or bypass security controls.</li>
          <li>Use automated tools, bots, or scrapers to extract data from the Platform.</li>
          <li>Upload malicious files, viruses, or harmful content.</li>
          <li>Use the AI features to generate fraudulent medical documentation.</li>
          <li>Share your account credentials or vault access codes with unauthorized individuals.</li>
          <li>Use the Platform for any purpose other than legitimate healthcare management.</li>
          <li>Violate any applicable local, state, national, or international law or regulation.</li>
        </ul>

        {/* 10. CLINIC & MULTI-USER */}
        <h2 className="text-xl font-bold text-foreground mt-10">10. Clinic & Multi-User Accounts</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>Clinic owners are responsible for managing team member access and ensuring compliance with these Terms.</li>
          <li>Role-based access control (Owner, Admin, Doctor, Nurse, Staff) determines what each team member can view and modify.</li>
          <li>The Clinic owner is responsible for revoking access for team members who leave the organization.</li>
          <li>Patient data shared within a Clinic is accessible to authorized members based on their role.</li>
          <li>Clinic-level analytics and feedback are visible to all Clinic members with appropriate roles.</li>
        </ul>

        {/* 11. SUBSCRIPTION & BILLING */}
        <h2 className="text-xl font-bold text-foreground mt-10">11. Subscription & Billing</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>The Platform offers free and paid tiers with different feature limits.</li>
          <li>Paid plans are billed monthly or annually as selected at the time of purchase.</li>
          <li>You may cancel your subscription at any time. Access to paid features continues until the end of the current billing period.</li>
          <li>Refunds are handled on a case-by-case basis. Contact <strong>billing@mediimate.com</strong>.</li>
          <li>We reserve the right to modify pricing with at least 30 days' advance notice.</li>
          <li>Non-payment may result in downgrade to the free tier or account suspension.</li>
        </ul>

        {/* 12. THIRD-PARTY SERVICES */}
        <h2 className="text-xl font-bold text-foreground mt-10">12. Third-Party Services</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>The Platform integrates with third-party services including email delivery, AI model providers, and cloud infrastructure.</li>
          <li>Your use of third-party services is subject to their respective terms and privacy policies.</li>
          <li>Mediimate is not responsible for the availability, accuracy, or security of third-party services.</li>
          <li>We select third-party partners with security and compliance as primary criteria.</li>
        </ul>

        {/* 13. INTELLECTUAL PROPERTY */}
        <h2 className="text-xl font-bold text-foreground mt-10">13. Intellectual Property</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>The Platform, its design, code, branding, and all non-user content are the intellectual property of Mediimate Health Technologies.</li>
          <li>You may not copy, modify, distribute, or reverse-engineer any part of the Platform.</li>
          <li>"Mediimate" and the Mediimate logo are trademarks of Mediimate Health Technologies.</li>
          <li>User-generated content (Health Data, feedback, reviews) remains your property as specified in Section 6.3.</li>
        </ul>

        {/* 14. LIMITATION OF LIABILITY */}
        <h2 className="text-xl font-bold text-foreground mt-10">14. Limitation of Liability</h2>
        <div className="bg-muted/50 border border-border rounded-xl p-4 my-4">
          <ul className="text-muted-foreground space-y-1 !mt-0">
            <li>TO THE MAXIMUM EXTENT PERMITTED BY LAW, MEDIIMATE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES.</li>
            <li>THIS INCLUDES BUT IS NOT LIMITED TO: LOSS OF DATA, LOSS OF PROFITS, PERSONAL INJURY, OR ADVERSE HEALTH OUTCOMES.</li>
            <li>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO MEDIIMATE IN THE 12 MONTHS PRECEDING THE CLAIM.</li>
            <li>MEDIIMATE IS A TECHNOLOGY PLATFORM. WE ARE NOT A HEALTHCARE PROVIDER AND DO NOT ASSUME LIABILITY FOR CLINICAL DECISIONS.</li>
          </ul>
        </div>

        {/* 15. INDEMNIFICATION */}
        <h2 className="text-xl font-bold text-foreground mt-10">15. Indemnification</h2>
        <p className="text-muted-foreground">You agree to indemnify and hold harmless Mediimate, its officers, directors, employees, and agents from any claims, damages, losses, or expenses (including legal fees) arising from:</p>
        <ul className="text-muted-foreground space-y-1">
          <li>Your use or misuse of the Platform.</li>
          <li>Your violation of these Terms.</li>
          <li>Your violation of any rights of a third party.</li>
          <li>Any Health Data you upload that is inaccurate or misleading.</li>
          <li>Any clinical decisions made using AI-generated suggestions.</li>
        </ul>

        {/* 16. DISPUTE RESOLUTION */}
        <h2 className="text-xl font-bold text-foreground mt-10">16. Dispute Resolution</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>Any dispute arising from these Terms shall first be attempted to be resolved through <strong>good-faith negotiation</strong> for a period of 30 days.</li>
          <li>If negotiation fails, disputes shall be resolved through <strong>binding arbitration</strong> under the Arbitration and Conciliation Act, 1996 (India).</li>
          <li>The seat of arbitration shall be <strong>New Delhi, India</strong>.</li>
          <li>You agree to waive any right to participate in class-action lawsuits against Mediimate.</li>
        </ul>

        {/* 17. GOVERNING LAW */}
        <h2 className="text-xl font-bold text-foreground mt-10">17. Governing Law</h2>
        <p className="text-muted-foreground">These Terms are governed by and construed in accordance with the laws of <strong>India</strong>, including the Information Technology Act, 2000, the Digital Personal Data Protection Act, 2023 (DPDPA), and applicable healthcare regulations. The courts of <strong>New Delhi, India</strong> shall have exclusive jurisdiction.</p>

        {/* 18. REGULATORY COMPLIANCE */}
        <h2 className="text-xl font-bold text-foreground mt-10">18. Regulatory Compliance</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>Mediimate is designed to comply with the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong> of India.</li>
          <li>For users in the United States, the Platform is designed with <strong>HIPAA</strong> (Health Insurance Portability and Accountability Act) considerations in mind, though formal HIPAA certification is pending.</li>
          <li>For users in the European Union, we comply with the <strong>General Data Protection Regulation (GDPR)</strong> for data processing and user rights.</li>
          <li>We maintain technical and organizational measures to ensure compliance with applicable healthcare data protection regulations.</li>
        </ul>

        {/* 19. TERMINATION */}
        <h2 className="text-xl font-bold text-foreground mt-10">19. Termination</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>You may terminate your account at any time by contacting <strong>support@mediimate.com</strong>.</li>
          <li>We may suspend or terminate your account immediately if you violate these Terms, with or without notice.</li>
          <li>Upon termination, your right to access the Platform ceases immediately.</li>
          <li>You may request export of your Health Data within 30 days of termination.</li>
          <li>Sections 5 (AI Disclaimer), 6.3 (Data Ownership), 14 (Limitation of Liability), 15 (Indemnification), and 16 (Dispute Resolution) survive termination.</li>
        </ul>

        {/* 20. MODIFICATIONS */}
        <h2 className="text-xl font-bold text-foreground mt-10">20. Modifications to Terms</h2>
        <ul className="text-muted-foreground space-y-1">
          <li>We reserve the right to modify these Terms at any time.</li>
          <li>Material changes will be communicated via email and/or in-app notification at least <strong>15 days</strong> before taking effect.</li>
          <li>Continued use of the Platform after changes take effect constitutes acceptance of the updated Terms.</li>
          <li>If you disagree with any changes, you must discontinue use and may request account deletion.</li>
        </ul>

        {/* 21. SEVERABILITY */}
        <h2 className="text-xl font-bold text-foreground mt-10">21. Severability</h2>
        <p className="text-muted-foreground">If any provision of these Terms is found to be unenforceable or invalid, that provision shall be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.</p>

        {/* 22. ENTIRE AGREEMENT */}
        <h2 className="text-xl font-bold text-foreground mt-10">22. Entire Agreement</h2>
        <p className="text-muted-foreground">These Terms, together with our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, constitute the entire agreement between you and Mediimate regarding the use of the Platform and supersede all prior agreements, understandings, and representations.</p>

        {/* 23. CONTACT */}
        <h2 className="text-xl font-bold text-foreground mt-10">23. Contact Information</h2>
        <p className="text-muted-foreground">For questions or concerns about these Terms:</p>
        <ul className="text-muted-foreground space-y-1">
          <li><strong>General:</strong> legal@mediimate.com</li>
          <li><strong>Privacy:</strong> privacy@mediimate.com</li>
          <li><strong>Security:</strong> security@mediimate.com</li>
          <li><strong>Billing:</strong> billing@mediimate.com</li>
          <li><strong>Support:</strong> support@mediimate.com</li>
        </ul>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground/60 text-center">
            © {new Date().getFullYear()} Mediimate Health Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  </div>
);

export default Terms;
