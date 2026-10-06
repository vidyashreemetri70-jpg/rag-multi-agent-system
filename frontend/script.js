const API_URL = "http://127.0.0.1:8000";

let mediaRecorder = null;
let audioChunks = [];
let isListening = false;

let recognition = null;
let usingWebSpeech = false;

let currentSpeech = null;
let speechQueue = [];
let speechIndex = 0;
let isSpeechPaused = false;

let currentAnswerText = "";


/* ==========================================
   M3.1 CLARIFICATION STATE
   ========================================== */

let pendingOriginalQuery = "";


/* ==========================================
   M3.4 RESPONSE TRANSPARENCY STATE
   ========================================== */

let currentEvidence = [];
let currentConfidence = null;
let currentRetrievalConfidence = null;
let currentQueryType = "";



/* ==========================================
   M4.1 ANALYTICS STATE
   ========================================== */

let analyticsRecords = [];

let currentAnalyticsFilter = "all";

let analyticsBaselineKeys = new Set();

let analyticsSessionInitialized = false;




/* ==========================================
   M4.1 ANALYTICS INSIGHTS STATE
   ========================================== */

let analyticsSummaryData = {};
let analyticsQueryTypesData = {};
let analyticsDomainsData = {};
let analyticsRetrievalData = {};
let analyticsDailyData = {};
let analyticsCommonQueriesData = {};
let analyticsLowConfidenceData = [];


/* ==========================================
   FILE UPLOAD
   ========================================== */

async function uploadFile() {

    const fileInput =
        document.getElementById("fileInput");

    const uploadStatus =
        document.getElementById("uploadStatus");


    if (!fileInput) {

        console.error(
            "fileInput element not found."
        );

        alert(
            "File input was not found."
        );

        return;
    }


    if (
        !fileInput.files ||
        fileInput.files.length === 0
    ) {

        alert(
            "Please select a document first."
        );

        return;
    }


    const file =
        fileInput.files[0];


    console.log(
        "Selected file:",
        file.name
    );

    console.log(
        "File type:",
        file.type
    );

    console.log(
        "File size:",
        file.size
    );


    if (uploadStatus) {

        uploadStatus.innerHTML =
            "⏳ Uploading and indexing...";
    }


    const formData =
        new FormData();

    formData.append(
        "file",
        file
    );


    try {

        const response =
            await fetch(
                `${API_URL}/upload`,
                {
                    method: "POST",
                    body: formData
                }
            );


        console.log(
            "Upload response status:",
            response.status
        );


        let data;


        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                `Backend returned an invalid response. HTTP ${response.status}`
            );
        }


        console.log(
            "Upload response:",
            data
        );


        if (!response.ok) {

            let errorMessage =
                data.detail ||
                data.message ||
                `Upload failed. HTTP ${response.status}`;


            if (
                Array.isArray(
                    errorMessage
                )
            ) {

                errorMessage =
                    errorMessage
                        .map(
                            item =>
                                item.msg ||
                                JSON.stringify(item)
                        )
                        .join(", ");
            }


            throw new Error(
                errorMessage
            );
        }


        const chunkCount =
            data.chunks ??
            data.chunk_count ??
            data.chunks_created ??
            0;


        if (uploadStatus) {

            uploadStatus.innerHTML = `
                <strong>
                    ✓ ${escapeHTML(
                        data.filename ||
                        file.name
                    )}
                    indexed successfully
                </strong>

                <br>

                ${chunkCount}
                knowledge chunks created.
            `;
        }


        fileInput.value = "";


    } catch (error) {

        console.error(
            "Upload error:",
            error
        );


        if (uploadStatus) {

            uploadStatus.innerHTML = `
                <strong>
                    ❌ Upload failed
                </strong>

                <br>

                ${escapeHTML(
                    error.message
                )}
            `;
        }


        if (
            error instanceof TypeError &&
            error.message.includes("fetch")
        ) {

            if (uploadStatus) {

                uploadStatus.innerHTML = `
                    <strong>
                        ❌ Cannot connect to backend
                    </strong>

                    <br>

                    Please make sure FastAPI is running on
                    <strong>
                        http://127.0.0.1:8000
                    </strong>
                `;
            }
        }
    }
}


/* ==========================================
   ASK AI QUESTION
   M3.1 + M3.4
   ========================================== */

async function askQuestion(
    customQuery = null
) {

    const queryInput =
        document.getElementById(
            "queryInput"
        );

    const result =
        document.getElementById(
            "result"
        );


    if (
        !queryInput ||
        !result
    ) {

        console.error(
            "queryInput or result element not found."
        );

        return;
    }


    const query =
        customQuery !== null
            ? customQuery.trim()
            : queryInput.value.trim();


    if (!query) {

        result.innerHTML =
            "⚠ Please enter a question.";

        return;
    }


    stopSpeech();


    result.innerHTML =
        "⏳ Processing your question...";


    try {

        const response =
            await fetch(
                `${API_URL}/query`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        query: query
                    })
                }
            );


        let data;


        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                `Backend returned an invalid response. HTTP ${response.status}`
            );
        }


        if (!response.ok) {

            let errorMessage =
                data.detail ||
                data.message ||
                "Query failed";


            if (
                Array.isArray(
                    errorMessage
                )
            ) {

                errorMessage =
                    errorMessage
                        .map(
                            item =>
                                item.msg ||
                                JSON.stringify(item)
                        )
                        .join(", ");
            }


            throw new Error(
                errorMessage
            );
        }


        /* ======================================
           M3.1 CLARIFICATION AGENT
           ====================================== */

        if (
            data.needs_clarification
        ) {

            pendingOriginalQuery =
                query;


            currentAnswerText =
                data.clarification_question ||
                "Could you please provide more details?";


            const clarificationPanel =
                document.getElementById(
                    "clarificationPanel"
                );


            const clarificationQuestion =
                document.getElementById(
                    "clarificationQuestion"
                );


            const clarificationInput =
                document.getElementById(
                    "clarificationInput"
                );


            if (clarificationPanel) {

                clarificationPanel.style.display =
                    "block";
            }


            if (clarificationQuestion) {

                clarificationQuestion.textContent =
                    data.clarification_question ||
                    "Could you please provide more details?";
            }


            if (clarificationInput) {

                clarificationInput.value = "";

                clarificationInput.focus();
            }


            result.innerHTML = `
                <div>

                    <strong>
                        Clarification Needed
                    </strong>

                    <p class="ai-answer">
                        ${escapeHTML(
                            data.clarification_question ||
                            "Could you please provide more details?"
                        )}
                    </p>

                </div>
            `;


            hideTransparency();


            loadVoices();


            if (
                data.clarification_question
            ) {

                speakText(
                    data.clarification_question
                );
            }


            await waitForAnalyticsSave();

            await loadAnalytics();


            return;
        }


        /* ======================================
           M3.4 GET RESPONSE TRANSPARENCY DATA
           ====================================== */

        currentEvidence =
            normalizeEvidence(
                data.evidence ||
                data.sources ||
                data.retrieved_context ||
                data.retrieved_information ||
                []
            );

        currentConfidence =
             data.confidence ??
             data.intent_confidence ??
             data.answer_confidence ??
             null;


        currentRetrievalConfidence =
             data.retrieval_confidence ??
             data.retrievalConfidence ??
             null;


        currentQueryType =
             data.query_type ||
             data.intent ||
             data.query_classification ||
             "N/A";
        
        
        

        /* ======================================
           NORMAL AI ANSWER
           ====================================== */

        let answer =
            data.answer ||
            data.response ||
            data.generated_answer ||
            data.message ||
            "";


        if (
            !currentEvidence.length &&
            (
                !answer ||
                /information not found/i.test(
                    answer
                ) ||
                /not found in the knowledge base/i.test(
                    answer
                )
            )
        ) {

            answer =
                "I couldn't find sufficient information " +
                "in the uploaded knowledge base to answer this question.";
        }


        currentAnswerText =
            answer;


        const formattedAnswer =
            escapeHTML(
                answer
            ).replace(
                /\n/g,
                "<br>"
            );


        const confidenceText =
            formatConfidence(
                currentConfidence
        );


        const retrievalConfidenceText =
            formatConfidence(
                currentRetrievalConfidence
     );


        result.innerHTML = `
            <div>

                <strong>
                    AI Answer
                </strong>

                <p class="ai-answer">
                    ${formattedAnswer}
                </p>

                <hr>

                <small>

                     Query Type:
                     ${escapeHTML(
                         currentQueryType
                  )}

                 <br>

                 Intent Confidence:
                 ${confidenceText}

                 <br>

                 Retrieval Confidence:
                 ${retrievalConfidenceText}

            </small>

            </div>
        `;


        /* ======================================
           M3.4 SHOW TRANSPARENCY
           ====================================== */

        renderTransparency();


        /* ======================================
           TEXT TO SPEECH
           ====================================== */

        loadVoices();


        if (answer) {

            speakText(
                answer
            );
        }


        /* ======================================
           M4.1 UPDATE ANALYTICS
           ====================================== */

        await waitForAnalyticsSave();

        await loadAnalytics();


    } catch (error) {

        console.error(
            "Query error:",
            error
        );


        result.innerHTML =
            `❌ Unable to get an answer.<br>
             ${escapeHTML(
                 error.message
             )}`;


        hideTransparency();


        await waitForAnalyticsSave();

        await loadAnalytics();
    }
}


