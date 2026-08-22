/* ============================================================
   ZETA DX - Dx AI Laboratory Report Extractor
   ============================================================

   Stage 2 - Coordinate-based PDF extraction

   Scope:
   - Extract laboratory results from selectable-text PDFs
   - Use PDF X/Y coordinates to reconstruct table columns
   - Preserve laboratory reference intervals
   - Detect LOW / HIGH / NORMAL
   - Preserve UNKNOWN when status cannot be determined
   - Identify laboratory-calculated results
   - Ignore radiology / imaging / ECG
   - Preserve page number internally
   - Page number is NOT displayed in results

   OCR for scanned PDFs/images will be added later.
   ============================================================ */


/* ============================================================
   LABORATORY SECTION NAMES
   ============================================================ */



const DX_LAB_SECTIONS = [

    ["Urinalysis",
        /urinalysis|urine\s+r\/m|urine\s+analysis/i
    ],

    ["CBC",
        /\bcbc\b|complete\s+blood\s+count/i
    ],

    ["Glucose",
        /fasting\s+(blood\s+)?glucose|fasting\s+blood\s+sugar/i
    ],

    ["Lipid Profile",
        /lipid\s+profile/i
    ],

    ["Liver Function",
        /liver\s+function\s+test|\blft\b/i
    ],

    ["Kidney Function",
        /kidney\s+function\s+test|\bkft\b/i
    ],

    ["Vitamin B12",
        /vitamin\s*b[-\s]?12/i
    ],

    ["Vitamin D",
        /vitamin\s*d\b|25[-\s]?oh\s+vitamin\s+d/i
    ],

    ["Iron Profile",
        /iron\s+profile/i
    ],

    ["HbA1c",
        /hb\s*a1c|hba1c/i
    ],

    ["Thyroid Profile",
        /thyroid\s+profile|free\s+thyroid/i
    ],

    ["ESR",
        /^\s*esr\b/i
    ]
];


/* ============================================================
   SECTIONS WE IGNORE
   ============================================================ */

const DX_IGNORED_SECTIONS = [

    /x[-\s]?ray/i,
    /radiograph/i,
    /ultrasound/i,
    /sonography/i,
    /\becg\b/i,
    /electrocardiogram/i,
    /\bmri\b/i,
    /\bct\s+scan/i,
    /computed\s+tomography/i,
    /imaging/i,
    /radiology/i
];


/* ============================================================
   TEXT NORMALIZATION
   ============================================================ */

function dxNormalizeText(text) {

    if (!text) {
        return [];
    }

    return String(text)

        .replace(/\u00a0/g, " ")

        .replace(/\r/g, "")

        .split("\n")

        .map(line =>
            line
                .replace(/[ \t]+/g, " ")
                .trim()
        )

        .filter(Boolean);
}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function dxEscapeHTML(value) {

    return String(value ?? "")

        .replace(/&/g, "&amp;")

        .replace(/</g, "&lt;")

        .replace(/>/g, "&gt;")

        .replace(/"/g, "&quot;")

        .replace(/'/g, "&#039;");
}


/* ============================================================
   FIND LAB SECTION
   ============================================================ */

function dxFindLabSection(line) {

    if (!line) {
        return null;
    }

    for (const [name, pattern] of DX_LAB_SECTIONS) {

        if (pattern.test(line)) {
            return name;
        }
    }

    return null;
}


/* ============================================================
   CHECK IGNORED SECTION
   ============================================================ */

function dxIsIgnoredSection(line) {

    if (!line) {
        return false;
    }

    return DX_IGNORED_SECTIONS.some(
        pattern => pattern.test(line)
    );
}


/* ============================================================
   NORMALIZE UNITS
   ============================================================ */

function dxNormalizeUnit(unit) {

    if (!unit) {
        return "";
    }

    return String(unit)

        .replace(/mg\/dl/gi, "mg/dL")

        .replace(/g\/dl/gi, "g/dL")

        .replace(/mg\/l/gi, "mg/L")

        .replace(/g\/l/gi, "g/L")

        .replace(/mmol\/l/gi, "mmol/L")

        .replace(/mol\/l/gi, "mol/L")

        .replace(/meq\/l/gi, "mEq/L")

        .replace(/iu\/l/gi, "IU/L")

        .replace(/miu\/l/gi, "mIU/L")

        .replace(/ng\/ml/gi, "ng/mL")

        .replace(/pg\/ml/gi, "pg/mL")

        .replace(/ng\/dl/gi, "ng/dL")

        .replace(/µl/gi, "µL")

        .replace(/ul/gi, "µL")

        .replace(/\/hr/gi, "/h")

        .replace(/mm\/hr/gi, "mm/h")

        .trim();
}


/* ============================================================
   PARSE NUMBER
   ============================================================ */

function dxNumber(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return null;
    }

    const match = String(value)

        .replace(/,/g, "")

        .match(/-?\d+(?:\.\d+)?/);


    if (!match) {
        return null;
    }


    const number =
        Number(match[0]);


    return Number.isFinite(number)
        ? number
        : null;
}


/* ============================================================
   CHECK NUMERIC VALUE
   ============================================================ */

function dxIsNumeric(value) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return false;
    }

    return /^-?\d+(?:\.\d+)?$/.test(
        String(value).trim()
    );
}


/* ============================================================
   PARSE REFERENCE RANGE
   ============================================================ */

/* ============================================================
   PARSE REFERENCE RANGE
   ============================================================ */

/* ============================================================
   PARSE REFERENCE RANGE
   ============================================================ */

function dxParseReference(text) {

    if (
        text === null ||
        text === undefined
    ) {
        return null;
    }


    let raw =
        String(text)
            .replace(/\s+/g, " ")
            .trim();


    if (!raw) {
        return null;
    }


    /* ========================================================
       NORMALIZE DECIMAL SPACING

       Examples:

       6 .0 - 8.0
       0 .60 - 1 .25

       becomes:

       6.0 - 8.0
       0.60 - 1.25
       ======================================================== */

    raw =
        raw.replace(
            /(\d)\s*\.\s*(\d)/g,
            "$1.$2"
        );


    /* ========================================================
       SPECIAL OCR CASE

       Example:

       7-5 - 12.0

       becomes:

       7.5 - 12.0
       ======================================================== */

    raw =
        raw.replace(
            /^(\d+)-(\d+)\s*[-–—]\s*(\d+(?:\.\d+)?)/,
            "$1.$2 - $3"
        );


    /* ========================================================
       LESS THAN OR EQUAL

       Examples:

       <=200
       <= 200
       ======================================================== */

    let match =
        raw.match(
            /^<=\s*(-?\d+(?:\.\d+)?)/ 
        );


    if (match) {

        return {

            type: "less_than_equal",

            high:
                Number(match[1]),

            text:
                `<=${match[1]}`
        };
    }


    /* ========================================================
       LESS THAN

       Examples:

       <200
       < 200
       ======================================================== */

    match =
        raw.match(
            /^<\s*(-?\d+(?:\.\d+)?)/ 
        );


    if (match) {

        return {

            type: "less_than",

            high:
                Number(match[1]),

            text:
                `<${match[1]}`
        };
    }


    /* ========================================================
       GREATER THAN OR EQUAL

       Examples:

       >=40
       >= 40
       ======================================================== */

    match =
        raw.match(
            /^>=\s*(-?\d+(?:\.\d+)?)/ 
        );


    if (match) {

        return {

            type: "greater_than_equal",

            low:
                Number(match[1]),

            text:
                `>=${match[1]}`
        };
    }


    /* ========================================================
       GREATER THAN

       Examples:

       >40
       > 40
       ======================================================== */

    match =
        raw.match(
            /^>\s*(-?\d+(?:\.\d+)?)/ 
        );


    if (match) {

        return {

            type: "greater_than",

            low:
                Number(match[1]),

            text:
                `>${match[1]}`
        };
    }


    /* ========================================================
       NORMAL NUMERIC RANGE

       IMPORTANT:

       We intentionally DO NOT require the entire string
       to be the reference.

       Therefore these all work:

       19 - 43 Urease, Colorimetric
       3.5 - 8.5 Uricase, Colorimetric
       150 - 410 x 10³/μL
       98 - 107 ISE Direct
       261 - 462 Chromazurol B
       pg/mL 2.77 - 5.27
       ng/dL 0.78 - 2.19
       ======================================================== */

    raw = raw.replace(
        /(\d)-(\d)\s*-\s*(\d+(?:\.\d+)?)/g,
        "$1.$2 - $3"
    );

    raw = raw.replace(
        /\bCalculated\b.*$/i,
        ""
    ).trim();

    match =
        raw.match(
            /(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)/ 
        );


    if (match) {

        const low =
            Number(match[1]);


        const high =
            Number(match[2]);


        if (
            Number.isFinite(low) &&
            Number.isFinite(high) &&
            low < high
        ) {

            return {

                type: "range",

                low:
                    low,

                high:
                    high,

                text:
                    `${low} - ${high}`
            };
        }
    }


    /* ========================================================
       QUALITATIVE REFERENCE

       Examples:

       Negative
       Positive
       Nil
       Normal
       Absent
       Present
       ======================================================== */

    if (
        /^(negative|positive|nil|normal|absent|present|clear)$/i
            .test(raw)
    ) {

        return {

            type: "qualitative",

            expected:
                raw.toLowerCase(),

            text:
                raw
        };
    }


    /* ========================================================
       NO REFERENCE / METHOD TEXT

       These are NOT reference ranges.

       Examples:

       Calculated
       Calculated By CKD-EPI(2021)
       Enzymatic
       Colorimetric
       Impedance
       ISE Direct
       ======================================================== */

    /*if (
        /^(calculated|calculated\s+by\b|enzymatic|colorimetric|impedance|eclia|clia|ise\s+direct|ise\b|ifcc|jaffe|urease|uricase|bcg|chromazurol\s+b|pyridylazo\s+dye)/i
            .test(raw)
    ) {

        return {

            type: "none",

            text:
                raw
        };
    }*/


    /* ========================================================
       OTHER NON-NUMERIC TEXT

       Preserve it, but mark it as text.

       This allows us to distinguish:

       NO REFERENCE
       from
       INVALID / UNKNOWN REFERENCE
       ======================================================== */

    return {

        type: "text",

        text:
            raw
    };
}


