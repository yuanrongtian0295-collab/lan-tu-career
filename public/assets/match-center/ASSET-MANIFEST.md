# Match center generated assets

Generated with the built-in Image Gen workflow, then locally keyed to alpha with `remove_chroma_key.py` using soft matte and despill.

| Final asset | Chroma source | Key | Prompt brief |
| --- | --- | --- | --- |
| `curry-portrait.png` | `chroma-sources/curry-portrait-green.png` | `#00ff00` | Recreate the reference Curry chest-up sports portrait in a white Warriors-style jersey; crisp studio cutout, generous padding, uniform chroma background, no text or shadow. |
| `tactic-pick-roll.png` | `chroma-sources/tactic-pick-roll-magenta.png` | `#ff00ff` | Two royal/electric-blue paper-cut basketball silhouettes demonstrating a high pick-and-roll with a curved dashed movement arrow; no card frame or text. |
| `tactic-fastbreak.png` | `chroma-sources/tactic-fastbreak-magenta.png` | `#ff00ff` | Royal/electric-blue paper-cut basketball runner sprinting right with three speed streaks; no card frame or text. |
| `tactic-inside.png` | `chroma-sources/tactic-inside-magenta.png` | `#ff00ff` | Royal/electric-blue airborne finisher attacking a simple hoop and backboard; no card frame or text. |
| `match-center-background.png` | n/a | n/a | Tall blue basketball broadcast background with cyan splashes, navy court-line strokes, halftone clusters, faint city/court architecture and white/cyan/yellow diagonal speed stripes; no UI, text, logos or players. |
| `match-center-title.png` | `chroma-sources/match-center-title-magenta.png` | `#ff00ff` | Exact Chinese title “比赛中心” in the home page “生涯中心” title style: white condensed display lettering, deep navy 3D extrusion, electric-blue rim and dynamic speed-stroke underline. |
| `scoreboard-panel-background.png` | `chroma-sources/scoreboard-panel-background-magenta.png` | `#ff00ff` | Empty live-score panel skin with a warm-white halftone paper surface, blue left rim, red right rim and angular folded corner details; no logos, scores, labels, meters or text. |
| `player-strip-background.png` | `chroma-sources/player-strip-background-magenta.png` | `#ff00ff` | Empty live-player stat strip with a white halftone surface, electric-blue frame and a logo-free translucent blue portrait zone. |
| `content-panel-background.png` | `chroma-sources/content-panel-background-magenta.png` | `#ff00ff` | Empty tall live-feed and tactics outer panel with a white halftone surface, electric-blue border and folded-paper corner slashes. |

All chroma prompts required one perfectly flat key color with no gradient, texture, reflection, floor plane, lighting variation or cast shadow, and prohibited the key color inside the subject.