/* ==========================================
   M4.1 WAIT FOR ANALYTICS SAVE
   ========================================== */

function waitForAnalyticsSave() {

    return new Promise(
        function(resolve) {

            setTimeout(
                resolve,
                500
            );
        }
    );
}


/* ==========================================
   M3.1 CLARIFICATION SUBMIT
   ========================================== */

async function submitClarification() {

    const clarificationInput =
        document.getElementById(
            "clarificationInput"
        );


    const clarificationPanel =
        document.getElementById(
            "clarificationPanel"
        );


    const result =
        document.getElementById(
            "result"
        );


    const clarification =
        clarificationInput
            ? clarificationInput.value.trim()
            : "";


    if (!clarification) {

        alert(
            "Please provide clarification."
        );

        return;
    }


    if (!pendingOriginalQuery) {

        alert(
            "Original question was not found. Please ask the question again."
        );

        return;
    }


    const refinedQuery =
        `Original question: ${pendingOriginalQuery}
Clarification: ${clarification}`;


    if (clarificationPanel) {

        clarificationPanel.style.display =
            "none";
    }


    if (result) {

        result.innerHTML = `
            <div>

                <strong>
                    Clarification Received
                </strong>

                <p class="ai-answer">
                    ${escapeHTML(
                        clarification
                    )}
                </p>

                <p>
                    ⏳ Refining your question...
                </p>

            </div>
        `;
    }


    await askQuestion(
        refinedQuery
    );


    if (
        !document.getElementById(
            "clarificationPanel"
        ) ||
        document.getElementById(
            "clarificationPanel"
        ).style.display !== "block"
    ) {

        pendingOriginalQuery =
            "";
    }
}


/* ==========================================
   M3.4 NORMALIZE EVIDENCE
   ========================================== */

function normalizeEvidence(
    evidence
) {

    if (!Array.isArray(evidence)) {

        return [];
    }


    return evidence.map(
        function(item) {

            if (
                !item ||
                typeof item !== "object"
            ) {

                return {

                    document:
                        "Unknown source",

                    chunk:
                        "N/A",

                    score:
                        null,

                    page:
                        "N/A",

                    section:
                        "N/A",

                    citation:
                        "N/A",

                    content:
                        String(
                            item || ""
                        )
                };
            }


            return {

                document:
                    item.document_name ||
                    item.source ||
                    item.filename ||
                    item.document ||
                    "Unknown source",

                chunk:
                    item.chunk_id ||
                    item.id ||
                    item.chunk ||
                    "N/A",

                score:
                    item.score ??
                    item.relevance_score ??
                    item.similarity ??
                    item.distance ??
                    null,

                page:
                    item.page ??
                    item.page_number ??
                    item.page_no ??
                    "N/A",

                section:
                    item.section ||
                    item.section_name ||
                    "N/A",

                citation:
                    item.citation ||
                    item.citation_reference ||
                    item.reference ||
                    "N/A",

                content:
                    item.content ||
                    item.text ||
                    item.chunk_text ||
                    item.retrieved_information ||
                    ""
            };
        }
    );
}


/* ==========================================
   M3.4 FORMAT CONFIDENCE
   ========================================== */

function formatConfidence(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "N/A";
    }


    let number =
        Number(value);


    if (
        Number.isNaN(
            number
        )
    ) {

        return escapeHTML(
            value
        );
    }


    if (number > 1) {

        number =
            number / 100;
    }


    return number.toFixed(
        2
    );
}


/* ==========================================
   M3.4 CONFIDENCE LEVEL
   ========================================== */

function getConfidenceLevel(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        

        return "Unknown confidence";
    }


    let number =
        Number(value);


    if (
        Number.isNaN(
            number
        )
    ) {

        return "Unknown confidence";
    }


    if (number > 1) {

        number =
            number / 100;
    }


    if (number >= 0.80) {

        return "High confidence";
    }


    if (number >= 0.50) {

        return "Medium confidence";
    }


    return "Low confidence";
}


/* ==========================================
   M3.4 EVIDENCE RELEVANCE
   ========================================== */

function getEvidenceRelevance(
    evidence
) {

    const distances =
        evidence
            .map(
                function(item) {

                    return Number(
                        item.score
                    );
                }
            )
            .filter(
                function(distance) {

                    return !Number.isNaN(
                        distance
                    );
                }
            );


    if (!distances.length) {

        return "Evidence retrieved";
    }


    const bestDistance =
        Math.min(
            ...distances
        );


    /*
     * Chroma distance:
     * Lower = better relevance.
     */

    if (bestDistance <= 0.50) {

        return "High evidence relevance";
    }


    if (bestDistance <= 0.75) {

        return "Medium evidence relevance";
    }


    return "Low evidence relevance";
}


/* ==========================================
   M3.4 RENDER TRANSPARENCY
   ========================================== */

