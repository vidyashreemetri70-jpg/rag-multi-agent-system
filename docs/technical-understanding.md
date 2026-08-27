 M1— Research & Technical Understanding
1. Overview

The proposed system is a "Multi-Agent Retrieval-Augmented Generation (RAG) system" designed to provide reliable, context-aware responses using information stored in an organization-specific knowledge base.

The system combines document ingestion, text processing, semantic embeddings, vector search, RAG-based response generation, multi-agent orchestration, conversation memory, and voice interaction.

The primary objective of Milestone 1 is to establish the foundation for "knowledge retrieval and intelligent query resolution".

2. Retrieval-Augmented Generation (RAG)

"Retrieval-Augmented Generation (RAG)" is an architecture that combines information retrieval with a Large Language Model (LLM).

Instead of relying only on the knowledge contained within the LLM, the system first retrieves relevant information from an external knowledge base. The retrieved information is then provided to the LLM as contextual information for generating the final response.

The RAG process is:
----------------------------------------------------
User Query
    ↓
Query Processing
    ↓
Semantic Retrieval
    ↓
Relevant Document Chunks
    ↓
Context Construction
    ↓
LLM
    ↓
Generated Response
--------------------------------------------------
RAG provides an effective approach for working with private, domain-specific, and frequently updated information without requiring the underlying LLM to be retrained for every knowledge-base update.


3. End-to-End RAG Pipeline

The proposed RAG pipeline consists of two major workflows: "knowledge-base ingestion" and "query-time retrieval and generation".

Knowledge-Base Ingestion

-------------------------------------------------
Document Upload
      ↓
File Validation
      ↓
Text Extraction
      ↓
Text Cleaning & Normalization
      ↓
Document Chunking
      ↓
Embedding Generation
      ↓
Vector Store Indexing
      ↓
Knowledge Base
--------------------------------------------------

The ingestion module will support:

* PDF
* DOCX
* TXT
* CSV

Each document is converted into text, cleaned, divided into meaningful chunks, converted into vector embeddings, and indexed in the vector database along with appropriate metadata.

* Query-Time Pipeline

----------------------------------------
User Query
      ↓
Query Understanding
      ↓
Query Embedding
      ↓
Semantic Vector Search
      ↓
Top-K Relevant Chunks
      ↓
Context Construction
      ↓
Response Generation
      ↓
LLM
      ↓
Answer + Citations
--------------------------------------------

This separation allows the knowledge base to be processed independently from user queries.


4. Semantic Embeddings

An "embedding" is a numerical representation of text in a high-dimensional vector space.

The embedding model converts a document chunk into a vector representation:

-----------------------------
Document Chunk
      ↓
Embedding Model
      ↓
Numerical Vector
------------------------------

Similarly, the user's query is converted into an embedding.

The system compares the query embedding with document embeddings to identify semantically related information.

For example, the query:

> "How can a student become eligible for the examination?"

may retrieve a document chunk containing:

> "Students must satisfy the prescribed examination eligibility criteria."

Even though the wording differs, the semantic meaning is similar.


5. Semantic Similarity and Vector Search

"Semantic similarity" determines how closely two pieces of text are related in meaning.

The vector database stores embeddings generated from document chunks. During query processing, the user query is converted into an embedding and compared against stored vectors.

-------------------------------------------------------------------
                    Query
                      ↓
                Query Embedding
                      ↓
              Vector Similarity
                      ↓
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
     Chunk 1       Chunk 2       Chunk 3
     Score: .92    Score: .84    Score: .71
--------------------------------------------------------------------

The highest-scoring chunks are selected as the most relevant context for response generation.

The initial implementation will use **Top-K retrieval**, with Top-5 retrieval used as the initial evaluation configuration.


6. Document Chunking

Large documents cannot always be processed efficiently as a single unit. Therefore, documents are divided into smaller sections called **chunks**.

The initial chunking strategy will use a configurable chunk size and overlap.

Proposed initial configuration:

* Chunk size: "500–800 tokens"
* Chunk overlap: "50–100 tokens"

Overlap preserves contextual information between neighboring chunks.

Each chunk will retain metadata such as:

--------------------------------------
chunk_id
document_id
filename
file_type
chunk_index
source_information
-----------------------------------------

The chunking configuration will be evaluated and refined based on retrieval performance.


7. Multi-Agent Query Resolution

The system uses a "multi-agent architecture" in which specialized agents perform different stages of query resolution.

The proposed agents are:

> Query Understanding Agent

Responsible for:

* Interpreting the user's query.
* Identifying the query intent.
* Extracting important information from the query.
* Determining whether additional clarification is required.

> Retrieval Agent

Responsible for:

* Generating or receiving the query representation.
* Searching the vector database.
* Performing semantic similarity search.
* Selecting the most relevant document chunks.
* Returning retrieval results with similarity scores and metadata.

> Response Generation Agent

Responsible for:

* Receiving the user query and retrieved context.
* Constructing the response-generation prompt.
* Using the LLM to generate the final response.
* Maintaining factual grounding in the retrieved information.

> Clarification Agent

Responsible for:

* Detecting ambiguous or incomplete queries.
* Identifying missing information.
* Requesting clarification from the user before retrieval or response generation.

> Conversation Memory Agent

Responsible for:

* Maintaining relevant conversation history.
* Providing previous conversational context when required.
* Supporting context-aware follow-up questions.


8. Multi-Agent Orchestration

