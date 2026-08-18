import re


def parse_reference(reference):

    reference = reference.strip()

    # Range: 0.60-1.25
    match = re.fullmatch(
        r"(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)",
        reference
    )

    if match:
        low = float(match.group(1))
        high = float(match.group(2))

        if low >= high:
            return None

        return {
            "type": "range",
            "low": low,
            "high": high
        }

    # Less than: <200
    match = re.fullmatch(
        r"<\s*(-?\d+(?:\.\d+)?)",
        reference
    )

    if match:
        return {
            "type": "less_than",
            "limit": float(match.group(1))
        }

    # Greater than: >40
    match = re.fullmatch(
        r">\s*(-?\d+(?:\.\d+)?)",
        reference
    )

    if match:
        return {
            "type": "greater_than",
            "limit": float(match.group(1))
        }

    return None


def calculate_status(value, reference):

    if value is None:
        return "UNKNOWN"

    parsed = parse_reference(reference)

    if parsed is None:
        return "UNKNOWN"

    if parsed["type"] == "range":

        if value < parsed["low"]:
            return "LOW"

        if value > parsed["high"]:
            return "HIGH"

        return "NORMAL"

    if parsed["type"] == "less_than":

        if value >= parsed["limit"]:
            return "HIGH"

        return "NORMAL"

    if parsed["type"] == "greater_than":

        if value <= parsed["limit"]:
            return "LOW"

        return "NORMAL"

    return "UNKNOWN"


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    tests = [
        (1.17, "0.60-1.25"),
        (1.41, "0.60-1.25"),
        (0.40, "0.60-1.25"),
        (235, "<200"),
        (180, "<200"),
        (32, ">40"),
        (55, ">40"),
        (100, "1.30-0.60"),
    ]

    for value, reference in tests:

        status = calculate_status(
            value,
            reference
        )

        print(
            f"{value} | {reference} -> {status}"
        )