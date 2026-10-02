import heapq
from collections import defaultdict

from .availability import is_available
from .models import Listing


def match_score(listing: Listing, wanted: set[str]) -> float:
    hits = len(wanted & listing.amenities)
    return hits * 10 + listing.rating * 2 + min(listing.review_count, 100) / 50


def top_k(listings: list[Listing], wanted: set[str], k: int) -> list[Listing]:
    heap: list[tuple[float, int, Listing]] = []
    for listing in listings:
        item = (match_score(listing, wanted), -listing.id, listing)
        if len(heap) < k:
            heapq.heappush(heap, item)
        elif item > heap[0]:
            heapq.heapreplace(heap, item)
    return [listing for _, _, listing in sorted(heap, reverse=True)]


def price_range(sorted_by_price: list[Listing], low: int, high: int) -> list[Listing]:
    lo, hi = 0, len(sorted_by_price)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_by_price[mid].base_price < low:
            lo = mid + 1
        else:
            hi = mid
    start = lo
    hi = len(sorted_by_price)
    while lo < hi:
        mid = (lo + hi) // 2
        if sorted_by_price[mid].base_price <= high:
            lo = mid + 1
        else:
            hi = mid
    return sorted_by_price[start:lo]


def search_stays(listings, booked_by_listing, stay, guests, city):
    results = []
    for listing in listings:
        if listing.city != city or listing.capacity < guests:
            continue
        if is_available(booked_by_listing.get(listing.id, []), stay):
            results.append(listing)
    return results


class GeoGrid:
    def __init__(self, cell_size: float = 0.01):
        self.cell_size = cell_size
        self.cells: dict[tuple[int, int], list[Listing]] = defaultdict(list)

    def _cell(self, lat: float, lng: float) -> tuple[int, int]:
        return int(lat // self.cell_size), int(lng // self.cell_size)

    def add(self, listing: Listing) -> None:
        self.cells[self._cell(listing.lat, listing.lng)].append(listing)

    def nearby(self, lat: float, lng: float, rings: int = 1) -> list[Listing]:
        row, col = self._cell(lat, lng)
        found: list[Listing] = []
        for dr in range(-rings, rings + 1):
            for dc in range(-rings, rings + 1):
                found.extend(self.cells.get((row + dr, col + dc), []))
        return found


class AmenityTrie:
    def __init__(self):
        self.children: dict[str, "AmenityTrie"] = {}
        self.count = 0

    def insert(self, word: str) -> None:
        node = self
        for ch in word.lower():
            node = node.children.setdefault(ch, AmenityTrie())
        node.count += 1

    def suggest(self, prefix: str, limit: int = 5) -> list[str]:
        node = self
        for ch in prefix.lower():
            if ch not in node.children:
                return []
            node = node.children[ch]
        found: list[tuple[int, str]] = []
        node._collect(prefix.lower(), found)
        found.sort(key=lambda item: (-item[0], item[1]))
        return [word for _, word in found[:limit]]

    def _collect(self, path: str, out: list[tuple[int, str]]) -> None:
        if self.count:
            out.append((self.count, path))
        for ch, child in self.children.items():
            child._collect(path + ch, out)
