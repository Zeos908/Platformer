# Headline Aim Range

A browser aim trainer for tactical shooters, set in one painted hallway with four doorways: two on each side, at 13 m and 34 m. Every agent has the same health pool and hitbox, and you shoot them with a rifle, revolver or sniper tuned to Valorant's Vandal, Sheriff and Operator stat sheets. Optional flash drills throw two kinds of flashes at you so you can practise turning away and swinging back. Your Valorant crosshair code imports directly.

![Gameplay: a one-tap headshot at 16 m](docs/screenshot.jpg)

## Download and play

The easiest way: download **`dist/headline.html`** and double-click it. It is one self-contained file (about 630 KB, with three.js and all the game code inside), so it runs straight from your disk with no install and no server, and works offline. Fonts fall back to your system fonts when you are offline.

On GitHub, open `headline-aim-trainer/dist/headline.html` on the branch and use the **Download raw file** button (the download icon above the code). Then open the downloaded file in Chrome, Edge or Firefox.

To rebuild that file after changing the code: `npm install`, then `npm run build`.

## Run it from source

It is a static site with no build step. Serve the folder over HTTP: ES modules do not load from `file://`.

```bash
npm start                 # uses npx serve on http://localhost:5173
# or
python3 -m http.server 5173
```

Open the URL in Chrome, Edge or Firefox and click **Start session**. The click locks the mouse. Three.js loads from jsDelivr, so the first load needs a network connection.

To host it, any static host works. For GitHub Pages: Settings → Pages → deploy from the branch and folder that contain `index.html`.

## Controls

| Input | Action |
| --- | --- |
| Left mouse | Fire (hold for full auto) |
| Right mouse | Rifle: hold to zoom 1.25×. Sniper: click to cycle 2.5× → 5× → unscoped |
| R | Reload |
| 1 / 2 | Rifle / revolver (Training and Endless) |
| Esc | Pause |

Sensitivity has its own card in the menu (number box, slider, DPI, zoom multiplier, cm/360 and eDPI), and you can also change it from the pause menu mid-session. It uses Valorant's scale (0.07° per mouse count) and the field of view is 103° horizontal, so your in-game sensitivity carries over. The settings panel also shows your cm/360 for a given DPI. Zoomed, sensitivity is divided by the zoom (2.8° per 500 counts at 5× instead of 14°), then multiplied by the zoom multiplier. Raw mouse input (`unadjustedMovement`) is requested when the browser supports it.

## The hallway

You stand at one end of an open-air hallway, 8.4 m wide and 53 m long, looking down it. Each side wall has two doorways, at 13 m (A1 left, B1 right) and 34 m (A2 left, B2 right). Each doorway has a blade sign with its callout and depth. Every doorway opens into a small side room where agents wait out of sight. From there they peek out, strafe in the doorway, or cross the hallway into the room opposite. Flashes arc out of the doorways too. The kill feed and the endless death screen name the door an agent came from instead of the agent.

The scenery is painted to match the agents:

- **Surfaces:** cream plaster walls with a teal panelled lower band, sandstone door frames and trims, warm stone floor tiles and a carpet runner down the middle.
- **Details:** wooden beams that throw shadow stripes, planters, wall lamps, banners, a mural on the end wall, rooftops beyond the walls and painted clouds.
- **Shading:** every surface uses the same soft banded shading, with big brush-like tone variation, sunlit tops on walls and darker floor edges along the walls.
- **Performance:** the static scenery is merged into one mesh per material, so the empty hallway costs about 70 draw calls.

## Modes

