#!/usr/bin/env python3
"""Figure 7. What foundations say they pay toward indirect costs, as their own pages state it (read October 4–5, 2026)

Reads  figures/data/foundation-indirect-rates.csv
Writes figures/out/foundation-indirect-rates.svg and figures/out/foundation-indirect-rates.pdf
Run:   python3 figures/scripts/foundation-indirect-rates.py   (needs matplotlib; no other dependency)

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

FIG = "foundation-indirect-rates"
LABEL = "Figure 7"
TITLE = 'What foundations say they pay toward indirect costs, as their own pages state it (read October 4–5, 2026)'
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


from matplotlib.lines import Line2D
from matplotlib.patches import Patch


def main():
    rows = read_csv(FIG)
    drawn = [r for r in rows if r["rate_num"].strip() != ""]  # file order kept
    kinds = []
    for r in drawn:
        if r["rate_kind"] not in kinds:
            kinds.append(r["rate_kind"])
    if len(kinds) > len(SERIES):
        raise SystemExit("more kinds of rate than series colours")
    colour = dict(zip(kinds, SERIES))
    full = [r["funder"] + ": " + r["applies_to"] for r in drawn]
    short = [textwrap.shorten(s, 70, placeholder="…") for s in full]
    # a label cut to 70 characters is kept unless the cut makes two rows read the same;
    # those rows carry the whole label, wrapped, so that each bar can still be told from the next
    labels = [textwrap.fill(f, 70) if short.count(s) > 1 else s for f, s in zip(full, short)]
    fig, ax = plt.subplots(figsize=(12.5, 0.31 * len(drawn) + 1.9), layout="constrained")
    zero_kinds = set()
    for y, r in enumerate(drawn):
        v = float(r["rate_num"])
        if v == 0:  # a zero-length bar: only a tick at zero, and the words "none paid"
            zero_kinds.add(r["rate_kind"])
            ax.plot([0], [y], marker="|", markersize=10, markeredgewidth=2, color=colour[r["rate_kind"]], zorder=3)
            end = "none paid"
        else:
            ax.barh(y, v, height=0.6, color=colour[r["rate_kind"]], zorder=3)
            end = r["rate_num"] + "% " + r["rate_kind"]
        ax.annotate(end, (v, y), xytext=(6, 0), textcoords="offset points", ha="left", va="center", fontsize=8,
                    color=INK2)
    ax.set_yticks(range(len(drawn)))
    ax.set_yticklabels(labels, fontsize=8, linespacing=1.0)
    ax.set_ylim(-0.7, len(drawn) - 0.3)
    ax.invert_yaxis()
    ax.set_xlim(0, max(float(r["rate_num"]) for r in drawn) * 1.28)
    ax.set_xlabel("Stated rate in percent, as rate_num gives it (the base differs from funder to funder)", loc="left")
    clean_axes(ax, "x")
    key = [Line2D([], [], linestyle="", marker="|", markersize=10, markeredgewidth=2, color=colour[k], label=k)
           if k in zero_kinds else Patch(facecolor=colour[k], label=k) for k in kinds]
    ax.legend(handles=key, title="Kind of rate", loc="lower left", bbox_to_anchor=(0.0, 1.0), ncol=len(kinds),
              frameon=False, fontsize=8, title_fontsize=8, alignment="left")
    finish(fig, "not drawn: %d rows with no single figure" % (len(rows) - len(drawn)))
    save(fig, FIG)


if __name__ == "__main__":
    main()
