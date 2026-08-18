import json
import re

from train_ner_context import model, token_features
from validate_extraction import validate_extraction

# ============================================================
# EXTRACTION
# ============================================================

def extract_result(text):

    tokens = text.split()

    predictions = []

    for i, token in enumerate(tokens):

        features = [
            token_features(tokens, i)
        ]

        probabilities = model.predict_proba(features)[0]

        classes = model.classes_

        best_index = probabilities.argmax()

        label = classes[best_index]

        confidence = float(
            probabilities[best_index]
        )

        predictions.append({
            "token": token,
            "label": label,
            "confidence": confidence
        })


    # ========================================================
    # COLLECT FIELDS
    # ========================================================

    fields = {
        "parameter": [],
        "value": [],
        "unit": [],
        "reference": [],
        "method": []
    }

    field_confidence = {
        "parameter": [],
        "value": [],
        "unit": [],
        "reference": [],
        "method": []
    }


    label_map = {
        "PARAMETER": "parameter",
        "VALUE": "value",
        "UNIT": "unit",
        "REFERENCE": "reference",
        "METHOD": "method"
    }


    current_field = None


    for item in predictions:

        token = item["token"]
        label = item["label"]
        confidence = item["confidence"]


        if label == "O":
            continue


        parts = label.split("-", 1)

        if len(parts) != 2:
            continue


        prefix, entity = parts

        field = label_map.get(entity)

        if not field:
            continue


        current_field = field

        fields[field].append(token)

        field_confidence[field].append(
            confidence
        )


    # ========================================================
    # JOIN FIELDS
    # ========================================================

    parameter = " ".join(
        fields["parameter"]
    ).strip(" :;,")


    value_text = " ".join(
        fields["value"]
    ).strip()


    unit = " ".join(
        fields["unit"]
    ).strip()


    reference = " ".join(
        fields["reference"]
    ).strip()


    method = " ".join(
        fields["method"]
    ).strip()


    # ========================================================
    # NUMERIC VALUE
    # ========================================================

    value_match = re.fullmatch(
        r"-?\d+(?:\.\d+)?",
        value_text
    )


    numeric_value = None


    if value_match:

        numeric_value = float(
            value_match.group()
        )


    # ========================================================
    # FIELD CONFIDENCE
    # ========================================================

    def average(values):

        if not values:
            return 0.0

        return sum(values) / len(values)


    confidence = {

        "parameter":
            average(
                field_confidence["parameter"]
            ),

        "value":
            average(
                field_confidence["value"]
            ),

        "unit":
            average(
                field_confidence["unit"]
            ),

        "reference":
            average(
                field_confidence["reference"]
            ),

        "method":
            average(
                field_confidence["method"]
            )
    }


    # ========================================================
    # VALIDATION
    # ========================================================

    validation_errors = []


    if not parameter:

        validation_errors.append(
            "Parameter could not be identified."
        )


    if numeric_value is None:

        validation_errors.append(
            "Result value could not be identified as numeric."
        )


    if not unit:

        validation_errors.append(
            "Unit could not be identified."
        )


    if not reference:

        validation_errors.append(
            "Reference range could not be identified."
        )


    # --------------------------------------------------------
    # Reference validation
    # --------------------------------------------------------

    valid_reference = False


    if re.fullmatch(
        r"-?\d+(?:\.\d+)?\s*-\s*-?\d+(?:\.\d+)?",
        reference
    ):

        valid_reference = True


    elif re.fullmatch(
        r"[<>]\s*-?\d+(?:\.\d+)?",
        reference
    ):

        valid_reference = True


    if reference and not valid_reference:

        validation_errors.append(
            "Reference format could not be interpreted."
        )


    # ========================================================
    # OVERALL CONFIDENCE
    # ========================================================

    important_fields = [
        confidence["parameter"],
        confidence["value"],
        confidence["unit"],
        confidence["reference"]
    ]


    overall_confidence = (
        sum(important_fields)
        / len(important_fields)
    )


    # ========================================================
    # ACCEPT / REJECT
    # ========================================================

    validated = (
        len(validation_errors) == 0
        and confidence["parameter"] >= 0.80
        and confidence["value"] >= 0.80
        and confidence["unit"] >= 0.80
        and confidence["reference"] >= 0.80
    )

    validation = validate_extraction({
        "parameter": parameter,
        "value": numeric_value,
        "unit": unit,
        "reference": reference,
        "method": method
    })
    # ========================================================
    # RESULT
    # ========================================================

    return {

        "parameter": parameter,

        "value": numeric_value,

        "value_text": value_text,

        "unit": unit,

        "reference": reference,

        "method": method,

        "confidence": confidence,

        "overall_confidence": round(
            overall_confidence,
            3
        ),

        "validated": validation["validated"],

        "validation_errors": validation["errors"],

        "validation_warnings": validation["warnings"]
    }


# ============================================================
# TEST
# ============================================================

if __name__ == "__main__":

    test_lines = [

        "CREATININE : 1.17 mg/dL 0.60-1.25 Enzymatic",

        "Platelet Count 318 X 10³/µL 150-410 Impedance",

        "TOTAL CHOLESTEROL 235 mg/dL <200 Enzymatic"

        "Creatinine mg/dL 0.60-1.25 Enzymatic",

        "Creatinine 1.17 0.60-1.25 Enzymatic",

        "Creatinine 1.17 mg/dL Enzymatic",

        "Creatinine 1.17 mg/dL 1.30-0.60 Enzymatic",

    ]


    for line in test_lines:

        print("\n" + "=" * 60)

        print("INPUT:")
        print(line)

        print("\nEXTRACTED:")

        result = extract_result(line)

        print(
            json.dumps(
                result,
                indent=4,
                ensure_ascii=False
            )
        )