| Mode | What it does |
| --- | --- |
| **Training** | Every setting is yours: weapon, which doors (near, far or all), movement, speed, agents at once, shields and flashes. Sessions are 60 s, 120 s or untimed. |
| **Endless** | Everything is on: all distances, all movement types, walk and run, heavy shields, both flashes with a swing after each pop. It speeds up as you survive: 1 agent at a time, 2 after 25 s, 3 after 70 s, with spawns and flashes getting more frequent until 150 s. **Any agent that keeps line of sight on you for 2 s kills you.** Each agent has a red meter under its health bar that fills while it can see you and drains while it can't. The screen edges turn red as the most dangerous agent gets close to 2 s. Looking away does not help, because the meter tracks what the agent can see, not what is on your screen. |
| **Operator** | You get the bolt-action sniper and agents only come from the far doors (34 m). Movement, speed, shields, flashes and length are still yours to set. |

## Score

Every kill is worth up to 1000 points:

```
points = 1000 × (fewest bullets that could have killed it) ÷ (bullets you fired since your last kill)
```

- **Bullets you fired** counts every shot since your previous kill, misses included, so spraying at nothing costs you on the next kill.
- **Fewest bullets** is the number of headshots that kill that agent at that range with your gun. That is 1 for the rifle and sniper. For the revolver it is 1 inside 30 m, and 2 beyond 30 m against 150 HP.
- A one-tap is always 1000. A kill with 2 bullets is 500, 3 bullets 333, a 6-bullet spray 167.
- Session score is the sum over all kills, so more kills still beat fewer perfect ones, but efficiency multiplies everything. The report also shows bullets per kill and bullet efficiency. Personal bests are tracked by score.

## What is modelled

### Health

Every agent has **100 health** plus the shield you pick: none (100), light (125) or heavy (150, the default). Shields absorb damage first.

### Art style

The agents use a stylized look in the spirit of hero tactical shooters, built from original designs:

- **Shading:** soft banded ("painted") light with a lifted shadow side, a top-to-bottom tone gradient, a little brush-like color variation, and a warm rim light.
- **Enemy highlight:** a thin edge in red, yellow or purple (or off) under HUD & sound. It widens with distance so it stays visible at long range.
- **Red head highlight:** a soft red glow sized to the head hitbox, so you can see exactly where headshots count. Walls still hide it. Toggle it under HUD & sound.
- **Silhouettes:** each agent reads differently from far away: Halcyon's open long coat, Nyx's hood and two-piece cape, Brakk's pauldrons and chest plate, Saffron's flowing scarf and ponytail, Tarn's duster and big gloves, Juno's headphones and lowered hood, Ozark's goggles, pack and antenna, Kestrel's spiked hair and high collar. Coats, capes, scarves and ponytails swing with the legs and flutter when running.
- **Accents:** glowing trim on arms, chest emblem, belt, knees, boots and gun, with a slow pulse. It dims when an agent dies.
- **Detail:** eyes, brows and mouth on every face, and gloves with fingers and a thumb wrapped on the gun.
- **Visual bulk:** some agents look heavier or slimmer, but the hitboxes never change.
- **Performance:** static parts are merged per bone (about 40 meshes per agent instead of about 110). All agents share one compiled shader, warmed up at load, so spawning never stalls.

### Body shape and hitboxes

All eight agents share one skeleton, one set of proportions and one set of hitboxes, the way every agent in Valorant shares a hitbox and an in-game height (Riot has said this publicly; it does not publish the exact dimensions). Only clothes, hair and colors change.

- **Height:** about 1.78 m standing. The head center sits at 1.62 m, level with your eyes (1.6 m), so head-level crosshair placement lines up on flat ground. The head is about 1/7.5 of body height. Crouching drops the head to about 1.26 m.
- **Skeleton:** pelvis, spine, chest, neck, head, two-joint legs with knees and ankles, and arms posed with two-bone IK onto a shouldered rifle. Limbs are tapered, not boxes.
- **Hitboxes follow the bones:** head; neck, chest, stomach, pelvis, upper arms and forearms count as body; thighs, shins and feet count as legs. There are real gaps between the legs and beside the head, and the head box is a little generous, so shots at the top of the neck count as headshots.
- **Animation:** the walk and run cycles bend the knees and keep the feet planted. While strafing, the hips turn toward the direction of travel and the chest stays on you. Peekers crouch 30% of the time once they stop, and strafers sometimes crouch during a short pause. Crouching moves the hitboxes with the body.

