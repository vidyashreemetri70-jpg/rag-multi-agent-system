from faster_whisper import WhisperModel

model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)


def transcribe_audio(audio_file):

    segments, info = model.transcribe(
        audio_file,
        language="en"
    )

    text = ""

    for segment in segments:
        text += segment.text

    return text.strip()
