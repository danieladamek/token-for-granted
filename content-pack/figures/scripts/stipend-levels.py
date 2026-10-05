#!/usr/bin/env python3
"""Figure 4. Fellowship and traineeship stipends as each notice or page states them (read October 4–5, 2026)

Reads  figures/data/stipend-levels.csv
Writes figures/out/stipend-levels.svg and figures/out/stipend-levels.pdf
Run:   python3 figures/scripts/stipend-levels.py   (needs matplotlib; no other dependency)

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

FIG = "stipend-levels"
LABEL = "Figure 4"
TITLE = 'Fellowship and traineeship stipends as each notice or page states them (read October 4–5, 2026)'
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

# Levels run from early career to late; a level not named here follows in the order the file first gives it.
ORDER = ["undergraduate", "predoctoral", "postdoctoral", "faculty or scholar", "other"]


def main():
    rows = read_csv(FIG)
    drawn = [r for r in rows if r["annual_usd"].strip() != ""]
    levels = [lv for lv in ORDER if any(r["level"] == lv for r in drawn)]
    for r in drawn:
        if r["level"] not in levels:
            levels.append(r["level"])
    if len(levels) > len(SERIES):
        raise SystemExit("more levels than series colours")
    colour = dict(zip(levels, SERIES))
    n_slots = len(drawn) + 1.1 * len(levels)
    fig, ax = plt.subplots(figsize=(12.5, 0.3 * n_slots + 1.6), layout="constrained")
    y, ticks, labels = 0.0, [], []
    for lv in levels:
        # inside a level, bars run from the highest figure to the lowest (ties keep file order)
        group = sorted((r for r in drawn if r["level"] == lv), key=lambda r: -float(r["annual_usd"]))
        ax.text(0, y - 0.15, " " + lv, ha="left", va="center", fontsize=8.5, color=INK, fontweight="bold")
        y += 0.9
        for r in group:
            v = float(r["annual_usd"])
            ax.barh(y, v, height=0.62, color=colour[lv], zorder=3)
            shown = "$" + format(int(v), ",") if v == int(v) else "$" + r["annual_usd"]
            ax.annotate(shown, (v, y), xytext=(5, 0), textcoords="offset points", ha="left", va="center",
                        fontsize=7.8, color=INK2)
            ticks.append(y)
            labels.append(textwrap.fill(r["programme"], 66))
            y += 1
        y += 0.2
    ax.set_yticks(ticks)
    ax.set_yticklabels(labels, fontsize=7.8, linespacing=1.0)
    ax.set_ylim(-0.8, y - 0.5)
    ax.invert_yaxis()
    top = max(float(r["annual_usd"]) for r in drawn)
    ax.set_xlim(0, top * 1.12)
    ax.xaxis.set_major_formatter(lambda v, _: "$" + format(int(v), ","))
    ax.set_xlabel("Annual stipend as published, US dollars", loc="left")
    clean_axes(ax, "x")
    ax.legend(handles=[Patch(facecolor=colour[lv], label=lv) for lv in levels], title="Career level", loc="lower left",
              bbox_to_anchor=(0.0, 1.0), ncol=len(levels), frameon=False, fontsize=8, title_fontsize=8,
              alignment="left")
    finish(fig, "not drawn: %d rows with no single figure" % (len(rows) - len(drawn)))
    save(fig, FIG)


if __name__ == "__main__":
    main()
