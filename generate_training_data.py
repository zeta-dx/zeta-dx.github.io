import json
import random


PARAMETERS = [
    {
        "name": "Creatinine",
        "values": ["0.82", "1.08", "1.32", "1.41"],
        "unit": "mg/dL",
        "references": ["0.60 - 1.25", "0.70 - 1.30"],
        "methods": ["Jaffe", "Enzymatic"],
    },
    {
        "name": "Blood Urea",
        "values": ["28", "35", "43", "53"],
        "unit": "mg/dL",
        "references": ["19 - 43", "15 - 45"],
        "methods": ["Enzymatic"],
    },
    {
        "name": "Glucose",
        "values": ["72", "86", "96", "118"],
        "unit": "mg/dL",
        "references": ["70 - 100", "70 - 110"],
        "methods": ["Hexokinase", "GOD-POD"],
    },
    {
        "name": "Hemoglobin",
        "values": ["11.2", "12.8", "14.1", "15.2"],
        "unit": "g/dL",
        "references": ["12.0 - 15.0", "13.0 - 17.0"],
        "methods": ["Photometry"],
    },
    {
        "name": "Platelet Count",
        "values": ["85", "175", "275", "410"],
        "unit": "X 10³/µL",
        "references": ["150 - 410", "150 - 450"],
        "methods": ["Impedance"],
    },
    {
        "name": "WBC",
        "values": ["3.2", "7.09", "9.5", "12.4"],
        "unit": "X 10³/µL",
        "references": ["4.0 - 10.0", "4.0 - 11.0"],
        "methods": ["Flow Cytometry"],
    },
    {
        "name": "TSH",
        "values": ["0.25", "1.8", "2.85", "4.8"],
        "unit": "µIU/mL",
        "references": ["0.4 - 4.5", "0.5 - 5.0"],
        "methods": ["ECLIA"],
    },
    {
        "name": "Vitamin D",
        "values": ["18.2", "28.4", "42.5", "76.1"],
        "unit": "ng/mL",
        "references": ["30 - 100"],
        "methods": ["ECLIA"],
    },
    {
        "name": "Vitamin B12",
        "values": ["145", "312", "520", "890"],
        "unit": "pg/mL",
        "references": ["200 - 900"],
        "methods": ["ECLIA"],
    },
    {
        "name": "Total Cholesterol",
        "values": ["145", "185", "220", "265"],
        "unit": "mg/dL",
        "references": ["<200"],
        "methods": ["Enzymatic"],
    },
    {
        "name": "HDL Cholesterol",
        "values": ["32", "48", "56", "72"],
        "unit": "mg/dL",
        "references": [">40"],
        "methods": ["Enzymatic"],
    },
    {
        "name": "Triglycerides",
        "values": ["95", "128", "168", "245"],
        "unit": "mg/dL",
        "references": ["<150"],
        "methods": ["Enzymatic"],
    },
    {
        "name": "ALT",
        "values": ["18", "32", "48", "85"],
        "unit": "U/L",
        "references": ["7 - 56"],
        "methods": ["IFCC"],
    },
    {
        "name": "AST",
        "values": ["20", "31", "48", "76"],
        "unit": "U/L",
        "references": ["10 - 40"],
        "methods": ["IFCC"],
    },
    {
        "name": "Albumin",
        "values": ["3.2", "3.8", "4.2", "4.8"],
        "unit": "g/dL",
        "references": ["3.5 - 5.0"],
        "methods": ["BCG"],
    },
]


def add_tokens(tokens, labels, text, entity):
    """
    Add a field to the example while generating
    the correct BIO labels at the same time.
    """

    parts = text.split()

    for index, token in enumerate(parts):

        tokens.append(token)

        if index == 0:
            labels.append(f"B-{entity}")
        else:
            labels.append(f"I-{entity}")


