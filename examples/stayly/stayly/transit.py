import heapq
from collections import deque

Graph = dict[str, list[tuple[str, int]]]


def fastest_route(graph: Graph, src: str, dst: str) -> tuple[int, list[str]] | None:
    dist = {src: 0}
    prev: dict[str, str] = {}
    heap = [(0, src)]
    while heap:
        minutes, node = heapq.heappop(heap)
        if node == dst:
            path = [dst]
            while path[-1] != src:
                path.append(prev[path[-1]])
            return minutes, path[::-1]
        if minutes > dist.get(node, float("inf")):
            continue
        for nxt, cost in graph.get(node, []):
            if minutes + cost < dist.get(nxt, float("inf")):
                dist[nxt] = minutes + cost
                prev[nxt] = node
                heapq.heappush(heap, (dist[nxt], nxt))
    return None


def fewest_transfers(lines: dict[str, list[str]], src: str, dst: str) -> int:
    stop_lines: dict[str, list[str]] = {}
    for line, stops in lines.items():
        for stop in stops:
            stop_lines.setdefault(stop, []).append(line)
    if src == dst:
        return 0
    seen_lines: set[str] = set()
    queue = deque([(src, 0)])
    while queue:
        stop, rides = queue.popleft()
        for line in stop_lines.get(stop, []):
            if line in seen_lines:
                continue
            seen_lines.add(line)
            for nxt in lines[line]:
                if nxt == dst:
                    return rides
                queue.append((nxt, rides + 1))
    return -1


class UnionFind:
    def __init__(self, items):
        self.parent = {item: item for item in items}
        self.size = {item: 1 for item in items}

    def find(self, item):
        while self.parent[item] != item:
            self.parent[item] = self.parent[self.parent[item]]
            item = self.parent[item]
        return item

    def union(self, a, b) -> bool:
        ra, rb = self.find(a), self.find(b)
        if ra == rb:
            return False
        if self.size[ra] < self.size[rb]:
            ra, rb = rb, ra
        self.parent[rb] = ra
        self.size[ra] += self.size[rb]
        return True


def neighborhood_clusters(neighborhoods: list[str], walkable_pairs: list[tuple[str, str]]) -> list[set[str]]:
    uf = UnionFind(neighborhoods)
    for a, b in walkable_pairs:
        uf.union(a, b)
    groups: dict[str, set[str]] = {}
    for name in neighborhoods:
        groups.setdefault(uf.find(name), set()).add(name)
    return list(groups.values())


def count_listing_clusters(grid: list[str]) -> int:
    rows, cols = len(grid), len(grid[0]) if grid else 0
    seen: set[tuple[int, int]] = set()
    clusters = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] != "L" or (r, c) in seen:
                continue
            clusters += 1
            stack = [(r, c)]
            seen.add((r, c))
            while stack:
                cr, cc = stack.pop()
                for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                    if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "L" and (nr, nc) not in seen:
                        seen.add((nr, nc))
                        stack.append((nr, nc))
    return clusters