function renderTransparency() {

    const panel =
        document.getElementById(
            "transparencyPanel"
        );


    const content =
        document.getElementById(
            "transparencyContent"
        );


    if (
        !panel ||
        !content
    ) {

        return;
    }


    panel.style.display =
        "block";


    /* ======================================
       NO EVIDENCE
       ====================================== */

    if (
        !currentEvidence.length
    ) {

        content.innerHTML = `

            <div class="no-evidence">

                <strong>
                    No supporting evidence found
                </strong>

                <p>
                    I couldn't find sufficient information
                    in the uploaded knowledge base to answer
                    this question.
                </p>

            </div>


            <div class="evidence-meta">

                <div>
                    <b>Query Type:</b>
                    ${escapeHTML(
                        currentQueryType
                    )}
                </div>

                <div>
                    <b>Intent Confidence:</b>
                    ${formatConfidence(
                        currentConfidence
                    )}
                </div>
                <div>
                <b>Retrieval Confidence:</b>
                ${formatConfidence(
                    currentRetrievalConfidence
                )}
                </div>

                
                <div>
                    <b>Evidence Relevance:</b>
                    No evidence
                </div>

            </div>
        `;


        return;
    }



    /* ======================================
       EVIDENCE AVAILABLE
       ====================================== */

    let html = `

        <div class="evidence-description">

            <p>
                The information below was retrieved from
                the knowledge base and used as supporting
                context for the generated answer.
            </p>


            <div class="evidence-meta">

                <div>
                    <b>Query Type:</b>
                    ${escapeHTML(
                        currentQueryType
                    )}
                </div>

                <div>
                    <b>Intent Confidence:</b>
                    ${formatConfidence(
                        currentConfidence
                    )}
                </div>

                <div>
                <b>Intent Confidence:</b>
                ${formatConfidence(
                    currentConfidence
                )}
                </div>
                <div>
                <b>Retrieval Confidence:</b>
                ${formatConfidence(
                    currentRetrievalConfidence
                )}
                </div>
                <div>
                <b>Confidence Level:</b>
                ${getConfidenceLevel(
                    currentRetrievalConfidence
                )}
                </div>

            </div>

        </div>
    `;


    /* ======================================
       EACH RETRIEVED CHUNK
       ====================================== */

    currentEvidence.forEach(
        function(item, index) {

            let score =
                "N/A";


            if (
                item.score !== null &&
                item.score !== undefined &&
                item.score !== ""
            ) {

                const numericScore =
                    Number(
                        item.score
                    );


                if (
                    !Number.isNaN(
                        numericScore
                    )
                ) {

                    score =
                        numericScore.toFixed(
                            3
                        );

                } else {

                    score =
                        String(
                            item.score
                        );
                }
            }


            html += `

                <details
                    class="evidence-item"
                    ${
                        index === 0
                            ? "open"
                            : ""
                    }
                >

                    <summary>

                        Source Evidence
                        ${index + 1}

                        —

                        ${escapeHTML(
                            item.document
                        )}

                    </summary>


                    <div class="evidence-content">


                        <div class="evidence-meta">

                            <div>
                                <b>
                                    Source Document:
                                </b>

                                ${escapeHTML(
                                    item.document
                                )}
                            </div>


                            <div>
                                <b>
                                    Chunk ID:
                                </b>

                                ${escapeHTML(
                                    item.chunk
                                )}
                            </div>


                            <div>
                                <b>
                                    Relevance Score:
                                </b>

                                ${escapeHTML(
                                    score
                                )}
                            </div>


                            <div>
                                <b>
                                    Page:
                                </b>

                                ${escapeHTML(
                                    item.page
                                )}
                            </div>


                            <div>
                                <b>
                                    Section:
                                </b>

                                ${escapeHTML(
                                    item.section
                                )}
                            </div>


                            <div>
                                <b>
                                    Citation:
                                </b>

                                ${escapeHTML(
                                    item.citation
                                )}
                            </div>

                        </div>


                        <div class="retrieved-information">

                            <strong>
                                Retrieved Information
                            </strong>

                            <p>
                                ${
                                    escapeHTML(
                                        item.content ||
                                        "No content available."
                                    )
                                    .replace(
                                        /\n/g,
                                        "<br>"
                                    )
                                }
                            </p>

                        </div>


                    </div>

                </details>

            `;
        }
    );


    content.innerHTML =
        html;
}


/* ==========================================
   M3.4 HIDE TRANSPARENCY
   ========================================== */

function hideTransparency() {

    const panel =
        document.getElementById(
            "transparencyPanel"
        );


    const content =
        document.getElementById(
            "transparencyContent"
        );


    if (panel) {

        panel.style.display =
            "none";
    }


    if (content) {

        content.innerHTML =
            "";
    }
}


/* =========================================================
   M4.1 ANALYTICS
   ========================================================= */

/*
 * Create a unique key for each backend analytics record.
 *
 * Used only by frontend to identify old records.
 */

function createAnalyticsRecordKey(
    record
) {

    if (
        !record ||
        typeof record !== "object"
    ) {

        return "";
    }


    return JSON.stringify({

        timestamp:
            record.timestamp ?? "",

        query:
            record.query ?? "",

        query_type:
            record.query_type ?? "",

        confidence:
            record.confidence ?? "",

        answered:
            record.answered ?? "",

        needs_clarification:
            record.needs_clarification ?? "",

        knowledge_gap:
            record.knowledge_gap ?? "",

        retrieved_documents:
            record.retrieved_documents ?? [],

        relevance_distances:
            record.relevance_distances ?? []

    });
}


/* =========================================================
   M4.1 LOAD ANALYTICS
   IMPORTANT:
   ONLY ONE loadAnalytics() FUNCTION EXISTS.
   ========================================================= */

