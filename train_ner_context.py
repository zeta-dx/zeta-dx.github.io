import json

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

import re
# ============================================================
# LOAD TRAINING EXAMPLES
# ============================================================
def clean_token(token):

    return token.strip(" :;,")


with open(
    "data/training_examples.json",
    "r",
    encoding="utf-8"
) as f:

    examples = json.load(f)


print("Training examples:", len(examples))


# ============================================================
# FEATURE CREATION
# ============================================================

def token_features(tokens, index):

    token = clean_token(tokens[index])

    previous = (
        clean_token(tokens[index - 1])
        if index > 0
        else "<START>"
    )

    next_token = (
        clean_token(tokens[index + 1])
        if index < len(tokens) - 1
        else "<END>"
    )

    return {
        "token": token.lower(),

        "previous": previous.lower(),

        "next": next_token.lower(),

        "position": index,

        "relative_position":
            index / max(len(tokens) - 1, 1),

        "length":
            len(token),

        "is_number":
            token.replace(".", "", 1).isdigit(),

        "has_decimal":
            "." in token,

        "has_slash":
            "/" in token,

        "has_percent":
            "%" in token,

        "has_dash":
            "-" in token,

        "starts_with_number":
            token[0].isdigit()
            if token else False,

        "ends_with_number":
            token[-1].isdigit()
            if token else False
    }


# ============================================================
# SPLIT COMPLETE REPORT LINES
# ============================================================

train_examples, test_examples = train_test_split(
    examples,
    test_size=0.25,
    random_state=42
)


print("Training rows:", len(train_examples))
print("Testing rows :", len(test_examples))


# ============================================================
# CREATE TRAINING DATA
# ============================================================

X_train = []
y_train = []


for example in train_examples:

    tokens = example["tokens"]
    labels = example["labels"]

    for index in range(len(tokens)):

        X_train.append(
            token_features(
                tokens,
                index
            )
        )

        y_train.append(
            labels[index]
        )


# ============================================================
# CREATE TEST DATA
# ============================================================

X_test = []
y_test = []


for example in test_examples:

    tokens = example["tokens"]
    labels = example["labels"]

    for index in range(len(tokens)):

        X_test.append(
            token_features(
                tokens,
                index
            )
        )

        y_test.append(
            labels[index]
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
            max_iter=3000
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


print()
print("Model trained.")

print(
    f"Unseen-row token accuracy: {accuracy:.2%}"
)


# ============================================================
# TEST A COMPLETELY NEW REPORT LINE
# ============================================================

test_line = (
    "CREATININE : 1.17 mg/dL "
    "0.60-1.25 Enzymatic"
)

tokens = test_line.split()


print()
print("=" * 60)
print("NEW REPORT LINE")
print("=" * 60)

print(test_line)

print()
print("PREDICTIONS:")
print()


for index, token in enumerate(tokens):

    features = [
        token_features(
            tokens,
            index
        )
    ]

    prediction = model.predict(
        features
    )[0]

    print(
        f"{token:15} -> {prediction}"
    )