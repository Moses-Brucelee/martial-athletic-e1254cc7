# Show "Martial Athletic" on the Google sign-in screen

The Google screen says "to continue to Lovable" and links Lovable's privacy policy because sign-in currently uses Lovable's shared (managed) Google credentials. No app code can change that text — Google shows whatever brand owns the OAuth client. To show Martial Athletic there, the project needs its own Google OAuth client, and Google requires a public privacy policy and terms page on the app's domain before it will approve that branding.

## What gets built

1. **Privacy Policy page at `/privacy`**
   Owner-authored content covering what data Martial Athletic collects (account details, profile, competition and score data), how it is used, storage, third-party services, retention, user rights, and a contact email. Public route, no login required.

2. **Terms of Service page at `/terms`**
   Acceptable use, account responsibilities, competition/organizer rules, liability limits, changes, and contact. Public route, no login required.

3. **Footer / auth-page links**
   Links to Privacy and Terms from the landing page footer and the Login/Register pages, so both pages are reachable and crawlable (Google verifies this).

4. **SEO metadata**
   Unique title, description and canonical for both routes via the existing RouteMeta mapping, plus sitemap entries.

## What you do (outside the app)

Once the two pages are live on martialathletic.fitness:

1. In Google Cloud Console, configure the OAuth consent screen with app name "Martial Athletic", your logo, and the two URLs (`https://martialathletic.fitness/privacy`, `/terms`).
2. Create an OAuth Web client, and add the callback URL shown in Cloud → Users → Auth Settings → Sign In Methods → Google.
3. Paste the client ID and secret into that same Google section in the Cloud auth settings.

After that the Google screen reads "to continue to Martial Athletic" with your logo and your policy links.

## Notes

- I need a contact email address for the legal pages, and confirmation of the legal entity name (e.g. "Martial Athletic" vs "Jaggulas Consulting") — I will use placeholders you can correct if not supplied.
- The consent screen for AI-agent access (`/.lovable/oauth/consent`) already uses the Martial Athletic logo.
