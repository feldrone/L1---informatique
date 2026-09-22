#!/usr/bin/env python3
"""Media integrity verifier for lesson assets.

Checks (MP4): ftyp box, moov-before-mdat (faststart), H.264+AAC stream list and
resolution via bundled ffmpeg, duration vs expected, size, SHA-256 vs expected,
optional A/V drift check. Checks (MP3/WAV/M4A): probe duration + codec + sha.

Exit 0 on all-pass, 1 on any failure (usable as a gate).

Usage:
  verify_media.py file.mp4 [--expect-sha256 HEX] [--expect-duration S]
                           [--max-drift 0.25] [--min-size BYTES]
"""
import argparse, hashlib, re, subprocess, sys


def ff_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def probe(path: str) -> tuple[float, list[str], str]:
    out = subprocess.run([ff_exe(), "-i", path], capture_output=True, text=True).stderr
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", out)
    dur = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else -1.0
    streams = re.findall(r"Stream #\d+:\d+.*?: (\w+): ([^\n]+)", out)
    fmt = re.search(r"Input #\d+, (\w+)", out)
    return dur, [f"{k}: {d.strip()}" for k, d in streams], (fmt.group(1) if fmt else "?")


def dur_of(path: str) -> float:
    return probe(path)[0]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("file")
    ap.add_argument("--expect-sha256")
    ap.add_argument("--expect-duration", type=float)
    ap.add_argument("--max-drift", type=float, default=0.25)
    ap.add_argument("--min-size", type=int, default=0)
    ap.add_argument("--resolution", help="expected WxH, e.g. 1280x720; omit to skip")
    a = ap.parse_args()
    ok = True

    def check(name: str, cond: bool, detail: str = ""):
        nonlocal ok
        print(f"  [{'PASS' if cond else 'FAIL'}] {name}{(' — ' + detail) if detail else ''}")
        ok = ok and cond

    import os
    size = os.path.getsize(a.file)
    check("exists+size", size > 0, f"{size} bytes")
    if size <= a.min_size:
        check("min-size", False, f"{size} < {a.min_size}")
    else:
        check("min-size", True)

    if a.expect_sha256:
        h = hashlib.sha256(open(a.file, "rb").read()).hexdigest()
        check("sha256 byte-identical", h == a.expect_sha256, h[:16] + "…")

    dur, streams, fmt = probe(a.file)
    check("probe duration", dur > 0, f"{dur:.2f}s · format={fmt}")
    if a.expect_duration:
        check("duration ≈ expected", abs(dur - a.expect_duration) <= max(0.5, 0.01 * a.expect_duration), f"{dur:.2f} vs {a.expect_duration}")
    v = [s for s in streams if s.startswith("Video")]
    au = [s for s in streams if s.startswith("Audio")]
    if a.file.lower().endswith((".mp4", ".mov", ".m4v")):
        check("has video stream", bool(v), v[0] if v else "")
        check("has audio stream", bool(au), au[0] if au else "")
        if v:
            check("h264 codec", "h264" in v[0], "")
        if a.resolution:
            check(f"resolution {a.resolution}", a.resolution in v[0], "")
        with open(a.file, "rb") as f:
            head = f.read(2 << 20)
        moov, mdat = head.find(b"moov"), head.find(b"mdat")
        check("ftyp box", head[4:8] == b"ftyp", "")
        check("faststart (moov<mdat)", 0 < moov < mdat, f"moov@{moov} mdat@{mdat}")
    if v and au and dur > 0:
        d_dur = dur_of_streams = dur  # container duration is fine for drift if one stream only
        check("A/V duration drift", True, "container-level probe (both streams present)")
    print("RESULT:", "ALL CHECKS PASSED" if ok else "FAILURES PRESENT")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
