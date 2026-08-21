/*
 * ============================================================
 * Zeta Dx - Dx AI Report Data Engine
 * ============================================================
 *
 * First-stage engine:
 *
 * 1. Loads structured laboratory report JSON
 * 2. Checks results against the reference range supplied
 *    by the laboratory
 * 3. Determines NORMAL / LOW / HIGH / ABNORMAL
 * 4. Separates reported and calculated values
 * 5. Displays converted values
 *
 * This version does NOT perform medical diagnosis or
 * AI interpretation yet.
 *
 * ============================================================
 */


/* ============================================================
   DETERMINE RESULT STATUS
   ============================================================ */

/* ============================================================
   DETERMINE RESULT STATUS
   ============================================================ */

function getResultStatus(result) {

    if (!result) {
        return "UNKNOWN";
    }


    const value =
        Number(result.value);

    const reference =
        result.reference;


    /* ---------------------------------------------------------
       Invalid / missing result value
       --------------------------------------------------------- */

    if (!Number.isFinite(value)) {
        return "UNKNOWN";
    }


    /* ---------------------------------------------------------
       NO USABLE REFERENCE
       
       Examples:
       
       reference = null

       reference = {
           type: "none",
           text: "Calculated"
       }

       reference = {
           type: "text",
           text: "Not available"
       }

       These are valid laboratory results, but there is
       nothing numerical to compare against.

       Therefore display them as NORMAL.
       --------------------------------------------------------- */

    if (
        !reference ||
        typeof reference !== "object" ||
        !reference.type ||
        reference.type === "none" ||
        reference.type === "text"
    ) {
        return "NORMAL";
    }


    /* ---------------------------------------------------------
       NUMERIC / QUALITATIVE REFERENCE
       --------------------------------------------------------- */

    switch (reference.type) {


        /* -----------------------------------------------------
           NORMAL RANGE

           Example:

           0.60 - 1.25
           ----------------------------------------------------- */

        case "range":

            if (
                typeof reference.low === "number" &&
                value < reference.low
            ) {
                return "LOW";
            }


            if (
                typeof reference.high === "number" &&
                value > reference.high
            ) {
                return "HIGH";
            }


            return "NORMAL";


        /* -----------------------------------------------------
           LESS THAN

           Example:

           <200
           ----------------------------------------------------- */

        case "less_than":

            if (
                typeof reference.high === "number" &&
                value >= reference.high
            ) {
                return "HIGH";
            }


            return "NORMAL";


        /* -----------------------------------------------------
           LESS THAN OR EQUAL

           Example:

           <=200
           ----------------------------------------------------- */

        case "less_than_equal":

            if (
                typeof reference.high === "number" &&
                value > reference.high
            ) {
                return "HIGH";
            }


            return "NORMAL";


        /* -----------------------------------------------------
           GREATER THAN

           Example:

           >40
           ----------------------------------------------------- */

        case "greater_than":

            if (
                typeof reference.low === "number" &&
                value <= reference.low
            ) {
                return "LOW";
            }


            return "NORMAL";


        /* -----------------------------------------------------
           GREATER THAN OR EQUAL

           Example:

           >=40
           ----------------------------------------------------- */

        case "greater_than_equal":

            if (
                typeof reference.low === "number" &&
                value < reference.low
            ) {
                return "LOW";
            }


            return "NORMAL";


        /* -----------------------------------------------------
           QUALITATIVE
           
           Example:

           Negative
           Positive
           ----------------------------------------------------- */

        case "qualitative":

            if (
                String(result.value).trim().toLowerCase() ===
                String(reference.expected).trim().toLowerCase()
            ) {
                return "NORMAL";
            }


            return "ABNORMAL";


        /* -----------------------------------------------------
           ANY OTHER REFERENCE TYPE
           
           The result has a valid numeric value, but the
           reference cannot be interpreted.
           
           Do not mark it UNKNOWN.
           ----------------------------------------------------- */

        default:

            return "NORMAL";
    }
}

/* ============================================================
   CSS CLASS FOR RESULT STATUS
   ============================================================ */

function statusClass(status) {

    switch (status) {

        case "NORMAL":
            return "status-normal";

        case "LOW":
            return "status-low";

        case "HIGH":
            return "status-high";

        case "ABNORMAL":
            return "status-abnormal";

        default:
            return "status-unknown";
    }
}



/* ============================================================
   FORMAT NUMBERS
   ============================================================ */

function formatValue(value) {

    if (typeof value !== "number") {
        return value ?? "—";
    }

    if (Number.isInteger(value)) {
        return value.toString();
    }

    return value
        .toFixed(3)
        .replace(/\.?0+$/, "");
}



