from bisect import bisect_right
from datetime import date

from .availability import is_available
from .models import Booking, Listing
from .pricing import quote

FLEXIBLE = [(0, 0), (1, 100)]
MODERATE = [(0, 0), (5, 50), (14, 100)]
STRICT = [(0, 0), (7, 50), (30, 100)]


def refund_amount(total: int, days_before: int, policy: list[tuple[int, int]]) -> int:
    if days_before < 0:
        return 0
    tier = bisect_right([d for d, _ in policy], days_before) - 1
    return total * policy[tier][1] // 100


class BookingError(Exception):
    pass


class Calendar:
    def __init__(self):
        self.bookings: dict[int, list[Booking]] = {}
        self.next_id = 1

    def book(self, listing: Listing, guest_id: int, start: date, end: date, guests: int, seasons=()) -> Booking:
        if end <= start:
            raise BookingError("checkout must be after check-in")
        if guests > listing.capacity:
            raise BookingError("too many guests")
        taken = [(b.start, b.end) for b in self.bookings.get(listing.id, [])]
        if not is_available(taken, (start, end)):
            raise BookingError("dates unavailable")
        price = quote(listing.base_price, (start, end), list(seasons))
        booking = Booking(self.next_id, listing.id, guest_id, start, end, guests, price["total"])
        self.next_id += 1
        self.bookings.setdefault(listing.id, []).append(booking)
        return booking

    def cancel(self, booking: Booking, today: date, policy: list[tuple[int, int]]) -> int:
        self.bookings[booking.listing_id].remove(booking)
        return refund_amount(booking.total, (booking.start - today).days, policy)
