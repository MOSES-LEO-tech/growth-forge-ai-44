import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Terms and Conditions</h1>
          
          <p className="text-muted-foreground mb-8">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>

          <div className="prose prose-slate dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Agreement to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using StudentHub ("Platform"), you accept and agree to be bound by the terms 
                and provisions of this agreement. If you do not agree to these Terms and Conditions, please 
                do not use our Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Use License</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Permission is granted to temporarily access and use StudentHub for personal, non-commercial 
                educational purposes. This license grants you the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Create and maintain a student profile</li>
                <li>Upload and share educational content and achievements</li>
                <li>Access personalized recommendations and scholarship matches</li>
                <li>Participate in school communities and events</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                This license does not allow you to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Modify or copy Platform materials for commercial purposes</li>
                <li>Use the Platform for any unlawful purpose</li>
                <li>Attempt to reverse engineer any aspect of the Platform</li>
                <li>Remove any copyright or proprietary notations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">User Accounts</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you create an account with us, you must:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain the security of your password and account</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We reserve the right to suspend or terminate accounts that violate these terms or 
                engage in fraudulent or harmful activity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">User Content</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You retain ownership of content you submit to the Platform. By posting content, you grant us:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>A non-exclusive license to use, display, and distribute your content</li>
                <li>The right to use your content for service improvement and analytics</li>
                <li>Permission to share your content with schools and institutions as authorized</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You are responsible for ensuring you have the necessary rights to any content you upload 
                and that your content does not violate any laws or third-party rights.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Upload false, misleading, or fraudulent information</li>
                <li>Harass, abuse, or harm other users</li>
                <li>Violate any applicable laws or regulations</li>
                <li>Transmit viruses, malware, or harmful code</li>
                <li>Attempt to gain unauthorized access to the Platform</li>
                <li>Scrape or harvest data from the Platform</li>
                <li>Impersonate others or misrepresent your affiliation</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform and its original content, features, and functionality are owned by StudentHub 
                and are protected by international copyright, trademark, patent, trade secret, and other 
                intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Disclaimers</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The Platform is provided "as is" and "as available" without warranties of any kind. We do not guarantee:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>Uninterrupted or error-free operation</li>
                <li>Accuracy of recommendations or matches</li>
                <li>Scholarship awards or educational outcomes</li>
                <li>Security of data transmission over the internet</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                StudentHub shall not be liable for any indirect, incidental, special, consequential, or 
                punitive damages resulting from your use of or inability to use the Platform. Our total 
                liability shall not exceed the amount paid by you, if any, for accessing the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Termination</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may terminate or suspend your account and access to the Platform immediately, without 
                prior notice, for any reason, including breach of these Terms. Upon termination, your 
                right to use the Platform will immediately cease.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will provide notice of 
                significant changes by posting the new terms and updating the "Last updated" date. 
                Your continued use of the Platform after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Governing Law</h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with applicable laws, 
                without regard to conflict of law provisions.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms and Conditions, please contact us through 
                our contact page or email us at legal@studenthub.com.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;
