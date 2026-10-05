#!/usr/bin/env python3
"""Figure 8. Which states and territories are on each agency's EPSCoR or IDeA list (as each agency's page or notice stated it when read, October 4–5, 2026)

Reads  figures/data/jurisdiction-lists.csv
Writes figures/out/jurisdiction-lists.svg and figures/out/jurisdiction-lists.pdf
Run:   python3 figures/scripts/jurisdiction-lists.py   (needs matplotlib; no other dependency)

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

FIG = "jurisdiction-lists"
LABEL = "Figure 8"
TITLE = "Which states and territories are on each agency's EPSCoR or IDeA list (as each agency's page or notice stated it when read, October 4–5, 2026)"
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

COLS = [("nsf_epscor", "NSF EPSCoR"), ("nih_idea", "NIH IDeA"), ("doe_epscor", "DOE EPSCoR"),
        ("nasa_epscor", "NASA EPSCoR"), ("dod_depscor", "DoD DEPSCoR"), ("usda_epscor", "USDA EPSCoR")]


def main():
    rows = read_csv(FIG)  # jurisdictions down the side in file order
    n = len(rows)
    fig, ax = plt.subplots(figsize=(7.8, 0.27 * n + 1.9), layout="constrained")
    odd = set()
    for j, (field, _) in enumerate(COLS):
        total = 0
        for i, r in enumerate(rows):
            cell = r[field].strip().lower()
            on = cell == "yes"  # a cell is filled only where the file says yes
            total += on
            if cell not in ("yes", ""):
                odd.add(r[field])
            ax.add_patch(Rectangle((j - 0.45, i - 0.39), 0.9, 0.78, facecolor=SERIES[0] if on else SURFACE,
                                   edgecolor="none" if on else GRID, linewidth=0.8))
        # column total: a count of the filled cells above it
        ax.text(j, n - 0.25, str(total), ha="center", va="top", fontsize=10, color=INK, fontweight="bold")
    for i, r in enumerate(rows):  # lists_num is written as the file gives it
        ax.text(len(COLS) - 0.25, i, r["lists_num"], ha="center", va="center", fontsize=8.5, color=INK2)
    ax.text(-0.6, n - 0.25, "Places on the list", ha="right", va="top", fontsize=8.5, color=INK2)
    ax.set_xlim(-0.55, len(COLS) + 0.1)
    ax.set_ylim(n + 0.6, -0.6)
    ax.xaxis.tick_top()
    ax.set_xticks(list(range(len(COLS))) + [len(COLS) - 0.25])
    ax.set_xticklabels([label.replace(" ", "\n") for _, label in COLS] + ["Lists\n(of six)"], fontsize=8.5)
    ax.set_yticks(range(n))
    ax.set_yticklabels([r["jurisdiction"] for r in rows], fontsize=8.5)
    ax.tick_params(length=0)
    for side in ax.spines.values():
        side.set_visible(False)
    note = "Filled cell: the file says yes for that place and list. Empty cell: the file has no entry."
    if odd:
        note += " Cells left empty that hold other text: " + "; ".join(sorted(odd)) + "."
    finish(fig, note)
    save(fig, FIG)


if __name__ == "__main__":
    main()
