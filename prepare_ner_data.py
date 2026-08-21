import pandas as pd


# ============================================================
# TRAINING EXAMPLES
# ============================================================

data = [

    (
        "Serum Creatinine 1.32 mg/dL 0.60 - 1.25 Enzymatic",
        [
            "B-PARAMETER",
            "I-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    ),

    (
        "Platelet Count 275 X 10³/µL 150 - 410 Impedance",
        [
            "B-PARAMETER",
            "I-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "I-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    ),

    (
        "Hemoglobin 12.8 g/dL 12.0 - 15.0 Photometry",
        [
            "B-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    ),

    (
        "WBC 7.09 X 10³/µL 4.0 - 10.0 Flow Cytometry",
        [
            "B-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "I-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD",
            "I-METHOD"
        ]
    ),

    (
        "TSH 2.85 µIU/mL 0.4 - 4.5 ECLIA",
        [
            "B-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    ),

    (
        "Vitamin D 28.4 ng/mL 30 - 100 ECLIA",
        [
            "B-PARAMETER",
            "I-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    ),

    (
        "Blood Urea 53 mg/dL 19 - 43 Enzymatic",
        [
            "B-PARAMETER",
            "I-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    ),

    (
        "Glucose 96 mg/dL 70 - 100 Hexokinase",
        [
            "B-PARAMETER",
            "B-VALUE",
            "B-UNIT",
            "B-REF_LOW",
            "B-REF_SEPARATOR",
            "B-REF_HIGH",
            "B-METHOD"
        ]
    )
]


# ============================================================
# CREATE TOKEN DATASET
# ============================================================

rows = []


for text, labels in data:

    tokens = text.split()

    if len(tokens) != len(labels):

        print("\nERROR:")
        print(text)

        print("\nTokens:")
        for i, token in enumerate(tokens):
            print(i, token)

        print("\nLabels:")
        for i, label in enumerate(labels):
            print(i, label)

        continue


    for token, label in zip(tokens, labels):

        rows.append({
            "token": token,
            "label": label
        })


# ============================================================
# SAVE DATASET
# ============================================================

df = pd.DataFrame(rows)

df.to_csv(
    "data/ner_tokens.csv",
    index=False
)


print("\nNER dataset created successfully.\n")

print(df.to_string(index=False))


# ============================================================
# SHOW LABEL COUNTS
# ============================================================

print("\n\nLABEL COUNTS:\n")

print(
    df["label"].value_counts()
)