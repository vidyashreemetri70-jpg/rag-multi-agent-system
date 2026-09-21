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
   FILE UPLOAD
   ========================================== */

async function uploadFile() {

    const fileInput =
        document.getElementById("fileInput");

    const uploadStatus =
        document.getElementById("uploadStatus");

    if (!fileInput || !fileInput.files.length) {

        alert(
            "Please select a document first."
        );

        return;
    }

    const file =
        fileInput.files[0];

    uploadStatus.innerText =
        "Uploading and indexing...";

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

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Upload failed"
            );
        }

        uploadStatus.innerHTML =
            `✓ ${escapeHTML(data.filename)}
             indexed successfully<br>
             ${data.chunks}
             knowledge chunks created.`;

    } catch (error) {

        console.error(
            "Upload error:",
            error
        );

        uploadStatus.innerText =
            "❌ Upload failed. Please check the backend.";
    }
}


/* ==========================================
   ASK AI QUESTION
   ========================================== */

async function askQuestion() {

    const queryInput =
        document.getElementById(
            "queryInput"
        );

    const result =
        document.getElementById(
            "result"
        );

    const query =
        queryInput.value.trim();

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

                    body:
                        JSON.stringify({
                            query: query
                        })
                }
            );

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.detail ||
                "Query failed"
            );
        }


        /* ==================================
           CLARIFICATION
           ================================== */

        if (data.needs_clarification) {

            currentAnswerText =
                data.clarification_question;

            result.innerHTML = `
                <div>

                    <strong>
                        Clarification Needed
                    </strong>

                    <p class="ai-answer">
                        ${escapeHTML(
                            data.clarification_question
                        )}
                    </p>

                </div>
            `;

            createTTSControls();

            speakText(
                data.clarification_question
            );

            return;
        }


        /* ==================================
           STORE ANSWER
           ================================== */

        currentAnswerText =
            data.answer || "";


        /* ==================================
           FORMAT ANSWER
           ================================== */

        const formattedAnswer =
            escapeHTML(
                data.answer || ""
            ).replace(
                /\n/g,
                "<br>"
            );


        /* ==================================
           DISPLAY ANSWER
           ================================== */

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
                        data.query_type ||
                        "N/A"
                    )}

                    <br>

                    Confidence:
                    ${data.confidence ||
                    "N/A"}

                </small>

            </div>
        `;


        createTTSControls();

        loadVoices();

        speakText(
            data.answer || ""
        );

    } catch (error) {

        console.error(
            "Query error:",
            error
        );

        result.innerHTML =
            "❌ Unable to get an answer. Please check the backend.";
    }
}


/* ==========================================
   CREATE TTS CONTROLS
   ========================================== */

function createTTSControls() {

    const oldControls =
        document.getElementById(
            "dynamicTTSControls"
        );

    if (oldControls) {

        oldControls.remove();
    }


    const oldVoice =
        document.getElementById(
            "dynamicTTSVoice"
        );

    if (oldVoice) {

        oldVoice.remove();
    }


    const controls =
        document.createElement(
            "div"
        );

    controls.id =
        "dynamicTTSControls";

    controls.style.display =
        "flex";

    controls.style.alignItems =
        "center";

    controls.style.gap =
        "8px";

    controls.style.marginTop =
        "12px";

    controls.style.flexWrap =
        "wrap";


    function createButton(
        text,
        clickFunction,
        gradient
    ) {

        const button =
            document.createElement(
                "button"
            );

        button.type =
            "button";

        button.innerText =
            text;

        button.style.appearance =
            "none";

        button.style.webkitAppearance =
            "none";

        button.style.background =
            gradient;

        button.style.color =
            "#ffffff";

        button.style.border =
            "none";

        button.style.borderRadius =
            "8px";

        button.style.padding =
            "9px 15px";

        button.style.fontFamily =
            '"Noto Sans JP", sans-serif';

        button.style.fontSize =
            "11px";

        button.style.fontWeight =
            "700";

        button.style.cursor =
            "pointer";

        button.style.outline =
            "none";

        button.style.boxShadow =
            "0 4px 15px rgba(255,45,149,0.35)";

        button.style.transition =
            "all 0.2s ease";


        button.onmouseenter =
            function() {

                button.style.background =
                    "linear-gradient(135deg, #ff0080, #7c3aed, #00bfff)";

                button.style.transform =
                    "translateY(-2px)";

                button.style.boxShadow =
                    "0 7px 22px rgba(255,45,149,0.55)";
            };


        button.onmouseleave =
            function() {

                button.style.background =
                    gradient;

                button.style.transform =
                    "translateY(0)";

                button.style.boxShadow =
                    "0 4px 15px rgba(255,45,149,0.35)";
            };


        button.onclick =
            clickFunction;

        return button;
    }


    controls.appendChild(
        createButton(
            "🔊 Start",
            startSpeechFromResult,
            "linear-gradient(135deg, #ff2d95, #8b5cf6, #00c6ff)"
        )
    );


    controls.appendChild(
        createButton(
            "⏸ Pause",
            pauseSpeech,
            "linear-gradient(135deg, #ff8a00, #ff2d55)"
        )
    );


    controls.appendChild(
        createButton(
            "▶ Resume",
            resumeSpeech,
            "linear-gradient(135deg, #00c853, #00a8ff)"
        )
    );


    controls.appendChild(
        createButton(
            "⏹ Stop",
            stopSpeech,
            "linear-gradient(135deg, #ff1744, #d50000)"
        )
    );


    const result =
        document.getElementById(
            "result"
        );

    result.parentNode.insertBefore(
        controls,
        result.nextSibling
    );


    const voiceArea =
        document.createElement(
            "div"
        );

    voiceArea.id =
        "dynamicTTSVoice";

    voiceArea.style.display =
        "flex";

    voiceArea.style.alignItems =
        "center";

    voiceArea.style.gap =
        "8px";

    voiceArea.style.marginTop =
        "8px";

    voiceArea.style.fontSize =
        "12px";


    const label =
        document.createElement(
            "span"
        );

    label.innerText =
        "Voice:";

    label.style.color =
        "#ff4ca3";

    label.style.fontWeight =
        "600";


    const select =
        document.createElement(
            "select"
        );

    select.id =
        "voiceSelect";

    select.style.appearance =
        "none";

    select.style.background =
        "#111827";

    select.style.color =
        "#ffffff";

    select.style.border =
        "1px solid #e32683";

    select.style.borderRadius =
        "6px";

    select.style.padding =
        "6px 10px";

    select.style.fontFamily =
        '"Noto Sans JP", sans-serif';

    select.style.fontSize =
        "11px";

    select.style.outline =
        "none";

    select.style.cursor =
        "pointer";


    voiceArea.appendChild(
        label
    );

    voiceArea.appendChild(
        select
    );


    controls.parentNode.insertBefore(
        voiceArea,
        controls.nextSibling
    );

    loadVoices();
}


/* ==========================================
   START SPEECH
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

            let transcript = "";

            for (
                let i = event.resultIndex;
                i < event.results.length;
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

    const voiceButton =
        document.getElementById(
            "voiceButton"
        );


    /* --------------------------------------
       STOP WEB SPEECH
       -------------------------------------- */

    if (
        usingWebSpeech &&
        isListening
    ) {

        recognition.stop();

        return;
    }


    /* --------------------------------------
       WEB SPEECH API
       -------------------------------------- */

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


    /* --------------------------------------
       WHISPER FALLBACK
       -------------------------------------- */

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


        audioChunks = [];


        mediaRecorder =
            new MediaRecorder(
                stream
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
                                "audio/webm"
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
                    method: "POST",
                    body: formData
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

function speakText(text) {

    if (
        !("speechSynthesis" in window)
    ) {

        console.warn(
            "Text-to-Speech is not supported."
        );

        return;
    }


    stopSpeech();


    const cleanText =
        text
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
            ) || [cleanText];


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
        !("speechSynthesis" in window)
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
        window.speechSynthesis
            .getVoices();


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

            if (!isSpeechPaused) {

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
        !("speechSynthesis" in window)
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
        window.speechSynthesis
            .getVoices();


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
}


/* ==========================================
   VOICE LIST UPDATE
   ========================================== */

if (
    "speechSynthesis" in window
) {

    window.speechSynthesis.onvoiceschanged =
        function() {

            loadVoices();
        };
}


/* ==========================================
   PAUSE
   ========================================== */

function pauseSpeech() {

    if (
        !("speechSynthesis" in window)
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
   RESUME
   ========================================== */

function resumeSpeech() {

    if (
        !("speechSynthesis" in window)
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
   STOP
   ========================================== */

function stopSpeech() {

    if (
        !("speechSynthesis" in window)
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

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );

    div.textContent =
        text;

    return div.innerHTML;
}


/* ==========================================
   INITIALIZE WEB SPEECH API
   ========================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        initializeSpeechRecognition();

        loadVoices();
    }
);