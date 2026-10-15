"""Two-pass build: docx -> PDF (LibreOffice in Docker) -> TOC page numbers -> final docx.

Usage: python make.py <input.md> <final.docx>
"""
import json
import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
MD, FINAL = sys.argv[1], sys.argv[2]
WORK = os.path.join(HERE, "out")
os.makedirs(WORK, exist_ok=True)
DOCX = os.path.join(WORK, "doc.docx")
PAGES = os.path.join(WORK, "pages.json")


def build(pages_json=None):
    args = ["node", os.path.join(HERE, "build.js"), MD, DOCX]
    if pages_json:
        args.append(pages_json)
    subprocess.run(args, check=True)


def render():
    for f in ("doc.pdf", "doc.txt", "info.txt"):
        p = os.path.join(WORK, f)
        if os.path.exists(p):
            os.remove(p)
    cmd = (
        "soffice --headless --convert-to pdf --outdir /work /work/doc.docx >/dev/null 2>&1 && "
        "pdfinfo /work/doc.pdf > /work/info.txt && pdftotext -layout /work/doc.pdf /work/doc.txt"
    )
    subprocess.run(
        ["docker", "run", "--rm", "-v", f"{WORK}:/work", "najdimo-lo:1", "bash", "-c", cmd],
        check=True,
    )
    with open(os.path.join(WORK, "doc.txt"), encoding="utf-8") as f:
        pages = f.read().split("\f")
    with open(os.path.join(WORK, "info.txt"), encoding="utf-8") as f:
        info = dict(l.split(":", 1) for l in f.read().splitlines() if ":" in l)
    return pages, int(info["Pages"].strip())


def locate(pages, entries):
    found = {}
    for e in entries:
        text = e["text"]
        for idx, page in enumerate(pages):
            if idx < 2:  # title page and first TOC page
                continue
            lines = [l.strip() for l in page.splitlines()]
            if any(l == text or (l.startswith(text[:40]) and "...." not in l and len(text) > 40) for l in lines):
                found[e["id"]] = idx + 1
                break
        else:
            found[e["id"]] = None
    return found


build()
pages, n1 = render()
entries = json.load(open(DOCX + ".toc.json", encoding="utf-8"))
found = locate(pages, entries)
missing = [e["text"] for e in entries if not found[e["id"]]]
if missing:
    print("NOT FOUND:", missing)
    sys.exit(1)
json.dump(found, open(PAGES, "w"), indent=1)
build(PAGES)
pages2, n2 = render()
found2 = locate(pages2, entries)
if found2 != found:
    print("page numbers shifted between passes; rerunning once")
    json.dump(found2, open(PAGES, "w"), indent=1)
    build(PAGES)
    pages2, n2 = render()
    found2 = locate(pages2, entries)
print(f"pages: {n2}")
for e in entries:
    print(f"  {found2[e['id']]:>3}  {'  ' if e['level'] == 2 else ''}{e['text']}")
shutil.copyfile(DOCX, FINAL)
shutil.copyfile(os.path.join(WORK, "doc.pdf"), os.path.splitext(FINAL)[0] + ".check.pdf")
print("final:", FINAL)
