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

1. A visitor enters their email and checks the newsletter box. The box is required: registering means getting the newsletter. The page sends the sign-up to a small Google Apps Script ([google-apps-script/Code.gs](google-apps-script/Code.gs)) that runs in your Google account.
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
| Newsletter | `yes` once they confirm. The box is required, so new sign-ups always get `yes` |
| Language | `en` or `fr`: the language the page was shown in |
| Confirmed at | When they clicked the confirmation link |
| Newsletter consent at | When their newsletter opt-in was confirmed |
| Newsletter consent text | The exact checkbox wording they agreed to: your proof of consent |

Registering twice doesn't create a duplicate. Send newsletters only to rows with Newsletter = `yes`: anyone who registered before the box was required may have `no`. Every email you send to the list must include a way to unsubscribe (CASL).

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
- To keep waits short, "Check your inbox" shows immediately for the big email providers listed in `KNOWN_PROVIDERS` (`public/main.js`), and "You're on the list" shows as soon as a confirmation link opens. The script finishes the work in the background. Only add providers whose addresses the script always accepts.
- Styles are in `public/styles.css`. The pages load it as `/styles.css?v=3` (and `/main.js?v=2`): when you change either file, raise that number in the HTML, so visitors get the new file with the new page instead of an old copy their browser kept. App screenshots are in `public/screens/` (WebP, 400 px and 800 px wide).
- Visitors get French if their browser prefers it and English otherwise. The EN/FR switch remembers their choice.

## RARE, the daily food game

RARE lives at <https://cuisigo.ca/rare/> (`public/rare/`). Visitors reach it with the **Play Rare** link in the header, left of EN/FR, and from the homepage footer. Each day everyone gets the same two menus of seven prompts, with 25 seconds for each answer. The menus change at midnight Montréal time.

- **Today's menu** asks everyday questions ("Name a pasta shape"). **Chef's Table** is harder: knife cuts, French sauces, kitchen job titles and more. Its last course is **Beat the chef**: the player sees the chef's answer (a Rare or Blue one) and has to serve a rarer one.
- A right answer scores by how uncommon it is: Well done 10, Medium 25, Rare 50, Blue 75, Tartare 100. Running out of time scores 0 (Burnt). A wrong answer costs nothing but time: the player tries again until the clock runs out.
- The day's total, out of 700, gives a kitchen rank: Dishwasher (0), Prep Cook (70), Line Cook (175), Station Chef (300), Sous Chef (425), Head Chef (550).
- How common each answer is was set by hand in the prompt bank. It isn't measured from players' answers: the site has no server to collect them.
- Games and stats are saved in the visitor's browser only. Nothing is sent anywhere.

| File | What's in it |
| --- | --- |
| `prompts.js` | The prompts and every accepted answer with its tier. The comment at the top explains the format. |
| `match.js` | How a typed answer is matched: case, accents, articles, plurals and small typos don't matter. |
| `game.js` | The rules: daily schedule, points, ranks, saved progress. |
| `rare.js`, `rare.css`, `index.html` | The page. |

To add a prompt, copy an existing one in `prompts.js`, give it a new `id` and at least one answer at each tier from 1 to 5. More prompts mean longer before any repeats. Today 28 everyday prompts give a 4-day cycle and 21 Chef's Table prompts a 3-day cycle. Adding or removing prompts reshuffles the coming days, so make that change between days, not in the middle of one. Never rename or reuse an `id`.

## Google Tag Manager

Every page loads the Google Tag Manager container **GTM-M2ZFCNKG**. Google's snippet sits right after `<head>` in `public/index.html` and `public/rare/index.html`. If you add a page, paste the same snippet there too, once. Analytics and other tags are set up in Tag Manager itself, not in this repo.

The local preview (`server.js`) has a strict security policy that only lets this exact snippet run. If Google's snippet ever changes, update `GTM_INLINE_HASH` in `server.js`: the browser console prints the new value. The live site on GitHub Pages doesn't use that policy.

## Google AdSense (ads)

- The AdSense script for **ca-pub-8693995366671646** is in the `<head>` of `public/index.html` and `public/rare/index.html`, right after Tag Manager. Google looks for it on the homepage when it reviews the site, so keep it there. `public/ads.txt` tells ad buyers that this account may sell ads on cuisigo.ca.
- **Ads beside the game:** `public/rare/` has a 160 × 600 ad column on each side, shown only on screens 1360px wide or more. On smaller screens the page looks the same as without ads. The columns stay empty until you put a display ad unit's ID in `SLOT` at the top of `public/rare/ads.js` (AdSense → Ads → By ad unit → Display ads; one unit is used for both sides).
- **Auto ads:** in AdSense, Auto ads can also place ads anywhere on both pages, including pop-up ones between pages and a bar at the bottom of the screen. To keep ads only beside the game, turn Auto ads off for cuisigo.ca (AdSense → Ads → By site).
- Google doesn't show ads on `localhost`, so the columns are empty in the local preview.

## Search engines

- `public/sitemap.xml` lists the page for Google and Bing, and `public/robots.txt` points to it. When you change the page's content, update `<lastmod>` in the sitemap to that day's date.
- The page's `<head>` tells search engines that `https://cuisigo.ca/` is the one official address, that the site is called "Cuisigo", and which logo goes with it. None of this shows on the page.
- If you add a page, add its full address to the sitemap as another `<url>` entry.

### Set up Google Search Console (one time)

1. Go to <https://search.google.com/search-console> and sign in.
2. Click **Ajouter une propriété**, choose **Domaine**, enter `cuisigo.ca` and click **Continuer**.
3. Google shows a TXT record. Add it to the domain's DNS settings at your domain registrar, then click **Valider**. DNS changes can take up to a day.
4. In the left menu, open **Sitemaps**, enter `sitemap.xml` under **Ajouter un sitemap**, and click **Envoyer**.
5. Open **Inspection de l'URL**, enter `https://cuisigo.ca/`, and click **Demander une indexation**.

Do the same in Bing Webmaster Tools (<https://www.bing.com/webmasters>). It can import the site from Search Console.

## Before going live

- **Contact info:** add a contact email or mailing address to the footer. Canada's anti-spam law (CASL) requires the sender's contact details where consent is collected.
- **Analytics, ads and cookies:** Google Tag Manager and Google AdSense are on every page. AdSense requires a privacy policy that says Google and its partners use cookies to show ads. If Tag Manager's tags (Google Analytics, for example) set cookies or track visitors, say that too. Quebec's Law 25 also requires tracking that can identify or profile people to be off until visitors agree. A consent banner with Google's Consent Mode does that.
- **Privacy policy:** publish a short privacy policy and link it in the footer. Quebec's Law 25 requires one on any site that collects personal information. Say that sign-ups are stored with Google, whose servers may be outside Quebec.
