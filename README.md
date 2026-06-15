```
            ██
           ████
          ██  ██
         ██    ██
        ██      ██
       ██        ██
      ██          ██
     ██            ██
    ██              ██
   ██                ██
  ██                  ██
 ██                    ██
██                      ██
```

# Spectra · λ

An online, real‑time, **team** party game in the spirit of *Wavelength* — wrapped
in an ASCII / terminal aesthetic with a spectral colour theme. Make a room, share
the code, split into two teams, and try to read each other's minds across a
rainbow dial.

Rooms work like skribbl.io: no accounts, just a name and a 4‑character code. The
host can tune the rules and add their own **custom spectrum pairs** before play.

---

## How it plays

Each round one team is **active** and one player on it is the **psychic**:

1. **Clue** — only the psychic sees the hidden target zone on the spectrum
   (e.g. somewhere between `Cold ◄———► Hot`). They give their team a single
   short clue pointing to it.
2. **Guess** — the psychic's teammates turn the dial together to where they
   think the target is, then lock it in. They score **4 / 3 / 2 / 0** by how
   close the dial lands.
3. **Bet** — the *other* team guesses whether the real target is to the **left**
   or **right** of that locked guess. If they're right, they steal a **+1**.
4. **Reveal** — the target is shown, points are tallied, and the turn passes to
   the other team with a new psychic.

First team to the target score (default **10**) wins.

---

## Quick start

Requires Node.js 18+.

```bash
npm install        # installs all three workspaces
npm run dev        # server on :3001, client on :5173 (open this one)
```

Open http://localhost:5173, create a room, and share the code. To try it solo,
open several browser tabs — you need at least **2 players per team** (4 total)
to start.

### Production (single port)

```bash
npm run build      # builds the client into client/dist
npm start          # serves the app + game on http://localhost:3001
```

Set `PORT` to change the server port.

---

## Custom spectrum pairs

In the lobby, the host can:

- toggle the built‑in deck on/off,
- set the score needed to win,
- add any number of custom pairs (a left term and a right term, e.g.
  `Boring ⟷ Thrilling`). Custom pairs mix into the draw pile alongside the
  default deck.

> The built‑in deck is original generic opposite‑pairs written for this project.

---

## Project layout

```
spectra/
├── shared/   @spectra/shared — types, the socket protocol, scoring/geometry, deck
├── server/   @spectra/server — Express + Socket.IO authoritative game engine
└── client/   @spectra/client — React + Vite UI (the ASCII/spectral front end)
```

**Stack:** TypeScript everywhere · Socket.IO for real‑time play · React + Vite ·
plain CSS for the terminal/spectral theme (no UI framework).

### How it stays fair

The server is authoritative and sends every player a **personalized** view of the
game state. The secret target is only included for the psychic — and for everyone
once the round is revealed — so it can't be peeked at from the network.

---

## Notes & limitations

- Rooms live in server memory and disappear when empty; there's no database.
- There's no reconnect/session resume yet — a page refresh drops you from the
  room (you can re‑join with the same code).
- Built for friends playing together; team discussion happens over voice/chat,
  the same trust model as skribbl.io.
```
