#!/usr/bin/env python3
"""Figure 6. How 65 foundations and private grantmakers take requests, by kind of foundation (their own pages, read October 4–5, 2026)

Reads  figures/data/foundation-doors.csv
Writes figures/out/foundation-doors.svg and figures/out/foundation-doors.pdf
Run:   python3 figures/scripts/foundation-doors.py   (needs matplotlib; no other dependency)

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

FIG = "foundation-doors"
LABEL = "Figure 6"
TITLE = 'How 65 foundations and private grantmakers take requests, by kind of foundation (their own pages, read October 4–5, 2026)'
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


from matplotlib.patches import Patch

NEUTRAL = {"kind not recorded": MUTED}  # a missing kind is drawn in grey, not in a series colour


def main():
    rows = read_csv(FIG)
    doors, kinds = [], []  # both in file order of first appearance
    for r in rows:
        if r["how_it_takes_requests"] not in doors:
            doors.append(r["how_it_takes_requests"])
        if r["foundation_kind"] not in kinds:
            kinds.append(r["foundation_kind"])
    hued = [k for k in kinds if k not in NEUTRAL]
    if len(hued) > len(SERIES):
        raise SystemExit("more kinds than series colours")
    colour = dict(zip(hued, SERIES))
    colour.update(NEUTRAL)
    fig, ax = plt.subplots(figsize=(10.5, 6.6), layout="constrained")
    base = [0.0] * len(doors)
    for k in kinds:
        for r in rows:
            if r["foundation_kind"] != k:
                continue
            i, c = doors.index(r["how_it_takes_requests"]), float(r["count"])
            # the surface-coloured edge leaves a thin gap between the segments of a stack
            ax.bar(i, c, bottom=base[i], width=0.56, color=colour[k], edgecolor=SURFACE, linewidth=1.6, zorder=3)
            ax.text(i, base[i] + c / 2, r["count"], ha="center", va="center", fontsize=7.5, color=INK, zorder=4,
                    bbox=dict(boxstyle="round,pad=0.16", facecolor=SURFACE, edgecolor="none"))
            base[i] += c
    for i, total in enumerate(base):  # the total is the sum of the counts stacked in that bar
        ax.text(i, total + 0.35, format(total, "g"), ha="center", va="bottom", fontsize=10, color=INK, fontweight="bold")
    ax.set_xticks(range(len(doors)))
    ax.set_xticklabels([textwrap.fill(d, 18) for d in doors], fontsize=9)
    ax.set_ylim(0, max(base) * 1.12)
    ax.set_ylabel("Number of the %g records" % sum(base))
    ax.set_xlabel("How the foundation takes requests")
    clean_axes(ax, "y")
    ax.legend(handles=[Patch(facecolor=colour[k], label=k) for k in reversed(kinds)],
              title="Kind of foundation, as recorded", loc="upper left", bbox_to_anchor=(1.01, 1.0), frameon=False,
              fontsize=8.5, title_fontsize=8.5, alignment="left")
    finish(fig, "The number above each bar is the sum of the counts in it; the bars together hold %g records."
           % sum(base))
    save(fig, FIG)


if __name__ == "__main__":
    main()
