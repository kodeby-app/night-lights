# Night Lights

A calm puzzle game: switch off every light in town before bedtime. Free, no ads, no sign-up.

A small game made by the Kodeby team and listed on [kodeby.app](https://kodeby.app).

## How to play

Tap a window to flip its light. The windows right above, below, left and right of it flip too. Switch off every light to put the town to sleep.

- 30 streets, from 3×3 to 7×7 windows, and bonus streets after that
- Finish in as few moves as the goal for three moons
- Undo, restart and hints when you are stuck
- Works with mouse, touch and keyboard (arrow keys, Enter or Space, U to undo)
- Your progress is saved in the browser
- English and Norwegian

Every level is made by tapping random windows on a dark street, so every level can be solved. The same windows are what the hint uses.

## Privacy

There is no server, no account, no ads, no analytics and no cookies. Progress is stored in your browser's local storage.
The Content Security Policy in `vercel.json` blocks all network requests from the page (`connect-src 'none'`). Only kodeby.app may show the page in a frame, for the "Try it here" demo on its app page.

## Run locally

It is plain HTML, CSS and JavaScript with no build step:

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Import the repository in Vercel with the default settings (Framework preset: Other, no build command).

## License

MIT
