import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline


# ============================================================
# LOAD DATA
# ============================================================

df = pd.read_csv("data/ner_tokens.csv")

print("Dataset loaded:")
print(df.head())

print("\nTotal tokens:", len(df))


# ============================================================
# CREATE FEATURES
# ============================================================

def token_features(token):

    return {
        "token": token.lower(),

        "is_number":
            token.replace(".", "", 1).isdigit(),

        "has_slash":
            "/" in token,

        "has_percent":
            "%" in token,

        "has_dash":
            "-" in token,

        "length":
            len(token)
    }


X = [
    token_features(token)
    for token in df["token"]
]

y = df["label"]


# ============================================================
# TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.25,
    random_state=42
)


# ============================================================
# MODEL
# ============================================================

model = Pipeline([

    (
        "vectorizer",
        DictVectorizer()
    ),

    (
        "classifier",
        LogisticRegression(
            max_iter=2000
        )
    )

])


# ============================================================
# TRAIN
# ============================================================

model.fit(
    X_train,
    y_train
)


# ============================================================
# EVALUATE
# ============================================================

accuracy = model.score(
    X_test,
    y_test
)

print("\nModel trained.")

print(
    f"Test accuracy: {accuracy:.2%}"
)


# ============================================================
# TEST INDIVIDUAL TOKENS
# ============================================================

test_tokens = [
    "Serum",
    "Creatinine",
    "1.32",
    "mg/dL",
    "0.60",
    "-",
    "1.25",
    "Enzymatic"
]


print("\nPredictions:\n")


for token in test_tokens:

    features = [
        token_features(token)
    ]

    prediction = model.predict(
        features
    )[0]

    print(
        f"{token:15} -> {prediction}"
    )