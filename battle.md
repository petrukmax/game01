You are an expert game developer and creative AI. Your task is to create a complete, playable side-scrolling beat 'em up game using Three.js (and optionally Next.js for project structure). The game must be modular, well-organized, and feature a single playable hero — an original black panther — fighting against various enemies across multiple levels. You must generate all graphics yourself using code (procedural textures, simple 3D models, canvas-generated sprites, or geometric shapes). Do not use external image assets. You may use the Web Audio API to generate sound effects procedurally. There must be no background music—only sound effects (paw swipes, bites, hits, jumps, etc.).

**Important:** Do not mention or reference any existing game titles. This is an original creation inspired by classic side-scrolling beat 'em ups. The panther is an original stylized animal character; do not use any existing superhero, film, comic, or game character likeness.

**Game Overview:**
- **Genre:** 2.5D side-scrolling beat 'em up.
- **Camera:** Fixed side view with slight perspective, following the hero horizontally.
- **Hero:** A single playable black panther — an original, stylized, low-poly melanistic big cat — with a unique appearance. It moves on all fours, can move left/right, jump, attack with forepaw swipes and bites, perform combos, grab and throw enemies with its forepaws and jaws, and use a special pounce that leaps onto an enemy and knocks it back. The hero has health and lives. The panther's silhouette, proportions, rig, animation set, and combat motion are defined in the **Black Panther Hero & Animation Reference** section below; treat that section as the authoritative character specification for every stage.
- **Enemies:** Multiple types (e.g., grunt, brute, agile) with distinct looks, behaviors, and attack patterns. They spawn in waves and must be defeated to progress.
- **Levels:** At least 3 distinct levels (e.g., street, dojo, industrial). Each level has a scrolling environment, obstacles, and a boss at the end. Levels have a start and end, with checkpoints.
- **Combat:** Real-time fighting with hitboxes, damage, knockback, invincibility frames, and combo counters. Enemies can block, dodge, and attack in groups.
- **Animations:** Procedural or keyframe-based quadruped animations for idle, stalking walk, run, turn in place, crouch, jump, land, forepaw swipe, bite, pounce, grab, throw, hit, fall, get up, defeat, etc. Use Three.js AnimationMixer or manual bone manipulation.
- **UI:** Health bars for hero and boss, score, lives, level indicator, game over and victory screens.
- **Sound:** Procedural sound effects for actions (paw swipe, bite snap, pounce, growl, hit, jump, land, enemy defeat, etc.). No music.

**Black Panther Hero & Animation Reference (Persistent Production Data):**
Treat this section as the authoritative character bible for the hero. It preserves the figure, rig, locomotion, turning, and combat-motion data derived from the supplied 19.7-second, 60 fps side-view reference clip, so a future production pass can rebuild the same character and animation language without re-analyzing the video. The clip is a motion reference only: the game remains the 2.5D side-scrolling beat 'em up defined in this document, not a platformer. Do not copy the clip's blue backdrop, flat platform, or demo camera. Do not add a superhero costume, humanoid torso, weapons, armor, speech, or any existing character likeness. The hero is an original, low-poly, quadruped melanistic big cat. The clip file is not required at runtime; this section contains the complete production data needed to rebuild the hero and its movement.

**A. What the reference clip shows (motion breakdown)**
- 0.0–1.4 s: low, nearly stationary stance. The panther shifts weight between paws, makes small paw adjustments, keeps its head low and forward, and holds its tail low with a slight upward tip. The body never rises to a humanoid upright pose.
- 1.4–6.5 s: a smooth, low stalking walk to the right. The head stays level, the shoulder blades roll, the hips counter-sway, and the long tail trails and balances the body. The paws stay close to the ground; steps are deliberate rather than bouncy.
- 6.5–6.8 s: a close, three-quarter turn. The head and neck lead, the chest follows, the hips pivot last, and the tail whips around as a counterweight. The body compresses slightly during the pivot.
- 6.8–19.7 s: repeated left/right passes across the platform with the same low gait and several close turns. Turning is fluid and continuous; there is no moonwalk, pop, or upright idle.
- The clip contains no attack, jump, hit, or death animation. The attack moves below are therefore built from the same feline motion language: low center of gravity, shoulder-driven paw arcs, jaw-led bites, powerful hind-leg launches, and tail counterbalance.
- Constant rules: the spine stays roughly horizontal; the head is carried forward at about shoulder height; the tail is never stiff or vertical; the feet are digitigrade; the silhouette reads as a big cat from the side at all times.

