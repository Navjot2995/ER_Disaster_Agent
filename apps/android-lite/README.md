# ER Gemma Vision: Android LiteRT-LM Roadmap

To move this web-based prototype into a fully native, offline Android application running on edge devices (tablets/phones), we will utilize **LiteRT** (formerly TensorFlow Lite) specifically optimized for Large Language Models (LiteRT-LM).

Here is the exact engineering roadmap to port the Python/React codebase into Kotlin/LiteRT.

## 1. Model Conversion (Gemma 4 -> LiteRT)
You cannot run standard `.gguf` or Ollama models natively via LiteRT. You must convert the Gemma weights for the edge.
*   **Action**: Use the TensorFlow Lite Model Maker or KerasNLP.
*   **Process**:
    ```python
    import keras_nlp
    # Load Gemma 2b or lightweight instruction-tuned variant
    gemma_lm = keras_nlp.models.GemmaCausalLM.from_preset("gemma_instruct_2b_en")
    # Export to LiteRT .tflite format (int8 quantized for mobile)
    gemma_lm.export_to_tflite("gemma_er_vision.tflite", quantization="int8")
    ```
*   **Deployment**: Place `gemma_er_vision.tflite` into the `src/main/assets/` directory of your Android project.

## 2. Replacing the Python Backend with Local Android Services
Currently, FastAPI handles orchestration. In Android, this logic moves to a **ViewModel & Repository pattern**.
*   **LiteRT LLM Inference API**: Integrate the `play-services-tflite-java` or the MediaPipe LLM Inference Task API.
*   **Flow**: 
    1. UI collects symptoms.
    2. Android pushes the `system_prompt.txt` (stored in `assets/`) + patient data into the MediaPipe LLM Inference task.
    3. The `.tflite` model generates the RED/YELLOW/GREEN JSON directly on the Snapdragon/Tensor chip.

## 3. Replacing FAISS with a Mobile Vector Store
Python FAISS won't run natively on Android easily.
*   **Action**: Switch to **ObjectBox** or **SQLite Video/Vector extensions** which natively support on-device vector similarity search.
*   **Process**: You chunk the `emergency_guides/` on Android, use a lightweight LiteRT embedding model (like MobileBERT) to embed them, and store them in ObjectBox. When the user dictates a symptom, embed the voice string and retrieve the closest guideline locally.

## 4. Replacing Web APIs with Native Android APIs
*   **Web Speech API -> Android SpeechRecognizer**: Replace our browser dictation with `android.speech.SpeechRecognizer` using `RecognizerIntent.ACTION_RECOGNIZE_SPEECH` in Kotlin.
*   **React UI -> Jetpack Compose**: Rewrite `App.jsx` into declarative Compose UI screens. You already have the mock structure outlined in `res/layout/`.

## 5. Handling Multimodal X-Rays on Edge
Full multimodal LLMs (like LLaVA) are currently too heavy for a standard tablet's RAM.
*   **Action**: Instead of running a massive VLM on-device, use a lightweight **LiteRT Image Classification model** explicitly trained on Chest X-Rays (e.g., a MobileNetV3 fine-tuned on the MIMIC-CXR dataset). 
*   **Flow**: The camera takes an X-Ray photo -> MobileNetV3 detects "Pneumonia - 88%" -> This text string is passed into the local Gemma text-only model as `xray_findings` just like we do in the web app!
