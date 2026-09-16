import { Bullets, LegalPage, Section } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal';

export default function Terms() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={`These terms apply to everyone who uses ${LEGAL.siteName}. By using this website, you agree to them.`}
    >
      <Section title="What this site does">
        <p>
          {LEGAL.siteName} shows used vehicles available at participating dealerships. Listings are
          updated once a day from each dealership's inventory system. The dealership named on a
          vehicle's page is the seller; no vehicle is sold through this website.
        </p>
      </Section>

      <Section title="Vehicle information and pricing">
        <Bullets
          items={[
            'Listings come from the dealerships and can be out of date or contain errors. A vehicle may be sold before this site updates.',
            'A price shown here is not an offer to sell. Unless stated otherwise, it excludes tax, title, tags, registration and dealer charges.',
            '"Call for Price" means the dealership has not published a price for that vehicle.',
            'Mileage, equipment, fuel economy, accident history and certified pre-owned status come from the dealership and outside data providers, and are not independently verified by us. Fuel economy figures are EPA estimates for comparison only.',
            'Please confirm price, availability and vehicle details with the dealership before you buy.',
          ]}
        />
      </Section>

      <Section title="Contacting a dealership through this site">
        <p>
          When you submit an inquiry, you are asking that dealership to contact you at the phone
          number and email address you provide, including by phone call, text message or email. Your
          carrier's message and data rates may apply. You can ask the dealership to stop contacting
          you at any time.
        </p>
      </Section>

      <Section title="Acceptable use">
        <Bullets
          items={[
            'Use this site for your own personal, non-commercial vehicle shopping.',
            'Do not use automated tools to copy, scrape or republish our listings.',
            'Do not attempt to disrupt the site, work around its security, or submit false information through its forms.',
          ]}
        />
      </Section>

      <Section title="Content ownership">
        <p>
          The design, text and layout of this site belong to {LEGAL.companyName} or its licensors.
          Vehicle photos and descriptions belong to the dealerships and their data providers.
        </p>
      </Section>

      <Section title="Links to other websites">
        <p>
          Some pages link to dealership websites and other third parties. We don't control those sites
          and aren't responsible for their content or their practices.
        </p>
      </Section>

      <Section title="No warranty">
        <p>
          This site is provided "as is". We don't promise it will always be available, error-free, or
          that every listing is accurate or current.
        </p>
      </Section>

      <Section title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, {LEGAL.companyName} is not liable for indirect,
          incidental or consequential damages arising from your use of this site or your reliance on a
          listing.
        </p>
      </Section>

      <Section title="Governing law">
        <p>These terms are governed by the laws of the State of {LEGAL.governingState}.</p>
      </Section>

      <Section title="Changes to these terms">
        <p>
          We post changes on this page and update the effective date above. Continuing to use the site
          means you accept the updated terms.
        </p>
      </Section>

      <Section title="Contact us">
        <p>
          {LEGAL.companyName}
          <br />
          {LEGAL.mailingAddress}
          <br />
          {LEGAL.contactEmail}
          <br />
          {LEGAL.contactPhone}
        </p>
      </Section>
    </LegalPage>
  );
}
