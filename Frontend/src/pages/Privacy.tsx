const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 -z-10" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-card rounded-2xl border border-border p-6 sm:p-10 text-foreground">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">PRIVACY POLICY</h1>
          <p className="text-muted-foreground mb-8">Last updated February 02, 2026</p>

          <p className="mb-4">
            This Privacy Notice for Virality Media ("we," "us," or "our"), describes how and why we
            might access, collect, store, use, and/or share ("process") your personal information
            when you use our services ("Services"), including when you:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>
              Visit our website at viralitymedia.in or any website of ours that links to this
              Privacy Notice
            </li>
            <li>
              Download and use our Facebook application (Virality Media ), or any other application
              of ours that links to this Privacy Notice
            </li>
            <li>Engage with us in other related ways, including any marketing or events</li>
          </ul>
          <p className="mb-8">
            Questions or concerns? Reading this Privacy Notice will help you understand your privacy
            rights and choices. We are responsible for making decisions about how your personal
            information is processed. If you do not agree with our policies and practices, please do
            not use our Services. If you still have any questions or concerns, please contact us at{" "}
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>
            .
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">SUMMARY OF KEY POINTS</h2>
          <p className="mb-4">
            This summary provides key points from our Privacy Notice, but you can find out more
            details about any of these topics by clicking the link following each key point or by
            using our table of contents below to find the section you are looking for.
          </p>
          <p className="mb-4">
            <strong>What personal information do we process?</strong> When you visit, use, or
            navigate our Services, we may process personal information depending on how you interact
            with us and the Services, the choices you make, and the products and features you use.
            Learn more about personal information you disclose to us.
          </p>
          <p className="mb-4">
            <strong>Do we process any sensitive personal information?</strong> Some of the
            information may be considered "special" or "sensitive" in certain jurisdictions, for
            example your racial or ethnic origins, sexual orientation, and religious beliefs. We do
            not process sensitive personal information.
          </p>
          <p className="mb-4">
            <strong>Do we collect any information from third parties?</strong> We do not collect any
            information from third parties.
          </p>
          <p className="mb-4">
            <strong>How do we process your information?</strong> We process your information to
            provide, improve, and administer our Services, communicate with you, for security and
            fraud prevention, and to comply with law. We may also process your information for other
            purposes with your consent. We process your information only when we have a valid legal
            reason to do so. Learn more about how we process your information.
          </p>
          <p className="mb-4">
            <strong>
              In what situations and with which parties do we share personal information?
            </strong>{" "}
            We may share information in specific situations and with specific third parties. Learn
            more about when and with whom we share your personal information.
          </p>
          <p className="mb-4">
            <strong>How do we keep your information safe?</strong> We have adequate organizational
            and technical processes and procedures in place to protect your personal information.
            However, no electronic transmission over the internet or information storage technology
            can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers,
            cybercriminals, or other unauthorized third parties will not be able to defeat our
            security and improperly collect, access, steal, or modify your information. Learn more
            about how we keep your information safe.
          </p>
          <p className="mb-4">
            <strong>What are your rights?</strong> Depending on where you are located geographically,
            the applicable privacy law may mean you have certain rights regarding your personal
            information. Learn more about your privacy rights.
          </p>
          <p className="mb-4">
            <strong>How do you exercise your rights?</strong> The easiest way to exercise your rights
            is by submitting a data subject access request, or by contacting us. We will consider and
            act upon any request in accordance with applicable data protection laws.
          </p>
          <p className="mb-8">
            Want to learn more about what we do with any information we collect? Review the Privacy
            Notice in full.
          </p>

          <h2 className="text-xl sm:text-2xl font-bold mb-4">TABLE OF CONTENTS</h2>
          <ol className="list-decimal pl-6 mb-8 space-y-1">
            <li><a href="#section-1" className="text-primary hover:underline">WHAT INFORMATION DO WE COLLECT?</a></li>
            <li><a href="#section-2" className="text-primary hover:underline">HOW DO WE PROCESS YOUR INFORMATION?</a></li>
            <li><a href="#section-3" className="text-primary hover:underline">WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</a></li>
            <li><a href="#section-4" className="text-primary hover:underline">DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?</a></li>
            <li><a href="#section-5" className="text-primary hover:underline">HOW DO WE HANDLE YOUR SOCIAL LOGINS?</a></li>
            <li><a href="#section-6" className="text-primary hover:underline">HOW LONG DO WE KEEP YOUR INFORMATION?</a></li>
            <li><a href="#section-7" className="text-primary hover:underline">HOW DO WE KEEP YOUR INFORMATION SAFE?</a></li>
            <li><a href="#section-8" className="text-primary hover:underline">DO WE COLLECT INFORMATION FROM MINORS?</a></li>
            <li><a href="#section-9" className="text-primary hover:underline">WHAT ARE YOUR PRIVACY RIGHTS?</a></li>
            <li><a href="#section-10" className="text-primary hover:underline">CONTROLS FOR DO-NOT-TRACK FEATURES</a></li>
            <li><a href="#section-11" className="text-primary hover:underline">DO WE MAKE UPDATES TO THIS NOTICE?</a></li>
            <li><a href="#section-12" className="text-primary hover:underline">HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</a></li>
            <li><a href="#section-13" className="text-primary hover:underline">HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</a></li>
          </ol>

          {/* Section 1 */}
          <h2 id="section-1" className="text-xl sm:text-2xl font-bold mb-4">
            1. WHAT INFORMATION DO WE COLLECT?
          </h2>
          <h3 className="text-lg font-semibold mb-2">Personal information you disclose to us</h3>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We collect personal information that you provide to us.
          </p>
          <p className="mb-4">
            We collect personal information that you voluntarily provide to us when you register on
            the Services, express an interest in obtaining information about us or our products and
            Services, when you participate in activities on the Services, or otherwise when you
            contact us.
          </p>
          <p className="mb-2">
            <strong>Personal Information Provided by You.</strong> The personal information that we
            collect depends on the context of your interactions with us and the Services, the choices
            you make, and the products and features you use. The personal information we collect may
            include the following:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>names</li>
            <li>email addresses</li>
            <li>ads manager data</li>
          </ul>
          <p className="mb-4">
            <strong>Sensitive Information.</strong> We do not process sensitive information.
          </p>
          <p className="mb-4">
            <strong>Social Media Login Data.</strong> We may provide you with the option to register
            with us using your existing social media account details, like your Facebook, X, or other
            social media account. If you choose to register in this way, we will collect certain
            profile information about you from the social media provider, as described in the section
            called "HOW DO WE HANDLE YOUR SOCIAL LOGINS?" below.
          </p>
          <p className="mb-4">
            All personal information that you provide to us must be true, complete, and accurate, and
            you must notify us of any changes to such personal information.
          </p>
          <h3 className="text-lg font-semibold mb-2">Google API</h3>
          <p className="mb-4">
            Our use of information received from Google APIs will adhere to Google API Services User
            Data Policy, including the Limited Use requirements.
          </p>
          <p className="mb-8">
            <strong>Information collected when you use our Facebook application(s).</strong> We by
            default access your Facebook basic account information, including your name, email,
            gender, birthday, current city, and profile picture URL, as well as other information
            that you choose to make public. We may also request access to other permissions related
            to your account, such as friends, check-ins, and likes, and you may choose to grant or
            deny us access to each individual permission. For more information regarding Facebook
            permissions, refer to the Facebook Permissions Reference page.
          </p>

          {/* Section 2 */}
          <h2 id="section-2" className="text-xl sm:text-2xl font-bold mb-4">
            2. HOW DO WE PROCESS YOUR INFORMATION?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We process your information to provide, improve, and administer our Services,
            communicate with you, for security and fraud prevention, and to comply with law. We may
            also process your information for other purposes with your consent.
          </p>
          <p className="mb-2">
            We process your personal information for a variety of reasons, depending on how you
            interact with our Services, including:
          </p>
          <ul className="list-disc pl-6 mb-8 space-y-2">
            <li>
              <strong>To facilitate account creation and authentication and otherwise manage user accounts.</strong>{" "}
              We may process your information so you can create and log in to your account, as well
              as keep your account in working order.
            </li>
            <li>
              <strong>To evaluate and improve our Services, products, marketing, and your experience.</strong>{" "}
              We may process your information when we believe it is necessary to identify usage
              trends, determine the effectiveness of our promotional campaigns, and to evaluate and
              improve our Services, products, marketing, and your experience.
            </li>
            <li>
              <strong>To identify usage trends.</strong> We may process information about how you use
              our Services to better understand how they are being used so we can improve them.
            </li>
            <li>
              <strong>To determine the effectiveness of our marketing and promotional campaigns.</strong>{" "}
              We may process your information to better understand how to provide marketing and
              promotional campaigns that are most relevant to you.
            </li>
          </ul>

          {/* Section 3 */}
          <h2 id="section-3" className="text-xl sm:text-2xl font-bold mb-4">
            3. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We may share information in specific situations described in this section
            and/or with the following third parties.
          </p>
          <p className="mb-2">
            We may need to share your personal information in the following situations:
          </p>
          <ul className="list-disc pl-6 mb-8 space-y-2">
            <li>
              <strong>Business Transfers.</strong> We may share or transfer your information in
              connection with, or during negotiations of, any merger, sale of company assets,
              financing, or acquisition of all or a portion of our business to another company.
            </li>
            <li>
              <strong>Affiliates.</strong> We may share your information with our affiliates, in
              which case we will require those affiliates to honor this Privacy Notice. Affiliates
              include our parent company and any subsidiaries, joint venture partners, or other
              companies that we control or that are under common control with us.
            </li>
            <li>
              <strong>Business Partners.</strong> We may share your information with our business
              partners to offer you certain products, services, or promotions.
            </li>
          </ul>

          {/* Section 4 */}
          <h2 id="section-4" className="text-xl sm:text-2xl font-bold mb-4">
            4. DO WE OFFER ARTIFICIAL INTELLIGENCE-BASED PRODUCTS?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We offer products, features, or tools powered by artificial intelligence,
            machine learning, or similar technologies.
          </p>
          <p className="mb-4">
            As part of our Services, we offer products, features, or tools powered by artificial
            intelligence, machine learning, or similar technologies (collectively, "AI Products").
            These tools are designed to enhance your experience and provide you with innovative
            solutions. The terms in this Privacy Notice govern your use of the AI Products within our
            Services.
          </p>
          <h3 className="text-lg font-semibold mb-2">Use of AI Technologies</h3>
          <p className="mb-4">
            We provide the AI Products through third-party service providers ("AI Service
            Providers"), including Google Cloud AI. As outlined in this Privacy Notice, your input,
            output, and personal information will be shared with and processed by these AI Service
            Providers to enable your use of our AI Products for purposes outlined in "WHEN AND WITH
            WHOM DO WE SHARE YOUR PERSONAL INFORMATION?" You must not use the AI Products in any way
            that violates the terms or policies of any AI Service Provider.
          </p>
          <h3 className="text-lg font-semibold mb-2">Our AI Products</h3>
          <p className="mb-2">Our AI Products are designed for the following functions:</p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Natural language processing</li>
          </ul>
          <h3 className="text-lg font-semibold mb-2">How We Process Your Data Using AI</h3>
          <p className="mb-8">
            All personal information processed using our AI Products is handled in line with our
            Privacy Notice and our agreement with third parties. This ensures high security and
            safeguards your personal information throughout the process, giving you peace of mind
            about your data's safety.
          </p>

          {/* Section 5 */}
          <h2 id="section-5" className="text-xl sm:text-2xl font-bold mb-4">
            5. HOW DO WE HANDLE YOUR SOCIAL LOGINS?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: If you choose to register or log in to our Services using a social media
            account, we may have access to certain information about you.
          </p>
          <p className="mb-4">
            Our Services offer you the ability to register and log in using your third-party social
            media account details (like your Facebook or X logins). Where you choose to do this, we
            will receive certain profile information about you from your social media provider. The
            profile information we receive may vary depending on the social media provider concerned,
            but will often include your name, email address, friends list, and profile picture, as
            well as other information you choose to make public on such a social media platform. If
            you log in using Facebook, we may also request access to other permissions related to
            your account, such as your friends, check-ins, and likes, and you may choose to grant or
            deny us access to each individual permission.
          </p>
          <p className="mb-8">
            We will use the information we receive only for the purposes that are described in this
            Privacy Notice or that are otherwise made clear to you on the relevant Services. Please
            note that we do not control, and are not responsible for, other uses of your personal
            information by your third-party social media provider. We recommend that you review their
            privacy notice to understand how they collect, use, and share your personal information,
            and how you can set your privacy preferences on their sites and apps.
          </p>

          {/* Section 6 */}
          <h2 id="section-6" className="text-xl sm:text-2xl font-bold mb-4">
            6. HOW LONG DO WE KEEP YOUR INFORMATION?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We keep your information for as long as necessary to fulfill the purposes
            outlined in this Privacy Notice unless otherwise required by law.
          </p>
          <p className="mb-4">
            We will only keep your personal information for as long as it is necessary for the
            purposes set out in this Privacy Notice, unless a longer retention period is required or
            permitted by law (such as tax, accounting, or other legal requirements). No purpose in
            this notice will require us keeping your personal information for longer than twelve (12)
            months past the termination of the user's account.
          </p>
          <p className="mb-8">
            When we have no ongoing legitimate business need to process your personal information, we
            will either delete or anonymize such information, or, if this is not possible (for
            example, because your personal information has been stored in backup archives), then we
            will securely store your personal information and isolate it from any further processing
            until deletion is possible.
          </p>

          {/* Section 7 */}
          <h2 id="section-7" className="text-xl sm:text-2xl font-bold mb-4">
            7. HOW DO WE KEEP YOUR INFORMATION SAFE?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We aim to protect your personal information through a system of organizational
            and technical security measures.
          </p>
          <p className="mb-8">
            We have implemented appropriate and reasonable technical and organizational security
            measures designed to protect the security of any personal information we process.
            However, despite our safeguards and efforts to secure your information, no electronic
            transmission over the Internet or information storage technology can be guaranteed to be
            100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other
            unauthorized third parties will not be able to defeat our security and improperly
            collect, access, steal, or modify your information. Although we will do our best to
            protect your personal information, transmission of personal information to and from our
            Services is at your own risk. You should only access the Services within a secure
            environment.
          </p>

          {/* Section 8 */}
          <h2 id="section-8" className="text-xl sm:text-2xl font-bold mb-4">
            8. DO WE COLLECT INFORMATION FROM MINORS?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: We do not knowingly collect data from or market to children under 18 years of
            age.
          </p>
          <p className="mb-8">
            We do not knowingly collect, solicit data from, or market to children under 18 years of
            age, nor do we knowingly sell such personal information. By using the Services, you
            represent that you are at least 18 or that you are the parent or guardian of such a minor
            and consent to such minor dependent's use of the Services. If we learn that personal
            information from users less than 18 years of age has been collected, we will deactivate
            the account and take reasonable measures to promptly delete such data from our records.
            If you become aware of any data we may have collected from children under age 18, please
            contact us at{" "}
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>
            .
          </p>

          {/* Section 9 */}
          <h2 id="section-9" className="text-xl sm:text-2xl font-bold mb-4">
            9. WHAT ARE YOUR PRIVACY RIGHTS?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: You may review, change, or terminate your account at any time, depending on
            your country, province, or state of residence.
          </p>
          <p className="mb-4">
            <strong>Withdrawing your consent:</strong> If we are relying on your consent to process
            your personal information, which may be express and/or implied consent depending on the
            applicable law, you have the right to withdraw your consent at any time. You can withdraw
            your consent at any time by contacting us by using the contact details provided in the
            section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.
          </p>
          <p className="mb-4">
            However, please note that this will not affect the lawfulness of the processing before
            its withdrawal nor, when applicable law allows, will it affect the processing of your
            personal information conducted in reliance on lawful processing grounds other than
            consent.
          </p>
          <h3 className="text-lg font-semibold mb-2">Account Information</h3>
          <p className="mb-2">
            If you would at any time like to review or change the information in your account or
            terminate your account, you can:
          </p>
          <ul className="list-disc pl-6 mb-4 space-y-1">
            <li>Contact us using the contact information provided.</li>
          </ul>
          <p className="mb-4">
            Upon your request to terminate your account, we will deactivate or delete your account
            and information from our active databases. However, we may retain some information in our
            files to prevent fraud, troubleshoot problems, assist with any investigations, enforce
            our legal terms and/or comply with applicable legal requirements.
          </p>
          <p className="mb-8">
            If you have questions or comments about your privacy rights, you may email us at{" "}
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>
            .
          </p>

          {/* Section 10 */}
          <h2 id="section-10" className="text-xl sm:text-2xl font-bold mb-4">
            10. CONTROLS FOR DO-NOT-TRACK FEATURES
          </h2>
          <p className="mb-8">
            Most web browsers and some mobile operating systems and mobile applications include a
            Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy
            preference not to have data about your online browsing activities monitored and
            collected. At this stage, no uniform technology standard for recognizing and implementing
            DNT signals has been finalized. As such, we do not currently respond to DNT browser
            signals or any other mechanism that automatically communicates your choice not to be
            tracked online. If a standard for online tracking is adopted that we must follow in the
            future, we will inform you about that practice in a revised version of this Privacy
            Notice.
          </p>

          {/* Section 11 */}
          <h2 id="section-11" className="text-xl sm:text-2xl font-bold mb-4">
            11. DO WE MAKE UPDATES TO THIS NOTICE?
          </h2>
          <p className="mb-4 italic text-muted-foreground">
            In Short: Yes, we will update this notice as necessary to stay compliant with relevant
            laws.
          </p>
          <p className="mb-8">
            We may update this Privacy Notice from time to time. The updated version will be
            indicated by an updated "Revised" date at the top of this Privacy Notice. If we make
            material changes to this Privacy Notice, we may notify you either by prominently posting
            a notice of such changes or by directly sending you a notification. We encourage you to
            review this Privacy Notice frequently to be informed of how we are protecting your
            information.
          </p>

          {/* Section 12 */}
          <h2 id="section-12" className="text-xl sm:text-2xl font-bold mb-4">
            12. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?
          </h2>
          <p className="mb-4">
            If you have questions or comments about this notice, you may email us at{" "}
            <a href="mailto:swaraj@viralitymedia.in" className="text-primary hover:underline">
              swaraj@viralitymedia.in
            </a>{" "}
            or contact us by post at:
          </p>
          <address className="not-italic mb-8 pl-4 border-l-2 border-primary/30">
            Virality Media<br />
            403 Parinee I<br />
            Shah industrial estate<br />
            Mumbai, Maharashtra 400053<br />
            India
          </address>

          {/* Section 13 */}
          <h2 id="section-13" className="text-xl sm:text-2xl font-bold mb-4">
            13. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?
          </h2>
          <p className="mb-4">
            Based on the applicable laws of your country, you may have the right to request access to
            the personal information we collect from you, details about how we have processed it,
            correct inaccuracies, or delete your personal information. You may also have the right to
            withdraw your consent to our processing of your personal information. These rights may be
            limited in some circumstances by applicable law. To request to review, update, or delete
            your personal information, please fill out and submit a data subject access request.
          </p>
          <p className="text-sm text-muted-foreground mt-8">
            This Privacy Policy was created using Termly's Privacy Policy Generator.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