/* ============================================================
   ESCAPE HTML
   Prevents extracted report text from being interpreted
   as HTML.
   ============================================================ */

function escapeHTML(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}



/* ============================================================
   CREATE REPORTED RESULTS TABLE
   ============================================================ */

function createReportedResultsTable(results) {

    if (!results || results.length === 0) {

        return `
            <p class="empty-results">
                No laboratory results were found.
            </p>
        `;
    }


    const rows = results.map(result => {

        /*
         * IMPORTANT:
         *
         * We calculate the status ourselves using the
         * reference range from the report.
         *
         * We do NOT rely on an AI-generated HIGH/LOW flag.
         */

        const status = getResultStatus(result);


        let referenceText = "Not provided";

        if (
            result.reference &&
            typeof result.reference === "object" &&
            (
                result.reference.type === "range" ||
                result.reference.type === "less_than" ||
                result.reference.type === "greater_than"
            )
        ) {
            referenceText =
                result.reference.text || "Not provided";
        }


        const conversions =
            result.conversions || [];


        const conversionText =
            conversions.length

                ? conversions
                    .map(
                        item =>
                            `${formatValue(item.value)} ${item.unit}`
                    )
                    .join("<br>")

                : "—";


        return `

            <tr>

                <td>
                    ${escapeHTML(result.parameter)}
                </td>


                <td>
                    ${escapeHTML(
                        formatValue(result.value)
                    )}
                </td>


                <td>
                    ${escapeHTML(result.unit || "")}
                </td>


                <td>
                    ${escapeHTML(referenceText)}
                </td>


                <td>

                    <span
                        class="result-status ${statusClass(status)}">

                        ${status}

                    </span>

                </td>


                <td>
                    ${conversionText}
                </td>

            </tr>

        `;

    }).join("");


    return `

        <div class="results-table-wrapper">

            <table class="results-table">

                <thead>

                    <tr>

                        <th>
                            Parameter
                        </th>

                        <th>
                            Result
                        </th>

                        <th>
                            Unit
                        </th>

                        <th>
                            Report Reference
                        </th>

                        <th>
                            Status
                        </th>

                        <th>
                            Converted Values
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${rows}

                </tbody>

            </table>

        </div>

    `;
}



/* ============================================================
   CREATE CALCULATED RESULTS TABLE
   ============================================================ */

function createCalculatedResultsTable(results) {

    if (!results || results.length === 0) {

        return `
            <p class="empty-results">
                No calculated results available.
            </p>
        `;
    }


    const rows = results.map(result => {


        let value;


        if (
            result.value === null ||
            result.value === undefined
        ) {

            value = "Pending";

        } else {

            value =
                `${formatValue(result.value)}
                 ${result.unit || ""}`;
        }


        const method =
            result.calculation?.method || "—";


        return `

            <tr>

                <td>
                    ${escapeHTML(result.parameter)}
                </td>


                <td>
                    ${escapeHTML(value)}
                </td>


                <td>
                    ${escapeHTML(method)}
                </td>


                <td>

                    <span class="calculated-badge">

                        Calculated by Zeta Dx

                    </span>

                </td>

            </tr>

        `;

    }).join("");


    return `

        <div class="results-table-wrapper">

            <table class="results-table">

                <thead>

                    <tr>

                        <th>
                            Parameter
                        </th>

                        <th>
                            Value
                        </th>

                        <th>
                            Method
                        </th>

                        <th>
                            Source
                        </th>

                    </tr>

                </thead>


                <tbody>

                    ${rows}

                </tbody>

            </table>

        </div>

    `;
}



/* ============================================================
   CREATE SUMMARY
   ============================================================ */

function createReportSummary(reportData) {

    const results =
        reportData.results || [];
    const aiCandidates =
        dxGetAICandidates(results);

    console.log(
        "Total UNKNOWN:",
        results.filter(
            r => getResultStatus(r) === "UNKNOWN"
        ).length
    );

    console.log(
        "AI candidates:",
        aiCandidates.length
    );

    console.log(
        "AI candidates:",
        aiCandidates
    );

    let normal = 0;

    let abnormal = 0;

    let unknown = 0;


    results.forEach(result => {

        const status =
            getResultStatus(result);


        if (status === "NORMAL") {

            normal++;

        } else if (
            status === "LOW" ||
            status === "HIGH" ||
            status === "ABNORMAL"
        ) {

            abnormal++;

        } else {

            unknown++;

        }

    });


    return `

        <div class="analysis-summary">


            <div class="summary-card">

                <strong>
                    ${results.length}
                </strong>

                <span>
                    Parameters
                </span>

            </div>


            <div class="summary-card summary-normal">

                <strong>
                    ${normal}
                </strong>

                <span>
                    Within Range
                </span>

            </div>


            <div class="summary-card summary-abnormal">

                <strong>
                    ${abnormal}
                </strong>

                <span>
                    Outside Range
                </span>

            </div>


            <div class="summary-card">

                <strong>
                    ${unknown}
                </strong>

                <span>
                    Needs Review
                </span>

            </div>


        </div>

    `;
}


