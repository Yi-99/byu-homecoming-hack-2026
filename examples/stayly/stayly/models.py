from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Listing:
    id: int
    host_id: int
    city: str
    neighborhood: str
    base_price: int
    capacity: int
    amenities: frozenset[str]
    lat: float
    lng: float
    rating: float = 0.0
    review_count: int = 0


@dataclass(frozen=True)
class Booking:
    id: int
    listing_id: int
    guest_id: int
    start: date
    end: date
    guests: int
    total: int = 0
