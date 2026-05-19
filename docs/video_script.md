# ER Gemma Vision: 3-Minute Demo Video Script

**[0:00 - 0:15] TITLE SEQUENCE & HOOK**
*(Visual: Fast-paced shots of crowded emergency waiting rooms. Cut to a sleek, dark-mode terminal running Ollama, transitioning to the React UI).*
**Narrator (Voiceover):** "In emergency settings, every second counts. But in low-resource or disaster zones, internet connectivity is the first thing to drop. Introducing ER Gemma Vision—a fully offline, multimodal AI triage assistant."

**[0:15 - 0:45] MULTIMODAL INTAKE DEMO**
*(Visual: Screen recording of the 'Patient Intake' dashboard).*
**Narrator:** "Our system runs completely locally on a standard laptop using the Gemma 4 multimodal model. A triage nurse can rapidly type or dictate symptoms."
*(Action: Mouse clicks Dictate. The screen transcribes: "Severe headache, sudden onset, blurred vision.")*
**Narrator:** "To leverage the full power of Gemma 4, we drag-and-drop a patient's medical imaging directly into the intake form—in this case, a Brain CT scan."

**[0:45 - 1:15] BEHIND THE SCENES: THE RAG & SAFETY PIPELINE**
*(Visual: Split screen. Left side shows the UI loading. Right side shows the local python backend parsing FAISS and running the safety loop).*
**Narrator:** "Behind the scenes, we aren't just querying an LLM. Our FAISS Vector Database instantly pulls relevant offline medical protocols. Gemma then processes the CT Scan natively, identifying anomalies like a midline shift."
*(Action: Highlight the terminal logs showing "Running AI Safety Audit...").*
**Narrator:** "Before the clinician sees the result, an autonomous 'LLM-as-a-Judge' safety loop reviews the output, ensuring critical symptoms aren't hallucinated or under-triaged."

**[1:15 - 1:45] TRIAGE RESULT & ACCESSIBILITY**
*(Visual: The screen flashes to the Triage Result. A massive RED urgency badge appears).*
**Narrator:** "Gemma 4 fuses the vitals, imaging, and protocols to generate a strict, standardized JSON response. It flags the case as RED, lists likely concerns, and suggests immediate interventions with clinician-approval disclaimers."
*(Action: Mouse hovers over the "Medical Terms Explained" section).*
**Narrator:** "To aid non-medical users, it even extracts complex medical jargon and dynamically builds a layman's dictionary."

**[1:45 - 2:00] STREAMING MULTILINGUAL CHAT**
*(Visual: Cursor clicks the 'Punjabi' translation button. The patient text streams rapidly onto the screen in Punjabi).*
**Narrator:** "Because global clinics aren't mono-lingual, ER Gemma Vision supports real-time, streaming translations of all patient explanations. We also include a contextual chat assistant that dynamically suggests relevant follow-up questions for deeper insights."

**[2:00 - 2:15] CLOSING**
*(Visual: ER Gemma Vision Logo along with the 'Powered by Gemma' badge).*
**Narrator:** "Fast. Secure. Multimodal. And completely offline. This is ER Gemma Vision."