async function loadAnalytics() {

    const analyticsStatus =
        document.getElementById(
            "analyticsStatus"
        );


    const totalQueries =
        document.getElementById(
            "totalQueries"
        );


    const answeredQueries =
        document.getElementById(
            "answeredQueries"
        );


    const unansweredQueries =
        document.getElementById(
            "unansweredQueries"
        );


    const clarificationQueries =
        document.getElementById(
            "clarificationQueries"
        );


    const knowledgeGapCount =
        document.getElementById(
            "knowledgeGapCount"
        );


    const analyticsTableBody =
        document.getElementById(
            "analyticsTableBody"
        );


    const knowledgeGapList =
        document.getElementById(
            "knowledgeGapList"
        );


    /*
     * If analytics HTML does not exist,
     * stop safely.
     */

    if (
        !analyticsStatus &&
        !totalQueries &&
        !answeredQueries &&
        !unansweredQueries &&
        !clarificationQueries &&
        !knowledgeGapCount &&
        !analyticsTableBody &&
        !knowledgeGapList
    ) {

        return;
    }


    try {

        /* =====================================================
           LOAD MAIN ANALYTICS
           ===================================================== */

        const response =
            await fetch(
                `${API_URL}/analytics`
            );


        if (!response.ok) {

            throw new Error(
                "Analytics endpoint failed"
            );
        }


        const analyticsData =
            await response.json();


        let allAnalyticsRecords =
            [];


        /*
         * Backend can return:
         *
         * [
         *   {...}
         * ]
         *
         * OR:
         *
         * {
         *   analytics: [...]
         * }
         */

        if (
            Array.isArray(
                analyticsData
            )
        ) {

            allAnalyticsRecords =
                analyticsData;

        } else {

            allAnalyticsRecords =
                analyticsData.records ||
                analyticsData.analytics ||
                analyticsData.data ||
                [];
        }


        /* =====================================================
           M4.1 INSIGHT DATA
           ===================================================== */

        try {

            const [
                summaryResponse,
                queryTypesResponse,
                domainsResponse,
                retrievalResponse,
                dailyResponse,
                commonQueriesResponse,
                lowConfidenceResponse
            ] = await Promise.all([

                fetch(
                    `${API_URL}/analytics/summary`
                ),

                fetch(
                    `${API_URL}/analytics/query-types`
                ),

                fetch(
                    `${API_URL}/analytics/domains`
                ),

                fetch(
                    `${API_URL}/analytics/retrieval`
                ),

                fetch(
                    `${API_URL}/analytics/daily`
                ),

                fetch(
                    `${API_URL}/analytics/common-queries`
                ),

                fetch(
                    `${API_URL}/analytics/low-confidence`
                )

            ]);


            /* -----------------------------------------
               SUMMARY
               ----------------------------------------- */

            if (
                summaryResponse.ok
            ) {

                analyticsSummaryData =
                    await summaryResponse.json();
            }


            /* -----------------------------------------
               QUERY TYPES
               ----------------------------------------- */

            if (
                queryTypesResponse.ok
            ) {

                analyticsQueryTypesData =
                    await queryTypesResponse.json();
            }


            /* -----------------------------------------
               DOMAINS
               ----------------------------------------- */

            if (
                domainsResponse.ok
            ) {

                analyticsDomainsData =
                    await domainsResponse.json();
            }


            /* -----------------------------------------
               RETRIEVAL
               ----------------------------------------- */

            if (
                retrievalResponse.ok
            ) {

                analyticsRetrievalData =
                    await retrievalResponse.json();
            }


            /* -----------------------------------------
               DAILY
               ----------------------------------------- */

            if (
                dailyResponse.ok
            ) {

                analyticsDailyData =
                    await dailyResponse.json();
            }


            /* -----------------------------------------
               COMMON QUERIES
               ----------------------------------------- */

            if (
                commonQueriesResponse.ok
            ) {

                analyticsCommonQueriesData =
                    await commonQueriesResponse.json();
            }


            /* -----------------------------------------
               LOW CONFIDENCE
               ----------------------------------------- */

            if (
                lowConfidenceResponse.ok
            ) {

                const lowConfidenceResult =
                    await lowConfidenceResponse.json();


                analyticsLowConfidenceData =
                    Array.isArray(
                        lowConfidenceResult
                    )
                        ? lowConfidenceResult
                        : (
                            lowConfidenceResult
                                .low_confidence_queries ||
                            []
                        );
            }


        } catch (insightError) {

            console.warn(
                "M4.1 insight data could not be loaded:",
                insightError
            );
        }


        /* =====================================================
           FIRST LOAD AFTER F5
           ===================================================== */

        if (
            !analyticsSessionInitialized
        ) {

            /*
             * Existing backend records become
             * baseline/old records.
             */

            analyticsBaselineKeys =
                new Set(
                    allAnalyticsRecords.map(
                        createAnalyticsRecordKey
                    )
                );


            /*
             * Start dashboard at zero.
             */

            analyticsRecords =
                [];


            analyticsSessionInitialized =
                true;


            updateAnalyticsDisplay();


            if (analyticsStatus) {

                analyticsStatus.innerText =
                    "✓ Analytics session started — 0 queries.";
            }


        } else {

            /* =================================================
               SUBSEQUENT LOADS
               ================================================= */

            analyticsRecords =
                allAnalyticsRecords.filter(
                    function(record) {

                        const key =
                            createAnalyticsRecordKey(
                                record
                            );


                        if (!key) {

                            return false;
                        }


                        return !analyticsBaselineKeys.has(
                            key
                        );
                    }
                );


            updateAnalyticsDisplay();


            if (analyticsStatus) {

                analyticsStatus.innerText =
                    `✓ Analytics updated — ${analyticsRecords.length} current-session query records loaded.`;
            }
        }


        /* =====================================================
           M4.1 INSIGHT UI
           ===================================================== */

        renderAnalyticsInsights();


    } catch (error) {

        console.error(
            "Analytics error:",
            error
        );


        analyticsRecords =
            [];


        updateAnalyticsDisplay();


        if (analyticsStatus) {

            analyticsStatus.innerText =
                "❌ Unable to load analytics. Make sure FastAPI is running.";
        }
    }
}


/* =========================================================
   M4.1 ANALYTICS INSIGHTS RENDER
   ========================================================= */

function renderAnalyticsInsights() {

    /* -----------------------------------------
       SYSTEM PERFORMANCE
       ----------------------------------------- */

    const answerRate =
        document.getElementById(
            "answerRate"
        );


    const averageConfidence =
        document.getElementById(
            "averageConfidence"
        );


    const averageResponseTime =
        document.getElementById(
            "averageResponseTime"
        );


    const lowConfidenceCount =
        document.getElementById(
            "lowConfidenceCount"
        );


    if (answerRate) {

        answerRate.innerText =
            `${
                analyticsSummaryData.answer_rate ??
                0
            }%`;
    }


    if (averageConfidence) {

        averageConfidence.innerText =
            analyticsSummaryData.average_confidence ??
            0;
    }


    if (averageResponseTime) {

        averageResponseTime.innerText =
            `${
                analyticsSummaryData.average_response_time ??
                0
            } s`;
    }


    if (lowConfidenceCount) {

        lowConfidenceCount.innerText =
            analyticsLowConfidenceData.length;
    }


    /* -----------------------------------------
       RETRIEVAL PERFORMANCE
       ----------------------------------------- */

    const retrievedDocuments =
        document.getElementById(
            "retrievedDocuments"
        );


    const averageDistance =
        document.getElementById(
            "averageDistance"
        );


    const bestDistance =
        document.getElementById(
            "bestDistance"
        );


    const worstDistance =
        document.getElementById(
            "worstDistance"
        );


    if (retrievedDocuments) {

        retrievedDocuments.innerText =
            analyticsRetrievalData
                .total_retrieved_documents ??
            0;
    }


    if (averageDistance) {

        averageDistance.innerText =
            analyticsRetrievalData
                .average_retrieval_distance ??
            0;
    }


    if (bestDistance) {

        const value =
            analyticsRetrievalData
                .best_retrieval_distance;


        bestDistance.innerText =
            value === null ||
            value === undefined
                ? "N/A"
                : Number(value).toFixed(4);
    }


    if (worstDistance) {

        const value =
            analyticsRetrievalData
                .worst_retrieval_distance;


        worstDistance.innerText =
            value === null ||
            value === undefined
                ? "N/A"
                : Number(value).toFixed(4);
    }


    /* -----------------------------------------
       QUERY TYPE DISTRIBUTION
       ----------------------------------------- */

    const queryTypeContainer =
        document.getElementById(
            "queryTypeAnalytics"
        );


    if (queryTypeContainer) {

        const statistics =
            analyticsQueryTypesData
                .query_type_statistics ||
            {};


        const entries =
            Object.entries(
                statistics
            );


        if (!entries.length) {

            queryTypeContainer.innerHTML = `
                <div class="analytics-empty">
                    No query-type data available.
                </div>
            `;

        } else {

            const total =
                entries.reduce(
                    function(
                        sum,
                        item
                    ) {

                        return sum +
                            Number(
                                item[1] || 0
                            );
                    },
                    0
                );


            queryTypeContainer.innerHTML =
                entries
                    .sort(
                        function(
                            a,
                            b
                        ) {

                            return Number(
                                b[1]
                            ) -
                            Number(
                                a[1]
                            );
                        }
                    )
                    .map(
                        function(item) {

                            const name =
                                item[0];


                            const count =
                                Number(
                                    item[1] || 0
                                );


                            const percentage =
                                total > 0
                                    ? (
                                        count /
                                        total
                                    ) * 100
                                    : 0;


                            return `
                                <div>

                                    <div
                                        class="analytics-list-row"
                                    >

                                        <span
                                            class="analytics-list-name"
                                        >
                                            ${escapeHTML(
                                                name
                                            )}
                                        </span>

                                        <span
                                            class="analytics-list-value"
                                        >
                                            ${count}
                                        </span>

                                    </div>

                                    <div
                                        class="analytics-progress"
                                    >

                                        <div
                                            class="analytics-progress-bar"
                                            style="width:${percentage}%"
                                        ></div>

                                    </div>

                                </div>
                            `;
                        }
                    )
                    .join("");
        }
    }


    /* -----------------------------------------
       DOMAIN DISTRIBUTION
       ----------------------------------------- */

    const domainContainer =
        document.getElementById(
            "domainAnalytics"
        );


    if (domainContainer) {

        const statistics =
            analyticsDomainsData
                .domain_statistics ||
            {};


        const entries =
            Object.entries(
                statistics
            );


        if (!entries.length) {

            domainContainer.innerHTML = `
                <div class="analytics-empty">
                    No domain data available.
                </div>
            `;

        } else {

            const total =
                entries.reduce(
                    function(
                        sum,
                        item
                    ) {

                        return sum +
                            Number(
                                item[1] || 0
                            );
                    },
                    0
                );


            domainContainer.innerHTML =
                entries
                    .sort(
                        function(
                            a,
                            b
                        ) {

                            return Number(
                                b[1]
                            ) -
                            Number(
                                a[1]
                            );
                        }
                    )
                    .map(
                        function(item) {

                            const name =
                                item[0];


                            const count =
                                Number(
                                    item[1] || 0
                                );


                            const percentage =
                                total > 0
                                    ? (
                                        count /
                                        total
                                    ) * 100
                                    : 0;


                            return `
                                <div>

                                    <div
                                        class="analytics-list-row"
                                    >

                                        <span
                                            class="analytics-list-name"
                                        >
                                            ${escapeHTML(
                                                name
                                            )}
                                        </span>

                                        <span
                                            class="analytics-list-value"
                                        >
                                            ${count}
                                        </span>

                                    </div>

                                    <div
                                        class="analytics-progress"
                                    >

                                        <div
                                            class="analytics-progress-bar"
                                            style="width:${percentage}%"
                                        ></div>

                                    </div>

                                </div>
                            `;
                        }
                    )
                    .join("");
        }
    }


    /* -----------------------------------------
       DAILY QUERY ACTIVITY
       ----------------------------------------- */

    const dailyContainer =
        document.getElementById(
            "dailyAnalytics"
        );


    if (dailyContainer) {

        const statistics =
            analyticsDailyData
                .daily_statistics ||
            {};


        const entries =
            Object.entries(
                statistics
            )
            .sort(
                function(
                    a,
                    b
                ) {

                    return a[0].localeCompare(
                        b[0]
                    );
                }
            );


        if (!entries.length) {

            dailyContainer.innerHTML = `
                <div class="analytics-empty">
                    No daily statistics available.
                </div>
            `;

        } else {

            const maxQueries =
                Math.max(
                    ...entries.map(
                        function(item) {

                            return Number(
                                item[1]
                                    .total_queries ||
                                0
                            );
                        }
                    ),
                    1
                );


            dailyContainer.innerHTML =
                entries
                    .map(
                        function(item) {

                            const date =
                                item[0];


                            const total =
                                Number(
                                    item[1]
                                        .total_queries ||
                                    0
                                );


                            const percentage =
                                (
                                    total /
                                    maxQueries
                                ) * 100;


                            return `
                                <div
                                    class="daily-stat-row"
                                >

                                    <div
                                        class="daily-date"
                                    >
                                        ${escapeHTML(
                                            date
                                        )}
                                    </div>

                                    <div
                                        class="daily-bar-area"
                                    >

                                        <div
                                            class="daily-bar"
                                            style="width:${percentage}%"
                                        ></div>

                                    </div>

                                    <div
                                        class="daily-count"
                                    >
                                        ${total}
                                    </div>

                                </div>
                            `;
                        }
                    )
                    .join("");
        }
    }


    /* -----------------------------------------
       COMMON USER QUERIES
       ----------------------------------------- */

    const commonQueriesContainer =
        document.getElementById(
            "commonQueriesAnalytics"
        );


    if (commonQueriesContainer) {

        const queries =
            analyticsCommonQueriesData
                .common_queries ||
            [];


        if (!queries.length) {

            commonQueriesContainer.innerHTML = `
                <div class="analytics-empty">
                    No common queries available.
                </div>
            `;

        } else {

            commonQueriesContainer.innerHTML =
                queries
                    .slice(
                        0,
                        10
                    )
                    .map(
                        function(item) {

                            return `
                                <div
                                    class="analytics-list-row"
                                >

                                    <span
                                        class="analytics-list-name"
                                    >

                                        ${escapeHTML(
                                            item.query ||
                                            "Unknown query"
                                        )}

                                    </span>

                                    <span
                                        class="analytics-list-value"
                                    >

                                        ${item.count || 0}

                                    </span>

                                </div>
                            `;
                        }
                    )
                    .join("");
        }
    }
}


