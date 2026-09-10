const API_URL = "http://127.0.0.1:8000";

let mediaRecorder = null;
let audioChunks = [];
let isListening = false;


// ==========================================
// FILE UPLOAD / BUILD KNOWLEDGE INDEX
// ==========================================

async function uploadFile() {

    const fileInput = document.getElementById("fileInput");
    const uploadStatus = document.getElementById("uploadStatus");

    if (!fileInput || !fileInput.files.length) {
        alert("Please select a document first.");
        return;
    }

    const file = fileInput.files[0];

    uploadStatus.innerText = "Uploading and indexing...";

    const formData = new FormData();
    formData.append("file", file);

    try {

        const response = await fetch(`${API_URL}/upload`, {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || "Upload failed");
        }

        uploadStatus.innerHTML =
            `✓ ${escapeHTML(data.filename)} indexed successfully<br>
             ${data.chunks} knowledge chunks created.`;

    } catch (error) {

        console.error("Upload error:", error);

        uploadStatus.innerText =
            "❌ Upload failed. Please check the backend.";
    }
}


// ==========================================
// ASK AI QUESTION
// ==========================================

async function askQuestion() {

    const queryInput = document.getElementById("queryInput");
    const result = document.getElementById("result");

    const query = queryInput.value.trim();

    if (!query) {

        result.innerHTML =
            "⚠ Please enter a question.";

        return;
    }

    result.innerHTML =
        "⏳ Processing your question...";

    try {

        const response = await fetch(`${API_URL}/query`, {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                query: query
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || "Query failed"
            );
        }

        const formattedAnswer =
            escapeHTML(data.answer)
            .replace(/\n/g, "<br>");

        result.innerHTML = `
            <div>

                <strong>AI Answer</strong>

                <p class="ai-answer">
                    ${formattedAnswer}
                </p>

                <hr>

                <small>
                    Query Type:
                    ${escapeHTML(data.query_type || "N/A")}

                    <br>

                    Confidence:
                    ${data.confidence || "N/A"}
                </small>

            </div>
        `;

    } catch (error) {

        console.error("Query error:", error);

        result.innerHTML =
            "❌ Unable to get an answer. Please check the backend.";
    }
}


// ==========================================
// MICROPHONE
// ==========================================

async function startVoiceInput() {

    const queryInput =
        document.getElementById("queryInput");

    const voiceButton =
        document.getElementById("voiceButton");

    if (isListening) {

        mediaRecorder.stop();

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
            new MediaRecorder(stream);

        isListening = true;

        voiceButton.innerText = "⏹";

        voiceButton.classList.add("recording");

        queryInput.placeholder =
            "Listening... speak your question";

        mediaRecorder.ondataavailable =
            function(event) {

                if (event.data.size > 0) {

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
                        track => track.stop()
                    );

                resetVoice();

                queryInput.placeholder =
                    "Converting speech to text...";

                const audioBlob =
                    new Blob(audioChunks, {
                        type: "audio/webm"
                    });

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


// ==========================================
// SEND AUDIO TO WHISPER
// ==========================================

async function sendAudioToWhisper(audioBlob) {

    const queryInput =
        document.getElementById("queryInput");

    const result =
        document.getElementById("result");

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
            data.text;

        if (!data.text.trim()) {

            result.innerHTML =
                "⚠ No speech detected. Please try again.";

            queryInput.placeholder =
                "Type your question or use the microphone...";

            return;
        }

        queryInput.placeholder =
            "Question captured. Getting AI answer...";

        setTimeout(
            function() {
                askQuestion();
            },
            500
        );

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


// ==========================================
// RESET MICROPHONE
// ==========================================

function resetVoice() {

    const voiceButton =
        document.getElementById("voiceButton");

    const queryInput =
        document.getElementById("queryInput");

    isListening = false;

    if (voiceButton) {

        voiceButton.innerText = "🎙";

        voiceButton.classList.remove(
            "recording"
        );
    }

    if (queryInput) {

        queryInput.placeholder =
            "Type your question or use the microphone...";
    }
}


// ==========================================
// SECURITY - ESCAPE HTML
// ==========================================

function escapeHTML(text) {

    const div =
        document.createElement("div");

    div.textContent =
        text;

    return div.innerHTML;
}