The "Multi-Agent Orchestrator" acts as the control layer for the agents.

The proposed orchestration flow is:

------------------------------------------------------
                 User Query
                     ↓
          Query Understanding Agent
                     ↓
              Query Classification
                     ↓
          ┌──────────┴──────────┐
          │                     │
      Clear Query          Ambiguous Query
          │                     │
          ↓                     ↓
 Retrieval Agent       Clarification Agent
          │                     │
          ↓                User Clarification
 Relevant Chunks              │
          │_____________________│
                     ↓
          Response Generation Agent
                     ↓
                    LLM
                     ↓
          Response + Citations
---------------------------------------------------

The Conversation Memory Agent can provide previous conversational context whenever the current query depends on earlier interactions.

The orchestration layer allows the architecture to be extended with additional specialized agents in future milestones.



9. Web Speech API Integration

The system will support browser-based voice interaction using the **Web Speech API**.

> Speech-to-Text

The Speech Recognition interface converts spoken input into text.

--------------------------------------
User Speech
     ↓
Web Speech API
     ↓
Text Query
     ↓
RAG Pipeline
-------------------------------------

> Text-to-Speech

The Speech Synthesis interface converts the generated response into spoken output.

-----------------------------------------
Generated Response
     ↓
Web Speech API
     ↓
Voice Response
-----------------------------------------

Voice interaction is treated as an additional input/output interface and does not change the underlying RAG retrieval architecture.



10. Knowledge Base Ingestion

The Knowledge Base Ingestion Module will provide a common processing pipeline for multiple document formats.

----------------------------------
PDF / DOCX / TXT / CSV
          ↓
      File Upload
          ↓
    Format Detection
          ↓
    Text Extraction
          ↓
     Text Cleaning
          ↓
       Chunking
          ↓
     Embeddings
          ↓
   Vector Store Index
----------------------------------------

The implementation will maintain document and chunk metadata to support traceability and source citation during retrieval.



11. Proposed Data Models

> Document

---------------------------------
document_id
filename
file_type
file_size
upload_timestamp
document_metadata
----------------------------------

> Chunk

--------------------------------
chunk_id
document_id
chunk_index
chunk_text
metadata
-------------------------------

> Embedding

----------------------------------
embedding_id
chunk_id
embedding_model
embedding_vector
----------------------------------

> Query

----------------------------------
query_id
query_text
timestamp
session_id
----------------------------------

> Retrieval Result

----------------------------------
query_id
chunk_id
similarity_score
rank
metadata
---------------------------------

> Response

-----------------------------------------
response_id
query_id
response_text
source_chunks
citations
confidence_information
timestamp
---------------------------------------

These models provide traceability between the original document, individual chunks, retrieval results, and generated responses.



12. Technology Selection

| Component           | Proposed Technology                            | Purpose                                 |
| ------------------- | ---------------------------------------------- | --------------------------------------- |
| Frontend            | React.js                                       | User interface and document upload      |
| Backend             | Python + FastAPI                               | API and application services            |
| RAG Framework       | LangChain                                      | Document and retrieval pipeline support |
| Agent Orchestration | LangGraph                                      | Multi-agent workflow orchestration      |
| Embedding Model     | Sentence Transformers / selected embedding API | Semantic vector generation              |
| Vector Database     | ChromaDB                                       | Vector storage and similarity search    |
| LLM                 | Selected foundation model/API                  | Response generation                     |
| PDF Processing      | PyMuPDF                                        | PDF text extraction                     |
| DOCX Processing     | python-docx                                    | DOCX text extraction                    |
| TXT Processing      | Python file handling                           | Plain-text extraction                   |
| CSV Processing      | Pandas / Python CSV                            | Structured text extraction              |
| Voice Interface     | Web Speech API                                 | Speech-to-text and text-to-speech       |
| Version Control     | Git + GitHub                                   | Source-code management                  |

The final choice of embedding model and LLM will be validated against implementation requirements, cost, latency, and retrieval quality.



13. Architecture Decisions

The following decisions have been established for Milestone 1:

1) Use RAG as the primary knowledge-retrieval architecture.
2) Use a separate knowledge ingestion pipeline and query-time retrieval pipeline.
3) Support PDF, DOCX, TXT, and CSV documents.
4) Convert documents into normalized text before chunking.
5) Use configurable chunk size and overlap.
6) Generate embeddings for individual document chunks.
7) Store embeddings together with document and chunk metadata.
8) Use vector similarity search for semantic retrieval.
9) Use specialized agents for query understanding, retrieval, response generation, clarification, and conversation memory.
10) Use a centralized Multi-Agent Orchestrator to control agent execution.
11) Use retrieved document context to ground LLM responses.
12) Include source metadata to support response citations and retrieval transparency.
13) Use the Web Speech API as the browser-based voice interface.
14) Evaluate retrieval using Top-1, Top-3, and Top-5 accuracy.
15) Validate the system using knowledge bases from two different domains.


14. M1.1 Expected Outcome

At the completion of M1.1, the team will have:

1) A clear understanding of RAG architecture.
2) A defined end-to-end retrieval pipeline.
3) A multi-agent query-resolution strategy.
4) Defined responsibilities for all required agents.
5) A proposed orchestration mechanism.
6) An understanding of embeddings, semantic similarity, chunking, and vector search.
7) A proposed Web Speech API integration approach.
8) A defined technology stack.
9) Documented architecture and technology decisions.
