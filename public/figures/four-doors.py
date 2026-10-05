#!/usr/bin/env python3
"""Figure 1. Four systems behind the word "grant", and the door into each

Reads  figures/data/four-doors.json
Writes figures/out/four-doors.svg and figures/out/four-doors.pdf
Run:   python3 figures/scripts/four-doors.py   (needs matplotlib; no other dependency)

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

FIG = "four-doors"
LABEL = "Figure 1"
TITLE = 'Four systems behind the word "grant", and the door into each'
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


from matplotlib.colors import to_rgb
from matplotlib.lines import Line2D
from matplotlib.patches import FancyBboxPatch, Patch, Rectangle

XS, YS = 2.0, 2.1  # drawing units between one col and the next, and between one row and the next
W, H, H_NOTE = 1.64, 0.86, 0.62  # box width; box height; height of a note box
RAIL = 0.24  # how far outside a lane a line runs when it has to pass other boxes of the same lane
TINT = to_rgb(SERIES[1]) + (0.16,)
STYLE = {  # kind: (edge colour, fill, line width, line style, font weight, words for the key)
    "question": (INK, SURFACE, 1.6, "-", "bold", "question"),
    "door": (SERIES[0], SURFACE, 2.0, "-", "bold", "door into the system"),
    "step": (INK2, SURFACE, 0.9, "-", "normal", "step"),
    "decision": (SERIES[1], TINT, 1.6, "-", "normal", "decision made by someone else"),
    "note": (MUTED, SURFACE, 0.9, (0, (3, 2)), "normal", "note"),
    "end": (INK2, GRID, 1.2, "-", "bold", "end: what you hold"),
}
EDGE = {"choice": (MUTED, "-"), "step": (INK2, "-"), "note": (MUTED, (0, (3, 2)))}


def main():
    g = read_json(FIG)
    nodes = {n["id"]: n for n in g["nodes"]}
    pos = {i: (n["col"] * XS, -n["row"] * YS) for i, n in nodes.items()}  # placed from col and row, nothing else
    half = {i: (H_NOTE if n["kind"] == "note" else H) / 2 for i, n in nodes.items()}
    fig, ax = plt.subplots(figsize=(14.5, 8.4), layout="constrained")

    # one quiet strip behind each lane: the row of every door, from the door to the last column
    last = max(n["col"] for n in nodes.values()) * XS
    for n in nodes.values():
        if n["kind"] == "door":
            x, y = pos[n["id"]]
            ax.add_patch(Rectangle((x - W / 2 - 0.1, y - H / 2 - 0.12), last - x + W + 0.2, H + 0.24,
                                   facecolor=GRID, edgecolor="none", alpha=0.45, zorder=0))

    for e in g["edges"]:
        a, b = e["from"], e["to"]
        (x0, y0), (x1, y1) = pos[a], pos[b]
        colour, ls = EDGE.get(e["kind"], (INK2, "-"))
        if y0 == y1 and abs(x1 - x0) > XS * 1.01:
            # same lane but not neighbours: the line leaves the lane, runs along a rail and comes back,
            # so that it does not cross the boxes in between (choices above the lane, steps below it)
            up = 1 if e["kind"] == "choice" else -1
            rail = y0 + up * (half[a] + RAIL)
            pts, end = [(x0 + 0.3, y0 + up * half[a]), (x0 + 0.3, rail), (x1 - 0.3, rail)], (x1 - 0.3, y1 + up * half[b])
        elif x0 == x1:
            s = 1 if y1 > y0 else -1
            pts, end = [(x0, y0 + s * half[a])], (x1, y1 - s * half[b])
        elif y0 != y1:  # to another row: out to a short trunk beside the box, along it, then straight in
            trunk = x0 + W / 2 + 0.13
            pts, end = [(x0 + W / 2, y0), (trunk, y0), (trunk, y1)], (x1 - W / 2, y1)
        else:
            pts, end = [(x0 + W / 2, y0)], (x1 - W / 2, y1)
        ax.plot([p[0] for p in pts], [p[1] for p in pts], color=colour, linewidth=1.0, linestyle=ls, zorder=1)
        ax.annotate("", end, pts[-1], zorder=2,
                    arrowprops=dict(arrowstyle="-|>", color=colour, linewidth=1.0, linestyle=ls, shrinkA=0, shrinkB=0))
        if e.get("label"):  # an edge label sits beside the box the edge points to
            if x0 == x1:
                ax.text(x1 + W / 2 + 0.14, y1, textwrap.fill(e["label"], 30), ha="left", va="center",
                        fontsize=7.5, color=INK2, style="italic")
            else:
                ax.text(x1, y1 + half[b] + 0.1, textwrap.fill(e["label"], 30), ha="center", va="bottom",
                        fontsize=7.5, color=INK2, style="italic")

    for i, n in nodes.items():
        x, y = pos[i]
        edge, fill, lw, ls, weight, _ = STYLE[n["kind"]]
        h = 2 * half[i]
        ax.add_patch(FancyBboxPatch((x - W / 2, y - h / 2), W, h, boxstyle="round,pad=0.0,rounding_size=0.08",
                                    facecolor=fill, edgecolor=edge, linewidth=lw, linestyle=ls, zorder=3))
        ax.text(x, y, textwrap.fill(n["label"], 21 if weight == "bold" else 23), ha="center", va="center",
                fontsize=7.8, color=INK, fontweight=weight, zorder=4, linespacing=1.15)

    kinds = [k for k in STYLE if any(n["kind"] == k for n in nodes.values())]
    key = [Patch(facecolor=STYLE[k][1], edgecolor=STYLE[k][0], linewidth=STYLE[k][2], linestyle=STYLE[k][3],
                 label=STYLE[k][5]) for k in kinds]
    key += [Line2D([], [], color=INK2, linewidth=1.0, label="leads to"),
            Line2D([], [], color=MUTED, linewidth=1.0, linestyle=(0, (3, 2)), label="note on a box")]
    ax.legend(handles=key, loc="upper left", bbox_to_anchor=(0.0, 0.0), ncol=len(key), frameon=False, fontsize=8,
              handlelength=2.2, columnspacing=1.6)
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    ax.set_xlim(min(xs) - W / 2 - 0.2, max(xs) + W / 2 + 0.2)
    ax.set_ylim(min(ys) - H / 2 - 0.3, max(ys) + H / 2 + 0.3)
    ax.axis("off")
    finish(fig)
    save(fig, FIG)


if __name__ == "__main__":
    main()