### Weapons

| | Rifle (Vandal stats) | Revolver (Sheriff stats) | Sniper (Operator stats) |
| --- | --- | --- | --- |
| Head / body / legs | 160 / 40 / 34 at any range | 159 / 55 / 46 up to 30 m, then 145 / 50 / 42 | 255 / 150 / 127 at any range |
| Fire rate | 9.75 rounds/s (−10% zoomed) | 4 rounds/s | 0.6 rounds/s, one shot per click |
| Magazine | 25 | 6 | 5 |
| Reload | 2.5 s | 2.25 s | 3.7 s |
| Spread | 0.25° first shot (0.16° zoomed) | 0.25° first shot | 5° unscoped, 0° scoped |
| Zoom | 1.25× (hold) | none | 2.5× and 5× (click to cycle) |

**Infinite ammo** is on by default (Session card): the magazine never empties and you never reload. Turn it off to practise reloads. Score still counts every bullet you fire.

Against 150 HP, the rifle kills with 1 headshot, 4 body shots or 5 leg shots. The revolver one-taps the head inside 30 m but needs two headshots beyond that. The sniper kills with one head or body shot. The settings panel recalculates shots-to-kill when you change shields. The sniper stays scoped after a shot and cycles its bolt before the next one. Its viewmodel is replaced by a scope overlay with a duplex reticle and your crosshair profile's sniper center dot.

**Recoil.** The rifle spray climbs gently for the first three bullets, kicks up hard for bullets 4–9, then sways left and right along the top. Spread stays tight for the first few rounds and then opens up. It recovers if you pause briefly, so 2–3 round bursts stay accurate. Each revolver shot kicks about 2.4°, and spamming it blooms fast. Recoil and recovery are hand-tuned to feel like the reference guns. They are not extracted data.

### Agents

Agents wait in the side rooms and do one of four things:

- **Peek:** walk a random distance out from the wall and stand still until you kill them (30% crouch once they stop). The distance is skewed toward the wall: `0.35 m + range × u^2.2` (u uniform from 0 to 1, range up to 5 m). About half stop within the first fifth of the range, just past the edge, and the chance falls off further out.
- **Strafe:** step out and jiggle left and right.
- **Cross:** walk or run across the hallway from one doorway into the room opposite.
- **Swing:** run out wide right after a flash pops.

Running agents move at 6.75 m/s and you can hear their footsteps. Walking agents are silent.

Peek spots are computed from the map at load time. The game sweeps a line through each pair of doors and finds where an agent goes from fully hidden (inside a room) to fully visible (in the doorway). Health bars only appear while you have line of sight, and agents have no name tags.

### Flashes

| | Curve flare (modelled on Phoenix's Curveball) | Hawk flash (modelled on Skye's Guiding Light) |
| --- | --- | --- |
| Path | Arcs out of a doorway around the frame | Glides out of a doorway toward you |
| Cue | Whoosh on throw | Screech on launch, then a rising screech 0.55 s before the pop |
| Time to pop | 0.65 s | 0.75–1.25 s of flight + 0.55 s windup |
| Full blind if you look at it | 1.1 s, then a 0.55 s fade | 1.75 s, then a 0.75 s fade |

How much you get flashed depends on the angle between your view and the pop. Up to 42° off-centre is a full flash. The effect fades out by 95°, so turning roughly 90° away dodges completely. Cover between you and the pop also blocks it. With **"An agent swings out right after each pop"** on, an agent runs out from where the flash came from about 0.1–0.4 s after the pop, so you have to turn back and take the fight. **Flash drill only** removes every other agent.

Timings are approximations of the abilities, not data pulled from the game.

### Stats

