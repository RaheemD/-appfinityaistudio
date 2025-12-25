import { Layout } from "@/components/layout/Layout";
import { FileText } from "lucide-react";

const Terms = () => {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12 opacity-0 animate-fade-in">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Terms of Service
              </h1>
              <p className="text-muted-foreground">
                Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            <div className="prose prose-slate dark:prose-invert max-w-none space-y-8 opacity-0 animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing or using any services, applications, or websites provided by Appfinity AI Studio ("we," "our," or "us"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">2. Description of Services</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Appfinity AI Studio develops and provides AI-powered applications, web platforms, mobile applications, and related digital services. Our services may include but are not limited to software applications available through app stores, web-based platforms, and automation tools.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">3. User Accounts</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Some of our services may require you to create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating an account and to update your information as necessary.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">4. Acceptable Use</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to use our services only for lawful purposes and in accordance with these terms. You may not:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                  <li>Use our services in any way that violates applicable laws or regulations</li>
                  <li>Attempt to gain unauthorized access to our systems or networks</li>
                  <li>Interfere with or disrupt the integrity or performance of our services</li>
                  <li>Transmit any malicious code, viruses, or harmful content</li>
                  <li>Use our services to infringe upon the rights of others</li>
                  <li>Reverse engineer, decompile, or disassemble our software</li>
                </ul>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">5. Intellectual Property</h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content, features, and functionality of our services, including but not limited to text, graphics, logos, icons, images, software, and code, are the exclusive property of Appfinity AI Studio and are protected by copyright, trademark, and other intellectual property laws.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">6. User Content</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If our services allow you to submit, upload, or share content, you retain ownership of your content. However, by submitting content, you grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, modify, and display your content as necessary to provide our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">7. In-App Purchases and Subscriptions</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Some of our applications may offer in-app purchases or subscription services. All purchases are subject to the terms and conditions of the respective app store (Apple App Store, Google Play Store). Refund policies are governed by the applicable app store's policies.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">8. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that our services will be uninterrupted, error-free, or free of harmful components. You use our services at your own risk.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">9. Limitation of Liability</h2>
                <p className="text-muted-foreground leading-relaxed">
                  To the fullest extent permitted by law, Appfinity AI Studio shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of our services.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">10. Indemnification</h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify and hold harmless Appfinity AI Studio and its affiliates, officers, and employees from any claims, damages, losses, or expenses arising from your use of our services or your violation of these terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">11. Termination</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We reserve the right to suspend or terminate your access to our services at any time, without notice, for conduct that we believe violates these terms or is harmful to other users, us, or third parties, or for any other reason at our sole discretion.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">12. Changes to Terms</h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update these Terms of Service from time to time. We will notify you of any material changes by posting the new terms on our website or within our applications. Your continued use of our services after such changes constitutes acceptance of the updated terms.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">13. Governing Law</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms of Service shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.
                </p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">14. Contact Information</h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <p className="text-primary font-medium">support@appfinity.ai</p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Terms;
