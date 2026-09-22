# Media Environment — bootstrap & reproducibility

Purpose: recreate the audiovisual toolchain used to render the Arabic ASD1
lesson videos on this workspace. **This file is documentation only — nothing here
is installed at clone time; the environment itself is intentionally NOT committed
to Git** (it is ~195 MB of binaries and wheels; skills' *definitions* are
committed alongside this directory).

## Baseline (verified in-session)

| Component | Version / location |
|---|---|
| OS Python | `python3` = **3.11.2** (Debian, `/usr/bin/python3`) |
| pip | 23.0.1 (system) — installs require `--break-system-packages` on the system interpreter (PEP 668) |
| Pillow | 12.3.0 |
| numpy | latest 1.x from index (installed via venv) |
| arabic-reshaper | 3.0.1 |
| python-bidi | 0.6.11 |
| imageio / imageio-ffmpeg | imageio v2 API; **imageio-ffmpeg bundles a static ffmpeg 7.0.2** (`ffmpeg-linux-x86_64-v7.0.2`) — no system ffmpeg/ffprobe exists and none should be installed |
| Fonts | system: DejaVu family in `/usr/share/fonts/truetype/dejavu/` — `DejaVuSans.ttf` has Arabic + presentation-forms coverage (verified render), plus Latin; `DejaVuSansMono.ttf` for code. `canvas-design/canvas-fonts/` adds OFL Latin display fonts. |
| ImageMagick | system `convert` present (not required by the pipeline) |

## Recreate (one command, run from this repo's parent workspace)

```bash
python3 -m venv /home/user/skills/media-env
/home/user/skills/media-env/bin/pip install --upgrade pip
/home/user/skills/media-env/bin/pip install \
    "Pillow>=12" "numpy" "arabic-reshaper>=3" "python-bidi>=0.6" \
    "imageio>=2.31" "imageio-ffmpeg>=0.4.9"
```

Notes:
- The venv lives **inside `/home/user/skills/`** on purpose: `~/.local` and `.venv`
  are excluded from the workspace snapshots that persist this sandbox;
  a normal path under the workspace root survives rebuilds (195 MB may exceed the
  best-effort snapshot cap, hence this bootstrap document — `git clone` + the
  command above fully restores capability).
- The pip index proxy works even when general outbound HTTPS (raw.githubusercontent,
  etc.) is blocked in this sandbox.
- ffmpeg is NEVER installed system-wide; always use the bundled binary:
  `FF=$(/home/user/skills/media-env/bin/python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")`

## Verification commands

```bash
PY=/home/user/skills/media-env/bin/python
$PY -c "import PIL,numpy,arabic_reshaper,bidi,imageio,imageio_ffmpeg;print('deps OK', PIL.__version__)"
$($PY -c "import imageio_ffmpeg as f;print(f.get_ffmpeg_exe())") -version | head -1
# Arabic shaping round-trip (must print ink-pixel count > 0):
$PY - <<'EOF'
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import arabic_reshaper; from bidi.algorithm import get_display
f=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",42)
im=Image.new('RGB',(600,90)); d=ImageDraw.Draw(im)
d.text((10,20),get_display(arabic_reshaper.reshape("الخوارزمية")),font=f,fill=(255,255,255))
print("ink:",int((np.asarray(im.convert('L'))>50).sum()))
EOF
# media gate (any MP4):
$PY lesson-av-pipeline/tools/verify_media.py <file.mp4> --resolution 1280x720
```

## Expected media capabilities after bootstrap

- Encode 720p motion-graphics MP4 (H.264 High + AAC, faststart) from PIL frames
  via imageio — ~10 min of video encodes in ~3–6 min at 12–15 fps.
- Lossless mux (`-c:v copy`), concat audio lists, `loudnorm`/`afftdn` audio chain,
  `silencedetect`/`ebur128` QC, poster extraction, byte-level `moov/mdat` checks.
- Arabic RTL text in frames via reshape→bidi→PIL (verified approach; see
  `lesson-av-pipeline/SKILL.md` §2).
