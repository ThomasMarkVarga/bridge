# Featured preview for vibe-coding.fans

The wall does not use GIFs. Both featured cards there are plain elements animated
by CSS, inside a `<div class="preview ...">` of 339 by 184 with `role="img"` and a
description. So the thing to paste is CSS, and that is what is here. The animated
files are a fallback for anywhere that cannot run a stylesheet.

## What to paste

Open `bridgedays-preview.html`. It is a harness: the only parts that go on the
wall are the two blocks between the PASTE MARKER comments.

- The markup block replaces the `<div class="preview ...">` used by the other cards.
- The CSS block goes wherever `.preview-ps` and friends already live.

Everything is prefixed `bd-`, and all the colours are local custom properties on
`.preview-bd`, so nothing can reach out and change another card.

## What it shows

The real Romanian calendar, not an invention: Saturday 28 November to Sunday
6 December 2026. Saint Andrew's Day falls on the Monday and the National Day on
the Tuesday, so booking the Wednesday, Thursday and Friday joins two weekends and
two public holidays into nine days off for three days of leave. That is the whole
pitch of the app in one picture, and running the app for RO 2026 gives the same
answer.

Seven second loop: the three booked days land one after another, a span closes
over all nine, the count changes from what you spend to what you get, it holds,
then it clears and starts again.

## Files

| File | What it is |
| --- | --- |
| `bridgedays-preview.html` | The harness, and the source of truth for the markup and CSS |
| `bridgedays-preview.gif` | 678 by 368, 25fps, 118KB. For a README or a directory listing |
| `bridgedays-preview.mp4` | The same loop, 72KB. Prefer this where a video tag is allowed |
| `make-gif.mjs` | Renders the two files above |

## Rebuilding the animated files

```
node featured-preview/make-gif.mjs
```

Needs ffmpeg on PATH. Everything else is already a dev dependency.

It is not a screen recording. The geometry is what the browser measured off the
real preview and the keyframes are the ones in the stylesheet, replayed with the
same cubic-bezier, so the CSS version and the file cannot drift into looking like
different animations. Every frame is drawn from vectors in the site's own
typeface, so there is no resampling blur, and a flat 64 colour palette with no
dithering keeps the GIF small.

## Accessibility

The box carries `role="img"` and an `aria-label` describing what happens, so it
is not silent to a screen reader. Under `prefers-reduced-motion: reduce` the
animation is switched off and the finished state is shown instead, which is the
state worth seeing anyway.