The end-of-session report shows:

- **Score:** session score, bullets per kill and bullet efficiency. Endless runs also show time survived and who killed you.
- **Shooting:** kills, accuracy and headshot rate.
- **Speed:** time from an agent becoming visible to your first hit and to the kill.
- **Breakdown:** where your hits landed, one-tap kills, agents that got back inside, best streak and average kill distance.
- **Flashes:** dodged, partial and full flashes, plus total time blind.

Personal bests (by score) are saved per mode and settings combination in `localStorage`.

## Crosshair codes

Paste a code from Valorant (Settings → Crosshair → Export Profile Code) into the Crosshair panel and click Import. **Copy code** exports it back. Quick controls change the color, outlines, center dot and inner and outer lines, and the code updates to match.

Riot does not publish the format. The key table and defaults follow the community-documented format used by open-source tools such as [genesy/crosshair-codes](https://github.com/genesy/crosshair-codes).

| Section | Keys |
| --- | --- |
| General (before `P`) | `s` advanced options, `p` ADS copies primary (`p;0` means a separate ADS crosshair), `c` override all primaries |
| `P` primary / `A` ADS | `c` color index 0–8 (white, green, yellow-green, green-yellow, yellow, cyan, pink, red, custom), `u` custom RRGGBBAA, `h` outlines, `t` outline thickness, `o` outline opacity, `d` center dot, `z` dot thickness, `a` dot opacity, `m` override firing-error offset |
| `0x` inner / `1x` outer lines | `b` show, `t` thickness, `l` length, `v` vertical length when `g;1`, `o` offset, `a` opacity, `f` firing error, `e` firing multiplier, `m` movement error, `s` movement multiplier |
| `S` sniper | `d` show center dot, `c` color index, `t` custom RRGGBBAA, `s` thickness, `o` opacity |

Keys a code leaves out keep their defaults, which are the ones that make code `0` Valorant's default crosshair. Unknown keys are kept, so a code survives a round trip.

The crosshair is drawn 1:1 in device pixels around the screen center, so sizes match the game at your native resolution. Lines with firing error enabled move out by the current weapon's spread on screen, and `m;1` removes the resting part of that spread. A separate `A` crosshair is used while the rifle is zoomed when `p;0` is set. The `S` center dot shows inside the sniper scope. Movement error does nothing here because you never move.

## Project layout

```
index.html        menu, HUD and result screens (all CSS inline)
src/config.js     weapon stats, health, flash timings, score formula, modes, defaults
src/crosshair.js  Valorant crosshair code parser, encoder and pixel renderer
src/world.js      painted hallway, doorways and side rooms, ray tests, peek-spot generation
src/agents.js     agent models, shared hitboxes, movement plans, peek distances, animation
src/weapon.js     viewmodels, fire rate, recoil pattern, spread, zoom, bolt, reload
src/flashes.js    curve flare and hawk flash paths and visuals
src/effects.js    sparks, tracers, decals, flash pop glow
src/audio.js      synthesized sounds with HRTF positional audio
src/hud.js        crosshair, hit markers, damage numbers, kill feed, health bars
src/input.js      pointer lock and raw mouse input
src/game.js       simulation: modes, spawning, shot resolution, scoring, flash dodging, endless line-of-sight death
src/main.js       settings UI, screens and the frame loop
```

There are no audio or model files. Everything is generated at runtime with three.js and WebAudio.

## Moving it into its own repository

This folder is self-contained. To split it into a new repository with its history:

```bash
git subtree split --prefix headline-aim-trainer -b headline-aim-trainer
git push git@github.com:<you>/headline-aim-trainer.git headline-aim-trainer:main
```

## Notes

This is an independent fan project and is not affiliated with Riot Games. It uses no Riot assets. The agents, guns and abilities are original designs. Only the published damage, fire-rate, magazine and health numbers are matched, and the crosshair code format is supported so you can bring your own crosshair.
