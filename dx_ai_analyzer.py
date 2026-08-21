from ner_extract import extract_result
from validate_extraction import validate_extraction
from calculate_status import calculate_status


def analyze_line(text):

    # 1. AI extraction
    result = extract_result(text)

    # 2. Independent validation
    validation = validate_extraction(result)

    result["validated"] = validation["validated"]
    result["validation_errors"] = validation["errors"]
    result["validation_warnings"] = validation["warnings"]

    # 3. Calculate status only if extraction is valid
    if result["validated"]:

        result["status"] = calculate_status(
            result["value"],
            result["reference"]
        )

    else:

        result["status"] = "UNKNOWN"

    return result


if __name__ == "__main__":

    test_lines = [
        "Creatinine 1.41 mg/dL 0.60-1.25 Enzymatic",
        "Platelet Count 318 X 10³/µL 150-410 Impedance",
        "TOTAL CHOLESTEROL 235 mg/dL <200 Enzymatic",
    ]

    for line in test_lines:

        print("\n" + "=" * 60)
        print("INPUT:")
        print(line)

        result = analyze_line(line)

        print("\nRESULT:")
        print(result)