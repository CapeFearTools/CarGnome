import { Bullets, LegalPage, Section } from '@/components/LegalPage';
import { LEGAL } from '@/lib/legal';

export default function Privacy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`This policy explains what ${LEGAL.siteName} collects when you use this website, why we collect it, and who else sees it.`}
    >
      <Section title="Who this policy covers">
        <p>
          This policy covers {LEGAL.siteName} at this website, operated by {LEGAL.companyName}. The
          dealerships' own websites, and any other site you reach from here, have their own privacy
          policies.
        </p>
      </Section>

      <Section title="What you give us">
        <Bullets
          items={[
            'When you send an inquiry, we collect the name, email address and phone number you enter, your message, and which vehicle you asked about.',
            'When you use "Click for Price", we record that someone asked about that vehicle. No contact details are collected.',
          ]}
        />
      </Section>

      <Section title="What we collect automatically">
        <Bullets
          items={[
            'Standard web server records: the page requested, the date and time, and basic browser information.',
            'Your IP address, used briefly to limit spam submissions to our forms. We do not use it to build a profile of you.',
          ]}
        />
        <p>We do not use advertising or analytics cookies, and we do not track you across other websites.</p>
      </Section>

      <Section title="What stays on your device">
        <p>
          The shortlist you build in Discover is saved in your own browser. It never reaches our
          servers, and it disappears if you choose "Start over" or clear your browser data.
        </p>
      </Section>

      <Section title="How we use your information">
        <Bullets
          items={[
            'To pass your inquiry to the dealership selling that vehicle, so they can get back to you.',
            'To keep the website running, secure and free of spam.',
          ]}
        />
      </Section>

      <Section title="Who we share it with">
        <Bullets
          items={[
            'The dealership selling the vehicle you asked about.',
            'Companies that host our website, application and database on our behalf.',
            'Anyone we are legally required to share it with.',
          ]}
        />
        <p>
          We do not sell your personal information, and we do not share it with anyone for their own
          advertising.
        </p>
      </Section>

      <Section title="Content loaded from other companies">
        <p>
          Vehicle photos are served by the dealerships' image provider, and our page fonts come from
          Google Fonts. Your browser contacts those companies directly to load them, so they receive
          your IP address and basic browser information as part of serving the files.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep inquiries for as long as needed to respond to you and to keep ordinary business
          records. You can ask us to delete yours sooner.
        </p>
      </Section>

      <Section title="Your choices">
        <p>
          Email us at {LEGAL.contactEmail} to ask what we hold about you, to correct it, or to have it
          deleted. To stop a dealership from following up, tell that dealership directly. Depending on
          where you live, you may have additional rights over your information.
        </p>
      </Section>

      <Section title="Children">
        <p>
          This site is not directed to children under 13, and we do not knowingly collect their
          information.
        </p>
      </Section>

      <Section title="Security">
        <p>
          We take reasonable steps to protect the information you send us. No website can promise
          perfect security, so please don't send sensitive details such as your social security number
          or bank information through the inquiry form.
        </p>
      </Section>

      <Section title="Changes to this policy">
        <p>We post changes on this page and update the effective date above.</p>
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
