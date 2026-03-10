const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -z-10" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-10 text-foreground">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Last updated: March 10, 2026</p>

          <p className="mb-4">
            This Privacy Policy explains how Virality Media ("Virality," "we," "us," or "our")
            collects, uses, stores, shares, and protects personal information when you use our
            website, dashboard, and related services (collectively, the "Services").
          </p>

          <p className="mb-8">
            If you have questions about this Privacy Policy or our data practices, you may contact us at{" "}
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">1. Who we are</h2>
          <p className="mb-8">
            Virality Media provides a marketing analytics and reporting platform that helps users
            connect advertising and commerce data sources such as Google Ads, Meta Ads, Facebook,
            and Shopify in order to view campaign performance, generate unified reports, and obtain
            AI-assisted insights.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">2. Information we collect</h2>

          <h3 className="text-lg font-semibold mb-2">A. Information you provide directly</h3>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Name</li>
            <li>Email address</li>
            <li>Account login details</li>
            <li>Messages or support requests you send to us</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">B. Information we receive from third-party integrations</h3>
          <p className="mb-2">
            If you choose to connect third-party services to Virality Media, we may receive data
            from those services based on the permissions you grant.
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Google Ads account and campaign performance data</li>
            <li>Meta Ads / Facebook Ads performance data</li>
            <li>Shopify store and sales-related analytics data</li>
            <li>Basic profile information from social login providers, where applicable</li>
          </ul>

          <h3 className="text-lg font-semibold mb-2">C. Google user data</h3>
          <p className="mb-4">
            If you connect your Google account, we may access Google user data that is necessary to
            provide the features you request. Depending on the permissions you grant and the Google
            APIs we use, this may include advertising account information, campaign data, ad group
            data, metrics such as clicks, impressions, conversions, cost, and related reporting data.
          </p>

          <p className="mb-8">
            We only access Google user data that is necessary to operate the specific features of
            Virality Media that you choose to use.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">3. How we use your information</h2>
          <ul className="list-disc pl-6 mb-8 space-y-2">
            <li>To create and manage your account</li>
            <li>To authenticate you and maintain secure access to the Services</li>
            <li>To import, display, and analyze marketing and commerce data connected by you</li>
            <li>To generate dashboards, reports, summaries, and AI-assisted insights</li>
            <li>To improve the functionality, reliability, and performance of our Services</li>
            <li>To communicate with you about your account, support, updates, or security matters</li>
            <li>To comply with legal obligations and enforce our terms</li>
          </ul>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">4. How we use Google API data</h2>
          <p className="mb-4">
            Virality Media’s use and transfer of information received from Google APIs to any other
            app will adhere to the Google API Services User Data Policy, including the Limited Use
            requirements.
          </p>

          <p className="mb-4">
            Specifically, Google user data is used only to provide and improve user-facing features
            requested by the user, such as dashboarding, analytics, campaign reporting, and related
            insights inside Virality Media.
          </p>

          <p className="mb-4">
            We do not sell Google user data. We do not use Google user data for advertising. We do
            not use Google user data to build, train, or improve generalized AI or machine learning
            models.
          </p>

          <p className="mb-8">
            We do not transfer Google user data to third parties except where necessary to operate
            the Services, comply with applicable law, protect rights and security, or as part of a
            business transfer described in this Privacy Policy.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">5. Legal bases for processing</h2>
          <p className="mb-8">
            Where required by applicable law, we process personal information on one or more of the
            following grounds: your consent, performance of a contract with you, compliance with legal
            obligations, and our legitimate interests in operating, securing, and improving the
            Services.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">6. When we share information</h2>
          <p className="mb-2">We may share information in the following limited situations:</p>
          <ul className="list-disc pl-6 mb-8 space-y-2">
            <li>
              <strong>Service providers:</strong> with trusted vendors that help us host, secure,
              maintain, or support the Services, subject to appropriate confidentiality obligations
            </li>
            <li>
              <strong>Legal compliance:</strong> where disclosure is required by law, regulation,
              court order, or valid governmental request
            </li>
            <li>
              <strong>Security and rights protection:</strong> where necessary to detect, prevent,
              or address fraud, abuse, security, or technical issues, or to protect rights, property,
              or safety
            </li>
            <li>
              <strong>Business transfer:</strong> in connection with a merger, acquisition,
              financing, or sale of assets
            </li>
          </ul>

          <p className="mb-8">
            We do not sell your personal information.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">7. Data retention</h2>
          <p className="mb-4">
            We retain personal information only for as long as necessary to provide the Services,
            comply with legal obligations, resolve disputes, and enforce agreements.
          </p>

          <p className="mb-4">
            Connected third-party data, including Google Ads data, is retained only for as long as
            needed for your account functionality, reporting, operational backups, and legal or
            security requirements.
          </p>

          <p className="mb-8">
            When information is no longer needed, we delete it or anonymize it, unless retention is
            required by law.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">8. Data security</h2>
          <p className="mb-8">
            We use reasonable technical and organizational safeguards designed to protect personal
            information against unauthorized access, disclosure, alteration, or destruction. However,
            no method of transmission over the internet or method of storage is completely secure,
            and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">9. Your choices and rights</h2>
          <p className="mb-2">Depending on your location and applicable law, you may have the right to:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Access the personal information we hold about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Object to or restrict certain processing</li>
            <li>Withdraw consent where processing is based on consent</li>
          </ul>

          <p className="mb-4">
            To exercise these rights, contact us at{" "}
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>.
          </p>

          <h3 className="text-lg font-semibold mb-2">Revoking Google access</h3>
          <p className="mb-8">
            If you connected your Google account, you can revoke Virality Media’s access at any time
            through your Google account security and permissions settings. You may also contact us to
            request deletion of Google-connected data stored by Virality Media, subject to applicable
            legal and backup retention requirements.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">10. Social logins</h2>
          <p className="mb-8">
            If you sign in through a third-party social platform such as Google, Facebook, or X, we
            may receive basic profile information associated with that account, such as your name,
            email address, and profile identifier, depending on the permissions you grant. We use
            this information only to authenticate you, create your account, and provide the Services.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">11. Children’s privacy</h2>
          <p className="mb-8">
            Our Services are not directed to children under 18, and we do not knowingly collect
            personal information from children under 18.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">12. International data transfers</h2>
          <p className="mb-8">
            Your information may be processed in countries other than your own, where data protection
            laws may differ. Where required, we take reasonable steps to ensure appropriate safeguards
            are in place for such transfers.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">13. Changes to this Privacy Policy</h2>
          <p className="mb-8">
            We may update this Privacy Policy from time to time. When we do, we will revise the
            "Last updated" date above. Continued use of the Services after an update means the
            updated Privacy Policy applies.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">14. Contact us</h2>
          <p className="mb-4">
            If you have questions, requests, or concerns regarding this Privacy Policy or our data
            practices, contact us at:
          </p>

          <address className="not-italic mb-8 pl-4 border-l-2 border-primary/30">
            Virality Media<br />
            403 Parinee I<br />
            Shah Industrial Estate<br />
            Mumbai, Maharashtra 400053<br />
            India<br />
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>
          </address>

          <p className="text-sm text-muted-foreground">
            This Privacy Policy is provided for general informational purposes and should be reviewed
            by your legal advisor for compliance with laws applicable to your business and users.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;