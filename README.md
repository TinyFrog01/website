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
- Styles are in `public/styles.css`. App screenshots are in `public/screens/` (WebP, 400 px and 800 px wide).
- Visitors get French if their browser prefers it and English otherwise. The EN/FR switch remembers their choice.

## Rare

A daily food game at [cuisigo.ca/rare](https://cuisigo.ca/rare/), linked from the landing page's header and footer. Every day has seven food prompts, such as "Name a pasta shape", with 25 seconds for each. The less common a correct answer, the more it scores. Scores are named after how a steak is cooked: Well done 10, Medium 25, Rare 50, Blue 75, Tartare 100. Running out of time or passing is Burnt, for 0. That's 700 points at most, and the day's total gives a kitchen rank: Dishwasher, Prep cook, Line cook, Chef de partie, Sous-chef, Head Chef.

There's also a harder daily menu for cooks, the **Chef's Table**: seven prompts on knife cuts, French sauces, the brigade, technique and so on. Its last course is **Beat the chef**: the player sees the chef's answer (a Rare or Blue one) and wins by naming a rarer one.

- Everyone gets the same prompts on the same day. They change at midnight, Montréal time, and no prompt comes back on the next day.
- Each menu can be played once a day. Scores, streaks and an unfinished game are kept in the player's browser (`localStorage`). Nothing is sent anywhere.
- Rarity is our own estimate, set in the prompt lists. It isn't measured from players, since nothing is sent anywhere.
- Answers are accepted in English or French, with small typos, plurals and missing accents. A wrong or unknown answer can be retried until time runs out.

### Files

| File | What's in it |
| --- | --- |
| `public/rare/menu.js` | The everyday prompts and their answers |
| `public/rare/chef.js` | The Chef's Table prompts and their answers |
| `public/rare/engine.js` | Matching answers, choosing each day's prompts and the chef's answer |
| `public/rare/game.js` | The page: rounds, timer, scores, ranks, sharing. On-screen text is in `TEXT` |
| `public/rare/index.html`, `rare.css` | Layout and styles, on top of `public/styles.css` |

### Adding or changing prompts

Each prompt in `menu.js` or `chef.js` looks like this:

```js
{
  id: 'citrus',
  en: 'Name a citrus fruit',
  fr: 'Nomme un agrume',
  welldone: 'Orange, Lemon / Citron, Lime|citron vert, Grapefruit / Pamplemousse',
  medium: 'Clementine / Clémentine, Kumquat, ...',
  rare: '...',
  blue: '...',
  tartare: 'Citrange, Iyokan, ...',
},
```

1. `id` is a short name that never changes. `en` and `fr` are the prompt, without a final period.
2. Each tier lists its answers, separated by commas. Put an answer in the tier for how few people would think of it, not how hard it is.
3. Write `English / French` when the two languages show the name differently, then any other accepted spellings after `|`. Every name and spelling is accepted in both languages. Names can't contain commas.
4. On the Chef's Table, give each prompt a few Blue and Tartare answers, so there's room to beat a chef who says something Rare.

Then run `npm run check:game`. It reports a name used by two answers in the same prompt, an answer listed twice, and any day that can't get seven prompts. `npm run check:game -- --all` also lists answers only a typo apart. That's fine as long as both are real: an exact name always wins, and a typo between two answers goes to the more common one.

Adding or removing a prompt changes which prompts come up from then on. A game that has already started keeps its prompts, but publishing just after midnight is still the safest time.

## Before going live

- **Contact info:** add a contact email or mailing address to the footer. Canada's anti-spam law (CASL) requires the sender's contact details where consent is collected.
- **Privacy policy:** publish a short privacy policy and link it in the footer. Quebec's Law 25 requires one on any site that collects personal information. Say that sign-ups are stored with Google, whose servers may be outside Quebec.
- **Link previews:** change `og:image` in `index.html` to the full URL (`https://cuisigo.ca/og-image.jpg`) so previews work on every platform.