**B. Silhouette and proportions**
Use these game-scale values as a starting point and preserve the ratios when resizing:

| Part | Value |
| --- | --- |
| Shoulder height at withers | 0.75–0.85 m |
| Nose-to-rump body length | 1.35–1.50 m |
| Tail length | 0.95–1.10 m (about 70–75% of body length) |
| Head length | 0.28–0.32 m |
| Chest depth | 0.36–0.42 m |
| Chest width | 0.38–0.44 m |
| Waist width | 0.26–0.30 m |
| Leg length (shoulder/hip to ground) | 0.55–0.65 m |
| Paw length | 0.12–0.15 m |
| Eye line | 0.78–0.88 m, just above the back line |

- Torso: long, low, muscular, with a deep chest, a tucked waist, and hips set slightly higher than the chest. The back line is almost horizontal in locomotion.
- Head: small relative to the torso, wedge-shaped, with a short muzzle, wide cheeks, small rounded ears, and a strong jaw. The neck is thick and carried forward, not upright.
- Legs: four digitigrade legs. The front legs are the panther's arms. The hind legs are longer and more powerful, with a pronounced hock. Paws are compact and rounded.
- Tail: thick at the base, tapering to the tip, carried low with a gentle upward curl. It is a major part of the silhouette and must never be hidden or shortened.
- Fur and materials: near-black base, subtle cool blue-gray facet highlights, a slightly lighter belly, and faint rosettes visible only in strong light. No cartoon spots, no bright costume colors.
- Eyes: luminous yellow-green with a vertical slit pupil; use emissive material so they read in dark scenes.
- Claws: pale gray, retracted in idle and locomotion, extended only during swipes, bites, grabs, and pounces.
- Face: black nose, dark inner ears, no visible human teeth or expressions. Keep the face animal-like and readable.

**C. Rig and technical setup**
Use one root object and a bone hierarchy. A 36–44-bone deform rig is enough; a 48-bone rig is the upper limit.
- `root` → `hips` → `spine_01` → `spine_02` → `chest` → `neck` → `head` → `jaw`
- `head` → `ear_L`, `ear_R`
- `chest` → `scapula_L/R` → `upper_arm_L/R` → `forearm_L/R` → `wrist_L/R` → `paw_L/R`
- `hips` → `thigh_L/R` → `shin_L/R` → `hock_L/R` → `foot_L/R` → `toe_L/R`
- `hips` → `tail_01` … `tail_06`
- The front legs are arms; there are no separate human arms, hands, or fists.
- Local forward is +X, up is +Y, and the side-view camera looks along −Z. Flip the root's Y rotation for left-facing; do not mirror the skeleton at runtime.
- Keep 1 unit = 1 meter. Disable root motion; the controller moves the root, while animations only rotate bones. This prevents foot-sliding and keeps collision authoritative.
- Add two-bone IK or an analytic paw-planting pass for all four legs. When a paw is in its contact phase, lock its world position until lift-off.
- Drive the tail as a damped spring chain (6 segments) layered on top of the keyframes. The tail is cosmetic and must not create gameplay hitboxes.
- Jaw, ears, and tail need separate bones. The jaw opens 25–30° for a bite; ears flatten during hits and pounce anticipation.
- Skin the low-poly mesh with at least 2–3 influenced bones per vertex at joints. Faceted low-poly shading is intentional; do not smooth the silhouette into a generic cat blob.

**D. Animation set and target timing**
Durations are targets. Tune by ±20% for game feel, but keep the relative weight, anticipation, and recovery. All locomotion loops must blend cleanly.