/* =========================================================
   M4.1 UPDATE ANALYTICS DISPLAY
   ========================================================= */

function updateAnalyticsDisplay() {

    const totalQueries =
        document.getElementById(
            "totalQueries"
        );


    const answeredQueries =
        document.getElementById(
            "answeredQueries"
        );


    const unansweredQueries =
        document.getElementById(
            "unansweredQueries"
        );


    const clarificationQueries =
        document.getElementById(
            "clarificationQueries"
        );


    const knowledgeGapCount =
        document.getElementById(
            "knowledgeGapCount"
        );


    /* -----------------------------------------
       TOTAL
       ----------------------------------------- */

    const total =
        analyticsRecords.length;


    /* -----------------------------------------
       ANSWERED
       ----------------------------------------- */

    const answered =
        analyticsRecords.filter(
            function(record) {

                return Boolean(
                    record.answered
                );
            }
        ).length;


    /* -----------------------------------------
       UNANSWERED
       ----------------------------------------- */

    const unanswered =
        analyticsRecords.filter(
            function(record) {

                return !Boolean(
                    record.answered
                );
            }
        ).length;


    /* -----------------------------------------
       CLARIFICATIONS
       ----------------------------------------- */

    const clarifications =
        analyticsRecords.filter(
            function(record) {

                return Boolean(
                    record.needs_clarification
                );
            }
        ).length;


    /* -----------------------------------------
       KNOWLEDGE GAPS
       ----------------------------------------- */

    const knowledgeGaps =
        analyticsRecords.filter(
            function(record) {

                return Boolean(
                    record.knowledge_gap
                );
            }
        ).length;


    /* -----------------------------------------
       UPDATE KPI CARDS
       ----------------------------------------- */

    if (totalQueries) {

        totalQueries.innerText =
            total;
    }


    if (answeredQueries) {

        answeredQueries.innerText =
            answered;
    }


    if (unansweredQueries) {

        unansweredQueries.innerText =
            unanswered;
    }


    if (clarificationQueries) {

        clarificationQueries.innerText =
            clarifications;
    }


    if (knowledgeGapCount) {

        knowledgeGapCount.innerText =
            knowledgeGaps;
    }


    /* -----------------------------------------
       TABLE
       ----------------------------------------- */

    renderAnalyticsTable();


    /* -----------------------------------------
       KNOWLEDGE GAPS
       ----------------------------------------- */

    renderKnowledgeGaps(
        analyticsRecords
    );
}


/* =========================================================
   M4.1 FILTER INITIALIZATION
   ========================================================= */

function initializeAnalyticsFilters() {

    document
        .querySelectorAll(
            ".analytics-filter"
        )
        .forEach(
            function(button) {

                button.addEventListener(
                    "click",
                    function() {

                        document
                            .querySelectorAll(
                                ".analytics-filter"
                            )
                            .forEach(
                                function(item) {

                                    item.classList.remove(
                                        "active"
                                    );
                                }
                            );


                        this.classList.add(
                            "active"
                        );


                        currentAnalyticsFilter =
                            this.dataset.filter;


                        renderAnalyticsTable();
                    }
                );
            }
        );
}


/* =========================================================
   M4.1 REFRESH BUTTON
   ========================================================= */

function initializeAnalyticsRefreshButton() {

    const refreshAnalyticsButton =
        document.getElementById(
            "refreshAnalyticsButton"
        );


    if (!refreshAnalyticsButton) {

        return;
    }


    refreshAnalyticsButton.onclick =
        async function(event) {

            event.preventDefault();


            /*
             * Refresh does not create a new session.
             */

            await loadAnalytics();
        };
}


