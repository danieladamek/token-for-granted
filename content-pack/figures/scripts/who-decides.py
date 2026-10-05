#!/usr/bin/env python3
"""Figure 2. Who reads an application and who decides: NIH, NSF and SAMHSA

Reads  figures/data/who-decides.json
Writes figures/out/who-decides.svg and figures/out/who-decides.pdf
Run:   python3 figures/scripts/who-decides.py   (needs matplotlib; no other dependency)

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

FIG = "who-decides"
LABEL = "Figure 2"
TITLE = 'Who reads an application and who decides: NIH, NSF and SAMHSA'
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
from matplotlib.patches import FancyBboxPatch, Patch

X0, XS, YS = 2.7, 3.5, 1.55  # x of col 1; drawing units between later cols; units between rows
W_LANE, W, H = 1.5, 3.1, 1.0  # width of a lane name box; width and height of the other boxes
SIDE = 0.45  # distance of the overlay line from the right edge of the last column
BLUE, ORANGE = to_rgb(SERIES[0]), to_rgb(SERIES[1])
KEY = {"advise": "advises (outline)", "decide": "the agency decides (filled)",
       "overlay": "review added by Executive Order 14332"}


def box(ax, x, y, w, h, text, edge, fill, lw, width, weight="normal", size=8):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.0,rounding_size=0.08",
                                facecolor=fill, edgecolor=edge, linewidth=lw, zorder=3))
    ax.text(x, y, textwrap.fill(text, width), ha="center", va="center", fontsize=size, color=INK,
            fontweight=weight, zorder=4, linespacing=1.15)


def main():
    g = read_json(FIG)
    nodes = {n["id"]: n for n in g["nodes"]}
    # placed from col and row: col 0 holds the lane names, row -1 is the overlay above the lanes
    pos = {i: (0.0 if n["col"] == 0 else X0 + (n["col"] - 1) * XS, -n["row"] * YS) for i, n in nodes.items()}
    wide = {i: W_LANE if n["kind"] == "lane" else W for i, n in nodes.items()}
    right = max(x + wide[i] / 2 for i, (x, _) in pos.items() if nodes[i]["kind"] != "overlay")
    left = min(x - wide[i] / 2 for i, (x, _) in pos.items() if nodes[i]["kind"] != "overlay")
    fig, ax = plt.subplots(figsize=(13.5, 6.6), layout="constrained")

    for e in g["edges"]:
        a, b = e["from"], e["to"]
        (x0, y0), (x1, y1) = pos[a], pos[b]
        if e["kind"] == "overlay":
            # the overlay reaches each box it points to by a line down the right side, so it crosses no box
            xr = right + SIDE
            ax.plot([xr, xr], [y0 - H * 0.36, y1], color=SERIES[1], linewidth=1.2, linestyle=(0, (4, 2)), zorder=1)
            ax.annotate("", (x1 + wide[b] / 2, y1), (xr, y1), zorder=2,
                        arrowprops=dict(arrowstyle="-|>", color=SERIES[1], linewidth=1.2, shrinkA=0, shrinkB=0))
            if e.get("label"):
                ax.text(xr + 0.12, y1, textwrap.fill(e["label"], 14), ha="left", va="center", fontsize=7.5,
                        color=INK2, style="italic")
            continue
        if n_cols_between(nodes[a], nodes[b]) > 1 and y0 == y1:
            # same lane but not neighbours: run under the box in between rather than through it
            rail = y0 - H / 2 - 0.22
            pts, end = [(x0 + 0.5, y0 - H / 2), (x0 + 0.5, rail), (x1 - 0.5, rail)], (x1 - 0.5, y1 - H / 2)
        else:
            pts, end = [(x0 + wide[a] / 2, y0)], (x1 - wide[b] / 2, y1)
        ax.plot([p[0] for p in pts], [p[1] for p in pts], color=INK2, linewidth=1.0, zorder=1)
        ax.annotate("", end, pts[-1], zorder=2,
                    arrowprops=dict(arrowstyle="-|>", color=INK2, linewidth=1.0, shrinkA=0, shrinkB=0))

    for i, n in nodes.items():
        x, y = pos[i]
        k = n["kind"]
        if k == "overlay":  # a bar across the top that spans every column, and the line down the right side
            x_mid, w = (left + right + SIDE + 0.2) / 2, right + SIDE + 0.2 - left
            box(ax, x_mid, y, w, H * 0.72, n["label"], SERIES[1], ORANGE + (0.16,), 1.4, 150)
        elif k == "lane":
            box(ax, x, y, W_LANE, H, n["label"], INK, SURFACE, 1.6, 12, weight="bold", size=10)
        elif k == "decide":
            box(ax, x, y, W, H, n["label"], SERIES[0], BLUE + (0.22,), 1.8, 40)
        else:
            box(ax, x, y, W, H, n["label"], SERIES[0], SURFACE, 1.2, 40)

    key = [Patch(facecolor=SURFACE, edgecolor=SERIES[0], linewidth=1.2, label=KEY["advise"]),
           Patch(facecolor=BLUE + (0.22,), edgecolor=SERIES[0], linewidth=1.8, label=KEY["decide"]),
           Patch(facecolor=ORANGE + (0.16,), edgecolor=SERIES[1], linewidth=1.4, label=KEY["overlay"]),
           Line2D([], [], color=INK2, linewidth=1.0, label="passes to")]
    ax.legend(handles=key, loc="upper left", bbox_to_anchor=(0.0, 0.0), ncol=4, frameon=False, fontsize=8,
              handlelength=2.2, columnspacing=1.6)
    ys = [p[1] for p in pos.values()]
    ax.set_xlim(left - 0.2, right + SIDE + 1.7)
    ax.set_ylim(min(ys) - H / 2 - 0.45, max(ys) + H / 2 + 0.1)
    ax.axis("off")
    finish(fig)
    save(fig, FIG)


def n_cols_between(a, b):
    return abs(b["col"] - a["col"])


if __name__ == "__main__":
    main()