| State | Loop | Duration | Key motion |
| --- | --- | --- | --- |
| Idle | Yes | 2.8 s | Breathing, subtle weight shift, tail-tip flick, occasional ear flick and blink. |
| Stalking walk | Yes | 0.90 s | Four-beat lateral-sequence walk; low head; shoulder roll; tail counter-sway. Two steps per loop. |
| Run | Yes | 0.55 s | Two-beat diagonal gait with a brief suspension; spine flexes and extends; tail streams behind. |
| Turn in place | No | 0.42 s | Head leads, chest follows, hips pivot last, outside hind paw steps around, tail whips. |
| Crouch / pounce charge | No | 0.20 s | Hips drop, elbows bend, hind legs gather, tail lowers, ears forward. |
| Jump start | No | 0.15 s | Hind legs extend, chest lifts, forepaws leave the ground last. |
| Jump air | No | 0.45 s | Body stretched, forepaws reaching, hind legs tucked, tail rudders. |
| Land | No | 0.25 s | Forepaws contact first, then hind paws; spine compresses; tail settles. |
| Forepaw swipe L/R | No | 0.36 s | Shoulder-driven diagonal arc, claws out, opposite paw plants, tail counterbalances. |
| Bite | No | 0.52 s | Neck extends, jaw opens, head snaps forward, chest braces, then recoil. |
| Pounce | No | 1.05 s | Crouch, explosive launch, airborne reach with both forepaws, impact, knockback, recovery. |
| Grab | No | 0.45 s | Both forepaws pin the target; jaws close on the shoulder/neck area. |
| Throw | No | 0.55 s | Body twists and neck tosses the target forward/sideways; paws release last. |
| Hit light | No | 0.28 s | Head snaps back, ears flatten, tail tucks, quick recovery. |
| Hit heavy | No | 0.45 s | Torso twists, one forepaw leaves the ground, longer recovery. |
| Fall | No | 0.60 s | Legs fold, body drops to the side, tail settles. |
| Get up | No | 0.50 s | Roll to the paws, push up with forelegs, regain low stance. |
| Defeat | No | 0.90 s | Limbs slacken, body rolls onto its side, eyes dim; no gore. |

**E. Gait, balance, and secondary motion rules**
- Walk: use a four-beat lateral-sequence footfall (left hind → left front → right hind → right front). Duty factor about 0.60. The head remains stable; body bob is only 2–3 cm and occurs twice per loop.
- Run: use diagonal pairs (left front with right hind, then right front with left hind), duty factor about 0.40, with a short suspension phase. Body bob is 5–7 cm; the spine flexes and extends like a big cat, not like a horse.
- Paw path: lift each paw 8–12 cm, flex the wrist on lift, extend the toes at contact, and place the paw almost silently. Do not high-step or march.
- Tail: six-segment traveling wave. Phase-lag each segment by 0.04–0.06 s. Walk amplitude 4–8°, run 10–16°, turn 20–30°. The tail swings opposite the hips in straight locomotion.
- Shoulders: 8–12° scapula roll; the chest counter-rotates against the hips. The head counter-rotates to keep the gaze level.
- Turn: the head starts 0.08 s before the chest, the hips follow 0.12 s later, and the tail finishes 0.18 s later. Compress the body by 2–3 cm during the pivot. The inside forepaw is the pivot; the outside hind paw steps around.
- Idle: breathing cycle 2.8 s, ribcage rises 1–2 cm. Add a tail-tip flick every 3–5 s, an ear flick, and a blink every 4–6 s. Keep the head forward; never sit or stand upright.
- Jump: gather the hind legs, launch at roughly 45°, stretch the body, reach with the forepaws, use the tail as a rudder, and land forepaws first. The pounce uses the same mechanics with more forward commitment.
- Hit reactions: ears flatten, eyes narrow, spine recoils away from the hit, tail tucks, then a quick return to stance. Keep the panther low; do not knock it into a humanoid stagger.
- Death: fold the legs, roll the torso onto one side, let the tail settle, and dim the eye emissive. No blood or dismemberment.

**F. Moveset mapping (replaces the human moves)**

| Player intent | Original human move | Black panther move | Description |
| --- | --- | --- | --- |
| Light attack | Punch | Forepaw swipe | Alternating left/right forepaw slash. Short range, fast, low commitment. |
| Heavy attack | Kick | Bite | Forward neck lunge with a jaw snap. Longer range than the swipe, slower recovery. |
| Combo finisher | Combo strike | Bite finisher | Two swipes followed by a bite; the bite is the knockdown/knockback hit. |
| Special | Spinning kick | Pounce | Crouch, leap onto/through the target, strike with both forepaws and jaws, and knock the enemy back. |
| Grab / throw | Grab and throw | Forepaw pin and body throw | Pin a staggered enemy with both forepaws and jaws, then twist and throw it forward or sideways. |
| Jump | Jump | Quadruped jump | Same traversal role; no double jump. Pounce is a separate attack. |

**G. Combat data and hitboxes**
Use the animation events below as the source of truth for hitbox timing. The controller, not the mesh, decides hits.