def add_reference(tokens, labels, reference):
    """
    Add reference range.

    Handles:

        0.70 - 1.30
        0.70-1.30
        <200
        >40
    """

    if reference.startswith("<") or reference.startswith(">"):

        tokens.append(reference)
        labels.append("B-REFERENCE")

        return

    parts = reference.replace("-", " - ").split()

    for index, token in enumerate(parts):

        tokens.append(token)

        if index == 0:
            labels.append("B-REFERENCE")
        else:
            labels.append("I-REFERENCE")


def create_example(parameter):

    name = parameter["name"]
    value = random.choice(parameter["values"])
    unit = parameter["unit"]
    reference = random.choice(parameter["references"])
    method = random.choice(parameter["methods"])

    tokens = []
    labels = []

    # --------------------------------------------------------
    # Parameter variations
    # --------------------------------------------------------

    parameter_text = name

    variation = random.randint(1, 5)

    if variation == 2:
        parameter_text = "Serum " + name

    elif variation == 3:
        parameter_text = name.upper()

    elif variation == 4:
        parameter_text = "Serum " + name
        parameter_text = parameter_text.upper()

    # --------------------------------------------------------
    # Parameter
    # --------------------------------------------------------

    add_tokens(
        tokens,
        labels,
        parameter_text,
        "PARAMETER"
    )

    # --------------------------------------------------------
    # Value
    # --------------------------------------------------------

    add_tokens(
        tokens,
        labels,
        value,
        "VALUE"
    )

    # --------------------------------------------------------
    # Unit
    # --------------------------------------------------------

    add_tokens(
        tokens,
        labels,
        unit,
        "UNIT"
    )

    # --------------------------------------------------------
    # Reference
    # --------------------------------------------------------

    add_reference(
        tokens,
        labels,
        reference
    )

    # --------------------------------------------------------
    # Method
    # --------------------------------------------------------

    # Some laboratory reports don't show method.
    include_method = random.random() > 0.15

    if include_method:

        add_tokens(
            tokens,
            labels,
            method,
            "METHOD"
        )

    # --------------------------------------------------------
    # Formatting
    # --------------------------------------------------------

    text = " ".join(tokens)

    formatting = random.randint(1, 5)

    if formatting == 2:
        text = text.replace(
            parameter_text,
            parameter_text + ":"
        )

        tokens[0] = tokens[0] + ":"

    elif formatting == 3:
        text = text.replace(
            " - ",
            "-"
        )

        # Rebuild tokens for compact reference
        new_tokens = []
        new_labels = []

        for token, label in zip(tokens, labels):

            if (
                label == "I-REFERENCE"
                and token != "-"
            ):
                continue

            new_tokens.append(token)
            new_labels.append(label)

        # Reconstruct reference correctly
        new_tokens = []
        new_labels = []

        ref_started = False
        ref_values = []

        for token, label in zip(tokens, labels):

            if label in (
                "B-REFERENCE",
                "I-REFERENCE"
            ):

                ref_values.append(token)

            else:

                if ref_values:

                    compact_reference = "".join(ref_values)

                    new_tokens.append(compact_reference)
                    new_labels.append("B-REFERENCE")

                    ref_values = []

                new_tokens.append(token)
                new_labels.append(label)

        if ref_values:

            new_tokens.append("".join(ref_values))
            new_labels.append("B-REFERENCE")

        tokens = new_tokens
        labels = new_labels

        text = " ".join(tokens)

    elif formatting == 4:
        text = "  ".join(tokens)

    elif formatting == 5:
        text = " ".join(tokens).replace(
            " ",
            " ",
            1
        )

    return {
        "text": text,
        "tokens": tokens,
        "labels": labels
    }


# ============================================================
# GENERATE DATASET
# ============================================================

TARGET = 150

examples = []

seen = set()

while len(examples) < TARGET:

    parameter = random.choice(PARAMETERS)

    example = create_example(parameter)

    key = example["text"].lower()

    if key in seen:
        continue

    seen.add(key)

    examples.append(example)


# ============================================================
# SAVE
# ============================================================

with open(
    "data/training_examples.json",
    "w",
    encoding="utf-8"
) as file:

    json.dump(
        examples,
        file,
        indent=2,
        ensure_ascii=False
    )


print(
    f"Generated {len(examples)} training examples."
)