/* =========================================================
   M4.1 FILTER LOGIC
   ========================================================= */

function filterAnalyticsRecords() {

    if (
        currentAnalyticsFilter ===
        "all"
    ) {

        return analyticsRecords;
    }


    return analyticsRecords.filter(
        function(record) {

            const answered =
                Boolean(
                    record.answered
                );


            const gap =
                Boolean(
                    record.knowledge_gap
                );


            const queryType =
                String(
                    record.query_type ||
                    ""
                ).toLowerCase();


            if (
                currentAnalyticsFilter ===
                "answered"
            ) {

                return answered;
            }


            if (
                currentAnalyticsFilter ===
                "unanswered"
            ) {

                return !answered;
            }


            if (
                currentAnalyticsFilter ===
                "gap"
            ) {

                return gap;
            }


            if (
                currentAnalyticsFilter ===
                "factual"
            ) {

                return queryType.includes(
                    "factual"
                );
            }


            if (
                currentAnalyticsFilter ===
                "procedural"
            ) {

                return queryType.includes(
                    "procedural"
                );
            }


            if (
                currentAnalyticsFilter ===
                "ambiguous"
            ) {

                return queryType.includes(
                    "ambiguous"
                );
            }


            return true;
        }
    );
}


/* =========================================================
   M4.1 ANALYTICS TABLE
   ========================================================= */