| Move | Startup | Active | Recovery | Damage | Range / travel | Knockback | Hitstop |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Forepaw swipe | 0.09 s | 0.10 s | 0.17 s | 6 | 0.9 m forward, paw-height | 1.2 m/s | 45 ms |
| Bite | 0.16 s | 0.10 s | 0.26 s | 11 | 1.2 m plus 0.45 m lunge | 2.5 m/s | 70 ms |
| Pounce | 0.20 s | 0.30 s airborne + 0.12 s impact | 0.43 s | 18 | 3.5–4.0 m leap; 1.2 m impact radius | 6.0 m/s | 90 ms |
| Grab | 0.18 s | 0.08 s | 0.19 s | 0 | 0.8 m | — | — |
| Throw | 0.20 s | 0.10 s | 0.25 s | 10 + collision damage | 2.5 m throw arc | 5.0 m/s | 60 ms |
- Swipe hitbox: a sphere/capsule around `paw_L` or `paw_R`, active only during the active window. Alternate paws for the three-hit combo.
- Bite hitbox: a forward capsule attached to `jaw` and `head`, active during the snap. The head lunge moves the hitbox with the animation.
- Pounce hitbox: a swept sphere along the leap path plus a radial impact check at landing. It hits the primary target and can knock back nearby enemies. Do not tunnel through enemies at high speed.
- Grab/throw: only against staggered or block-broken enemies. The thrown body can damage other enemies on collision.
- Combo: swipe → swipe → bite. Combo window 0.38 s after each hit; the finisher resets the chain. Cap the combo at three hits so it cannot loop forever.
- Special cooldown: 4 s. Pounce has brief invincibility only during the airborne phase, not during the recovery. It must remain risky if it misses.
- Hurtbox: a low capsule around the torso and head, roughly 0.55 m wide and 0.85 m tall, centered near the chest. Exclude the tail and the extended paws from the hurtbox. If the lower profile changes enemy attack reach, adjust only the enemy attack aim height needed for fairness; do not redesign enemy behavior, levels, or waves.
- Pounce must respect walls, level bounds, and obstacles: if the leap is blocked, stop at the obstacle and play the landing/recovery state. Never pass through geometry.

**H. Presentation, camera, and audio integration**
- Keep the existing side-follow camera and 2.5D perspective. Aim the camera target at the panther's chest (about 0.55 m above ground), not at a humanoid head height, so the low silhouette stays readable.
- The HUD layout, health bars, score, lives, level indicator, game-over, and victory screens remain unchanged. If a hero portrait is added, use a simple procedural panther-head silhouette; do not add a comic-style superhero portrait.
- The panther is the only playable character. Enemies, their models, AI, waves, bosses, and level layouts remain exactly as specified elsewhere in this document.
- Replace human attack sounds with panther-appropriate procedural sounds: short paw-swipe whooshes (filtered noise), bite snaps (sharp transient plus low thump), pounce growl/roar (low saw or filtered noise sweep), paw-step thuds, and impact hits. No music.
- Do not use external image assets. Build the panther from procedural low-poly geometry, vertex colors, and canvas-generated fur/roughness textures. Keep the eyes and claws procedural as well.

**I. Acceptance criteria for the hero**
- From the side, the character immediately reads as a low, long-bodied black panther, not a human in a cat suit.
- All four legs participate in locomotion; there are no punches, kicks, human arm swings, or upright poses.
- Idle, walk, run, turn, jump, land, hit, fall, and defeat states exist and blend without pops.
- The walk matches the reference's low, smooth, deliberate stalking quality; the turn is head-led with a tail whip.
- The tail has visible secondary motion and remains part of the silhouette.
- Forepaw swipes and bites are clearly telegraphed and their hitboxes match the paw/jaw positions.
- The pounce visibly leaps onto/through the enemy and knocks it back; it has a cooldown and a punishable recovery.
- Grab and throw still work and are animated with forepaws and jaws.
- No foot sliding, no root-motion drift, no tail hitboxes, and no external assets.
- Every other requirement in this document — genre, camera style, enemies, levels, waves, bosses, UI, lives, health, score, architecture, procedural graphics, no music, and all nine stages — remains unchanged.

**Modular Architecture:**
Organize the code into clear modules:
1. `Core` – game loop, state management, scene setup.
2. `Renderer` – Three.js renderer, camera, lighting.
3. `Input` – keyboard/gamepad handling.
4. `Physics` – simple collision detection (AABB or sphere), gravity, ground checks.
5. `Entities` – base classes for Hero, Enemy, Projectile, etc.
6. `Combat` – hitbox management, damage calculation, combo system.
7. `AI` – enemy behavior trees or state machines.
8. `Level` – level data, spawning, scrolling, obstacles.
9. `UI` – HUD, menus, health bars.
10. `Audio` – sound effect generation and playback.
11. `Assets` – procedural generation of textures, materials, and simple models.

