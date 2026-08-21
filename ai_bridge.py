from dx_ai_analyzer import analyze_line


def analyze_unknown_lines(lines):

    results = []

    for line in lines:

        line = line.strip()

        if not line:
            continue

        try:

            result = analyze_line(line)

            result["original_text"] = line

            results.append(result)

        except Exception as e:

            results.append({
                "original_text": line,
                "validated": False,
                "status": "UNKNOWN",
                "error": str(e)
            })

    return results


if __name__ == "__main__":

    unknown_lines = [

        "Serum Creatinine 1.41 mg/dL 0.60 - 1.25 Enzymatic",

        "Platelet Count 318 X 10³/µL 150 - 410 Impedance",

        "TSH 2.85 µIU/mL 0.4 - 4.5 ECLIA",

        "Vitamin B12 312 pg/mL 200 - 900 ECLIA"

    ]


    results = analyze_unknown_lines(
        unknown_lines
    )


    for result in results:

        print("\n" + "=" * 60)

        print(
            result["original_text"]
        )

        print(result)