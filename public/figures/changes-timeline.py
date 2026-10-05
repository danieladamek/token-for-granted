#!/usr/bin/env python3
"""Figure 10. What changed, January 2025 to October 5, 2026: the dated ledger by status

Reads  figures/data/changes-timeline.csv
Writes figures/out/changes-timeline.svg and figures/out/changes-timeline.pdf
Run:   python3 figures/scripts/changes-timeline.py   (needs matplotlib; no other dependency)

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

FIG = "changes-timeline"
LABEL = "Figure 10"
TITLE = 'What changed, January 2025 to October 5, 2026: the dated ledger by status'
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


import datetime as dt

import matplotlib.dates as mdates

STATUSES = ["final", "enacted", "pending-implementation", "announced", "proposed", "frozen-by-appropriations",
            "rescinded", "enjoined", "in-litigation", "on-appeal", "vacated"]  # rows from the top
MARKERS = ["o", "s", "D", "^", "v", "P", "X", "*"]  # the shape repeats what the colour says
NEAR = 5  # days: two points of one status closer than this would sit on top of each other on the page
SLOT = 0.085  # inches between one offset step and the next


def main():
    rows = read_csv(FIG)
    statuses = STATUSES + sorted({r["status"] for r in rows} - set(STATUSES))
    groups = []  # recorded_under, in file order of first appearance
    for r in rows:
        if r["recorded_under"] not in groups:
            groups.append(r["recorded_under"])
    if len(groups) > len(SERIES):
        raise SystemExit("more groups than series colours")
    # Points of one status on the same date, or fewer than NEAR days apart, would hide each other. Each point
    # therefore takes the first free step above or below its row line, tried in the order 0, +1, -1, +2, -2 ...
    # The offset carries no meaning; the x position is always the plot_date in the file.
    taken, step = {}, {}
    for i in sorted(range(len(rows)), key=lambda i: rows[i]["plot_date"]):
        day = dt.date.fromisoformat(rows[i]["plot_date"]).toordinal()
        lane = taken.setdefault(rows[i]["status"], {})
        k = 0
        while any(abs(day - d) < NEAR for d in lane.get(k, [])):
            k = -k if k > 0 else 1 - k
        lane.setdefault(k, []).append(day)
        step[i] = k
    # a row is as tall as its deepest pile of points needs; the unit of y is one offset step
    centre, edges, y = {}, [], 0.0
    for s in statuses:
        half = max([abs(k) for k in taken.get(s, {})] + [2]) + 1.5
        centre[s] = y + half
        y += 2 * half
        edges.append(y)
    fig, ax = plt.subplots(figsize=(14, y * SLOT + 1.9), layout="constrained")
    for j, g in enumerate(groups):
        idx = [i for i, r in enumerate(rows) if r["recorded_under"] == g]
        ax.scatter([dt.date.fromisoformat(rows[i]["plot_date"]) for i in idx],
                   [centre[rows[i]["status"]] - step[i] for i in idx], s=24, color=SERIES[j], marker=MARKERS[j],
                   edgecolor=SURFACE, linewidth=0.5, zorder=3, label=g)
    for s, edge in zip(statuses, edges):  # at the right edge: how many rows of the file carry this status
        n = sum(1 for r in rows if r["status"] == s)
        ax.annotate(str(n), (1.0, centre[s]), xycoords=("axes fraction", "data"), xytext=(8, 0),
                    textcoords="offset points", ha="left", va="center", fontsize=9, color=INK, fontweight="bold")
        ax.axhline(edge, color=GRID, linewidth=0.8, zorder=0)
    ax.annotate("rows", (1.0, 0), xycoords=("axes fraction", "data"), xytext=(8, 4), textcoords="offset points",
                ha="left", va="bottom", fontsize=8, color=MUTED)
    ax.set_yticks([centre[s] for s in statuses])
    ax.set_yticklabels(statuses)
    ax.set_ylim(y, 0)
    days = [dt.date.fromisoformat(r["plot_date"]) for r in rows]
    ax.set_xlim(min(days).replace(day=1) - dt.timedelta(days=8), max(days) + dt.timedelta(days=10))
    ax.xaxis.set_major_locator(mdates.MonthLocator())
    ax.xaxis.set_major_formatter(
        lambda x, pos: mdates.num2date(x).strftime("%b\n%Y" if pos == 0 or mdates.num2date(x).month == 1 else "%b"))
    by_month = sum(1 for r in rows if r["date_precision"] == "month")
    ax.set_xlabel("Date of the change, as plot_date gives it (%d rows dated to a month only sit where the file puts "
                  "them, mid-month)" % by_month, loc="left")
    ax.set_ylabel("Status on October 5, 2026")
    clean_axes(ax, "x")
    ax.spines["left"].set_visible(False)
    ax.legend(title="Part of the guide that recorded it", loc="lower left", bbox_to_anchor=(0.0, 1.0),
              ncol=len(groups), frameon=False, fontsize=8.5, title_fontsize=8.5, alignment="left", markerscale=1.4)
    finish(fig, "%d rows, one point each. Points of one status that share a date or fall within %d days of each other "
                "are set above and below the row line; that offset carries no meaning." % (len(rows), NEAR))
    save(fig, FIG)


if __name__ == "__main__":
    main()