function dxExtractReferenceFromText(text) {

    if (!text) {
        return null;
    }

    let raw =
        String(text)
            .replace(/\s+/g, " ")
            .trim();

    if (!raw) {
        return null;
    }


    /* ========================================================
       STEP 1
       REMOVE METHOD / CALCULATION TEXT
       ======================================================== */

    raw = raw.replace(
        /(Enzymatic|Impedance|Photometry|ECLIA|CLIA|IFCC|Jaffe|Urease|Uricase|ISE\s+Direct|Calculated|BCG|Bromothymol\s+Blue|Chromazurol\s+B|Pyridylazo\s+Dye|Colorimetric|Arsenazo\s+III|Phosphomolybdate\s+Reduction|CKD-EPI\s*\(\s*2021\s*\)).*$/i,
        ""
    ).trim();


    /* ========================================================
       STEP 2
       IF NOTHING REMAINS → NO REFERENCE
       ======================================================== */

    if (!raw) {
        return null;
    }


    /* ========================================================
       STEP 3
       NORMAL RANGE

       Examples:

       0.60 - 1.25
       19 - 43
       137-145
       6 .0 - 8.0
       7-5 - 12.0
       ======================================================== */

    let match =
        raw.match(
            /(-?\d+(?:\s*\.\s*\d+)?)\s*[-–—]\s*(-?\d+(?:\s*\.\s*\d+)?)/
        );


    if (match) {

        let lowText =
            match[1].replace(/\s/g, "");

        let highText =
            match[2].replace(/\s/g, "");


        /*
         * OCR correction:
         *
         * 7-5 - 12.0
         * becomes
         * 7.5 - 12.0
         *
         * This is handled only when the first number
         * looks like an OCR decimal.
         */

        if (
            /^\d-\d$/.test(lowText)
        ) {

            lowText =
                lowText.replace(
                    /^(\d)-(\d)$/,
                    "$1.$2"
                );
        }


        const low =
            Number(lowText);

        const high =
            Number(highText);


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
       STEP 4
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
       STEP 5
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


    /* ========================================================
       STEP 6
       DO NOT STORE LONG / TEXTUAL REFERENCES

       Examples:

       Calculated
       Calculated By CKD-EPI(2021)
       fasting.
       are associated with increased risk...
       explanatory laboratory notes
       ======================================================== */

    return null;
}

/* ============================================================
   DETERMINE STATUS
   ============================================================ */

/* ============================================================
   DETERMINE STATUS
   ============================================================ */

/* ============================================================
   DETERMINE STATUS
   ============================================================ */

function dxGetStatus(value, reference) {

    /*
     * --------------------------------------------------------
     * 1. QUALITATIVE RESULTS
     *
     * Examples:
     * Negative
     * Positive
     * Nil
     * Normal
     * Clear
     * Absent
     * Present
     * --------------------------------------------------------
     */

    const qualitativeValues = [
        "negative",
        "positive",
        "nil",
        "normal",
        "clear",
        "absent",
        "present",
        "calculated",
        "calculated by ckd-epi(2021)"       
    ];


    if (
        typeof value === "string" &&
        qualitativeValues.includes(
            value.trim().toLowerCase()
        )
    ) {

        /*
         * If there is no reference, we still consider
         * the successfully extracted qualitative result
         * as NORMAL for display.
         */

        if (
            !reference ||
            typeof reference !== "object" ||
            !reference.type
        ) {
            return "NORMAL";
        }


        /*
         * Qualitative reference exists.
         *
         * If the expected value is available,
         * compare it.
         */

        if (
            reference.type === "qualitative" &&
            reference.expected
        ) {

            return (
                value.trim().toLowerCase() ===
                String(
                    reference.expected
                ).trim().toLowerCase()
            )
                ? "NORMAL"
                : "ABNORMAL";
        }


        /*
         * Qualitative result with a non-qualitative
         * reference should not become UNKNOWN merely
         * because there is no numeric comparison.
         */

        return "NORMAL";
    }
    else {

        if (reference.type === "none") {

            /*console.log(
                "in else:",
                value,
                reference
            );*/

            if (
                reference.text &&
                reference.text
                    .toLowerCase()
                    .includes("calculated")
            ) {
                return "NO REFERENCE";
            }
        }
    }
       
    


    /*
     * --------------------------------------------------------
     * 2. NUMERIC RESULT CHECK
     * --------------------------------------------------------
     */

    const numericValue =
        Number(value);


    if (
        value === null ||
        value === undefined ||
        value === "" ||
        !Number.isFinite(numericValue)
    ) {
        return "UNKNOWN";
    }


    /*
     * --------------------------------------------------------
     * 3. NO REFERENCE
     *
     * Numeric result was successfully extracted,
     * but laboratory did not provide a reference.
     *
     * Display as NORMAL.
     * --------------------------------------------------------
     */

    if (
        !reference ||
        typeof reference !== "object" ||
        !reference.type
    ) {
        return "NORMAL";
    }


    /*
     * --------------------------------------------------------
     * 4. REFERENCE TYPE
     * --------------------------------------------------------
     */

    switch (reference.type) {


        /* ----------------------------------------------------
           NORMAL RANGE

           Example:
           19 - 43
           ---------------------------------------------------- */

        case "range":

            if (
                typeof reference.low !== "number" ||
                typeof reference.high !== "number"
            ) {
                return "UNKNOWN";
            }


            if (
                numericValue <
                reference.low
            ) {
                return "LOW";
            }


            if (
                numericValue >
                reference.high
            ) {
                return "HIGH";
            }


            return "NORMAL";


        /* ----------------------------------------------------
           LESS THAN

           Example:
           <200

           200 itself is HIGH.
           ---------------------------------------------------- */

        case "less_than":

            if (
                typeof reference.high !== "number"
            ) {
                return "UNKNOWN";
            }


            if (
                numericValue >=
                reference.high
            ) {
                return "HIGH";
            }


            return "NORMAL";


        /* ----------------------------------------------------
           LESS THAN OR EQUAL

           Example:
           <=200
           ---------------------------------------------------- */

        case "less_than_equal":

            if (
                typeof reference.high !== "number"
            ) {
                return "UNKNOWN";
            }


            if (
                numericValue >
                reference.high
            ) {
                return "HIGH";
            }


            return "NORMAL";


        /* ----------------------------------------------------
           GREATER THAN

           Example:
           >40

           40 itself is LOW.
           ---------------------------------------------------- */

        case "greater_than":

            if (
                typeof reference.low !== "number"
            ) {
                return "UNKNOWN";
            }


            if (
                numericValue <=
                reference.low
            ) {
                return "LOW";
            }


            return "NORMAL";


        /* ----------------------------------------------------
           GREATER THAN OR EQUAL

           Example:
           >=40
           ---------------------------------------------------- */

        case "greater_than_equal":

            if (
                typeof reference.low !== "number"
            ) {
                return "UNKNOWN";
            }


            if (
                numericValue <
                reference.low
            ) {
                return "LOW";
            }


            return "NORMAL";


        /* ----------------------------------------------------
           QUALITATIVE REFERENCE
           ---------------------------------------------------- */

        case "qualitative":

            if (
                reference.expected ===
                undefined ||
                reference.expected ===
                null
            ) {
                return "NORMAL";
            }


            return (
                String(value)
                    .trim()
                    .toLowerCase() ===
                String(reference.expected)
                    .trim()
                    .toLowerCase()
            )
                ? "NORMAL"
                : "ABNORMAL";


        /* ----------------------------------------------------
           UNKNOWN REFERENCE TYPE
           ---------------------------------------------------- */

        default:

            /*
             * We have a valid numeric result but the
             * reference type is something we don't yet
             * understand.
             *
             * Do not blindly call it abnormal.
             */

            return "UNKNOWN";
    }
}

/* ============================================================
   DETERMINE SOURCE
   ============================================================ */

function dxGetSource(method) {

    if (!method) {
        return "reported";
    }


    return /calculated|formula/i.test(method)

        ? "lab_calculated"

        : "reported";
}


/* ============================================================
   CLEAN TABLE TEXT
   ============================================================ */

function dxCleanTableText(text) {

    if (!text) {
        return "";
    }

    return String(text)

        .replace(/\u00a0/g, " ")

        .replace(/\s+/g, " ")

        .trim();
}


/* ============================================================
   BUILD TEXT FROM PDF ITEMS
   ============================================================ */

function dxJoinItems(items) {

    if (
        !items ||
        items.length === 0
    ) {
        return "";
    }


    return items

        .sort(
            (a, b) => a.x - b.x
        )

        .map(item => item.text)

        .join(" ")

        .replace(/\s+/g, " ")

        .trim();
}


/* ============================================================
   FIND TABLE HEADER
   ============================================================ */

function dxFindTableHeader(page) {

    if (
        !page ||
        !page.rows
    ) {
        return null;
    }


    for (const row of page.rows) {

        const text =
            dxJoinItems(row.items)
                .toLowerCase();


        const hasResult =
            /\bresult\b|\bobservation\b/.test(text);


        const hasUnit =
            /\bunit\b/.test(text);


        const hasReference =
            /\bref\b|\breference\b|\bbiological\b/.test(text);


        if (
            hasResult &&
            hasUnit &&
            hasReference
        ) {

            return row;
        }
    }


    return null;
}


/* ============================================================
   DETERMINE TABLE COLUMN POSITIONS
   ============================================================ */

function dxFindColumnPositions(page) {

    const header =
        dxFindTableHeader(page);


    /*
     * Default values for reports where a header
     * cannot be detected.
     */

    let parameterX = 30;

    let resultX = 135;

    let unitX = 245;

    let referenceX = 300;

    let methodX = 420;


    if (header) {

        for (const item of header.items) {

            const text =
                item.text
                    .toLowerCase()
                    .replace(/[.:]/g, "");


            if (
                text === "observation" ||
                text === "parameter" ||
                text === "test"
            ) {

                parameterX =
                    item.x;
            }


            if (
                text === "result"
            ) {

                resultX =
                    item.x;
            }


            if (
                text === "unit"
            ) {

                unitX =
                    item.x;
            }


            if (
                text === "ref" ||
                text === "reference" ||
                text === "biological"
            ) {

                /*
                 * "Biological Ref." can be split into
                 * two text items. Use the first one.
                 */

                if (
                    referenceX === 300 ||
                    item.x < referenceX
                ) {

                    referenceX =
                        item.x;
                }
            }


            if (
                text === "method"
            ) {

                methodX =
                    item.x;
            }
        }
    }


    /*
     * Make sure columns are ordered.
     */

    const values = [

        parameterX,
        resultX,
        unitX,
        referenceX,
        methodX

    ];


    /*
     * If the detected positions are clearly invalid,
     * use safe defaults.
     */

    if (
        resultX <= parameterX ||
        unitX <= resultX ||
        referenceX <= unitX
    ) {

        parameterX = 30;
        resultX = 135;
        unitX = 245;
        referenceX = 300;
        methodX = 420;
    }


    return {

        parameterX,
        resultX,
        unitX,
        referenceX,
        methodX
    };
}


/* ============================================================
   ASSIGN PDF ITEM TO COLUMN
   ============================================================ */

function dxColumnForX(x, columns) {

    /*
     * The next column begins at the next header X position.
     */

    if (
        x >= columns.methodX
    ) {

        return "method";
    }


    if (
        x >= columns.referenceX
    ) {

        return "reference";
    }


    if (
        x >= columns.unitX
    ) {

        return "unit";
    }


    if (
        x >= columns.resultX
    ) {

        return "result";
    }


    return "parameter";
}


/* ============================================================
   BUILD STRUCTURED TABLE ROWS
   ============================================================ */

function dxBuildTableRows(page) {

    if (
        !page ||
        !page.rows
    ) {
        return [];
    }


    const columns =
        dxFindColumnPositions(page);


    const output = [];


    for (const row of page.rows) {

        const grouped = {

            parameter: [],
            result: [],
            unit: [],
            reference: [],
            method: []
        };


        for (const item of row.items) {

            const column =
                dxColumnForX(
                    item.x,
                    columns
                );


            grouped[column].push(item);
        }


        const structured = {

            y: row.y,

            parameter:
                dxJoinItems(
                    grouped.parameter
                ),

            result:
                dxJoinItems(
                    grouped.result
                ),

            unit:
                dxJoinItems(
                    grouped.unit
                ),

            reference:
                dxJoinItems(
                    grouped.reference
                ),

            method:
                dxJoinItems(
                    grouped.method
                )
        };


        const fullText =
            [
                structured.parameter,
                structured.result,
                structured.unit,
                structured.reference,
                structured.method
            ]
                .filter(Boolean)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim();

        const originalText =
        row.items
            .slice()
            .sort((a, b) => a.x - b.x)
            .map(item => item.text)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();

        structured.text =
            fullText;

        structured.original_text =
            originalText;

        output.push(structured);
    }


    return output;
}


/* ============================================================
   CHECK IF ROW IS A TABLE HEADER
   ============================================================ */

function dxIsTableHeader(row) {

    if (!row) {
        return false;
    }


    const text =
        dxCleanTableText(
            row.text
        ).toLowerCase();


    return (

        (
            text.includes("result") ||
            text.includes("observation")
        )

        &&

        text.includes("unit")

        &&

        (
            text.includes("ref") ||
            text.includes("reference") ||
            text.includes("biological")
        )
    );
}


/* ============================================================
   CHECK IF ROW IS PAGE INFORMATION
   ============================================================ */

function dxIsPageInformation(text) {

    if (!text) {
        return false;
    }


    return (

        /^page\s+\d+\s+of\s+\d+/i.test(text)

        ||

        /^page\s+\d+\s*$/i.test(text)

        ||

        /^\d+\s+of\s+\d+$/i.test(text)
    );
}


/* ============================================================
   CHECK IF ROW IS REPORT METADATA
   ============================================================ */

function dxIsMetadata(text) {

    if (!text) {
        return false;
    }


    return (

        /^patient\s+name\s*:/i.test(text)

        ||

        /^age\s*\/\s*sex\s*:/i.test(text)

        ||

        /^referred\s+by\s*:/i.test(text)

        ||

        /^patient\s+id\s*:/i.test(text)

        ||

        /^centre\s*:/i.test(text)

        ||

        /^registration\s+on\s*:/i.test(text)

        ||

        /^accession\s+no\s*:/i.test(text)

        ||

        /^collected\s+on\s*:/i.test(text)

        ||

        /^received\s+on\s*:/i.test(text)

        ||

        /^approved\s+on\s*:/i.test(text)

        ||

        /^sample\s+type\s*:/i.test(text)

        ||

        /^method\s*:/i.test(text)

        ||

        /^technology\s*:/i.test(text)

        ||

        /^analyzer\s*:/i.test(text)

        ||

        /^remarks?\s*:/i.test(text)

        ||

        /^note\s*:/i.test(text)

        ||

        /^advise\s*:/i.test(text)
    );
}


function dxParseStructuredResult(row) {

    if (!row) {
        return null;
    }


    /*
     * ----------------------------------------------------------
     * GET ORIGINAL TEXT
     * ----------------------------------------------------------
     */

    const originalText =
        String(
            row.original_text ||
            row.original ||
            row.text ||
            ""
        )
        .replace(/\s+/g, " ")
        .trim();


    if (!originalText) {
        return null;
    }


    /*
     * ----------------------------------------------------------
     * IGNORE OBVIOUS NON-LABORATORY TEXT
     * ----------------------------------------------------------
     */

    const ignoredPatterns = [

        /^reports?\s+of\b/i,

        /^above\s+\d/i,

        /^below\s+\d/i,

        /^are\s+associated\s+with\b/i,

        /^associated\s+with\b/i,

        /^this\s+is\s+a\s+sample\s+report\b/i,

        /^sample\s+report\b/i,

        /^scan\s+to\s+validate\b/i,

        /^clinical\s+significance\b/i,

        /^clinical\s+notes?\b/i,

        /^interpretation\b/i,

        /^note\s+for\b/i,

        /^microscopy\b/i,

        /^in\s+case\s+of\b/i
    ];


    if (
        ignoredPatterns.some(
            pattern =>
                pattern.test(originalText)
        )
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * CLEAN TEXT
     * ----------------------------------------------------------
     */

    let text =
        originalText
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();


    /*
     * ----------------------------------------------------------
     * SPECIAL CASE:
     * ESTIMATED GFR
     *
     * Original:
     *
     * Estimated GFR 57.10 mL/min/1.73m2
     * Calculated By CKD-EPI(2021)
     *
     * Correct:
     *
     * parameter = Estimated GFR
     * value     = 57.10
     * unit      = mL/min/1.73m2
     * ----------------------------------------------------------
     */

    const egfrMatch =
        text.match(
            /^estimated\s+gfr\s+(-?\d+(?:\.\d+)?)\s*(mL\/min\/1\.73\s*m2|mL\/min\/1\.73m2)/i
        );


    if (egfrMatch) {

        const egfrValue =
            Number(egfrMatch[1]);


        if (Number.isFinite(egfrValue)) {

            return {

                parameter:
                    "Estimated GFR",

                value:
                    egfrValue,

                unit:
                    "mL/min/1.73m2",

                reference: {
                    type: "none",
                    text:
                        text
                            .substring(
                                egfrMatch[0].length
                            )
                            .trim()
                            .replace(
                                /^Calculated\s+By\s*/i,
                                "Calculated By "
                            ) ||
                        "Calculated"
                },

                method:
                    "Calculated By CKD-EPI(2021)",

                original:
                    originalText,

                original_text:
                    originalText
            };
        }
    }


    /*
     * ----------------------------------------------------------
     * EXTRACT PARAMETER
     *
     * We first try to identify the numeric result.
     * Everything before that is the parameter.
     * ----------------------------------------------------------
     */


    let valueMatch =
        text.match(
            /(^|[\s])(-?\d+(?:\.\d+)?)(?=\s|$)/
        );


    if (!valueMatch) {

        /*
         * No numeric result.
         * This is probably a heading or explanatory text.
         */

        return null;
    }


    /*
     * Position of the numeric value
     */

    const valueIndex =
        valueMatch.index +
        valueMatch[0].lastIndexOf(
            valueMatch[2]
        );


    const valueText =
        valueMatch[2];


    const value =
        Number(valueText);


    if (!Number.isFinite(value)) {
        return null;
    }


    /*
     * ----------------------------------------------------------
     * PARAMETER
     * ----------------------------------------------------------
     */

    let parameter =
        text
            .substring(
                0,
                valueIndex
            )
            .trim();


    /*
     * Remove accidental separators
     */

    parameter =
        parameter
            .replace(/^[|:;,]+/, "")
            .replace(/\s+/g, " ")
            .trim();


    /*
     * ----------------------------------------------------------
     * SPECIAL CASE:
     *
     * If parameter ends with < or >, it is usually a clinical
     * decision-limit description and NOT part of the parameter.
     *
     * Example:
     *
     * Total Cholesterol <200
     *
     * should become:
     *
     * Total Cholesterol
     *
     * with a reference of <200
     * ----------------------------------------------------------
     */

    let parameterLimit = null;


    const parameterLimitMatch =
        parameter.match(
            /^(.*?)(?:\s*)(<=|>=|<|>)(\d+(?:\.\d+)?)$/
        );


    if (parameterLimitMatch) {

        parameter =
            parameterLimitMatch[1]
                .trim();

        parameterLimit =
            parameterLimitMatch[2] +
            parameterLimitMatch[3];
    }


    /*
     * ----------------------------------------------------------
     * TEXT AFTER RESULT
     * ----------------------------------------------------------
     */

    let remainingText =
        text
            .substring(
                valueIndex +
                valueText.length
            )
            .trim();


    /*
     * ----------------------------------------------------------
     * UNIT
     * ----------------------------------------------------------
     *
     * We only recognize known laboratory units.
     *
     * IMPORTANT:
     *
     * Unit extraction is completely independent from reference
     * extraction.
     * ----------------------------------------------------------
     */

    let unit = "";


    const unitPatterns = [

        /^X\s*10[³3]\s*\/\s*[µμu]\s*L\b/i,

        /^10\^?3\s*\/\s*[µμu]\s*L\b/i,

        /^mL\/min\/1\.73\s*m2\b/i,

        /^mL\/min\/1\.73m2\b/i,

        /^mg\/dL\b/i,

        /^mg\/L\b/i,

        /^g\/dL\b/i,

        /^g\/L\b/i,

        /^mmol\/L\b/i,

        /^mIU\/L\b/i,

        /^mlU\/L\b/i,

        /^µIU\/mL\b/i,

        /^μIU\/mL\b/i,

        /^IU\/L\b/i,

        /^U\/L\b/i,

        /^pg\/mL\b/i,

        /^ng\/mL\b/i,

        /^ng\/dL\b/i,

        /^[µμu]g\/dL\b/i,

        /^fL\b/i,

        /^pH\b/i,

        /^Ratio\b/i,

        /^%\b/i,

        /^days?\b/i,

        /^years?\b/i,

        /^Calculated?\b/i,
    ];


    for (const pattern of unitPatterns) {

        const match =
            remainingText.match(pattern);


        if (match) {

            unit =
                match[0].trim();

            remainingText =
                remainingText
                    .substring(
                        match[0].length
                    )
                    .trim();

            break;
        }
    }


    /*
     * ----------------------------------------------------------
     * SPECIAL UNIT NORMALIZATION
     * ----------------------------------------------------------
     */

    if (
        /^X\s*10[³3]/i.test(unit)
    ) {

        unit =
            "X 10³ / µL";
    }


    if (
        /^mL\/min\/1\.73/i.test(unit)
    ) {

        unit =
            "mL/min/1.73m2";
    }


    /*
     * ----------------------------------------------------------
     * REFERENCE
     *
     * IMPORTANT:
     *
     * Reference is extracted from remaining text.
     *
     * We DO NOT try to match the unit.
     * ----------------------------------------------------------
     */

    let reference =
        null;


    /*
     * First use parameter clinical limit.
     *
     * Example:
     *
     * Total Cholesterol <200
     */

    if (parameterLimit) {

        reference =
            parseAIReference(
                parameterLimit
            );
    }


    /*
     * Otherwise extract numerical range from remaining text.
     */

    if (!reference) {

        reference =
            dxExtractReferenceFromText(
                remainingText
            );
    }


    /*
     * ----------------------------------------------------------
     * IF REFERENCE WAS NOT NUMERIC
     * ----------------------------------------------------------
     */

    if (!reference) {

        /*
         * Check whether the remaining text contains a known
         * calculation/method description.
         */

       const methodMatch =
        remainingText.match(
            /\b(Calculated|Enzymatic|Impedance|Photometry|ECLIA|CLIA|IFCC|Jaffe|Urease|Uricase|ISE\s+Direct|Calculated|BCG|Chromazurol\s+B|Pyridylazo\s+Dye|Colorimetric|Bromothymol\s+Blue|Arsenazo\s+III|Phosphomolybdate\s+Reduction)\b/i
        );


        /*
         * JavaScript does not support /x.
         *
         * Therefore repeat with a normal regex.
         */

        const methodMatchClean =
            remainingText.match(
                /\b(Calculated|Enzymatic|Impedance|Photometry|ECLIA|CLIA|IFCC|Jaffe|Urease|Uricase|ISE\s+Direct|Calculated|BCG|Chromazurol\s+B|Pyridylazo\s+Dye|Colorimetric|Bromothymol\s+Blue|Arsenazo\s+III|Phosphomolybdate\s+Reduction)\b/i
            );


        if (
            methodMatchClean
        ) {

            /*
             * No reference.
             */

            reference = {

                type:
                    "none",

                text:
                    remainingText
                        .trim()
            };
        }

        else {

            /*
             * No usable reference.
             */

            reference = {

                type:
                    "none",

                text:
                    remainingText
                        .trim() ||
                    "Not available"
            };
        }
    }


    /*
     * ----------------------------------------------------------
     * METHOD
     * ----------------------------------------------------------
     */

    let method = "";


    const methodMatch =
        remainingText.match(
            /\b(Calculated|Enzymatic|Impedance|Photometry|ECLIA|CLIA|IFCC|Jaffe|Urease|Uricase|ISE\s+Direct|Calculated|BCG|Chromazurol\s+B|Pyridylazo\s+Dye|Colorimetric|Bromothymol\s+Blue|Arsenazo\s+III|Phosphomolybdate\s+Reduction)\b/i
        );


    if (methodMatch) {

        method =
            methodMatch[1].trim();
    }


    /*
     * ----------------------------------------------------------
     * CALCULATED RESULTS WITHOUT REFERENCE
     * ----------------------------------------------------------
     *
     * These are legitimate laboratory results.
     *
     * Example:
     *
     * BUN/Creatinine Ratio 17.57 Ratio Calculated
     *
     * They should NOT be UNKNOWN.
     * ----------------------------------------------------------
     */

    /*if (
        !reference ||
        !reference.type
    ) {

        reference = {

            type:
                "none",

            text:
                method ||
                "Not available"
        };
    }*/


    /*
     * ----------------------------------------------------------
     * FINAL PARAMETER CLEANUP
     * ----------------------------------------------------------
     */

    parameter =
        parameter
            .replace(/\s+/g, " ")
            .trim();


    /*
     * Remove accidental trailing punctuation
     */

    parameter =
        parameter
            .replace(/[,:;]+$/, "")
            .trim();


    /*
     * ----------------------------------------------------------
     * FINAL SAFETY CHECK
     * ----------------------------------------------------------
     */

    if (!parameter) {
        return null;
    }


    /*
     * Reject obvious explanatory sentences that happened to
     * contain a number.
     */

    const invalidParameterPatterns = [

        /^reports?\s+of\b/i,

        /^above\b/i,

        /^below\b/i,

        /^hence\b/i,

        /^therefore\b/i,

        /^this\s+is\b/i,

        /^in\s+case\b/i,

        /^note\b/i
    ];


    if (
        invalidParameterPatterns.some(
            pattern =>
                pattern.test(parameter)
        )
    ) {

        return null;
    }


    /*
     * ----------------------------------------------------------
     * RETURN STRUCTURED RESULT
     * ----------------------------------------------------------
     */

    return {

        parameter:
            parameter,

        value:
            value,

        unit:
            unit,

        reference:
            reference,

        method:
            method,

        original:
            originalText,

        original_text:
            originalText
    };
}

/* ============================================================
   FALLBACK TEXT RESULT PARSER
   ============================================================

   Used only when coordinate columns cannot produce
   a structured result.
   ============================================================ */

function dxParseResultLine(
    line,
    section,
    page
) {

    if (!line) {
        return null;
    }


    line =
        dxCleanTableText(line);


    if (
        dxIsPageInformation(line) ||
        dxIsMetadata(line) ||
        dxIsIgnoredSection(line)
    ) {

        return null;
    }


    /*
     * Numeric result with unit and reference.
     */

    const match =
        line.match(

            /^(.+?)\s+(-?\d+(?:\.\d+)?)\s+([A-Za-zµμ%\/²³0-9._-]+)\s+(.+)$/

        );


    if (!match) {
        return null;
    }


    const parameter =
        match[1].trim();


    const resultText =
        match[2].trim();


    const unit =
        dxNormalizeUnit(
            match[3]
        );


    const referenceText =
        match[4].trim();


    const value =
        dxNumber(
            resultText
        );


    const reference =
        dxParseReference(
            referenceText
        );


    if (
        parameter.length < 2 ||
        parameter.length > 150
    ) {

        return null;
    }


    return {

        parameter,

        value,

        unit,

        reference,

        status:
            dxGetStatus(
                value,
                reference
            ),

        source:
            dxGetSource(""),

        method: "",

        section,

        page,

        original_text:
            line,

        extraction: {

            method:
                "pdf_text_fallback",

            confidence:
                0.70

        },

        conversions: []

    };
}


/* ============================================================
   EXTRACT PATIENT INFORMATION
   ============================================================ */

function dxExtractPatient() {

    const patient = {

        name: "",

        age: null,

        sex: "",

        weight: null

    };


    const ageInput =
        document.getElementById("age");

    const sexInput =
        document.getElementById("sex");

    const weightInput =
        document.getElementById("weight");


    /* =====================================================
       AGE
       ===================================================== */

    if (
        ageInput &&
        ageInput.value !== ""
    ) {

        patient.age =
            Number(
                ageInput.value
            );

    }


    /* =====================================================
       SEX
       ===================================================== */

    if (
        sexInput &&
        sexInput.value !== ""
    ) {

        patient.sex =
            sexInput.value;

    }


    /* =====================================================
       WEIGHT
       ===================================================== */

    if (
        weightInput &&
        weightInput.value !== ""
    ) {

        patient.weight =
            Number(
                weightInput.value
            );

    }


    return patient;

}

function dxLooksLikeLabCandidate(row) {

    if (!row) {
        return false;
    }

    const text =
        String(
            row.original_text ||
            row.text ||
            ""
        ).trim();

    if (!text) {
        return false;
    }

    /* Ignore obvious non-result content */

    const ignorePatterns = [
        /^sample report$/i,
        /^scan to validate/i,
        /^physical examination$/i,
        /^biochemical examination$/i,
        /^microscopic examination$/i,
        /^microscopy/i,
        /^clinical notes/i,
        /^clinical significance/i,
        /^interpretation/i,
        /^electrolytes$/i,
        /^indices$/i,
        /^differential/i,
        /^note\b/i,
        /^remarks?\b/i,
        /^advise\b/i,
        /^in case of/i,
        /^this is a sample report/i,
        /^classification/i,
        /^reference group/i,
        /^target goals/i,
        /^reports of/i,
        /^procedures and validation/i,
        /^-+$/,
        /^—+$/
    ];

    if (
        ignorePatterns.some(
            pattern => pattern.test(text)
        )
    ) {
        return false;
    }

    /*
     * A laboratory result should normally contain
     * at least one numeric value.
     */

    const hasNumber =
        /\d+(?:\.\d+)?/.test(text);

    if (!hasNumber) {
        return false;
    }

    /*
     * Strong indicator:
     * reference range / decision limit.
     */

    const hasReference =
        /(?:<|>)?\s*\d+(?:\.\d+)?\s*(?:[-–]\s*\d+(?:\.\d+)?)?/.test(text);

    /*
     * Units commonly found in laboratory reports.
     */

    const hasUnit =
        /\b(?:mg\/dL|g\/dL|g\/L|mg\/L|mmol\/L|µIU\/mL|mIU\/L|IU\/L|U\/L|fL|pg\/mL|ng\/mL|µg\/dL|%|ratio|index)\b/i.test(text)
        ||
        /X\s*10[³3]/i.test(text);

    /*
     * If the row has a number plus either a reference
     * or a recognizable unit, consider it an AI candidate.
     */

    return hasReference || hasUnit;
}

/* ============================================================
   PARSE ALL PDF PAGES
   ============================================================ */

function dxParsePages(pages) {

    const results = [];


    /*
     * Track current laboratory section.
     */

    let currentSection = null;

    let analyzingLab = false;


    for (const page of pages) {


        /*
         * Build coordinate-aware rows.
         */

        const tableRows =
            dxBuildTableRows(page);


        for (const row of tableRows) {


            const line =
                dxCleanTableText(
                    row.text
                );


            if (!line) {
                continue;
            }


            /* --------------------------------------------
               Ignore page information
               -------------------------------------------- */

            if (
                dxIsPageInformation(line)
            ) {

                continue;
            }


            /* --------------------------------------------
               Ignore metadata
               -------------------------------------------- */

            if (
                dxIsMetadata(line)
            ) {

                continue;
            }


            /* --------------------------------------------
               Ignore table headers
               -------------------------------------------- */

            if (
                dxIsTableHeader(row)
            ) {

                continue;
            }


            /* --------------------------------------------
               Radiology / imaging
               -------------------------------------------- */

            if (
                dxIsIgnoredSection(line)
            ) {

                currentSection = null;

                analyzingLab = false;

                continue;
            }


            /* --------------------------------------------
               Detect laboratory section
               -------------------------------------------- */

            const detectedSection =
                dxFindLabSection(line);


            if (detectedSection) {

                currentSection =
                    detectedSection;

                analyzingLab =
                    true;

                continue;
            }


            /*
             * If we have not yet found a laboratory
             * section, do not treat random report text
             * as a laboratory result.
             */

            if (
                !analyzingLab ||
                !currentSection
            ) {

                continue;
            }


            /* --------------------------------------------
               Parse coordinate-based result
               -------------------------------------------- */

            const result =
                dxParseStructuredResult(
                    row,
                    currentSection,
                    page.pageNumber
                );


            if (result) {

                /*console.log(
                    "STRUCTURED RESULT:",
                    result.parameter,
                    result.original ||
                    result.original_text ||
                    result.text
                );*/

                if (dxLooksLikeNarrativeText(result)) {

                    /*console.log(
                        "NARRATIVE DISCARDED (STRUCTURED):",
                        result.parameter,
                        result.original ||
                        result.original_text ||
                        result.text
                    );*/

                    continue;
                }

                results.push(result);

                continue;
            }


            /*
            * Coordinate parsing failed.
            *
            * Use text parser only as a fallback.
            */

            const fallback =
                dxParseResultLine(
                    line,
                    currentSection,
                    page.pageNumber
                );


            if (fallback) {

                /*console.log(
                    "FALLBACK RESULT:",
                    fallback.parameter,
                    fallback.original ||
                    fallback.original_text ||
                    fallback.text
                );*/


                if (dxLooksLikeNarrativeText(fallback)) {

                    /*console.log(
                        "NARRATIVE DISCARDED (FALLBACK):",
                        fallback.parameter,
                        fallback.original ||
                        fallback.original_text ||
                        fallback.text
                    );*/

                    continue;
                }


                results.push(fallback);
            }
        }
    }


    return dxRemoveDuplicates(
        results
    );
}


/* ============================================================
   REMOVE DUPLICATES
   ============================================================ */

function dxRemoveDuplicates(results) {

    const seen =
        new Set();


    return results.filter(
        result => {

            const key = [

                result.parameter
                    .toLowerCase()
                    .replace(/\s+/g, " ")
                    .trim(),

                result.value,

                result.unit,

                result.reference?.text || "",

                result.page

            ].join("|");


            if (
                seen.has(key)
            ) {

                return false;
            }


            seen.add(key);

            return true;
        }
    );
}


/* ============================================================
   EXTRACT PDF TEXT USING PDF.JS
   ============================================================ */

async function dxExtractPDF(file) {

    if (
        typeof pdfjsLib === "undefined"
    ) {

        throw new Error(
            "PDF.js is not loaded."
        );
    }


    const data =
        await file.arrayBuffer();


    const pdf =
        await pdfjsLib.getDocument({
            data
        }).promise;


    const pages = [];


    for (
        let pageNumber = 1;
        pageNumber <= pdf.numPages;
        pageNumber++
    ) {


        const page =
            await pdf.getPage(
                pageNumber
            );


        const content =
            await page.getTextContent();


        const items =
            content.items

                .filter(
                    item =>
                        item.str &&
                        item.str.trim()
                )

                .map(item => {

                    const transform =
                        item.transform;


                    return {

                        text:
                            item.str.trim(),

                        x:
                            transform[4],

                        y:
                            transform[5],

                        width:
                            item.width || 0,

                        height:
                            item.height || 0

                    };
                });


        /* --------------------------------------------
           Group items into visual rows
           -------------------------------------------- */

        const rows = [];


        const Y_TOLERANCE = 3;


        for (const item of items) {

            let row =
                rows.find(
                    existing =>
                        Math.abs(
                            existing.y -
                            item.y
                        ) <= Y_TOLERANCE
                );


            if (!row) {

                row = {

                    y:
                        item.y,

                    items: []

                };


                rows.push(row);
            }


            row.items.push(item);
        }


        /* --------------------------------------------
           Sort rows top to bottom
           -------------------------------------------- */

        rows.sort(
            (a, b) =>
                b.y - a.y
        );


        /* --------------------------------------------
           Sort items left to right
           -------------------------------------------- */

        for (const row of rows) {

            row.items.sort(
                (a, b) =>
                    a.x - b.x
            );
        }


        /* --------------------------------------------
           Build page text for patient extraction
           -------------------------------------------- */

        const pageText =
            rows

                .map(row =>
                    dxJoinItems(
                        row.items
                    )
                )

                .filter(Boolean)

                .join("\n");


        pages.push({

            pageNumber,

            text:
                pageText,

            items,

            rows

        });
    }


    return {

        totalPages:
            pdf.numPages,

        pages

    };
}


/* ============================================================
   BUILD DX AI REPORT
   ============================================================ */

async function buildDxAIReport(file) {

    const pdf =
        await dxExtractPDF(
            file
        );


    const allText =
        pdf.pages

            .map(
                page =>
                    page.text
            )

            .join("\n");


    const patient =
        dxExtractPatient(
            dxNormalizeText(
                allText
            )
        );


    const results =
        dxParsePages(
            pdf.pages
        );


    return {

        report: {

            file_name:
                file.name,

            source_type:
                "pdf",

            total_pages:
                pdf.totalPages

        },


        patient,


        results,


        calculated_results:
            results.filter(
                result =>
                    result.source ===
                    "lab_calculated"
            ),


        extraction: {

            method:
                "pdf_coordinates",

            parameters:
                results.length,

            status:
                "completed"

        }

    };
}


/* ============================================================
   DISPLAY EXTRACTED RESULTS
   ============================================================ */

function dxDisplayResults(report) {

    const container =
        document.getElementById(
            "dxAiResults"
        );


    if (!container) {

        console.error(
            "dxAiResults container not found."
        );

        return;
    }


    const results =
        report.results || [];


    /* =====================================================
       SEPARATE RESULTS
       ===================================================== */

    /* Always calculate status from the current fields.
     * This keeps the display correct after AI enrichment. */
    for (const result of results) {
        result.status =
            dxGetStatus(
                result.value,
                result.reference
            );
    }


    const abnormal =
        results.filter(
            r =>
                r.status === "HIGH" ||
                r.status === "LOW" ||
                r.status === "ABNORMAL"
        );


    const normal =
        results.filter(
            r =>
                r.status === "NORMAL"
        );


    const unknown =
        results.filter(
            r =>
                r.status === "UNKNOWN"
        );
    /*console.log(
            "========== UNKNOWN REFERENCE DEBUG =========="
        );*/

        results
            .filter(r => r.status === "UNKNOWN")
            .forEach((r, index) => {

                /*console.log(
                    `UNKNOWN #${index + 1}\n` +
                    `PARAMETER: ${r.parameter}\n` +
                    `VALUE: ${r.value}\n` +
                    `UNIT: ${r.unit}\n` +
                    `REFERENCE: ${JSON.stringify(r.reference, null, 2)}\n` +
                    `ORIGINAL: ${r.original_text}\n`
                );*/

            });

    const calculated =
        results.filter(
            r =>
                r.source ===
                "lab_calculated"
        );


    /* =====================================================
       RESULT ROW GENERATOR
       ===================================================== */

    function createRows(list) {

        if (
            list.length === 0
        ) {

            return `

                <tr>

                    <td
                        colspan="6"
                        style="
                            text-align:center;
                            color:#777;
                            padding:20px;
                        "
                    >

                        No results in this category.

                    </td>

                </tr>

            `;
        }


        return list

            .map(result => {


                let statusClass =
                    "status-unknown";


                if (
                    result.status ===
                    "NORMAL"
                ) {

                    statusClass =
                        "status-normal";

                }

                else if (
                    result.status ===
                    "HIGH"
                ) {

                    statusClass =
                        "status-high";

                }

                else if (
                    result.status ===
                    "LOW"
                ) {

                    statusClass =
                        "status-low";

                }

                else if (
                    result.status ===
                    "ABNORMAL"
                ) {

                    statusClass =
                        "status-abnormal";
                }


                return `

                    <tr>

                        <td>
                            ${dxEscapeHTML(
                                result.parameter
                            )}
                        </td>


                        <td>

                            <strong>

                                ${dxEscapeHTML(
                                    result.value
                                )}

                            </strong>

                        </td>


                        <td>

                            ${dxEscapeHTML(
                                result.unit
                            )}

                        </td>


                        <td>

                            ${dxEscapeHTML(
                                result.reference?.text ||
                                "Not available"
                            )}

                        </td>


                        <td>

                            <span
                                class="result-status ${statusClass}"
                            >

                                ${result.status}

                            </span>

                        </td>


                        <td>

                            ${dxEscapeHTML(
                                result.section
                            )}

                        </td>

                    </tr>

                `;

            })

            .join("");
    }


    /* =====================================================
       SUMMARY
       ===================================================== */

    const summaryHTML = `

        <div class="analysis-summary">


            <div
                class="summary-card summary-abnormal"
            >

                <strong>
                    ${abnormal.length}
                </strong>

                <span>
                    Abnormal
                </span>

            </div>


            <div
                class="summary-card summary-normal"
            >

                <strong>
                    ${normal.length}
                </strong>

                <span>
                    Normal
                </span>

            </div>


            <div
                class="summary-card summary-unknown"
            >

                <strong>
                    ${unknown.length}
                </strong>

                <span>
                    Unknown
                </span>

            </div>


            <div class="summary-card">

                <strong>
                    ${calculated.length}
                </strong>

                <span>
                    Lab Calculated
                </span>

            </div>

        </div>
        

    `;


    /* =====================================================
       CREATE CATEGORY
       ===================================================== */

    function createCategory(
        title,
        description,
        count,
        className,
        data
    ) {

        return `

            <details
                class="result-category ${className}"
            >

                <summary class="category-header">

                    <div>

                        <h3>
                            ${title}
                        </h3>

                        <p>
                            ${description}
                        </p>

                    </div>


                    <span class="category-count">

                        ${count}

                    </span>

                </summary>


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
                                    Section
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${createRows(data)}

                        </tbody>

                    </table>

                </div>

            </details>

        `;
    }


    /* =====================================================
       CATEGORY SECTIONS
       ===================================================== */

    const abnormalHTML =
        createCategory(

            "⚠ Abnormal Results",

            "Results outside the reference interval provided by the laboratory.",

            abnormal.length,

            "abnormal-category",

            abnormal

        );


    const normalHTML =
        createCategory(

            "✓ Normal Results",

            "Results within the reference interval provided by the laboratory.",

            normal.length,

            "normal-category",

            normal

        );


    const unknownHTML =
        createCategory(

            "? Unable to Determine",

            "The available report information does not allow Dx AI to determine whether these results are normal or abnormal.",

            unknown.length,

            "unknown-category",

            unknown

        );


    /*const allHTML =
        createCategory(

            "All Extracted Results",

            "Complete list of laboratory parameters extracted from the report.",

            results.length,

            "all-category",

            results

        );*/

    
    /* =====================================================
       FINAL OUTPUT
       ===================================================== */

    container.innerHTML = `

        <section class="dx-results-section">


            <h2>
                Laboratory Report Analysis
            </h2>


            <p class="report-source">

                File:

                <strong>

                    ${dxEscapeHTML(
                        report.report.file_name
                    )}

                </strong>

                &nbsp; • &nbsp;

                ${report.report.total_pages}

                pages processed

            </p>

            ${summaryHTML}
            <div id="dx-ai-summary"></div>
            ${abnormalHTML}
            ${normalHTML}
            ${unknownHTML}
            <!-- {allHTML} -->
            <p class="calculation-note">

                Dx AI uses the reference intervals
                reported by the laboratory when
                determining result status.

                Radiology, imaging and ECG sections
                are excluded from this analysis.

            </p>


        </section>

    `;
    
}

/* ============================================================
   PARSE AI REFERENCE
   Converts AI reference text into Zeta Dx reference format
   ============================================================ */

function parseAIReference(referenceText) {

    if (
        referenceText === null ||
        referenceText === undefined
    ) {
        return null;
    }


    const text =
        String(referenceText)
            .replace(/\s+/g, " ")
            .trim();


    if (!text) {
        return null;
    }


    /* ========================================================
       NORMAL RANGE

       Examples:
       0.60-1.25
       0.60 - 1.25
       6.0 - 8.0
       19 - 43
       ======================================================== */

    let match =
        text.match(
            /^(-?\d+(?:\.\d+)?)\s*[-–—]\s*(-?\d+(?:\.\d+)?)$/
        );


    if (match) {

        const low =
            Number(match[1]);

        const high =
            Number(match[2]);


        /*
         * Reject reversed ranges.
         */

        if (
            Number.isFinite(low) &&
            Number.isFinite(high) &&
            low < high
        ) {

            return {

                type: "range",

                low: low,

                high: high,

                text: text
            };
        }


        return null;
    }


    /* ========================================================
       LESS THAN

       Example:
       <200
       ======================================================== */

    match =
        text.match(
            /^<\s*(-?\d+(?:\.\d+)?)$/
        );


    if (match) {

        const high =
            Number(match[1]);


        if (Number.isFinite(high)) {

            return {

                type: "less_than",

                high: high,

                text: text
            };
        }
    }


    /* ========================================================
       GREATER THAN

       Example:
       >40
       ======================================================== */

    match =
        text.match(
            /^>\s*(-?\d+(?:\.\d+)?)$/
        );


    if (match) {

        const low =
            Number(match[1]);


        if (Number.isFinite(low)) {

            return {

                type: "greater_than",

                low: low,

                text: text
            };
        }
    }


    /* ========================================================
       QUALITATIVE

       Examples:
       Negative
       Positive
       ======================================================== */

    if (
        /^negative$/i.test(text) ||
        /^positive$/i.test(text)
    ) {

        return {

            type: "qualitative",

            expected: text,

            text: text
        };
    }


    return null;
}

/* ============================================================
   PUBLIC ANALYSIS FUNCTION
   ============================================================ */

async function analyzeUploadedLaboratoryReport(file) {

    if (!file) {

        throw new Error(
            "Please select a laboratory report."
        );
    }


    if (
        !file.name
            .toLowerCase()
            .endsWith(".pdf")
    ) {

        throw new Error(
            "This stage currently supports PDF reports. Image and OCR support will be added next."
        );
    }

    const info =
        document.getElementById("form-section");

    if (info) {
        info.style.display = "none";
    }
    
    const report =
        await buildDxAIReport(
            file
        );


    /*
     * If the Dx AI fallback engine is loaded, process only the
     * UNKNOWN rows that actually look like laboratory results.
     */
    if (
        typeof processUnknownResults === "function"
    ) {

        await processUnknownResults(
            report
        );
    }
    

    /* Recalculate all statuses after extraction / AI enrichment. */
    for (const result of report.results || []) {

        result.status =
            dxGetStatus(
                result.value,
                result.reference
            );
    }


    window.dxAIReport =
        report;


    dxDisplayResults(
        report
    );
    dxShowAIProcessing();


    const processingInterval =
        dxStartAIProcessingMessages();

    const aiAnalysis = await analyzeReportWithAI(report);

    if (aiAnalysis) {

        dxRenderAIAnalysis(
            aiAnalysis
        );

    }

    return report;
}

function dxLooksLikeNarrativeText(result) {

    if (!result) {
        return false;
    }


    const parameter =
        String(result.parameter || "")
            .trim()
            .toLowerCase();


    const original =
        String(
            result.original ||
            result.original_text ||
            result.text ||
            ""
        )
        .trim()
        .toLowerCase();


    /* =========================================================
       OBVIOUS NARRATIVE PARAMETERS
       ========================================================= */

    if (
        parameter.startsWith("reports of") ||
        parameter === "above" ||
        parameter === "below" ||
        parameter === "than" ||
        parameter.startsWith("in case") ||
        parameter.startsWith("- ldl -") ||
        parameter.startsWith("hence")
    ) {
        return true;
    }


    /* =========================================================
       OBVIOUS NARRATIVE SENTENCES
       ========================================================= */

    if (
        original.includes("are best obtained with") ||
        original.includes("are associated with increased risk") ||
        original.includes("regardless of hdl") ||
        original.includes("regardless of ldl") ||
        original.includes("increased risk of chd") ||
        original.includes("in case triglyceride levels are more than") ||
        original.includes("obesity medication") ||
        original.includes("alcohol intake") ||
        original.includes("diabetes mellitus") ||
        original.includes("pancreatitis")
    ) {
        return true;
    }


    return false;
}

/* ============================================================
   BUILD AI INPUT
   ============================================================ */

function dxBuildAIInput(reportData) {

    const results =
        reportData.results || [];


    /*
     * Only send results that have been classified
     * as abnormal by our own status engine.
     */

    const abnormalResults =
        results
            .filter(result => {

                const status =
                    getResultStatus(result);

                return (
                    status === "HIGH" ||
                    status === "LOW" ||
                    status === "ABNORMAL"
                );

            })
            .map(result => {

                return {

                    parameter:
                        result.parameter || "",

                    value:
                        result.value ?? null,

                    unit:
                        result.unit || "",

                    reference:
                        result.reference?.text || "",

                    status:
                        getResultStatus(result),

                    method:
                        result.method || ""

                };

            });


    /*
     * Send all valid laboratory results as context.
     *
     * This allows the AI to understand relationships
     * between abnormal and related normal results.
     */

    const allResults =
        results
            .map(result => {

                return {

                    parameter:
                        result.parameter || "",

                    value:
                        result.value ?? null,

                    unit:
                        result.unit || "",

                    reference:
                        result.reference?.text || "",

                    status:
                        getResultStatus(result)

                };

            });

    console.log("========== REPORT DATA FOR PATIENT INFO ==========");

    console.log(reportData);

    return {

        report: {

            laboratory:
                reportData.report
                    ?.laboratory_name || null

        },
        patient: {

            age:
                reportData.patient
                    ?.age ?? null,

            gender:
                reportData.patient
                    ?.sex || null,

            weight:
                reportData.patient
                    ?.weight ?? null

        },

        abnormal_results:
            abnormalResults,

        all_results:
            allResults

    };

}

/* ============================================================
   SEND REPORT TO DX AI
   ============================================================ */

async function analyzeReportWithAI(reportData) {

    const aiInput =
        dxBuildAIInput(reportData);


    console.log(
        "========== DX AI INPUT =========="
    );

    console.log(
        aiInput
    );


    /*
     * Nothing abnormal to interpret.
     */

    if (
        aiInput.abnormal_results.length === 0
    ) {

        console.log(
            "Dx AI: No abnormal results."
        );

        return null;
    }


    try {

        const response =
            await fetch(
                "https://zeta-dx-ai.onrender.com/analyze-report",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            aiInput
                        )

                }
            );


        if (!response.ok) {

            throw new Error(
                `Dx AI server returned ${response.status}`
            );

        }


        const aiResult =
            await response.json();


        /*console.log(
            "========== DX AI RESPONSE =========="
        );

        console.log(
            aiResult
        );*/


        return aiResult;


    } catch (error) {

        console.error(
            "Dx AI report analysis error:",
            error
        );


        return null;
    }

}

