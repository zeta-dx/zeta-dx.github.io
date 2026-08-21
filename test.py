import pandas as pd

from train import models


test_lines = [
    "Serum Creatinine 1.32 mg/dL 0.60 - 1.25 Enzymatic",
    "Platelet Count 275 X 10³/µL 150 - 410 Impedance",
    "TSH 2.85 µIU/mL 0.4 - 4.5 ECLIA"
]


for line in test_lines:

    print("\nINPUT:")
    print(line)

    print("\nPREDICTION:")

    for field, model in models.items():

        prediction = model.predict([line])[0]

        print(
            f"{field}: {prediction}"
        )