import heapq


def bayesian_rating(ratings: list[int], prior_mean: float = 4.2, prior_weight: int = 10) -> float:
    if not ratings:
        return prior_mean
    return (prior_mean * prior_weight + sum(ratings)) / (prior_weight + len(ratings))


def longest_good_streak(ratings: list[int], threshold: int, forgiven: int) -> int:
    best = left = bad = 0
    for right, rating in enumerate(ratings):
        if rating < threshold:
            bad += 1
        while bad > forgiven:
            if ratings[left] < threshold:
                bad -= 1
            left += 1
        best = max(best, right - left + 1)
    return best


class RunningMedian:
    def __init__(self):
        self.low: list[float] = []
        self.high: list[float] = []

    def add(self, rating: float) -> None:
        heapq.heappush(self.low, -rating)
        heapq.heappush(self.high, -heapq.heappop(self.low))
        if len(self.high) > len(self.low):
            heapq.heappush(self.low, -heapq.heappop(self.high))

    def median(self) -> float:
        if not self.low:
            raise ValueError("no ratings yet")
        if len(self.low) > len(self.high):
            return -self.low[0]
        return (-self.low[0] + self.high[0]) / 2


def rank_hosts(hosts: list[dict]) -> list[dict]:
    return sorted(hosts, key=lambda h: (-h["rating"], -h["response_rate"], h["response_minutes"], h["id"]))
