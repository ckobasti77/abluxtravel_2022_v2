# Hero media: plan, prompts and file contract

Made in the owner's browser (ChatGPT GPT Image 2 for keyframes, Google Flow Veo 3.1 for loops), then encoded with ffmpeg. Destinations are AI; vehicles, team and trips are real photos. Real photos are never altered by AI; the only exception is a Veo test that animates clouds over a real bus photo, and it is rejected if the vehicle changes at all.

## File contract (what the code reads)

All final files live in `public/media/hero/` and are listed in `public/media/hero/manifest.json`:

```json
{
  "version": 1,
  "scenes": {
    "hodocasca": { "desktop": { "poster": "hodocasca-desktop.avif", "mp4": "hodocasca-desktop.mp4", "webm": "hodocasca-desktop.webm" }, "mobile": { "poster": "hodocasca-mobile.avif", "mp4": "hodocasca-mobile.mp4" } },
    "mediteran": { "desktop": { "poster": "...", "mp4": "..." }, "mobile": { "poster": "..." } },
    "evropa":    { "desktop": { "poster": "...", "mp4": "..." }, "mobile": { "poster": "..." } },
    "ostrog":    { "desktop": { "poster": "...", "mp4": "..." }, "mobile": { "poster": "...", "mp4": "..." } },
    "rentabus":  { "desktop": { "poster": "...", "mp4": "..." } }
  }
}
```

Rules for the code: any key may be missing. Missing video → poster with slow CSS zoom. Missing poster → fall back to the existing images in `public/generated/` (`ablux-hero-reference-*`, `ablux-hero-ostrog-*`, `route-*`). When `design/hero/READY` exists, all planned assets are delivered.

Encoding targets: desktop 1920x1080 H.264 MP4 (CRF ~26, `-movflags +faststart`, no audio) ≤ 3 MB and VP9 WebM; mobile 720x1280 ≤ 1.5 MB; posters AVIF from the first frame. Loops: 8 s.

## Keyframes

Shared style preamble (every image prompt starts with it):