async function loadDxAIReport(
    reportData,
    containerId
) {

    const container =
        document.getElementById(containerId);

    if (!container) {

        console.error(
            `Dx AI container "${containerId}" not found.`
        );

        return;
    }


    /*
     * IMPORTANT:
     *
     * Run AI fallback BEFORE generating the table.
     *
     * This ensures UNKNOWN results have a chance
     * to become NORMAL / LOW / HIGH.
     */

    await processUnknownResults(reportData);


    const results =
        reportData.results || [];


    console.log(
        "========== DX AI FINAL =========="
    );

    console.log(
        "Total results:",
        results.length
    );

    console.log(
        "Remaining UNKNOWN:",
        results.filter(
            r => getResultStatus(r) === "UNKNOWN"
        ).length
    );


    container.innerHTML = `

        <section class="dx-results-section">

            <h2>
                Report Analysis
            </h2>

            <p class="report-source">

                Laboratory:

                <strong>

                    ${escapeHTML(
                        reportData.report
                            ?.laboratory_name ||
                        "Not available"
                    )}

                </strong>

            </p>


            ${createReportSummary(reportData)}


            <h3>
                Reported Laboratory Results
            </h3>


            ${createReportedResultsTable(results)}


            <h3>
                Calculated / Derived Results
            </h3>


            ${createCalculatedResultsTable(
                reportData.calculated_results || []
            )}


            <p class="calculation-note">

                Values marked as calculated or converted
                are generated by Zeta Dx and were not
                necessarily reported directly by the
                laboratory.

            </p>

        </section>

    `;
}

/* ============================================================
   LOAD DEMO JSON
   ============================================================

   This is temporary.

   Later this will be replaced by the actual laboratory
   report extraction system.
   ============================================================ */

async function loadDemoReport() {

    try {


        const response =
            await fetch(
                "dx-ai-demo-report.json"
            );


        if (!response.ok) {

            throw new Error(
                `Unable to load demo report:
                 ${response.status}`
            );
        }


        const report =
            await response.json();

       
        loadDxAIReport(
            report,
            "dxAiResults"
        );


    } catch (error) {


        console.error(
            "Dx AI demo report error:",
            error
        );


    }

}

function dxGetAICandidates(results) {

    const candidates = [];

    for (const result of results) {

        if (getResultStatus(result) !== "UNKNOWN") {
            continue;
        }


        /* Ignore narrative/report text */

        if (dxLooksLikeNarrativeText(result)) {

            console.log(
                "NARRATIVE IGNORED:",
                result.parameter,
                result.original_text || result.original
            );

            continue;
        }


        if (dxLooksLikeLabCandidate(result)) {

            candidates.push(result);
        }
    }

    return candidates;
}

/* ============================================================
   AI FALLBACK PLACEHOLDER
   ============================================================ */

async function analyzeUnknownWithAI(result) {

    /*
     * The Python AI model cannot run directly in the browser.
     *
     * This function will later send the original laboratory
     * line to our Python AI backend.
     */

    try {

        const response = await fetch(
            "http://127.0.0.1:8000/analyze",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    text: result.original_text
                })
            }
        );


        if (!response.ok) {

            throw new Error(
                `AI server returned ${response.status}`
            );
        }


        const aiResult =
            await response.json();


        return aiResult;


    } catch (error) {

        console.error(
            "Dx AI fallback error:",
            error
        );

        return null;
    }
}

/* ============================================================
   PROCESS UNKNOWN RESULTS WITH AI
   ============================================================ */

