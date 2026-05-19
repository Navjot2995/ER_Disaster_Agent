# ER Gemma Vision: Offline Multimodal Triage for Global Resilience

## Track: Health & Sciences & Global Resilience

### The Problem: When the World Goes Offline
Disaster zones, rural field hospitals, and underfunded clinics share a critical bottleneck: triage. When patient volume spikes—whether from a localized cholera outbreak, a Category 5 hurricane, or a generic overflowing ER—medical staff face immense cognitive overload. Clinical errors in triage mapping (under-triaging a myocardial infarction as indigestion) happen precisely when staff are most exhausted.

Compounding this problem is the reality of global infrastructure: **Cloud-based LLMs are useless when the internet drops.** We cannot rely on API endpoints to handle HIPAA-compliant diagnostic support in 0-connectivity environments.

### Our Solution: ER Gemma Vision
We built **ER Gemma Vision**, a multimodal, offline-first clinical decision support system. Harnessing the power of the **Gemma 4** open-model weights, we designed an architecture capable of digesting voice dictations, vital signs, patient history, and Chest X-Rays locally—outputting rigid, deterministic triage support grounded entirely in offline Vector Database RAG. 

By eliminating the cloud, we eliminated latency, guaranteed 100% uptime, and secured patient privacy natively.

---

### Technical Architecture & Innovation

To bridge the gap between "Generative Chatbot" and "Clinical Medical Agent," we implemented three massive enhancements over standard inference loops:

#### 1. Agentic Retrieval Augmented Generation (RAG)
Generic LLMs hallucinate medical data. To prevent this, ER Gemma Vision utilizes a **Local FAISS Vector Database**.
We embedded physical World Health Organization (WHO) Trauma Guidelines, CTAS (Canadian Triage Acuity Scale), and qSOFA Sepsis markers into markdown files bundled with the application.
Before Gemma 4 ever sees the patient's data, our Python Orchestrator (`ingest_docs.py`) queries the FAISS index. If a patient presents with a fever of 39.0°C and a heart rate of 110 bpm, the Vector DB literally extracts the "qSOFA Sepsis Recognition Protocol" and injects it into the LLM runtime context. Gemma 4 is forced to cross-reference the patient against the exact text of the medical guideline.

#### 2. Domain Adaptation via Few-Shot Formatting (MIMIC-IV-ED)
We knew we could not allow a triage tool to output conversational paragraphs. Triage requires fast, scannable data. 
We performed extreme prompt engineering using domain-adapted data from the **MIMIC-IV-ED (Emergency Department)** dataset. We provided Gemma 4 with rigid, few-shot examples mapping specific vital constellations to absolute Urgent, Emergent, and Non-Urgent states.
We forcibly locked Gemma's output format into strict JSON, returning precisely structured arrays:
`urgency_level` (RED/YELLOW/GREEN)
`likely_concerns`
`immediate_next_steps`
`escalation_triggers`
By doing this, we stripped the "chatbot" persona entirely and forged a deterministic "evaluator agent."

#### 3. Native Multimodal Vision (CT Scans & X-Rays)
True ER support requires processing medical imaging. Instead of chaining together fragile, separate models, we utilized the native multimodal capabilities of **Gemma 4**.
When a user uploads a Chest X-Ray or Brain CT Scan into the React Frontend, the image is processed directly by Gemma. We explicitly prompted the model to act as a universal radiologist—first identifying the modality (e.g., Head CT vs. Bone X-Ray) and then searching for modality-specific critical indicators (e.g., midline shift in a CT, or opacities in a Chest X-Ray). 
The parsed imaging findings are seamlessly integrated into the triage orchestration loop, granting the application immense diagnostic power without relying on external APIs.

#### 4. The Offline "LLM-as-a-Judge" Safety Audit
Medical LLMs can inadvertently downplay severe symptoms. To combat this, we built a secondary, autonomous validation loop. After the primary triage agent outputs its JSON, a completely separate offline safety prompt acts as a "Senior Attending Physician." It reviews the generated triage and the raw intake data. If it detects that a life-threatening symptom (like a heart attack) was incorrectly assigned a "GREEN" urgency, the auditor forcibly corrects the JSON to "RED" and provides a `safety_audit` explanation to the clinician, ensuring fail-safe reliability.

---

### Safety & Trust (Handling Edge AI Ethics)
Our app forces the Gemma model to adhere to strict safety paradigms in the architectural layer:
1. **Never Diagnose:** The system prompts contain explicit weights forbidding the model from acting as a definitive physician. It acts strictly as a "Triage Synthesizer."
2. **Medication Guardrails:** The app generates suggested medications but automatically attaches disclaimers requiring clinician approval and contraindication checks.
3. **Medical Terminology Dictionary:** We parse generated medical jargon (like "Dysuria" or "Hypoxia") and automatically attach layman's definitions to the output, ensuring non-medical patients aren't left confused by clinical terminology.
4. **Translation Verification:** The UI uses a dedicated translation stream to deliver culturally localized, comforting explanations without losing medical accuracy.

### Project Links & Attachments
*   **Public Code Repository (GitHub):** [Insert Link Here]
*   **Live Demo (HuggingFace Spaces Proxy):** [Insert Link Here]
*   **Demo Video (YouTube):** [Insert Link Here]

### The Future: LiteRT-LM & Android
We built this as a FastAPI/React SPA to prove the logic. But the true destiny of ER Gemma Vision is to run natively on mobile devices. Our repository ships with the core designs required to port this architecture into Kotlin using **LiteRT-LM** (TensorFlow Lite for Large Language Models). 

By quantizing the Gemma 4 weights to `int8` and swapping our FAISS db for ObjectBox, we can flash this entire application onto $100 Android tablets. When we achieve that, we completely democratize access to world-class triage intelligence, ensuring that whether you are in a hospital in Tokyo or a refugee camp post-earthquake, your first triage assessment is evaluated with precision, safety, and speed.