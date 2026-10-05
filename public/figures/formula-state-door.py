#!/usr/bin/env python3
"""Figure 5. Formula and pass-through programmes: who receives the federal money, and whom a non-profit applies to (as the federal pages state it, read October 4–5, 2026)

Reads  figures/data/formula-state-door.csv
Writes figures/out/formula-state-door.svg and figures/out/formula-state-door.pdf
Run:   python3 figures/scripts/formula-state-door.py   (needs matplotlib; no other dependency)

Values are drawn as the data file gives them; nothing is recomputed here beyond what the comments state.
"""
import csv
import json
import os
import textwrap

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(HERE, "..", "out")

# Chart chrome and series colours (light surface). Text always uses ink tokens, never a series colour.
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]

plt.rcParams.update({
    "font.family": "DejaVu Sans",  # bundled with matplotlib, so output is the same on every machine
    "font.size": 9,
    "svg.fonttype": "none",
    "pdf.fonttype": 42,
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE,
    "text.color": INK,
    "axes.labelcolor": INK2,
    "axes.edgecolor": AXIS,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "xtick.labelcolor": INK2,
    "ytick.labelcolor": INK2,
    "axes.linewidth": 0.8,
})
if "text.parse_math" in plt.rcParams:  # dollar signs in labels are literal, not mathtext
    plt.rcParams["text.parse_math"] = False

FIG = "formula-state-door"
LABEL = "Figure 5"
TITLE = 'Formula and pass-through programmes: who receives the federal money, and whom a non-profit applies to (as the federal pages state it, read October 4–5, 2026)'
FOOTER = "Token for Granted · data as read October 4–5, 2026 · not peer reviewed"


def read_csv(name):
    with open(os.path.join(DATA, name + ".csv"), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_json(name):
    with open(os.path.join(DATA, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def clean_axes(ax, grid_axis="y"):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis=grid_axis, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)


def finish(fig, note=""):
    """Label and title as the plot title (wrapped), an optional note under the plot, then the footer line."""
    w, h = fig.get_size_inches()
    fig.suptitle(textwrap.fill(LABEL + ". " + TITLE, int(w * 10.5)), x=0.01, ha="left", fontsize=10.5, color=INK)
    y = -0.08 / h
    if note:
        note = textwrap.fill(note, int(w * 14))
        fig.text(0.01, y, note, ha="left", va="top", fontsize=8, color=INK2)
        y -= (0.17 * (note.count("\n") + 1) + 0.05) / h
    fig.text(0.01, y, FOOTER, ha="left", va="top", fontsize=7.5, color=MUTED)


def save(fig, name):
    os.makedirs(OUT, exist_ok=True)
    for ext in ("svg", "pdf"):
        fig.savefig(os.path.join(OUT, name + "." + ext), bbox_inches="tight")
    plt.close(fig)
    print("wrote", os.path.join("figures", "out", name + ".svg"), "and .pdf")


from matplotlib.patches import Rectangle

# field, heading, column width in inches, characters per line
COLS = [("programme", "Programme", 3.0, 40),
        ("money_goes_to", "Who receives the federal award", 3.5, 48),
        ("nonprofit_door", "Whom a non-profit or local organisation applies to", 4.15, 57)]
SIZE, LINE, PAD = 8.2, 0.152, 0.09  # font size in points; height of a text line and cell padding in inches


def main():
    rows = read_csv(FIG)
    cells = [[textwrap.wrap(r[f], width) or [""] for f, _, _, width in COLS] for r in rows]
    heights = [max(len(c) for c in row) * LINE + 2 * PAD for row in cells]
    head_h = LINE + 2 * PAD
    total_w = sum(c[2] for c in COLS)
    total_h = head_h + sum(heights)
    fig, ax = plt.subplots(figsize=(total_w + 0.3, total_h + 0.9), layout="constrained")
    ax.set_xlim(0, total_w)  # one drawing unit is close to one inch, so the wrap widths above hold
    ax.set_ylim(-total_h, 0)
    ax.axis("off")
    lefts, x = [], 0.0
    for c in COLS:
        lefts.append(x)
        x += c[2]
    for left, (_, heading, _, _) in zip(lefts, COLS):
        ax.text(left + 0.08, -PAD, heading, ha="left", va="top", fontsize=SIZE, color=INK, fontweight="bold")
    ax.plot([0, total_w], [-head_h, -head_h], color=INK2, linewidth=1.0)
    y = -head_h
    for k, (row, h) in enumerate(zip(cells, heights)):
        if k % 2 == 1:
            ax.add_patch(Rectangle((0, y - h), total_w, h, facecolor=GRID, edgecolor="none", alpha=0.4, zorder=0))
        for j, (left, lines) in enumerate(zip(lefts, row)):
            ax.text(left + 0.08, y - PAD, "\n".join(lines), ha="left", va="top", fontsize=SIZE,
                    color=INK if j == 0 else INK2, linespacing=1.2)
        y -= h
        ax.plot([0, total_w], [y, y], color=GRID, linewidth=0.6)
    finish(fig, "%d rows in file order; three of the file's columns are drawn." % len(rows))
    save(fig, FIG)


if __name__ == "__main__":
    main()
