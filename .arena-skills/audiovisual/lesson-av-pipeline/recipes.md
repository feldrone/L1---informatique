# Recipes (verified working)

## scene_timeline — clips × splits, exact by construction
```python
CLIPD = {"ar01": 81.48, "ar02": 112.64, ...}      # MEASURED (ffmpeg -i)
SEQ   = [("ar01",1.0), ("ar02",1.0), ("ar04",1.0),
         ("ar07",0.55), ("ar07",0.45),            # one clip spanning two visual scenes
         ("ar08",0.78), ("ar08",0.22)]             # = no audio editing at all
scenes=[]; t=0.0
for cid,frac in SEQ:
    dur=CLIPD[cid]*frac; scenes.append((cid,t,t+dur)); t+=dur
NF=int(t*FPS)                                       # frames; audio=concat(SEQ clip order)
```

## RTL right-aligned text helper (PIL, no complex-engine)
```python
def T(draw, x_right, y, s, font, fill, a=1.0):
    txt = get_display(arabic_reshaper.reshape(s))
    b = draw.textbbox((0,0), txt, font=font)
    draw.text((x_right-(b[2]-b[0]), y), txt, font=font,
              fill=blend(BG, fill, a))              # fade = color-lerp on flat bg
```

## frame loop → MP4 (venv imageio, 12 fps sweet spot)
```python
import imageio.v2 as imageio, numpy as np
w = imageio.get_writer("lesson-raw.mp4", fps=12, codec="libx264", quality=8,
    pixelformat="yuv420p", ffmpeg_params=["-preset","veryfast","-profile:v","high"])
for fi in range(NF): w.append_data(np.asarray(render(fi)))   # print ETA every ~600
w.close()
```

## audio polish + final mux (no video recompression)
```bash
$FF -y -i voice.mp3 -af highpass=f=80,afftdn=nf=-25,loudnorm=I=-16:TP=-1.5:LRA=11 \
    -c:a libmp3lame -b:a 128k voice-clean.mp3
$FF -y -f concat -safe 0 -i list.txt -vn -c:a aac -b:a 128k track.m4a
$FF -y -i lesson-raw.mp4 -i track.m4a -c:v copy -c:a aac -b:a 128k \
    -movflags +faststart -shortest lesson.mp4
```

## media gate
```bash
$PY tools/verify_media.py lesson.mp4 --resolution 1280x720 \
    --expect-duration 893.03 --expect-sha256 $(sha256sum lesson.mp4|cut -d' ' -f1)
$PY tools/vtt_gen.py clips.json lesson.vtt      # anchor-based cue timing
```
