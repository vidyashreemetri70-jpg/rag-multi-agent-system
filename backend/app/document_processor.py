from pathlib import Path
from pypdf import PdfReader
from docx import Document
import pandas as pd


def extract_text(file_path: str) -> str:
    """
    Extract text from PDF, DOCX, TXT, or CSV files.
    """

    path = Path(file_path)
    extension = path.suffix.lower()

    # PDF
    if extension == ".pdf":
        reader = PdfReader(file_path)
        text = []

        for page in reader.pages:
            page_text = page.extract_text()

            if page_text:
                text.append(page_text)

        return "\n".join(text)

    # DOCX
    elif extension == ".docx":
        document = Document(file_path)
        paragraphs = []

        for paragraph in document.paragraphs:
            if paragraph.text.strip():
                paragraphs.append(paragraph.text)

        return "\n".join(paragraphs)

    # TXT
    elif extension == ".txt":
        with open(file_path, "r", encoding="utf-8") as file:
            return file.read()

    # CSV
    elif extension == ".csv":
        dataframe = pd.read_csv(file_path)

        return dataframe.to_string(index=False)

    else:
        raise ValueError(
            f"Unsupported file type: {extension}. "
            "Supported types are PDF, DOCX, TXT and CSV."
        )


def clean_text(text: str) -> str:
    """
    Clean and normalize extracted text.
    """

    # Remove extra spaces, tabs and new lines
    text = " ".join(text.split())

    # Remove leading and trailing spaces
    text = text.strip()

    return text