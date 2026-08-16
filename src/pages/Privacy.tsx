import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_LAST_UPDATED } from "@/lib/legal";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="Privacy Policy | Martial Athletic"
        description="How Martial Athletic collects, uses, stores and protects your account, profile and competition data, and the rights you have over it."
        path="/privacy"
      />
      <LegalLayout
        title="Privacy Policy"
        lastUpdated={LEGAL_LAST_UPDATED}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
        }
      >
        <LegalSection title="1. Who we are">
          <p>
            Martial Athletic is a fitness competition and training platform operated by {LEGAL_ENTITY}. This
            policy explains what personal information we collect when you use the platform at
            martialathletic.fitness, why we collect it, and what control you have over it.
          </p>
        </LegalSection>

        <LegalSection title="2. Information we collect">
          <ul>
            <li>
              <strong>Account details</strong> — email address and password (stored hashed), or the basic
              profile released by a sign-in provider such as Google (name, email address, profile picture).
            </li>
            <li>
              <strong>Athlete profile</strong> — display name, legal name, date of birth, gender, gym or
              affiliation, avatar and any biography you add. Date of birth and gender are used to place you in
              the correct age and gender divisions.
            </li>
            <li>
              <strong>Competition data</strong> — registrations, team membership, heat and lane assignments,
              judged scores, rankings and personal records.
            </li>
            <li>
              <strong>Training data</strong> — programs you follow, logged sessions, weights, times and
              personal bests.
            </li>
            <li>
              <strong>Technical data</strong> — basic log information such as IP address, browser type and
              timestamps, generated automatically when you use the service.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="3. How we use your information">
          <ul>
            <li>To create and secure your account and authenticate you at sign-in.</li>
            <li>To run competitions: registration, division eligibility, heats, judging and leaderboards.</li>
            <li>To show your results to competition organisers, judges and other participants of the same event.</li>
            <li>To send service email such as verification, password reset, invitations and event notifications.</li>
            <li>To maintain, troubleshoot and improve the platform.</li>
          </ul>
          <p>
            We do not sell your personal information, and we do not use it for third-party advertising.
          </p>
        </LegalSection>

        <LegalSection title="4. Information visible to others">
          <p>
            Competitions are social by nature. Your display name, gym affiliation, division, team and scores are
            visible to organisers, judges and other participants of the events you enter, and appear on public
            event pages and leaderboards for those events. Your email address, date of birth and password are
            never shown publicly.
          </p>
        </LegalSection>

        <LegalSection title="5. Sign-in providers">
          <p>
            If you sign in with Google, we receive only your name, email address and profile picture in order to
            create your account. We never receive your provider password, and we do not access any other data in
            your provider account. You can stop using the provider at any time by signing in with an email
            address and password instead.
          </p>
        </LegalSection>

        <LegalSection title="6. Service providers">
          <p>
            We use trusted infrastructure providers to run Martial Athletic: cloud hosting and managed database,
            authentication and file storage services, and an email delivery provider for transactional messages.
            These providers process data only on our instructions and only to deliver the service.
          </p>
        </LegalSection>

        <LegalSection title="7. Storage and security">
          <p>
            Data is stored on managed cloud infrastructure hosted in the European region. Traffic is encrypted in
            transit, passwords are stored hashed, and database access is restricted with row-level security rules
            so users can only read the records they are entitled to. No system is perfectly secure, but we work
            to protect your information with industry-standard measures.
          </p>
        </LegalSection>

        <LegalSection title="8. Retention">
          <p>
            We keep your account data for as long as your account is active. Competition results may be retained
            in the historical record of an event after account deletion, in an anonymised or organiser-owned
            form, so that past standings remain accurate. You may request deletion of your account and personal
            data at any time.
          </p>
        </LegalSection>

        <LegalSection title="9. Your rights">
          <ul>
            <li>Access a copy of the personal data we hold about you.</li>
            <li>Correct inaccurate information. Identity fields such as date of birth and legal name are locked after profile completion to keep competition eligibility fair — contact us and we can unlock them for a correction.</li>
            <li>Request deletion of your account and associated personal data.</li>
            <li>Unsubscribe from notification email using the link in any message or your email preferences.</li>
          </ul>
        </LegalSection>

        <LegalSection title="10. Children">
          <p>
            Junior athletes may compete on Martial Athletic, but accounts for competitors under the age of 16 must
            be created and managed by a parent, guardian or coach who accepts this policy on their behalf.
          </p>
        </LegalSection>

        <LegalSection title="11. Changes to this policy">
          <p>
            We may update this policy as the platform evolves. Material changes will be reflected in the "last
            updated" date above and, where appropriate, announced in the app.
          </p>
        </LegalSection>

        <LegalSection title="12. Contact">
          <p>
            Questions, data requests or complaints:{" "}
            <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="text-primary hover:underline">
              {LEGAL_CONTACT_EMAIL}
            </a>
            .
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  );
};

export default Privacy;