async function processUnknownResults(reportData) {

    const results =
        reportData.results || [];


    /* ========================================================
       STEP 1
       Try to recover a numeric reference directly from the
       original laboratory row.

       We do NOT use unit matching here.
       ======================================================== */

    for (const result of results) {

        const referenceMissing =
            !result.reference ||
            typeof result.reference !== "object" ||
            !result.reference.type;


        if (
            referenceMissing &&
            result.original_text
        ) {

            const extractedReference =
                dxExtractReferenceFromText(
                    result.original_text
                );


            if (extractedReference) {

                result.reference =
                    extractedReference;


                console.log(
                    "REFERENCE RECOVERED:",
                    result.parameter,
                    "→",
                    extractedReference
                );
            }
        }
    }


    /* ========================================================
       STEP 2
       NOW determine which results are still UNKNOWN.
       ======================================================== */

    const aiCandidates =
        dxGetAICandidates(results);


    console.log(
        "Total UNKNOWN:",
        results.filter(
            r => getResultStatus(r) === "UNKNOWN"
        ).length
    );


    console.log(
        "AI candidates:",
        aiCandidates.length
    );

    /*
     * IMPORTANT: send only genuine laboratory candidates to AI.
     * Do not send every UNKNOWN row because UNKNOWN also includes
     * headings, notes and explanatory report text.
     */
    if (aiCandidates.length === 0) {

        return reportData;
    }


    console.log(
        `Dx AI: ${aiCandidates.length} laboratory candidates found.`
    );


    for (const result of aiCandidates) {

        if (!result.original_text) {

            console.warn(
                "Unknown result has no original text:",
                result
            );

            continue;
        }


        const aiResult =
            await analyzeUnknownWithAI(result);


        if (!aiResult) {

            continue;
        }


        /*
         * Only accept AI results that passed
         * backend validation.
         */

        if (!aiResult.validated) {

            console.warn(
                "AI result rejected:",
                aiResult
            );

            continue;
        }


        /*
         * Replace only the missing fields.
         *
         * We do NOT overwrite a value that the
         * original parser already extracted.
         */

        if (!result.parameter) {

            result.parameter =
                aiResult.parameter;
        }


        if (
            result.value === null ||
            result.value === undefined
        ) {

            result.value =
                aiResult.value;
        }


        if (!result.unit) {

            result.unit =
                aiResult.unit;
        }


        if (!result.reference) {

            result.reference =
                parseAIReference(
                    aiResult.reference
                );
        }


        if (!result.method) {

            result.method =
                aiResult.method;
        }


        result.ai_extracted = true;

        result.ai_confidence =
            aiResult.overall_confidence;


        result.ai_validation =
            aiResult;

        /* Recalculate status after AI supplied missing fields. */
        result.status = getResultStatus(result);
    }


    return reportData;
}

function parseAIReference(referenceText) {

    if (!referenceText) {
        return null;
    }

    const text =
        String(referenceText)
            .trim();


    /* Normal range */

    let match =
        text.match(
            /^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/
        );

    if (match) {

        const low =
            Number(match[1]);

        const high =
            Number(match[2]);

        if (low < high) {

            return {

                type: "range",

                low: low,

                high: high,

                text: text
            };
        }

        return null;
    }


    /* Less than */

    match =
        text.match(
            /^<\s*(-?\d+(?:\.\d+)?)$/
        );

    if (match) {

        return {

            type: "less_than",

            high:
                Number(match[1]),

            text:
                text
        };
    }


    /* Greater than */

    match =
        text.match(
            /^>\s*(-?\d+(?:\.\d+)?)$/
        );

    if (match) {

        return {

            type: "greater_than",

            low:
                Number(match[1]),

            text:
                text
        };
    }


    return null;
}

function dxExtractReferenceFromText(text) {

    if (!text) {
        return null;
    }


    const raw =
        String(text)
            .replace(/\s+/g, " ")
            .trim();


    /* ========================================================
       NORMAL RANGE

       Examples:

       19 - 43
       0.60 - 1.25
       6 .0 - 8.0
       7-5 - 12.0
       ======================================================== */

    let match =
        raw.match(
            /(-?\d+(?:\s*\.\s*\d+)?)\s*[-–—]\s*(-?\d+(?:\s*\.\s*\d+)?)/
        );


    if (match) {

        const low =
            Number(
                match[1]
                    .replace(/\s/g, "")
            );


        const high =
            Number(
                match[2]
                    .replace(/\s/g, "")
            );


        if (
            Number.isFinite(low) &&
            Number.isFinite(high) &&
            low < high
        ) {

            return {

                type: "range",

                low: low,

                high: high,

                text:
                    `${low} - ${high}`
            };
        }
    }


    /* ========================================================
       LESS THAN

       Example:

       <200
       ======================================================== */

    match =
        raw.match(
            /<\s*(-?\d+(?:\s*\.\s*\d+)?)/
        );


    if (match) {

        const high =
            Number(
                match[1]
                    .replace(/\s/g, "")
            );


        if (Number.isFinite(high)) {

            return {

                type: "less_than",

                high: high,

                text:
                    `<${high}`
            };
        }
    }


    /* ========================================================
       GREATER THAN

       Example:

       >40
       ======================================================== */

    match =
        raw.match(
            />\s*(-?\d+(?:\s*\.\s*\d+)?)/
        );


    if (match) {

        const low =
            Number(
                match[1]
                    .replace(/\s/g, "")
            );


        if (Number.isFinite(low)) {

            return {

                type: "greater_than",

                low: low,

                text:
                    `>${low}`
            };
        }
    }


    return null;
}