/* ============================================================
   RENDER DX AI SUMMARY
   ============================================================ */

function dxRenderAIAnalysis(aiAnalysis) {

    if (!aiAnalysis) {
        return;
    }


    const container =
        document.getElementById("dx-ai-summary");


    if (!container) {

        console.error(
            "Dx AI summary container not found."
        );

        return;
    }


    let html = "";


    /* ---------------------------------------------------------
       OVERALL SUMMARY
       --------------------------------------------------------- */

    if (aiAnalysis.overall_summary) {

        html += `
            <div class="dx-ai-summary-card">

                <h2>\nDx AI Summary</h2>

                <p>
                    ${aiAnalysis.overall_summary}
                </p>

            </div>
        `;
    }


    /* ---------------------------------------------------------
       FINDINGS
       --------------------------------------------------------- */

    if (
        Array.isArray(aiAnalysis.findings) &&
        aiAnalysis.findings.length > 0
    ) {

        html += `
            <div class="dx-ai-findings">

                <h2>Abnormal Findings</h2>
        `;


        for (
            const finding
            of aiAnalysis.findings
        ) {

            html += `
                <div class="dx-ai-finding-card">

                    <div class="dx-ai-finding-header">

                        <h3>
                            ${finding.parameter || ""}
                        </h3>

                        <span class="dx-ai-separator">|</span>

                        <span class="dx-ai-status">
                            ${finding.status || ""}
                        </span>

                        ${
                            finding.category
                            ?
                            `
                            <span class="dx-ai-separator">|</span>

                            <span class="dx-ai-category">
                                ${finding.category}
                            </span>
                            `
                            :
                            ""
                        }

                    </div>


                    ${
                        finding.what_does_it_indicate
                        ?
                        `
                        <div class="dx-ai-section">

                            <h4>What does it indicate?</h4>

                            <p>
                                ${finding.what_does_it_indicate}
                            </p>

                        </div>
                        `
                        :
                        ""
                    }


                    ${
                        finding.interpretation
                        ?
                        `
                        <div class="dx-ai-section">

                            <h4>Your result</h4>

                            <p>
                                ${finding.interpretation}
                            </p>

                        </div>
                        `
                        :
                        ""
                    }

                </div>
            `;
        }


        html += `
            </div>
        `;
    }


    /* ---------------------------------------------------------
       SYSTEM SUMMARIES
       --------------------------------------------------------- */

    if (
        Array.isArray(aiAnalysis.system_summaries) &&
        aiAnalysis.system_summaries.length > 0
    ) {

        html += `
            <div class="dx-ai-systems">

                <h2>Related Systems</h2>
        `;


        for (
            const system
            of aiAnalysis.system_summaries
        ) {

            html += `
                <div class="dx-ai-system-card">

                    <h3>
                        ${system.system || ""}
                    </h3>

                    <p>
                        ${system.summary || ""}
                    </p>

                </div>
            `;
        }


        html += `
            </div>
        `;
    }


    /* ---------------------------------------------------------
       DISCLAIMER
       --------------------------------------------------------- */

    if (aiAnalysis.disclaimer) {

        html += `
            <div class="dx-ai-disclaimer">

                ${aiAnalysis.disclaimer}

            </div>
        `;
    }


    container.innerHTML =
        html;
}