**Development Stages:**
Proceed step by step, explaining each stage and providing complete code for each module. Do not skip steps. After each stage, ensure the game is runnable and testable.

**Stage 1: Project Setup**
- Set up a Next.js project (or plain HTML/JS with ES modules). Install Three.js.
- Create basic file structure and a simple Three.js scene with a ground plane and a camera.

**Stage 2: Core Engine**
- Implement game loop with `requestAnimationFrame`, delta time, and state manager (menu, playing, paused, game over).
- Set up input handling for keyboard (arrow keys, WASD, attack keys).

**Stage 3: Hero Entity — Black Panther**
- Create a procedurally generated low-poly 3D model of the black panther using Three.js primitives (boxes, spheres, cylinders, tapered segments) or a simple skeletal system, following the silhouette, proportions, and rig in the Black Panther Hero & Animation Reference section.
- Model the long quadruped torso, deep chest, four digitigrade legs, small wedge-shaped head with jaw and rounded ears, and a multi-segment tail. Use faceted black fur with subtle blue-gray highlights and emissive yellow-green eyes. Do not add humanoid anatomy, clothing, armor, or a superhero suit.
- Implement movement (left/right at a stalking walk and a faster run, jump, crouch, turn in place) with physics (gravity, ground collision). Keep the root motion controlled by the game, not the animation.
- Add basic animations: idle, stalking walk, run, turn, jump, land. Use the target timings and secondary-motion rules from the Black Panther Hero & Animation Reference section.

**Stage 4: Combat System**
- Implement hitboxes for the panther's forepaw swipes and bite. The forepaw swipe replaces the punch; the bite replaces the kick. Attach the swipe hitbox to the leading paw and the bite hitbox to the head/jaw.
- Add damage, knockback, and invincibility frames.
- Create a combo system (e.g., a three-hit combo: left forepaw swipe → right forepaw swipe → bite finisher).
- Add a special pounce attack that replaces the spinning kick: the panther crouches, leaps onto/through the target, strikes with both forepaws and jaws, and knocks the enemy back. Give it a cooldown and clear anticipation and recovery frames.
- Preserve the grab and throw mechanic from the original brief: the panther pins a staggered enemy with its forepaws and jaws, then throws it with a body twist or neck toss.

**Stage 5: Enemies**
- Create 2–3 enemy types with distinct models and colors.
- Implement AI: patrol, chase, attack, retreat. Use state machines.
- Enemies can block, get hit, and die with animations.

**Stage 6: Level Design**
- Create a scrolling level with a background (parallax layers using simple shapes).
- Add obstacles (barrels, crates) that can be destroyed or used.
- Spawn enemies in waves. Implement level progression and boss fight.

**Stage 7: UI and HUD**
- Add health bars for hero and boss, score, lives, and level indicator.
- Create menus: start, pause, game over, victory.

**Stage 8: Audio**
- Use Web Audio API to synthesize sound effects (paw swipe, bite snap, pounce, growl, hit, jump, land, etc.). No music.
- Trigger sounds on events.

**Stage 9: Polish and Optimization**
- Add particle effects (hit sparks, dust).
- Optimize performance (object pooling, frustum culling).
- Ensure game is playable and fun.

**Graphics Generation:**
- Use Three.js `CanvasTexture` to generate textures procedurally (e.g., noise, gradients, patterns).
- For the hero, use simple geometric shapes combined into a low-poly quadruped black panther: a long tapered torso, deep chest, narrow waist, four digitigrade legs, a small wedge-shaped head with jaw and rounded ears, and a long tail made of tapered segments. Animate it with a bone hierarchy (shoulder/elbow/wrist, hip/knee/hock, neck/head/jaw, and a six-segment tail chain), not by translating separate meshes. Keep the body low to the ground and the tail readable in silhouette. For enemies and other characters, use simple humanoid or creature figures as appropriate and animate by rotating limbs.
- For environments, use tiled textures, simple buildings, and parallax backgrounds made of colored planes.

**Sound Generation:**
- Use `OscillatorNode` and `GainNode` to create paw-swipe whooshes (short noise bursts with low-pass filter), bite snaps (sharp transient plus low thump), pounce growls (low filtered noise or saw sweep), hit sounds (square wave with quick decay), jump sounds (sine sweep), landing thuds, etc.
- No background music.

**Deliverables:**
- Complete source code for all modules.
- Instructions on how to run the game.
- Explanation of each module and how they interact.

Begin with Stage 1 and proceed sequentially. After each stage, provide the code and a brief explanation. Ensure the game is fully playable by the end.