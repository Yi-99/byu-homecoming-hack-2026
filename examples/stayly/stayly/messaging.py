OPENERS = {"if": "/if", "each": "/each", "unless": "/unless"}


def check_template(template: str) -> int:
    stack: list[tuple[str, int]] = []
    i = 0
    while i < len(template):
        if template[i] != "{" or i + 1 >= len(template) or template[i + 1] not in "#/":
            i += 1
            continue
        end = template.find("}", i)
        if end == -1:
            return i
        kind, name = template[i + 1], template[i + 2:end].split()[0] if template[i + 2:end].split() else ""
        if kind == "#":
            if name not in OPENERS:
                return i
            stack.append((name, i))
        elif not stack or stack[-1][0] != name:
            return i
        else:
            stack.pop()
        i = end + 1
    return stack[-1][1] if stack else -1
