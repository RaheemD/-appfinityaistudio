import { Layout } from "@/components/layout/Layout";
import { Sparkles } from "lucide-react";

const Privacy = () => {
  return (
    <Layout>
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <div 
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm font-medium text-primary mb-4 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.1s" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Legal
            </div>
            <h1 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.2s" }}
            >
              Privacy Policy
            </h1>
            <p 
              className="text-muted-foreground mb-10 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              Last updated: December 2024
            </p>

            <div 
              className="bg-card border border-border rounded-2xl p-8 md:p-12 space-y-10 opacity-0 animate-fade-in"
              style={{ animationDelay: "0.4s" }}
            >
              {/* Introduction */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Appfinity AI Studio ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our applications.
                </p>
              </section>

              {/* Information We Collect */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Information We Collect
                </h2>
                <div className="space-y-5 text-muted-foreground">
                  <p className="leading-relaxed">
                    We may collect information about you in a variety of ways, including:
                  </p>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">Personal Data</h3>
                      <p className="leading-relaxed">
                        When you use our services or contact us, you may provide us with personally identifiable information, such as your name, email address, and any other information you choose to provide.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">Usage Data</h3>
                      <p className="leading-relaxed">
                        We may automatically collect certain information when you access our website or applications, including your IP address, browser type, operating system, access times, and the pages you have viewed.
                      </p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-foreground mb-2">Mobile Application Data</h3>
                      <p className="leading-relaxed">
                        When using our mobile applications, we may request access to certain features on your device, such as storage or camera, only when necessary for the app's functionality. We will always request your permission before accessing these features.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Use of Information */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Use of Your Information
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    We may use the information we collect from you to:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>Provide, operate, and maintain our services</li>
                    <li>Improve, personalize, and expand our services</li>
                    <li>Understand and analyze how you use our services</li>
                    <li>Develop new products, services, features, and functionality</li>
                    <li>Communicate with you for customer service, updates, and marketing purposes</li>
                    <li>Process transactions and send related information</li>
                    <li>Protect against fraudulent or illegal activity</li>
                  </ul>
                </div>
              </section>

              {/* Data Sharing */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Disclosure of Your Information
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    We may share information we have collected about you in certain situations:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>With service providers who assist us in operating our services</li>
                    <li>To comply with legal obligations or respond to lawful requests</li>
                    <li>To protect and defend our rights and property</li>
                    <li>With your consent or at your direction</li>
                  </ul>
                  <p className="leading-relaxed">
                    We do not sell, trade, or otherwise transfer your personal information to third parties for their marketing purposes.
                  </p>
                </div>
              </section>

              {/* Data Security */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Security of Your Information
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We use administrative, technical, and physical security measures to protect your personal information. While we have taken reasonable steps to secure the information you provide to us, please be aware that no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
                </p>
              </section>

              {/* Third-Party Services */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Third-Party Services
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our website and applications may contain links to third-party websites and services. We are not responsible for the privacy practices of these third parties. We encourage you to read the privacy policies of any third-party services you access.
                </p>
              </section>

              {/* Children's Privacy */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Children's Privacy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
                </p>
              </section>

              {/* Your Rights */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Your Rights
                </h2>
                <div className="space-y-4 text-muted-foreground">
                  <p className="leading-relaxed">
                    Depending on your location, you may have certain rights regarding your personal information, including:
                  </p>
                  <ul className="list-disc list-inside space-y-2 ml-2">
                    <li>The right to access the personal information we hold about you</li>
                    <li>The right to request correction of inaccurate information</li>
                    <li>The right to request deletion of your personal information</li>
                    <li>The right to opt out of marketing communications</li>
                  </ul>
                  <p className="leading-relaxed">
                    To exercise these rights, please contact us using the information provided below.
                  </p>
                </div>
              </section>

              {/* Changes */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Changes to This Privacy Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  Contact Us
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you have questions or concerns about this Privacy Policy or our practices, please contact us at{" "}
                  <a
                    href="mailto:support@appfinity.ai"
                    className="text-primary hover:underline font-medium"
                  >
                    support@appfinity.ai
                  </a>
                  .
                </p>
              </section>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Privacy;
