from collections import deque


class _Node:
    def __init__(self, key=None, value=None):
        self.key, self.value = key, value
        self.prev = self.next = None


class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.map: dict = {}
        self.head, self.tail = _Node(), _Node()
        self.head.next, self.tail.prev = self.tail, self.head

    def _unlink(self, node: _Node) -> None:
        node.prev.next, node.next.prev = node.next, node.prev

    def _push_front(self, node: _Node) -> None:
        node.next, node.prev = self.head.next, self.head
        self.head.next.prev = node
        self.head.next = node

    def get(self, key):
        node = self.map.get(key)
        if node is None:
            return None
        self._unlink(node)
        self._push_front(node)
        return node.value

    def put(self, key, value) -> None:
        node = self.map.get(key)
        if node:
            node.value = value
            self._unlink(node)
        else:
            if len(self.map) >= self.capacity:
                oldest = self.tail.prev
                self._unlink(oldest)
                del self.map[oldest.key]
            node = self.map[key] = _Node(key, value)
        self._push_front(node)


class RateLimiter:
    def __init__(self, limit: int, window_seconds: int):
        self.limit, self.window = limit, window_seconds
        self.hits: dict[str, deque] = {}

    def allow(self, user: str, now: float) -> bool:
        q = self.hits.setdefault(user, deque())
        while q and q[0] <= now - self.window:
            q.popleft()
        if len(q) >= self.limit:
            return False
        q.append(now)
        return True
