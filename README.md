# Multi-Agent RAG System

A Multi-Agent Retrieval-Augmented Generation (RAG) system with knowledge base ingestion, semantic retrieval, query understanding, response generation, and multi-agent orchestration.

## Project Objective

The objective of this project is to develop an AI-Based Knowledge Retrieval Platform with Query Resolution System that can retrieve relevant information from uploaded documents and generate accurate, knowledge-grounded responses.

## Milestone 1

Milestone 1 focuses on:

* RAG architecture and retrieval pipeline
* Knowledge base ingestion
* Document text extraction
* Data cleaning and chunking
* Embedding generation
* Vector store indexing
* Semantic search
* Query understanding
* Response generation
* System architecture and agent design

## Milestone 2

Milestone 2 focuses on implementing the multi-agent query resolution system:

* Query Understanding Agent
* Retrieval Agent
* Response Generation Agent
* Multi-Agent Orchestration
* Query classification
* Confidence scoring
* Top-K semantic retrieval
* Low-relevance result handling
* Knowledge-grounded response generation
* Source-based responses
* Factual, procedural, comparative and ambiguous query handling

## Supported Documents

* PDF
* DOCX
* TXT
* CSV

## System Architecture

The system architecture is available in:

* `docs/architecture.png`
* `docs/architecture.drawio`

![System Architecture](docs/architecture.png)

## Main Agents

1. Query Understanding Agent
2. Retrieval Agent
3. Response Generation Agent
4. Clarification Agent
5. Conversation Memory Agent

## Multi-Agent Query Flow

User Query  
↓  
Query Understanding Agent  
↓  
Retrieval Agent  
↓  
Response Generation Agent  
↓  
Final Answer

The Query Understanding Agent classifies the user query as factual, procedural, comparative, or ambiguous.

The Retrieval Agent searches the vector database and retrieves the most relevant document chunks using semantic similarity.

The Response Generation Agent generates a grounded response using the retrieved information and avoids unsupported information.

The Multi-Agent Orchestrator manages the complete flow between the agents.

## Technology Stack

### Frontend

- HTML
- CSS
- JavaScript
- Web Speech API

### Backend

- Python
- FastAPI

### AI / RAG

- Large Language Model (LLM)
- Embeddings
- Sentence Transformers
- Semantic Search
- Retrieval-Augmented Generation (RAG)
- Multi-Agent AI

### Document Processing

- PDF processing
- DOCX processing
- TXT processing
- CSV processing
- Text cleaning
- Chunking

### Vector Database

- ChromaDB
- Vector Store

### Development Tools

- Git
- GitHub
- Draw.io
- VS Code
- Ollama

## Project Documentation

Technical understanding and research are available in:

`docs/technical-understanding.md`

## Project Status

Milestone 1 - Foundation and Knowledge Retrieval - Completed

Milestone 2 - Multi-Agent Query Resolution - In Progress