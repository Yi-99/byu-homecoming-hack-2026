import heapq
from datetime import date, timedelta

Range = tuple[date, date]


def overlaps(a: Range, b: Range) -> bool:
    return a[0] < b[1] and b[0] < a[1]


def is_available(booked: list[Range], stay: Range) -> bool:
    for existing in booked:
        if overlaps(existing, stay):
            return False
    return True


def merge_ranges(ranges: list[Range]) -> list[Range]:
    merged: list[Range] = []
    for start, end in sorted(ranges):
        if merged and start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))
    return merged


def free_windows(booked: list[Range], window: Range) -> list[Range]:
    lo, hi = window
    gaps: list[Range] = []
    cursor = lo
    for start, end in merge_ranges(booked):
        if end <= lo:
            continue
        if start >= hi:
            break
        if start > cursor:
            gaps.append((cursor, start))
        cursor = max(cursor, end)
    if cursor < hi:
        gaps.append((cursor, hi))
    return gaps


def earliest_stay(booked: list[Range], window: Range, nights: int) -> Range | None:
    for gap_start, gap_end in free_windows(booked, window):
        if (gap_end - gap_start).days >= nights:
            return gap_start, gap_start + timedelta(days=nights)
    return None


def orphan_nights(booked: list[Range], window: Range, min_stay: int) -> int:
    lost = 0
    for gap_start, gap_end in free_windows(booked, window):
        gap = (gap_end - gap_start).days
        if gap < min_stay:
            lost += gap
    return lost


def peak_occupancy(stays: list[Range]) -> int:
    events: list[tuple[date, int]] = []
    for start, end in stays:
        events.append((start, 1))
        events.append((end, -1))
    events.sort()
    current = peak = 0
    for _, delta in events:
        current += delta
        peak = max(peak, current)
    return peak


def units_required(stays: list[Range]) -> int:
    release_dates: list[date] = []
    for start, end in sorted(stays):
        if release_dates and release_dates[0] <= start:
            heapq.heapreplace(release_dates, end)
        else:
            heapq.heappush(release_dates, end)
    return len(release_dates)
