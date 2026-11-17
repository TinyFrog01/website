# Cuisigo website

Pre-launch landing page for Cuisigo (launching January 2027). It's bilingual (English/French) and has a launch registration form with an optional newsletter opt-in.

## Run it

```sh
npm start
```

Then open <http://localhost:3000> (in Codespaces, open port 3000 from the **Ports** tab). There's nothing to install. You need Node 18 or later.

## Where sign-ups go

Each registration is added to `data/subscribers.csv`:

| Column | Meaning |
| --- | --- |
| `email` | The address, lower-cased |
| `newsletter` | `yes` only if the person ticked the newsletter box |
| `language` | `en` or `fr`: the language the page was shown in |
| `registered_at` | Time of registration (UTC) |
| `newsletter_consent_text` | The exact checkbox wording they agreed to: your proof of consent |

Registering twice doesn't create a duplicate. If someone ticks the newsletter box on a later visit, a new row records that opt-in. Send launch news to everyone on the list, but send newsletters only to rows with `newsletter = yes`.

`data/` is git-ignored because subscriber emails must never be committed.

## Editing the page

- Copy is in `public/index.html`. Each text appears twice, once with `lang="en"` and once with `lang="fr"`, side by side. The French uses *tu*, like the app.
- Form error messages are in `public/main.js` (`MESSAGES`).
- Styles are in `public/styles.css`. App screenshots are in `public/screens/` (WebP, 400 px and 800 px wide).
- Visitors get French if their browser prefers it and English otherwise. The EN/FR switch remembers their choice.

## Before going live

- **Hosting:** sign-ups are saved to disk, so host the server somewhere with a persistent disk, such as a small VPS or Railway/Fly.io with a volume (set `DATA_DIR` to the volume path). If you'd rather use a static host (GitHub Pages, Netlify), point the form's `action` at your newsletter tool instead. The form sends JSON to whatever URL `action` contains.
- **Contact info:** add a contact email or mailing address to the footer. Canada's anti-spam law (CASL) requires the sender's contact details where consent is collected.
- **Privacy policy:** publish a short privacy policy and link it in the footer. Quebec's Law 25 requires one on any site that collects personal information.
- **Link previews:** once you have a domain, change `og:image` in `index.html` to the full URL (for example `https://your-domain.com/og-image.jpg`) so previews work on every platform.
