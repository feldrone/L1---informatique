#!/usr/bin/env python3
"""Generate a WebVTT subtitle file from narration-clip durations + cue specs.

Cue timing method ("proportional sync"): each clip's scenes/cues are placed at
character-fraction boundaries of the clip text, mapped linearly onto the clip's
MEASURED audio duration. No guessing, no external tooling.

Usage:
  vtt_gen.py clips.json out.vtt

clips.json format (list of clips, video order = narration order):
[
  { "file": "audio/ar01.mp3", "text": "full narration text of the clip",
    "cues": [ {"at": 0.0, "line": "short caption"}, {"at": 0.45, "line": "..."} ] }
]
If "dur" is provided it is used directly (seconds); otherwise the tool probes the
file with bundled ffmpeg (imageio-ffmpeg) for Duration.

If cues lack explicit "at", they are auto-spaced across the clip in order.
If a cue has "anchor" (a substring of the clip text), at = char-index/len(text).
"""
import json, re, subprocess, sys, os


def probe_duration(path: str) -> float:
    try:
        import imageio_ffmpeg
        ff = imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        ff = "ffmpeg"
    out = subprocess.run([ff, "-i", path], capture_output=True, text=True).stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", out)
    if not m:
        raise RuntimeError(f"no Duration found for {path}")
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def ts(sec: float) -> str:
    h, rem = divmod(max(sec, 0.0), 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    clips = json.load(open(sys.argv[1], encoding="utf-8"))
    lines = ["WEBVTT", ""]
    t = 0.0
    for clip in clips:
        dur = clip.get("dur") or probe_duration(clip["file"])
        text = clip.get("text", "")
        cues = clip.get("cues") or []
        if not cues:  # whole clip as one caption
            cues = [{"at": 0.0, "line": clip.get("summary", os.path.basename(clip["file"]))}]
        for i, c in enumerate(cues):
            if "at" not in c and "anchor" in c and text:
                idx = text.find(c["anchor"])
                c["at"] = (idx / max(len(text), 1)) if idx >= 0 else i / len(cues)
            elif "at" not in c:
                c["at"] = i / len(cues)
        cues.sort(key=lambda c: c["at"])
        for i, c in enumerate(cues):
            start = t + c["at"] * dur
            end = t + (cues[i + 1]["at"] * dur if i + 1 < len(cues) else dur)
            lines.append(f"{ts(start)} --> {ts(end)}")
            lines.append(c["line"])
            lines.append("")
        t += dur
    open(sys.argv[2], "w", encoding="utf-8").write("\n".join(lines))
    print(f"wrote {sys.argv[2]} · total {t:.2f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
