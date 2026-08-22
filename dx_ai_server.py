import os
import json

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI()


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# ============================================================
# OPENROUTER CLIENT
# ============================================================

api_key = os.environ.get(
    "OPENROUTER_API_KEY"
)


if not api_key:

    print()
    print("========================================")
    print("WARNING: OPENROUTER_API_KEY NOT FOUND")
    print("========================================")
    print()

    client = None

else:

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=api_key
    )


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "status": "running",
        "message": "Zeta Dx AI server is running"
    }


# ============================================================
# DX AI REPORT ANALYSIS
# ============================================================

@app.post("/analyze-report")
async def analyze_report(data: dict):

    print()
    print("========================================")
    print("       DX AI REPORT RECEIVED")
    print("========================================")


    abnormal_results = data.get(
        "abnormal_results",
        []
    )

    patient = data.get(
        "patient",
        {}
    )

    all_results = data.get(
        "all_results",
        []
    )


    print(
        "Abnormal results:",
        len(abnormal_results)
    )


    print(
        "All results:",
        len(all_results)
    )

    print()
    print("PATIENT INFORMATION:")

    print(
        "Age:",
        patient.get("age")
    )

    print(
        "Gender:",
        patient.get("gender")
    )

    print(
        "Weight:",
        patient.get("weight")
    )

    # --------------------------------------------------------
    # ABNORMAL RESULTS
    # --------------------------------------------------------

    print()
    print("ABNORMAL RESULTS:")


    for result in abnormal_results:

        print(
            result.get("parameter"),
            "|",
            result.get("value"),
            result.get("unit"),
            "|",
            result.get("status")
        )


    # --------------------------------------------------------
    # CHECK API
    # --------------------------------------------------------

    if client is None:

        return {
            "error":
                "OpenRouter API key is not configured."
        }


    # ========================================================
    # SYSTEM PROMPT
    # ========================================================

    system_prompt = """

    You are Dx AI, a laboratory-result explanation assistant.

    Your job is to help a general user understand abnormal laboratory
    results in simple, clear and concise language.

    The laboratory results have already been extracted and classified
    by Dx AI. The supplied laboratory reference ranges and result
    statuses must be treated as authoritative for this analysis.

    IMPORTANT RULES:

    1. Never change a reported laboratory value, unit, reference range
    or supplied HIGH, LOW or ABNORMAL status.

    2. Explain each abnormal parameter briefly and in simple language.

    3. For each parameter, explain:
    - what the parameter measures
    - what it generally indicates
    - what the user's reported result means

    4. Use ALL LABORATORY RESULTS to understand relationships between
    related parameters.

    5. When several abnormal results relate to the same physiological
    function, consider them together rather than interpreting each
    result in isolation.

    6. Check the actual status of related parameters before describing
    them as abnormal.

    7. Use the patient's age, sex and weight when they are relevant to
    understanding the laboratory findings.

    8. Do not mention age, sex or weight when they do not add useful
    context.

    9. Do not change or override the laboratory's reference ranges
    based on age, sex or weight.

    10. Do not diagnose a disease.

    11. Do not claim that an abnormal laboratory result proves a disease.

    12. Do not invent symptoms, medical history, medications, treatments
        or diagnoses.

    13. Do not assume information that has not been provided.

    14. Do not unnecessarily alarm the user.

    15. Describe mild abnormalities calmly and proportionately.

    16. Do not treat reference tables, comments, notes or explanatory
        text as patient laboratory results.

    17. Do not repeat duplicate laboratory parameters or duplicate
        findings.

    18. If the available results are insufficient to determine the
        possible meaning of an abnormality, clearly say so.

    19. Do not recommend specific medication or treatment.

    20. The overall summary must NOT list every abnormal parameter.

    21. The overall summary should identify the MAIN physiological
        areas or patterns involved in the abnormal results.

    22. The overall summary should explain those patterns in simple
        language that a general user can understand.

    23. Keep the overall summary to a maximum of 3 short paragraphs
        and approximately 100 words.

    24. Keep "what_is_it" to ONE or TWO short sentences.

    25. Keep "interpretation" to ONE or TWO short sentences.

    26. Avoid textbook-style explanations and unnecessary medical detail.

    27. Do not use medical terminology without briefly explaining it
        when necessary.

    28. Return ONLY valid JSON.

    """


    # ========================================================
    # USER PROMPT
    # ========================================================

    user_prompt = f"""

    Analyze the following laboratory report.

    PATIENT INFORMATION:

    {json.dumps(
        patient,
        indent=2,
        ensure_ascii=False
    )}


    ABNORMAL RESULTS:

    {json.dumps(
        abnormal_results,
        indent=2,
        ensure_ascii=False
    )}


    ALL LABORATORY RESULTS:

    {json.dumps(
        all_results,
        indent=2,
        ensure_ascii=False
    )}


    Provide a concise explanation of the abnormal laboratory findings.

    The overall summary should:

    - Identify the main physiological areas involved.
    - Explain the overall pattern in simple language.
    - Consider related results together.
    - Avoid simply listing every abnormal parameter.
    - Avoid diagnosing any disease.

    For each abnormal parameter provide:

    - parameter
    - status
    - category
    - what_is_it
    - interpretation

    Return ONLY JSON using exactly this structure:

    {
        "overall_summary": "...",

        "findings": [
            {
                "parameter": "...",
                "status": "...",
                "category": "...",
                "what_is_it": "...",
                "interpretation": "..."
            }
        ],

        "disclaimer": "..."
    }

    """


    # ========================================================
    # CALL OPENROUTER
    # ========================================================

    try:

        print()
        print(
            "========== CALLING OPENROUTER =========="
        )


        response = client.chat.completions.create(

            # Temporary free model.
            # We can change this after testing quality.
            model="openrouter/free",
            #model="nvidia/nemotron-3.5-lightning:free",


            messages=[

                {
                    "role": "system",
                    "content": system_prompt
                },

                {
                    "role": "user",
                    "content": user_prompt
                }

            ],

            temperature=0.2

        )


        # ====================================================
        # GET RESPONSE
        # ====================================================

        ai_text = response.choices[0].message.content


        print()
        print(
            "========== OPENROUTER RESPONSE =========="
        )


        print(
            ai_text
        )


        # ====================================================
        # REMOVE MARKDOWN JSON FENCES IF PRESENT
        # ====================================================

        ai_text = ai_text.strip()


        if ai_text.startswith("```json"):

            ai_text = ai_text[
                7:
            ]


        elif ai_text.startswith("```"):

            ai_text = ai_text[
                3:
            ]


        if ai_text.endswith("```"):

            ai_text = ai_text[
                :-3
            ]


        ai_text = ai_text.strip()


        # ====================================================
        # PARSE JSON
        # ====================================================

        try:

            ai_result = json.loads(
                ai_text
            )


        except json.JSONDecodeError:

            print()
            print(
                "ERROR: OpenRouter returned invalid JSON"
            )


            return {

                "error":
                    "OpenRouter returned invalid JSON.",

                "raw_response":
                    ai_text

            }


        # ====================================================
        # RETURN TO JAVASCRIPT
        # ====================================================

        return ai_result


    # ========================================================
    # OPENROUTER ERROR
    # ========================================================

    except Exception as error:

        print()
        print(
            "========== OPENROUTER ERROR =========="
        )


        print(
            str(error)
        )


        return {

            "error":
                "Unable to analyze the laboratory report.",

            "details":
                str(error)

        }

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )
