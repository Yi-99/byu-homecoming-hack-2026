from bisect import bisect_right
from datetime import date, timedelta

WEEKEND_DAYS = {4, 5}
WEEKEND_MARKUP = 1.15
LONG_STAY = [(7, 0.10), (28, 0.20)]

Season = tuple[date, date, float]


def nightly_rate(base: int, night: date, seasons: list[Season]) -> int:
    rate = float(base)
    for start, end, multiplier in seasons:
        if start <= night < end:
            rate *= multiplier
            break
    if night.weekday() in WEEKEND_DAYS:
        rate *= WEEKEND_MARKUP
    return round(rate)


def quote(base: int, stay: tuple[date, date], seasons: list[Season], cleaning_fee: int = 0) -> dict:
    start, end = stay
    nights = (end - start).days
    subtotal = sum(nightly_rate(base, start + timedelta(days=d), seasons) for d in range(nights))
    tier = bisect_right([n for n, _ in LONG_STAY], nights)
    discount = round(subtotal * LONG_STAY[tier - 1][1]) if tier else 0
    return {
        "nights": nights,
        "subtotal": subtotal,
        "discount": discount,
        "cleaning_fee": cleaning_fee,
        "total": subtotal - discount + cleaning_fee,
    }


def cheapest_window(prices: list[int], nights: int) -> int:
    if nights <= 0 or nights > len(prices):
        return -1
    current = sum(prices[:nights])
    best, best_start = current, 0
    for i in range(nights, len(prices)):
        current += prices[i] - prices[i - nights]
        if current < best:
            best, best_start = current, i - nights + 1
    return best_start


def smooth_prices(prices: list[int], max_step: int) -> list[int]:
    out = list(prices)
    for i in range(1, len(out)):
        out[i] = min(out[i], out[i - 1] + max_step)
    for i in range(len(out) - 2, -1, -1):
        out[i] = min(out[i], out[i + 1] + max_step)
    return out


def fewest_vouchers(amount: int, denominations: list[int]) -> int:
    INF = amount + 1
    best = [0] + [INF] * amount
    for target in range(1, amount + 1):
        for coin in denominations:
            if coin <= target and best[target - coin] + 1 < best[target]:
                best[target] = best[target - coin] + 1
    return best[amount] if best[amount] != INF else -1


def max_promo_value(promos: list[tuple[int, int]], points: int) -> int:
    best = [0] * (points + 1)
    for cost, value in promos:
        for budget in range(points, cost - 1, -1):
            best[budget] = max(best[budget], best[budget - cost] + value)
    return best[points]