> Cinematic travel photograph at golden hour, warm painterly realism, soft volumetric light, natural rich colors with deep ink-teal shadows (#06151A) and warm gold highlights (#D5A54F), subtle film grain. The left third of the frame falls off into deep ink-teal shadow for headline text, with faint engraved map contour lines barely visible in that dark area. No text, no letters, no logos, no watermark, no people in the foreground.

| Scene | Source | Desktop 16:9 | Mobile 9:16 |
| --- | --- | --- | --- |
| Hodočašća | existing `public/generated/ablux-hero-reference-*.png` (approved) | reuse | reuse |
| Verski turizam (Ostrog) | existing `public/generated/ablux-hero-ostrog-*.png` | reuse | reuse |
| Mediteran | new, style refs: hero reference + `route-mediteran.png` | "...a quiet Adriatic bay seen from a stone terrace: turquoise water, old stone town with terracotta roofs and a bell tower across the bay, cypress trees, sailboats resting, low sun on the right" | same scene recomposed vertically: sky and dark area on top for text, bay and town in the lower half |
| Evropski gradovi | new, style refs: hero reference + `route-evropski-gradovi.png` | "...an old European city at the blue-to-golden hour: a stone bridge over a calm river, baroque spires and a cathedral dome, warm street lamps reflecting on the water, cobbled riverside" | vertical version, spires in the lower two thirds |

## Loops (Google Flow, Veo 3.1 Quality, Frames to Video, first frame = last frame = keyframe, 8 s, no audio)

Shared motion prompt:

> Static locked-off camera, no camera movement, no zoom. Subtle natural motion only: {scene motion}. Every building, rock, tree and object stays perfectly still and unchanged. No people, no text. The last frame matches the first frame for a seamless loop.

| Scene | {scene motion} |
| --- | --- |
| Hodočašća | the sun glitters on the sea, small waves roll into the harbor, clouds drift slowly, the street lanterns flicker softly, a few distant birds glide |
| Ostrog | thin clouds drift along the cliff, warm light shifts slowly on the monastery walls, a few birds circle far away, leaves move gently in the breeze |
| Mediteran | gentle ripples on the turquoise water, sailboats bob slightly, cypress tips sway, clouds drift slowly |
| Evropa | river reflections shimmer, street lamps flicker softly, clouds drift, a few birds cross far away |
| Rent a bus (test, real photo) | only the clouds drift slowly across the sky and the light changes very slightly; the bus, its lettering and number plate, the buildings and road markings stay exactly identical |

Acceptance: no morphing of buildings, no invented objects, a seam that is nearly invisible (if it shows, the code crossfades 0.4 s at the loop point). Rent a bus: any change to the vehicle → reject and use the still photo with a CSS zoom.

## Isporuka (30. sep, uveče)

Napravljeno u vlasnikovom browseru: ChatGPT (GPT Image) za nove kadrove, Google Flow (Veo 3.1 Quality, first frame = last frame, 8 s, 1080p) za loopove. Sirovi fajlovi su u `design/hero/raw/` (van gita). Sve je u `public/media/hero/`, a `manifest.json` opisuje samo fajlove koji postoje.

| Scena | Desktop 1920x1080 | Mobilni 720x1280 |
| --- | --- | --- |
| hodocasca | loop MP4 + WebM, AVIF poster | loop MP4 + WebM, AVIF poster |
| ostrog | loop MP4 + WebM, AVIF poster | AVIF poster |
| mediteran | loop MP4 + WebM, AVIF poster (novi kadar) | AVIF poster (novi 9:16 kadar) |
| evropa | loop MP4 + WebM, AVIF poster (novi kadar) | AVIF poster (novi 9:16 kadar) |
| rentabus | AVIF poster, prava fotografija | — |

Rent a bus: Veo test je odbijen, jer je promenio registarsku tablicu i natpis na vetrobranu. Ostaje prava fotografija sa sporim CSS zoom-om. Pravilo važi i ubuduće: vozila, tim i putovanja se ne generišu i ne animiraju.

Obrada (ffmpeg, isto za sve loopove):
- Zona za naslov je zamrznuta na prvi kadar: na desktopu levih 30 % širine uz prelaz do 47 %, na mobilnom gornjih 30 % uz prelaz do 46 %. Ispod teksta se ništa ne pomera. Na Mediteranu je Veo animirao konture mape, a ovim je to uklonjeno.
- Petlja je već spojena: traje 7,5 s, a poslednjih 0,5 s pretapa se u početak. Kod ne radi crossfade, samo `loop muted playsinline`.
- Poster je prvi kadar gotovog loopa, pa nema skoka kad video krene.
- Desktop MP4 (H.264, `+faststart`, bez zvuka) i WebM (VP9) su do 3 MB, mobilni do 1,5 MB.
- Mobilni bez loopa prikazuje poster sa sporim CSS zoom-om. Na slabom signalu ili uz `prefers-reduced-motion` i desktop prikazuje samo poster.

## Dron kadrovi: odluka vlasnika (30. sep, 23:56) i ugovor za kod

Vlasnik želi da se kamera kreće kroz prostor i rotira, kao dron. Posledice za kod (korak 11):

- **Svaka scena u manifestu dobija `motion`:** `"drone"` (kamera se kreće, snimak ide jednom) ili `"loop"` (mirna kamera, sadašnji loopovi). Ako polje fali, podrazumeva se `"loop"`. Kod mora da radi sa oba, jer dron fajlovi stižu naknadno i menjaju samo manifest.
- **Reprodukcija `drone`:** kanal pušta svoj klip jednom od početka (`muted playsinline`, bez `loop`). Klip traje oko 8 s, a automatska smena kanala je na 9 s. Na kraju klip stoji na poslednjem kadru, a prelaz na sledeći kanal je pretapanje od 700 ms između dva `<video>` sloja. Kad korisnik izabere kanal, klip se pusti jednom i ostaje na poslednjem kadru; posle 12 s mirovanja kreće se dalje.
- **Reprodukcija `loop`:** kao do sada, `loop`, bez crossfade-a u kodu.
- **Zona za naslov je u kodu, ne u videu:** gradijent preko videa `linear-gradient(90deg, rgba(6,21,26,.94) 0%, rgba(6,21,26,.78) 32%, rgba(6,21,26,0) 58%)` na desktopu. Na mobilnom je isti gradijent odozgo nadole, 0–48 %. Preko gradijenta ide statičan SVG sloj sa linijama mape, `opacity` 0.10, maskiran na tamni deo. Kontrast teksta mora da prođe WCAG AA na svakom kadru, i proverava se na prvom i poslednjem kadru.
- **Učitavanje:** preuzima se samo aktivan klip, a sledeći tek 2 s pre smene (`preload="none"` pa `"auto"`). Poster (AVIF, prvi kadar) je uvek odmah vidljiv.
- **Bez videa, samo poster sa sporim CSS zoom-om:** kad je uključen `prefers-reduced-motion`, kad je `navigator.connection.saveData` true ili `effectiveType` 2g/3g, i dok video ne krene.
- **Obrada dron klipova (ffmpeg):** nema zamrzavanja zone i nema spajanja petlje. Snimak ostaje 8 s, sa pretapanjem iz postera tokom prvih 0,3 s. Desktop 1920x1080 je do 4 MB (kretanje traži više bitova), mobilni do 2 MB.


## Isporuka dron kadrova (1. okt, 02:50)

Isporučeno i uključeno u `public/media/hero/manifest.json` (verzija 2):

| Scena | `motion` | Desktop 1920x1080 | Mobilni 720x1280 |
| --- | --- | --- | --- |
| hodocasca | drone | MP4 3,7 MB + AVIF poster | MP4 1,9 MB + AVIF poster |
| ostrog | drone | MP4 4,0 MB + AVIF poster | MP4 2,0 MB + AVIF poster |
| mediteran | drone | MP4 4,1 MB + AVIF poster | MP4 2,1 MB + AVIF poster |
| evropa | drone | MP4 3,9 MB + AVIF poster | MP4 2,1 MB + AVIF poster |
| rentabus | still | AVIF poster (prava fotografija) | — |

- Izvor: Veo 3.1 Quality, samo početni kadar, 8 s, 1080p. Početni kadrovi su čiste verzije scena, bez tamne zone; napravljeni su u Flow-u (Nano Banana) od odobrenih slika.
- Mobilni je isečak 9:16 iz istog leta, centriran na glavni motiv scene.
- Dron klipovi idu samo kao MP4 (H.264, `+faststart`, bez zvuka). VP9 je pri ovoliko kretanja bio veći i sporiji.
- `motion: "still"` znači samo poster sa sporim CSS zoom-om.
- Zona za naslov je u kodu (gradijent i SVG linije mape), kako piše u ugovoru iznad. Na videu ništa nije zatamnjeno.
- Prethodni loopovi sa mirnom kamerom su u `design/hero/raw/static-loops/` (van gita), za slučaj da zatrebaju.