function dxShowAIProcessing() {

    const container =
        document.getElementById(
            "dx-ai-summary"
        );

    if (!container) {

        console.error(
            "dx-ai-summary container not found."
        );

        return;
    }


    container.innerHTML = `

        <div id="dx-ai-processing">

            <div class="dx-ai-processing-card">

                <div class="dx-ai-ring"></div>

                <div class="dx-ai-processing-text">

                    <strong>
                        Dx AI is analyzing your report...
                    </strong>

                    <span id="dx-ai-processing-status">
                        Reviewing abnormal results
                    </span>

                </div>

            </div>

        </div>

    `;
}


function dxStartAIProcessingMessages() {

    const messages = [

        "Reviewing abnormal results",

        "Checking related laboratory parameters",

        "Interpreting laboratory findings",

        "Grouping related results",

        "Preparing your explanation",

        "Dx AI might take a few minutes to analyze your report.",

        "Dx can make mistakes. Please consult your healthcare provider for medical advice"

    ];


    let index = 0;


    const interval =
        setInterval(() => {

            const element =
                document.getElementById(
                    "dx-ai-processing-status"
                );


            if (!element) {

                clearInterval(interval);

                return;
            }


            index =
                (index + 1) %
                messages.length;


            element.textContent =
                messages[index];


        }, 2200);


    return interval;
}
