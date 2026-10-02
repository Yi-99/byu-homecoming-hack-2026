import heapq


def plan_itineraries(stops: list[list[tuple[str, int]]], budget: int) -> list[list[str]]:
    plans: list[list[str]] = []
    chosen: list[str] = []

    def pick(city: int, spent: int) -> None:
        if spent > budget:
            return
        if city == len(stops):
            plans.append(chosen.copy())
            return
        for name, price in stops[city]:
            chosen.append(name)
            pick(city + 1, spent + price)
            chosen.pop()

    pick(0, 0)
    return plans


def settle_debts(balances: dict[str, int]) -> list[tuple[str, str, int]]:
    owed = [(-amount, who) for who, amount in balances.items() if amount > 0]
    owing = [(amount, who) for who, amount in balances.items() if amount < 0]
    heapq.heapify(owed)
    heapq.heapify(owing)
    payments: list[tuple[str, str, int]] = []
    while owed and owing:
        credit, creditor = heapq.heappop(owed)
        debt, debtor = heapq.heappop(owing)
        pay = min(-credit, -debt)
        payments.append((debtor, creditor, pay))
        if -credit > pay:
            heapq.heappush(owed, (credit + pay, creditor))
        if -debt > pay:
            heapq.heappush(owing, (debt + pay, debtor))
    return payments


def split_costs(total: int, shares: dict[str, int]) -> dict[str, int]:
    weight = sum(shares.values())
    out = {who: total * share // weight for who, share in shares.items()}
    leftover = total - sum(out.values())
    for who in sorted(shares, key=lambda w: (-(total * shares[w] % weight), w))[:leftover]:
        out[who] += 1
    return out