function renderAnalyticsTable() {

    const analyticsTableBody =
        document.getElementById(
            "analyticsTableBody"
        );


    if (!analyticsTableBody) {

        return;
    }


    const records =
        filterAnalyticsRecords();


    if (!records.length) {

        analyticsTableBody.innerHTML = `

            <tr>

                <td colspan="7">

                    <div class="analytics-empty">

                        No analytics records found
                        for this session.

                    </div>

                </td>

            </tr>

        `;

        return;
    }


    /*
     * Newest first.
     */

    const sortedRecords =
        [...records].sort(
            function(
                a,
                b
            ) {

                const timeA =
                    new Date(
                        a.timestamp
                    ).getTime();


                const timeB =
                    new Date(
                        b.timestamp
                    ).getTime();


                return timeB -
                    timeA;
            }
        );


    analyticsTableBody.innerHTML =
        sortedRecords
            .map(
                function(record) {

                    const timestamp =
                        formatAnalyticsTime(
                            record.timestamp
                        );


                    const query =
                        record.query ||
                        "N/A";


                    const queryType =
                        record.query_type ||
                        "N/A";


                    const confidence =
                        Number(
                            record.confidence
                        );


                    const confidenceText =
                        isNaN(
                            confidence
                        )
                            ? "N/A"
                            : confidence.toFixed(
                                2
                            );


                    const answered =
                        Boolean(
                            record.answered
                        );


                    const knowledgeGap =
                        Boolean(
                            record.knowledge_gap
                        );


                    const documents =
                        Array.isArray(
                            record.retrieved_documents
                        )
                            ? record
                                .retrieved_documents
                                .length
                            : 0;


                    return `

                        <tr>

                            <td>
                                ${escapeHTML(
                                    timestamp
                                )}
                            </td>


                            <td>

                                <div
                                    class="analytics-query"
                                >

                                    ${escapeHTML(
                                        query
                                    )}

                                </div>

                            </td>


                            <td>

                                <span
                                    class="analytics-type"
                                >

                                    ${escapeHTML(
                                        queryType
                                    )}

                                </span>

                            </td>


                            <td>

                                <span
                                    class="analytics-confidence"
                                >

                                    ${confidenceText}

                                </span>

                            </td>


                            <td>

                                ${
                                    answered
                                        ? `
                                            <span
                                                class="analytics-answered"
                                            >
                                                ✓ Answered
                                            </span>
                                        `
                                        : `
                                            <span
                                                class="analytics-unanswered"
                                            >
                                                ✕ Unanswered
                                            </span>
                                        `
                                }

                            </td>


                            <td>

                                ${
                                    knowledgeGap
                                        ? `
                                            <span
                                                class="analytics-gap"
                                            >
                                                GAP DETECTED
                                            </span>
                                        `
                                        : `
                                            <span
                                                class="analytics-no-gap"
                                            >
                                                ✓ No gap
                                            </span>
                                        `
                                }

                            </td>


                            <td>

                                ${documents}

                            </td>

                        </tr>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   M4.1 KNOWLEDGE GAPS
   ========================================================= */

function renderKnowledgeGaps(
    sessionRecords
) {

    const knowledgeGapList =
        document.getElementById(
            "knowledgeGapList"
        );


    if (!knowledgeGapList) {

        return;
    }


    /*
     * Only current-session records.
     */

    const gaps =
        sessionRecords.filter(
            function(record) {

                return Boolean(
                    record.knowledge_gap
                );
            }
        );


    if (!gaps.length) {

        knowledgeGapList.innerHTML = `

            <div class="analytics-empty">

                ✓ No knowledge gaps detected
                in this session.

            </div>

        `;

        return;
    }


    /*
     * Group repeated questions.
     */

    const gapMap =
        new Map();


    gaps.forEach(
        function(gap) {

            const query =
                String(
                    gap.query ||
                    "Unknown query"
                );


            if (
                gapMap.has(
                    query
                )
            ) {

                const current =
                    gapMap.get(
                        query
                    );


                current.count++;

            } else {

                gapMap.set(
                    query,
                    {
                        query:
                            query,

                        queryType:
                            gap.query_type ||
                            "N/A",

                        count:
                            1
                    }
                );
            }
        }
    );


    const groupedGaps =
        Array.from(
            gapMap.values()
        )
        .sort(
            function(
                a,
                b
            ) {

                return b.count -
                    a.count;
            }
        );


    knowledgeGapList.innerHTML =
        groupedGaps
            .map(
                function(item) {

                    return `

                        <div
                            class="knowledge-gap-item"
                        >

                            <div
                                class="knowledge-gap-query"
                            >

                                ${escapeHTML(
                                    item.query
                                )}

                            </div>


                            <div
                                class="knowledge-gap-type"
                            >

                                ${escapeHTML(
                                    item.queryType
                                )}

                                ·

                                ${item.count}

                                occurrence${
                                    item.count === 1
                                        ? ""
                                        : "s"
                                }

                            </div>

                        </div>

                    `;
                }
            )
            .join("");
}


/* =========================================================
   M4.1 TIME FORMAT
   ========================================================= */

function formatAnalyticsTime(
    timestamp
) {

    if (!timestamp) {

        return "N/A";
    }


    const date =
        new Date(
            timestamp
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return String(
            timestamp
        );
    }


    return date.toLocaleString();
}


/* ==========================================
   START SPEECH FROM RESULT
   ========================================== */

function startSpeechFromResult() {

    if (!currentAnswerText) {

        return;
    }


    speakText(
        currentAnswerText
    );
}


/* ==========================================
   WEB SPEECH API
   ========================================== */

function initializeSpeechRecognition() {

    const SpeechRecognition =
        window.SpeechRecognition ||
        window.webkitSpeechRecognition;


    if (!SpeechRecognition) {

        console.warn(
            "Web Speech API is not supported."
        );

        return false;
    }


    recognition =
        new SpeechRecognition();


    recognition.continuous =
        false;

    recognition.interimResults =
        true;

    recognition.lang =
        "en-US";


    recognition.onstart =
        function() {

            usingWebSpeech =
                true;

            isListening =
                true;


            const voiceButton =
                document.getElementById(
                    "voiceButton"
                );


            const queryInput =
                document.getElementById(
                    "queryInput"
                );


            if (voiceButton) {

                voiceButton.innerText =
                    "⏹";

                voiceButton.classList.add(
                    "recording"
                );
            }


            if (queryInput) {

                queryInput.placeholder =
                    "Listening... speak your question";
            }
        };


    recognition.onresult =
        function(event) {

            const queryInput =
                document.getElementById(
                    "queryInput"
                );


            let transcript =
                "";


            for (
                let i =
                    event.resultIndex;

                i <
                    event.results.length;

                i++
            ) {

                transcript +=
                    event.results[i][0].transcript;
            }


            if (queryInput) {

                queryInput.value =
                    transcript.trim();
            }
        };


    recognition.onend =
        async function() {

            const queryInput =
                document.getElementById(
                    "queryInput"
                );


            resetVoice();


            if (
                queryInput &&
                queryInput.value.trim()
            ) {

                queryInput.placeholder =
                    "Question captured. Getting AI answer...";


                await askQuestion();

            } else {

                const result =
                    document.getElementById(
                        "result"
                    );


                if (result) {

                    result.innerHTML =
                        "⚠ No speech detected. Please try again.";
                }
            }
        };


    recognition.onerror =
        function(event) {

            console.error(
                "Web Speech API error:",
                event.error
            );


            resetVoice();


            if (
                event.error ===
                "not-allowed"
            ) {

                alert(
                    "Please allow microphone access in Chrome."
                );

            } else if (
                event.error ===
                "no-speech"
            ) {

                const result =
                    document.getElementById(
                        "result"
                    );


                if (result) {

                    result.innerHTML =
                        "⚠ No speech detected. Please try again.";
                }
            }
        };


    return true;
}


/* ==========================================
   MICROPHONE
   ========================================== */

async function startVoiceInput() {

    const queryInput =
        document.getElementById(
            "queryInput"
        );


    if (!queryInput) {

        return;
    }


    if (
        usingWebSpeech &&
        isListening
    ) {

        recognition.stop();

        return;
    }


    if (
        recognition &&
        !isListening
    ) {

        try {

            queryInput.placeholder =
                "Listening... speak your question";


            recognition.start();

            return;

        } catch (error) {

            console.error(
                "Web Speech start error:",
                error
            );
        }
    }


    await startWhisperRecording();
}


/* ==========================================
   WHISPER FALLBACK
   ========================================== */

async function startWhisperRecording() {

    const queryInput =
        document.getElementById(
            "queryInput"
        );


    const voiceButton =
        document.getElementById(
            "voiceButton"
        );


    if (
        !queryInput ||
        !voiceButton
    ) {

        return;
    }


    if (isListening) {

        if (mediaRecorder) {

            mediaRecorder.stop();
        }

        return;
    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        alert(
            "Microphone is not supported in this browser."
        );

        return;
    }


    try {

        const stream =
            await navigator.mediaDevices.getUserMedia({
                audio: true
            });


        audioChunks =
            [];


        let mimeType =
            "audio/webm";


        if (
            MediaRecorder.isTypeSupported &&
            MediaRecorder.isTypeSupported(
                "audio/webm"
            )
        ) {

            mimeType =
                "audio/webm";

        } else if (
            MediaRecorder.isTypeSupported &&
            MediaRecorder.isTypeSupported(
                "audio/ogg"
            )
        ) {

            mimeType =
                "audio/ogg";
        }


        mediaRecorder =
            new MediaRecorder(
                stream,
                {
                    mimeType:
                        mimeType
                }
            );


        isListening =
            true;


        voiceButton.innerText =
            "⏹";


        voiceButton.classList.add(
            "recording"
        );


        queryInput.placeholder =
            "Listening... speak your question";


        mediaRecorder.ondataavailable =
            function(event) {

                if (
                    event.data.size > 0
                ) {

                    audioChunks.push(
                        event.data
                    );
                }
            };


        mediaRecorder.onstop =
            async function() {

                stream
                    .getTracks()
                    .forEach(
                        track =>
                            track.stop()
                    );


                resetVoice();


                const audioBlob =
                    new Blob(
                        audioChunks,
                        {
                            type:
                                mimeType
                        }
                    );


                await sendAudioToWhisper(
                    audioBlob
                );
            };


        mediaRecorder.start();


    } catch (error) {

        console.error(
            "Microphone error:",
            error
        );


        alert(
            "Please allow microphone access in Chrome."
        );


        resetVoice();
    }
}


/* ==========================================
   SEND AUDIO TO WHISPER
   ========================================== */

async function sendAudioToWhisper(
    audioBlob
) {

    const queryInput =
        document.getElementById(
            "queryInput"
        );


    const result =
        document.getElementById(
            "result"
        );


    if (
        !queryInput ||
        !result
    ) {

        return;
    }


    queryInput.placeholder =
        "Converting speech to text...";


    const formData =
        new FormData();


    formData.append(
        "file",
        audioBlob,
        "voice_input.webm"
    );


    try {

        const response =
            await fetch(
                `${API_URL}/transcribe`,
                {
                    method:
                        "POST",

                    body:
                        formData
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Transcription failed"
            );
        }


        queryInput.value =
            data.text || "";


        if (
            !data.text ||
            !data.text.trim()
        ) {

            result.innerHTML =
                "⚠ No speech detected. Please try again.";


            queryInput.placeholder =
                "Type your question or use the microphone...";


            return;
        }


        queryInput.placeholder =
            "Question captured. Getting AI answer...";


        await askQuestion();


    } catch (error) {

        console.error(
            "Whisper error:",
            error
        );


        result.innerHTML =
            "❌ Speech-to-text failed. Please try again.";


        queryInput.placeholder =
            "Type your question or use the microphone...";
    }
}


/* ==========================================
   RESET MICROPHONE
   ========================================== */

function resetVoice() {

    const voiceButton =
        document.getElementById(
            "voiceButton"
        );


    const queryInput =
        document.getElementById(
            "queryInput"
        );


    isListening =
        false;

    usingWebSpeech =
        false;


    if (voiceButton) {

        voiceButton.innerText =
            "🎙";

        voiceButton.classList.remove(
            "recording"
        );
    }


    if (queryInput) {

        queryInput.placeholder =
            "Type your question or use the microphone...";
    }
}


/* ==========================================
   TEXT TO SPEECH
   ========================================== */

function speakText(
    text
) {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        console.warn(
            "Text-to-Speech is not supported."
        );

        return;
    }


    stopSpeech();


    const cleanText =
        String(text)
            .replace(
                /<[^>]*>/g,
                ""
            )
            .replace(
                /\n/g,
                " "
            )
            .trim();


    if (!cleanText) {

        return;
    }


    speechQueue =
        cleanText
            .match(
                /[^.!?]+[.!?]+|[^.!?]+$/g
            )
            ?.map(
                sentence =>
                    sentence.trim()
            ) ||
        [cleanText];


    speechIndex =
        0;

    isSpeechPaused =
        false;


    speakNextPart();
}


/* ==========================================
   SPEAK NEXT PART
   ========================================== */

function speakNextPart() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }


    if (
        speechIndex >=
        speechQueue.length
    ) {

        currentSpeech =
            null;

        return;
    }


    if (isSpeechPaused) {

        return;
    }


    const text =
        speechQueue[
            speechIndex
        ];


    currentSpeech =
        new SpeechSynthesisUtterance(
            text
        );


    const voiceSelect =
        document.getElementById(
            "voiceSelect"
        );


    const voices =
        window.speechSynthesis.getVoices();


    if (
        voiceSelect &&
        voiceSelect.value
    ) {

        const selectedVoice =
            voices.find(
                voice =>
                    voice.name ===
                    voiceSelect.value
            );


        if (selectedVoice) {

            currentSpeech.voice =
                selectedVoice;


            currentSpeech.lang =
                selectedVoice.lang;
        }

    } else {

        currentSpeech.lang =
            "en-US";
    }


    currentSpeech.rate =
        1;

    currentSpeech.pitch =
        1;

    currentSpeech.volume =
        1;


    currentSpeech.onend =
        function() {

            if (
                !isSpeechPaused
            ) {

                speechIndex++;

                speakNextPart();
            }
        };


    currentSpeech.onerror =
        function(event) {

            console.error(
                "TTS error:",
                event
            );
        };


    window.speechSynthesis.speak(
        currentSpeech
    );
}


/* ==========================================
   LOAD VOICES
   ========================================== */

function loadVoices() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }


    const voiceSelect =
        document.getElementById(
            "voiceSelect"
        );


    if (!voiceSelect) {

        return;
    }


    const voices =
        window.speechSynthesis.getVoices();


    if (!voices.length) {

        return;
    }


    const currentValue =
        voiceSelect.value;


    voiceSelect.innerHTML =
        "";


    const englishVoices =
        voices.filter(
            voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("en")
        );


    const availableVoices =
        englishVoices.length
            ? englishVoices
            : voices;


    availableVoices.forEach(
        function(voice) {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                voice.name;


            option.textContent =
                `${voice.name} (${voice.lang})`;


            voiceSelect.appendChild(
                option
            );
        }
    );


    if (
        currentValue &&
        availableVoices.some(
            voice =>
                voice.name ===
                currentValue
        )
    ) {

        voiceSelect.value =
            currentValue;
    }
}


/* ==========================================
   VOICE LIST UPDATE
   ========================================== */

if (
    "speechSynthesis"
    in window
) {

    window.speechSynthesis.onvoiceschanged =
        function() {

            loadVoices();
        };
}


/* ==========================================
   PAUSE SPEECH
   ========================================== */

function pauseSpeech() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }


    if (
        window.speechSynthesis.speaking
    ) {

        isSpeechPaused =
            true;


        window.speechSynthesis.pause();
    }
}


/* ==========================================
   RESUME SPEECH
   ========================================== */

function resumeSpeech() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }


    if (isSpeechPaused) {

        isSpeechPaused =
            false;


        if (
            window.speechSynthesis.paused
        ) {

            window.speechSynthesis.resume();

        } else {

            speakNextPart();
        }
    }
}


/* ==========================================
   STOP SPEECH
   ========================================== */

function stopSpeech() {

    if (
        !(
            "speechSynthesis"
            in window
        )
    ) {

        return;
    }


    isSpeechPaused =
        false;


    speechQueue =
        [];


    speechIndex =
        0;


    currentSpeech =
        null;


    window.speechSynthesis.cancel();
}


/* ==========================================
   SECURITY
   ========================================== */

function escapeHTML(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        String(text);


    return div.innerHTML;
}


/* ==========================================
   INITIALIZE APPLICATION
   ========================================== */

function initializeApp() {

    console.log(
        "AI Knowledge Retrieval Platform initialized."
    );


    /* --------------------------------------
       SPEECH
       -------------------------------------- */

    initializeSpeechRecognition();

    loadVoices();


    /* --------------------------------------
       UPLOAD BUTTON
       -------------------------------------- */

    const uploadButton =
        document.getElementById(
            "uploadButton"
        );


    if (uploadButton) {

        uploadButton.onclick =
            function(event) {

                event.preventDefault();

                uploadFile();
            };
    }


    /* --------------------------------------
       ASK BUTTON
       -------------------------------------- */

    const askButton =
        document.getElementById(
            "askButton"
        );


    if (askButton) {

        askButton.onclick =
            function(event) {

                event.preventDefault();

                askQuestion();
            };
    }


    /* --------------------------------------
       MICROPHONE BUTTON
       -------------------------------------- */

    const voiceButton =
        document.getElementById(
            "voiceButton"
        );


    if (voiceButton) {

        voiceButton.onclick =
            function(event) {

                event.preventDefault();

                startVoiceInput();
            };
    }


    /* --------------------------------------
       ENTER KEY FOR QUERY
       -------------------------------------- */

    const queryInput =
        document.getElementById(
            "queryInput"
        );


    if (queryInput) {

        queryInput.addEventListener(
            "keydown",
            function(event) {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    askQuestion();
                }
            }
        );
    }


    /* ======================================
       M3.1 CLARIFICATION BUTTON
       ====================================== */

    const clarificationButton =
        document.getElementById(
            "clarificationButton"
        );


    if (clarificationButton) {

        clarificationButton.onclick =
            function(event) {

                event.preventDefault();

                submitClarification();
            };
    }


    /* ======================================
       M3.1 CLARIFICATION ENTER KEY
       ====================================== */

    const clarificationInput =
        document.getElementById(
            "clarificationInput"
        );


    if (clarificationInput) {

        clarificationInput.addEventListener(
            "keydown",
            function(event) {

                if (
                    event.key === "Enter" &&
                    !event.shiftKey
                ) {

                    event.preventDefault();

                    submitClarification();
                }
            }
        );
    }


    /* ======================================
       EXISTING TTS CONTROLS
       ====================================== */

    const startSpeechButton =
        document.getElementById(
            "startSpeechButton"
        );


    if (startSpeechButton) {

        startSpeechButton.onclick =
            function(event) {

                event.preventDefault();

                startSpeechFromResult();
            };
    }


    const pauseSpeechButton =
        document.getElementById(
            "pauseSpeechButton"
        );


    if (pauseSpeechButton) {

        pauseSpeechButton.onclick =
            function(event) {

                event.preventDefault();

                pauseSpeech();
            };
    }


    const resumeSpeechButton =
        document.getElementById(
            "resumeSpeechButton"
        );


    if (resumeSpeechButton) {

        resumeSpeechButton.onclick =
            function(event) {

                event.preventDefault();

                resumeSpeech();
            };
    }


    const stopSpeechButton =
        document.getElementById(
            "stopSpeechButton"
        );


    if (stopSpeechButton) {

        stopSpeechButton.onclick =
            function(event) {

                event.preventDefault();

                stopSpeech();
            };
    }


    /* --------------------------------------
       VOICE SELECT
       -------------------------------------- */

    const voiceSelect =
        document.getElementById(
            "voiceSelect"
        );


    if (voiceSelect) {

        voiceSelect.onchange =
            function() {

                if (
                    currentAnswerText &&
                    window.speechSynthesis &&
                    window.speechSynthesis.speaking
                ) {

                    speakText(
                        currentAnswerText
                    );
                }
            };
    }


    /* ======================================
       HIDE M3 PANELS AT START
       ====================================== */

    const clarificationPanel =
        document.getElementById(
            "clarificationPanel"
        );


    if (clarificationPanel) {

        clarificationPanel.style.display =
            "none";
    }


    const transparencyPanel =
        document.getElementById(
            "transparencyPanel"
        );


    if (transparencyPanel) {

        transparencyPanel.style.display =
            "none";
    }


    /* ======================================
       M4.1 ANALYTICS
       ====================================== */

    initializeAnalyticsFilters();

    initializeAnalyticsRefreshButton();


    /*
     * First load:
     *
     * Existing backend records are treated
     * as old records.
     *
     * Current session starts at ZERO.
     */

    loadAnalytics();


    console.log(
        "Buttons, TTS controls and M4.1 analytics connected successfully."
    );
}


/* ==========================================
   START APPLICATION
   ========================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );

} else {

    initializeApp();
}