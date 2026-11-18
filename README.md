# Cuisigo website

Pre-launch landing page for Cuisigo (launching January 2027). It's bilingual (English/French) and has a launch registration form with an optional newsletter opt-in.

The site is static. GitHub Pages publishes the `public/` folder to cuisigo.ca every time `main` is pushed. Sign-ups are kept in a private Google Sheet, never in this repo.

## Preview it locally

```sh
npm start
```

Then open <http://localhost:3000> (in Codespaces, open port 3000 from the **Ports** tab). There's nothing to install. You need Node 18 or later.

The preview's form sends to the real sign-up sheet, so delete any test rows afterwards.

## How sign-ups work

1. A visitor enters their email. The page sends it to a small Google Apps Script ([google-apps-script/Code.gs](google-apps-script/Code.gs)) that runs in your Google account.
2. The script turns away addresses that can't be real: a wrong format, a domain that can't receive email (checked live), or a throwaway inbox such as Yopmail or Mailinator.
3. It saves the address in the sheet's **Pending** tab and emails a confirmation link, in English or French to match the page.
4. When the person clicks the link, the address moves to the **Sign-ups** tab. Only confirmed addresses ever go there. Unconfirmed ones are deleted after 7 days.

### Why the list stays private

- The emails only live in your Google Sheet. Keep its sharing set to **Restricted**: anyone with access to the sheet can see the list.
- This repo holds code only: no emails, passwords or keys. The script's web address is public (it's in `index.html`), but all it lets anyone do is sign up. Nothing it sends back ever includes the list.
- The script can only open the spreadsheet it's attached to, not your other files.
- Don't save downloaded copies of the list in this folder. `.gitignore` blocks spreadsheet files, but anything committed here becomes public.

### The Sign-ups tab

| Column | Meaning |
| --- | --- |
| Email | The address, lower-cased |
| Newsletter | `yes` only if the person ticked the newsletter box and confirmed |
| Language | `en` or `fr`: the language the page was shown in |
| Confirmed at | When they clicked the confirmation link |
| Newsletter consent at | When their newsletter opt-in was confirmed |
| Newsletter consent text | The exact checkbox wording they agreed to: your proof of consent |

Registering twice doesn't create a duplicate. If someone already on the list ticks the newsletter box later, they get a new confirmation link, and their row is updated once they click it. Send launch news to everyone on the tab, but send newsletters only to rows with Newsletter = `yes`.

Don't rename the tabs or reorder their columns. You can add your own columns to the right.

## Set up the sign-up sheet (one time)

1. Sign in to the Google account that should send the confirmation emails, then create a new Google Sheet, for example "Cuisigo sign-ups".
2. In the sheet, open **Extensions → Apps Script**. Delete the sample code, paste in all of [google-apps-script/Code.gs](google-apps-script/Code.gs), and click **Save**.
3. Optional: at the top of the code, set `replyTo` to your @cuisigo.ca address, so replies to confirmation emails go there instead of to the Gmail account.
4. In the toolbar, choose `setup` and click **Run**. Google asks for permission. Because it's your own script, Google shows "Google hasn't verified this app": click **Advanced**, then **Go to … (unsafe)**, then **Allow**. The sheet now has **Sign-ups** and **Pending** tabs.
5. Click **Deploy → New deployment**. Click the gear icon and choose **Web app**. Set **Execute as** to **Me** and **Who has access** to **Anyone**, then click **Deploy**. Copy the **Web app URL** (it ends in `/exec`).
6. In `public/index.html`, paste that URL as the form's `action`, replacing the placeholder. Commit and push.

To change the script later, paste the new code, then click **Deploy → Manage deployments**, the pencil icon, **Version: New version**, and **Deploy**. This keeps the same URL. A **New deployment** would create a new URL.

**Limit:** a free Gmail account can send about 100 emails a day, so up to about 100 people a day can sign up. Past that, the form asks people to try again later. A Google Workspace account can send 1,500 a day.

## Editing the page

- Copy is in `public/index.html`. Each text appears twice, once with `lang="en"` and once with `lang="fr"`, side by side. The French uses *tu*, like the app.
- Form messages are in `public/main.js` (`MESSAGES`). The confirmation email's wording is in `google-apps-script/Code.gs` (`EMAIL_TEXT`).
- Styles are in `public/styles.css`. App screenshots are in `public/screens/` (WebP, 400 px and 800 px wide).
- Visitors get French if their browser prefers it and English otherwise. The EN/FR switch remembers their choice.

## Before going live

- **Contact info:** add a contact email or mailing address to the footer. Canada's anti-spam law (CASL) requires the sender's contact details where consent is collected.
- **Privacy policy:** publish a short privacy policy and link it in the footer. Quebec's Law 25 requires one on any site that collects personal information. Say that sign-ups are stored with Google, whose servers may be outside Quebec.
- **Link previews:** change `og:image` in `index.html` to the full URL (`https://cuisigo.ca/og-image.jpg`) so previews work on every platform.
