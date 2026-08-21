import re


# ============================================================
# KNOWN LABORATORY UNITS
# ============================================================

KNOWN_UNITS = {
    "mg/dL",
    "g/dL",
    "g/L",
    "mg/L",
    "mmol/L",
    "µmol/L",
    "µIU/mL",
    "mIU/L",
    "IU/L",
    "U/L",
    "ng/mL",
    "pg/mL",
    "mEq/L",
    "X 10³/µL",
    "10³/µL",
}


# ============================================================
# PARSE REFERENCE
# ============================================================

def parse_reference(reference):

    reference = reference.strip()

    # 0.60 - 1.25
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


    # <200
    match = re.fullmatch(
        r"<\s*(-?\d+(?:\.\d+)?)",
        reference
    )

    if match:

        return {
            "type": "less_than",
            "high": float(match.group(1))
        }


    # >40
    match = re.fullmatch(
        r">\s*(-?\d+(?:\.\d+)?)",
        reference
    )

    if match:

        return {
            "type": "greater_than",
            "low": float(match.group(1))
        }


    return None


# ============================================================
# VALIDATE VALUE
# ============================================================

def validate_value(value):

    if value is None:
        return False, "Missing numerical value."

    if not isinstance(value, (int, float)):
        return False, "Value is not numeric."

    if value != value:
        return False, "Value is NaN."

    return True, None


# ============================================================
# VALIDATE UNIT
# ============================================================

def validate_unit(unit):

    if not unit:
        return False, "Missing unit."

    if unit in KNOWN_UNITS:
        return True, None

    # Don't automatically reject an unknown unit.
    # Real reports may contain legitimate units not yet
    # included in our list.

    return True, None


# ============================================================
# VALIDATE REFERENCE
# ============================================================

def validate_reference(reference):

    if not reference:

        return False, "Missing reference interval."

    parsed = parse_reference(reference)

    if parsed is None:

        return False, (
            "Reference interval could not be interpreted."
        )

    return True, None


# ============================================================
# VALIDATE COMPLETE EXTRACTION
# ============================================================

def validate_extraction(result):

    errors = []
    warnings = []


    # --------------------------------------------------------
    # Parameter
    # --------------------------------------------------------

    parameter = result.get("parameter", "").strip()

    if not parameter:

        errors.append(
            "Parameter is missing."
        )


    # --------------------------------------------------------
    # Value
    # --------------------------------------------------------

    value_ok, value_error = validate_value(
        result.get("value")
    )

    if not value_ok:
        errors.append(value_error)


    # --------------------------------------------------------
    # Unit
    # --------------------------------------------------------

    unit_ok, unit_error = validate_unit(
        result.get("unit", "")
    )

    if not unit_ok:
        errors.append(unit_error)


    # --------------------------------------------------------
    # Reference
    # --------------------------------------------------------

    reference = result.get(
        "reference",
        ""
    )

    reference_ok, reference_error = (
        validate_reference(reference)
    )

    if not reference_ok:
        errors.append(reference_error)


    # --------------------------------------------------------
    # Reference/value mathematical check
    # --------------------------------------------------------

    if value_ok and reference_ok:

        parsed = parse_reference(reference)

        if parsed["type"] == "range":

            # We do NOT call this abnormal here.
            # We only verify that the range itself is valid.

            if parsed["low"] >= parsed["high"]:

                errors.append(
                    "Reference low value is not below high value."
                )


        elif parsed["type"] == "less_than":

            if parsed["high"] < 0:

                warnings.append(
                    "Reference limit is negative."
                )


        elif parsed["type"] == "greater_than":

            if parsed["low"] < 0:

                warnings.append(
                    "Reference limit is negative."
                )


    # --------------------------------------------------------
    # Method
    # --------------------------------------------------------

    if not result.get("method"):

        warnings.append(
            "Laboratory method was not identified."
        )


    # --------------------------------------------------------
    # FINAL STATUS
    # --------------------------------------------------------

    validated = len(errors) == 0


    return {

        "validated": validated,

        "errors": errors,

        "warnings": warnings
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    test_result = {

        "parameter": "CREATININE",

        "value": 1.17,

        "unit": "mg/dL",

        "reference": "0.60-1.25",

        "method": "Enzymatic"
    }


    result = validate_extraction(
        test_result
    )


    print(result)