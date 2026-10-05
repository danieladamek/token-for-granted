#!/usr/bin/env python3
"""Figure 9. How long the registrations take, as the official pages state it (read October 4–5, 2026)

Reads  figures/data/registration-times.csv
Writes figures/out/registration-times.svg and figures/out/registration-times.pdf
Run:   python3 figures/scripts/registration-times.py   (needs matplotlib; no other dependency)

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

FIG = "registration-times"
LABEL = "Figure 9"
TITLE = 'How long the registrations take, as the official pages state it (read October 4–5, 2026)'
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


def main():
    rows = read_csv(FIG)
    drawn = [r for r in rows if r["days_sort"].strip() != ""]  # file order kept
    fig, ax = plt.subplots(figsize=(13.5, 0.4 * len(drawn) + 1.6), layout="constrained")
    vals = [float(r["days_sort"]) for r in drawn]
    ys = list(range(len(drawn)))
    ax.barh(ys, vals, height=0.56, color=SERIES[0], zorder=3)
    for y, r, v in zip(ys, drawn, vals):
        # the stated time follows the number of days, because two rows can share a gate and a source
        said = textwrap.shorten(r["stated_time"], 62, placeholder="…")
        ax.annotate(r["days_sort"] + (" day" if v == 1 else " days"), (v, y), xytext=(6, 0),
                    textcoords="offset points", ha="left", va="center", fontsize=8.5, color=INK, fontweight="bold")
        ax.annotate("“" + said + "”", (v, y), xytext=(62, 0), textcoords="offset points", ha="left", va="center",
                    fontsize=7.5, color=INK2)
    ax.set_yticks(ys)
    ax.set_yticklabels([textwrap.fill(textwrap.shorten(r["gate"] + " — " + r["stated_by"], 80, placeholder="…"), 46)
                        for r in drawn], fontsize=8.2, linespacing=1.05)
    ax.set_ylim(-0.7, len(drawn) - 0.3)
    ax.invert_yaxis()
    top = max(vals)
    ax.set_xlim(0, top * 1.9)  # room on the right for the words at the end of the longest bar
    ax.set_xticks(range(0, int(top) + 1, 30))
    ax.set_xlabel("Stated time in days (business days counted as stated; a week taken as 7 days)", loc="left")
    clean_axes(ax, "x")
    finish(fig, "not drawn: %d rows with no single figure. The words in quotation marks are the start of the "
                "stated_time column." % (len(rows) - len(drawn)))
    save(fig, FIG)


if __name__ == "__main__":
    main()
