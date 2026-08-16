import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { LegalLayout, LegalSection } from "@/components/legal/LegalLayout";
import { LEGAL_CONTACT_EMAIL, LEGAL_ENTITY, LEGAL_LAST_UPDATED } from "@/lib/legal";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO
        title="Terms of Service | Martial Athletic"
        description="The terms that govern your use of Martial Athletic: accounts, competitions, organiser responsibilities, acceptable use and liability."
        path="/terms"
      />
      <LegalLayout
        title="Terms of Service"
        lastUpdated={LEGAL_LAST_UPDATED}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Button>
        }
      >
        <LegalSection title="1. Agreement">
          <p>
            These terms govern your use of Martial Athletic, a fitness competition and training platform operated
            by {LEGAL_ENTITY}. By creating an account or using the platform you agree to them. If you do not
            agree, please do not use the service.
          </p>
        </LegalSection>

        <LegalSection title="2. Your account">
          <ul>
            <li>You must provide accurate information, including a real name, date of birth and gender, because these determine competition eligibility.</li>
            <li>You are responsible for keeping your login credentials secure and for activity under your account.</li>
            <li>One account per person. Accounts for athletes under 16 must be managed by a parent, guardian or coach.</li>
            <li>Identity fields are locked once your profile is complete; contact support for a correction.</li>
          </ul>
        </LegalSection>

        <LegalSection title="3. Competitions">
          <p>
            Competition organisers are solely responsible for their events: rules, divisions, workouts, standards,
            judging, entry fees, prizes, safety and any refunds. Martial Athletic provides the software that runs
            registration, scoring and leaderboards — it is not the organiser of your event and is not a party to
            the agreement between you and an organiser.
          </p>
        </LegalSection>

        <LegalSection title="4. Organiser responsibilities">
          <ul>
            <li>Publish accurate event details, dates, deadlines and division criteria.</li>
            <li>Apply your published rules and scoring consistently, and handle scoring disputes fairly.</li>
            <li>Comply with applicable law, insurance, and health and safety requirements for your event.</li>
            <li>Handle participant data you access through the platform in line with our Privacy Policy and applicable data-protection law.</li>
          </ul>
        </LegalSection>

        <LegalSection title="5. Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Falsify identity, age, gender or results, or enter a division you are not eligible for.</li>
            <li>Attempt to access accounts, competitions or data you are not authorised to see.</li>
            <li>Upload unlawful, abusive, discriminatory or infringing content, including logos and images you do not have the rights to.</li>
            <li>Disrupt, scrape at scale, reverse-engineer or overload the service.</li>
            <li>Use the platform for anything illegal or for harassment of other users.</li>
          </ul>
          <p>We may suspend or remove accounts, competitions or content that breach these terms.</p>
        </LegalSection>

        <LegalSection title="6. Content and ownership">
          <p>
            You keep ownership of the content you upload — logos, posters, photos, workout descriptions and
            results. By uploading it you grant us a licence to host and display it as needed to operate the
            platform, including on public event pages and leaderboards. The Martial Athletic name, branding and
            software remain ours.
          </p>
        </LegalSection>

        <LegalSection title="7. Subscriptions and payments">
          <p>
            Some features are available on paid plans. Prices, billing periods and included features are shown at
            the point of purchase. Subscriptions renew until cancelled and can be cancelled at any time, taking
            effect at the end of the current period. Entry fees charged by an organiser are between you and that
            organiser.
          </p>
        </LegalSection>

        <LegalSection title="8. Health and safety">
          <p>
            Fitness competition and training carry a risk of injury. You participate at your own risk, are
            responsible for judging your own fitness to train and compete, and should seek medical advice where
            appropriate. Martial Athletic does not provide medical, coaching or nutritional advice.
          </p>
        </LegalSection>

        <LegalSection title="9. Availability">
          <p>
            We aim to keep the service available and accurate, but it is provided "as is" without warranty of
            uninterrupted or error-free operation. We may change, suspend or discontinue features, and will give
            reasonable notice for material changes where we can.
          </p>
        </LegalSection>

        <LegalSection title="10. Liability">
          <p>
            To the extent permitted by law, {LEGAL_ENTITY} is not liable for indirect or consequential loss, lost
            profits, lost data, or for injury, disputes or losses arising from an event organised by a third party
            on the platform. Nothing in these terms excludes liability that cannot lawfully be excluded.
          </p>
        </LegalSection>

        <LegalSection title="11. Termination">
          <p>
            You may delete your account at any time. We may suspend or terminate access for breach of these terms,
            for unlawful activity, or where required by law.
          </p>
        </LegalSection>

        <LegalSection title="12. Changes">
          <p>
            We may update these terms as the platform develops. Continued use after an update means you accept the
            revised terms; the "last updated" date above shows the current version.
          </p>
        </LegalSection>

        <LegalSection title="13. Contact">
          <p>
            Questions about these terms:{" "}
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

export default Terms;
