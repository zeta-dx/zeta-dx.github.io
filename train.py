import pandas as pd

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.multioutput import MultiOutputRegressor
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression


# Load training data
data = pd.read_csv("data/lab_training.csv")

X = data["text"]

y = data[
    [
        "parameter",
        "value",
        "unit",
        "reference",
        "method"
    ]
]


# Convert text into numerical features
vectorizer = TfidfVectorizer(
    ngram_range=(1, 3),
    lowercase=True
)

X_vectorized = vectorizer.fit_transform(X)


# Train one classifier for each field
models = {}

for column in y.columns:

    model = Pipeline([
        (
            "tfidf",
            TfidfVectorizer(
                ngram_range=(1, 3),
                lowercase=True
            )
        ),
        (
            "classifier",
            LogisticRegression(
                max_iter=2000
            )
        )
    ])

    model.fit(
        X,
        y[column].astype(str)
    )

    models[column] = model


print("Training completed.")

print()
print("Models trained:")

for name in models:
    print(" -", name)