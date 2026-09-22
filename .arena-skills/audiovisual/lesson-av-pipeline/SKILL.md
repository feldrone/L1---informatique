---
name: lesson-av-pipeline
description: End-to-end pipeline for producing educational MP4 video lessons with Arabic/RTL typography, TTS narration, synced progressive animation, VTT subtitles, and media integrity verification. Use when creating or upgrading audiovisual study lessons (animated diagrams, narration-synced scenes, poster frames, subtitle timing, faststart MP4 muxing, A/V sync checks).
license: Self-authored skill capturing workflows verified in-session on this machine (UBMA L1 study project). No third-party code.
---

# Lesson AV Pipeline — Arabic Educational Video Production

Battle-tested recipes for: **script → TTS clips → measured durations → proportional
scene timing → PIL-rendered animation frames → H.264/AAC MP4 (faststart) → VTT
subtitles → integrity verification.** All commands use the persistent venv at
`/home/user/skills/media-env` (Python 3.11: Pillow, numpy, arabic-reshaper,
python-bidi, imageio, imageio-ffmpeg with bundled static ffmpeg 7.0.2).

```bash
export PY=/home/user/skills/media-env/bin/python
export FF=$($PY -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
```

## 1. Golden rule: sync by measurement, not by guess

1. Generate narration clips FIRST (TTS tool, ≤1500 chars per call, one clip per lesson section).
2. **Measure every clip's exact duration** — never estimate:
   ```bash
   $FF -i clip.mp3 2>&1 | grep -oP 'Duration: \K[0-9:.]+'
   ```
3. Build the scene timeline as the concatenation of measured clip durations.
   Frame count = `int(total_seconds * fps)`. If this is exact, audio = simple
   `ffmpeg concat` of the clips and **no drift is possible**.
4. Within a scene, reveal elements at fractions of the clip: element anchored to
   the sentence at character fraction f appears at `t0 + f*dur`. This is
   "proportional sync" — cheap and good enough for teaching motion graphics.
5. If visual chapters must not align with clip boundaries (e.g., one clip spans
   two scenes), split the SCENE list, not the audio: `SEQ=[(clip,1.0),(clip,0.45)...]`
   style — see `tools/scene_timeline_example` in recipes.md.

## 2. Arabic/RTL typography (no complex-text engine — do it explicitly)

System font with Arabic glyphs here: `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf`
(includes Arabic + Presentation Forms-B; matplotlib's DejaVu is equivalent).

```python
import arabic_reshaper
from bidi.algorithm import get_display
def shape(s: str) -> str:
    return get_display(arabic_reshaper.reshape(s))   # reshape FIRST, then bidi
```

- Draw shaped strings with PIL LTR placement; for right-aligned RTL text use
  anchor and manual width: `w = draw.textbbox((0,0), shape(s), font=font)` then
  `draw.text((x_right - (b[2]-b[0]), y), shape(s), ...)`.
- Mixed Arabic + Latin/French terms: shaping handles Latin runs unchanged; verify
  visually by **reading back a rendered PNG** — never trust text layout blind.
- Fade on a flat background without compositing: blend the color toward the
  background (`alpha` per-element), avoids slow per-frame overlay composites.
- Pseudocode/C-code and flowchart SVG: force `dir="ltr"` in HTML; in PIL frames
  just draw LTR blocks inside RTL layouts.

## 3. Frame render → MP4 (faststart)

- 1280×720 @ 10–12 fps is the sweet spot for flat motion graphics: text stays
  crisp (higher compression, sharp edges), encode of ~15 min ≈ 3 min real time.
- Writer: `imageio.get_writer(mp4, fps=12, codec="libx264", quality=8,
  pixelformat="yuv420p", ffmpeg_params=["-preset","veryfast","-profile:v","high"])`
  (no `megapix` kwarg on imageio v2 — it exists only on imageio-ffmpeg's writer).
- Progress-print every ~600 frames; run long renders via a background process.

## 4. Mux + faststart + poster

```bash
# narration track from clip list (order = video's SEQ order!)
printf "file '%s'\n" $(echo audio/ar01.mp3 audio/ar02.mp3 ...) > list.txt
$FF -y -f concat -safe 0 -i list.txt -vn -c:a aac -b:a 128k track.m4a
$FF -y -i video-raw.mp4 -i track.m4a -c:v copy -c:a aac -b:a 128k \
     -movflags +faststart -shortest lesson.mp4
$FF -y -ss 12 -i lesson.mp4 -frames:v 1 -q:v 3 poster.jpg
```
- `-c:v copy` = no recompression; **the MP4 must be byte-preserved if it is a
  finished asset** (copy, never re-render, when moving it).
- `+faststart` puts `moov` before `mdat` → progressive streaming.

## 5. VTT subtitles

Generate cues from scene metadata (start = scene start; long scenes split by
sentence proportion). `tools/vtt_gen.py` does this: one command, no manual
timing. Timestamps use `HH:MM:SS.mmm` (comma), `default` attribute on the track
element, UTF-8.
- Arabic in VTT is fine; keep cues ≤ ~90 chars, put French terms in Latin inline.
- RTL note: VTT has no reliable direction in most players — keep lines short and
  center-aligned (`align:middle`); do not fight bidi with unicode control chars.

## 6. Audio polish (when allowed to touch NEW audio only)

- Loudness normalize narration: `$FF -i in.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=11
  -c:a libmp3lame -b:a 128k out.mp3` (educational speech target ≈ −16 LUFS).
- Gentle gate for room noise: `-af highpass=f=80,afftdn=nf=-25` before loudnorm.
- NEVER "improve" a delivered/committed asset in place — copy to a new path and
  verify the original's SHA-256 before and after your whole task.

## 7. Media integrity verification (mandatory closing step)

`tools/verify_media.py <file> [--expect-sha256 X] [--expect-duration S]` checks:
container ftyp, moov-before-mdat, per-stream codecs/resolution via bundled
ffmpeg probe parse, size, SHA-256, and (for -shortest muxes) that
|video_dur − audio_dur| ≤ 0.25 s. Exit code ≠ 0 on any failure → use it as a CI gate.
On the web: also request `Range: bytes=0-999` against the serving URL; a static
dev server that answers 200 instead of 206 means **seek may fail on some
browsers/servers** — note it in deliverables rather than pretending otherwise.

## 8. Lesson-content quality (educational guardrails, from the locked task spec)

- One narration clip = one concept; explain, don't read the page verbatim.
- Scene order may differ from page order if the story is better — keep clip
  content identical in both (the video audio = the page's audio files).
- Regeneration discipline: when a clip has a defect (wrong word, artifact),
  regenerate ONLY that clip, re-measure, rebuild the timeline table.
- Report honesty: label TTS as TTS; label generated video as a study resource,
  never as an official institution recording.

## Companion skills (same directory /home/user/skills/)

- `slack-gif-creator/core/easing.py` — import for animation curves (ease_out_cubic,
  interpolate, arc motion, squash/stretch); `frame_composer.py` + `gif_builder.py`
  for quick GIF previews of scene drafts (480px, ≤3 MB Slack-safe output).
- `algorithmic-art/` — p5.js seeded randomness / flow fields for decorative
  *background* systems only (never as lesson content); `templates/viewer.html`
  pulls p5 from cdnjs — strip that tag for offline lessons.
- `canvas-design/` — poster/palette/typography philosophy for title and recap cards;
  bundled OFL fonts are Latin-only — keep Arabic on DejaVu (see §2).
- `recipes.md` — copy-paste verified snippets (timeline math, RTL text helper,
  mux commands, media gate invocations).
