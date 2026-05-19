import { useState, useRef } from 'react';
import { Mic, MicOff, Upload, Activity, AlertTriangle, Globe, Zap, Send, MessageCircle } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState('landing');
  const [patientData, setPatientData] = useState({
    age: '', sex: '', symptoms: '', duration: '', medicalHistory: '',
    chronic_diseases: '', current_medications: '',
    vitals: { temp: '', spo2: '', hr: '' },
    xray: null, xray_image_b64: null
  });
  const [triageResult, setTriageResult] = useState(null);
  const [language, setLanguage] = useState('English');
  const [translations, setTranslations] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [speakingLanguage, setSpeakingLanguage] = useState('');

  // Voice states
  const [isRecordingSymptoms, setIsRecordingSymptoms] = useState(false);
  const [isVoiceIntakeRecording, setIsVoiceIntakeRecording] = useState(false);
  const [voiceIntakeStatus, setVoiceIntakeStatus] = useState('idle'); // idle | recording | transcribing | parsing | done | error
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [autoFilledFields, setAutoFilledFields] = useState(new Set());
  const voiceIntakeRef = useRef(null);

  // Chat states
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const resetForm = () => {
    setPatientData({ age: '', sex: '', symptoms: '', duration: '', medicalHistory: '',
      chronic_diseases: '', current_medications: '',
      vitals: { temp: '', spo2: '', hr: '' }, xray: null, xray_image_b64: null });
    setTranslations({});
    setLanguage('English');
    setVoiceIntakeStatus('idle');
    setVoiceTranscript('');
    setLiveTranscript('');
    setAutoFilledFields(new Set());
  };

  const startTriage = () => { resetForm(); setStep('intake'); };

  // ── Voice Quick Intake ──────────────────────────────────────────────
  const startVoiceIntake = async () => {
    setLiveTranscript('');
    setVoiceTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      // Also start native SpeechRecognition for LIVE UI feedback (if available)
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        const langMap = { 'hi': 'hi-IN', 'pa': 'pa-IN', 'bn': 'bn-IN', 'mr': 'mr-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'ur': 'ur-PK' };
        recognition.lang = langMap[speakingLanguage] || 'en-IN';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          setLiveTranscript(interim);
        };
        recognition.start();
      }

      voiceIntakeRef.current = { recorder, stream, chunks: [], recognition };

      recorder.ondataavailable = e => { if (e.data.size > 0) voiceIntakeRef.current.chunks.push(e.data); };
      recorder.onstop = async () => {
        setIsVoiceIntakeRecording(false);
        setVoiceIntakeStatus('transcribing');
        const blob = new Blob(voiceIntakeRef.current.chunks, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        if (speakingLanguage) formData.append('language', speakingLanguage);

        try {
          const res = await fetch('http://localhost:8000/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.transcript) {
            setVoiceTranscript(data.transcript);
            setLiveTranscript(''); // Clear live preview once final is in
            setVoiceIntakeStatus('parsing');
            await parseTranscriptWithAI(data.transcript);
          } else {
            setVoiceIntakeStatus('error');
          }
        } catch (e) {
          console.error(e);
          setVoiceIntakeStatus('error');
        }
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsVoiceIntakeRecording(true);
      setVoiceIntakeStatus('recording');
    } catch (e) {
      alert("Could not access microphone: " + e.message);
    }
  };

  const stopVoiceIntake = () => {
    if (voiceIntakeRef.current?.recognition) {
      voiceIntakeRef.current.recognition.stop();
    }
    if (voiceIntakeRef.current?.recorder?.state === 'recording') {
      voiceIntakeRef.current.recorder.stop();
    }
  };

  const parseTranscriptWithAI = async (transcript) => {
    try {
      const res = await fetch('http://localhost:8000/voice-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript })
      });
      const data = await res.json();
      if (data.success && data.fields) {
        const f = data.fields;
        const filled = new Set();
        setPatientData(prev => {
          const next = { ...prev };
          if (f.age)                { next.age = f.age; filled.add('age'); }
          if (f.sex)                { next.sex = f.sex; filled.add('sex'); }
          if (f.symptoms)           { next.symptoms = f.symptoms; filled.add('symptoms'); }
          if (f.duration)           { next.duration = f.duration; filled.add('duration'); }
          if (f.medicalHistory)     { next.medicalHistory = f.medicalHistory; filled.add('medicalHistory'); }
          if (f.chronic_diseases)   { next.chronic_diseases = f.chronic_diseases; filled.add('chronic_diseases'); }
          if (f.current_medications){ next.current_medications = f.current_medications; filled.add('current_medications'); }
          if (f.vitals_temp || f.vitals_spo2 || f.vitals_hr) {
            next.vitals = {
              temp: f.vitals_temp || prev.vitals.temp,
              spo2: f.vitals_spo2 || prev.vitals.spo2,
              hr:   f.vitals_hr   || prev.vitals.hr,
            };
            if (f.vitals_temp) filled.add('vitals_temp');
            if (f.vitals_spo2) filled.add('vitals_spo2');
            if (f.vitals_hr)   filled.add('vitals_hr');
          }
          return next;
        });
        setAutoFilledFields(filled);
        setVoiceIntakeStatus('done');
        setTimeout(() => setAutoFilledFields(new Set()), 4000);
      } else {
        setVoiceIntakeStatus('error');
      }
    } catch (e) {
      console.error('Parse failed:', e);
      setVoiceIntakeStatus('error');
    }
  };

  // ── Symptoms mic ────────────────────────────────────────────────────
  const handleMicClick = async () => {
    if (isRecordingSymptoms) {
      if (voiceIntakeRef.current?.recognition) {
        voiceIntakeRef.current.recognition.stop();
      }
      if (voiceIntakeRef.current?.recorder?.state === 'recording') {
        voiceIntakeRef.current.recorder.stop();
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      let recognition = null;
      if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        const langMap = { 'hi': 'hi-IN', 'pa': 'pa-IN', 'bn': 'bn-IN', 'mr': 'mr-IN', 'ta': 'ta-IN', 'te': 'te-IN', 'ur': 'ur-PK' };
        recognition.lang = langMap[speakingLanguage] || 'en-IN';
        recognition.onresult = (event) => {
          let interim = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            interim += event.results[i][0].transcript;
          }
          setLiveTranscript(interim);
        };
        recognition.start();
      }

      voiceIntakeRef.current = { recorder, stream, chunks: [], recognition };

      recorder.ondataavailable = e => { if (e.data.size > 0) voiceIntakeRef.current.chunks.push(e.data); };
      recorder.onstop = async () => {
        setIsRecordingSymptoms(false);
        setLiveTranscript('');
        const blob = new Blob(voiceIntakeRef.current.chunks, { type: 'audio/webm' });
        
        const formData = new FormData();
        formData.append('audio', blob, 'audio.webm');
        if (speakingLanguage) formData.append('language', speakingLanguage);

        try {
          const res = await fetch('http://localhost:8000/transcribe', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.transcript) {
            setPatientData(prev => ({...prev, symptoms: (prev.symptoms ? prev.symptoms + ' ' : '') + data.transcript}));
          }
        } catch (e) {
          console.error(e);
        }
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecordingSymptoms(true);
    } catch (e) {
      alert("Could not access microphone: " + e.message);
    }
  };

  // ── Image upload ────────────────────────────────────────────────────
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPatientData(prev => ({...prev, xray: file.name}));
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.split(',')[1];
        setPatientData(prev => ({...prev, xray_image_b64: base64String}));
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────
  const submitIntake = async () => {
    setStep('processing');
    setTranslations({});
    setLanguage('English');
    try {
      const response = await fetch('http://localhost:8000/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData)
      });
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      setTriageResult({
        urgency: data.urgency_level,
        concerns: data.likely_concerns,
        nextSteps: data.immediate_next_steps,
        medications: data.suggested_medications,
        suggestedQuestions: data.suggested_questions,
        escalation: data.escalation_triggers,
        explanation: data.patient_explanation,
        clinicianSummary: data.clinician_summary,
        terminology: data.terminology_explained,
        safetyAudit: data.safety_audit
      });
      setStep('result');
    } catch (error) {
      console.error("Failed to fetch triage result:", error);
      alert("Error connecting to backend. Make sure the FastAPI server is running.");
      setStep('intake');
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg = chatInput.trim();
    const updatedHistory = [...chatHistory, { role: 'user', content: userMsg }];
    
    setChatHistory(updatedHistory);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          history: chatHistory,
          patient_context: patientData,
          triage_context: triageResult
        })
      });

      if (!res.ok) throw new Error("Chat request failed");
      
      // Add empty assistant message placeholder
      let currentAssistantMessage = '';
      setChatHistory([...updatedHistory, { role: 'assistant', content: '' }]);
      setIsChatLoading(false); // Stop the bouncing dots

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        currentAssistantMessage += chunk;
        
        // Update the last message in history with new content
        setChatHistory(prev => {
          const newHistory = [...prev];
          newHistory[newHistory.length - 1].content = currentAssistantMessage;
          return newHistory;
        });
      }
      
    } catch (err) {
      console.error(err);
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please ensure the backend is running." }]);
      setIsChatLoading(false);
    }
  };

  // ── Translation ─────────────────────────────────────────────────────
  const handleLanguageChange = async (l) => {
    setLanguage(l);
    if (l === 'English' || translations[l]) return;
    setIsTranslating(true);
    
    // Initialize translation state with empty strings
    setTranslations(prev => ({
      ...prev,
      [l]: { explanation: '', concerns: '', nextSteps: '' }
    }));

    const streamTranslation = async (text, field) => {
      try {
        const res = await fetch('http://localhost:8000/translate/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, target_lang: l })
        });
        if (!res.ok) throw new Error("Translation stream failed");
        
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let currentText = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          currentText += decoder.decode(value, { stream: true });
          
          setTranslations(prev => ({
            ...prev,
            [l]: { ...prev[l], [field]: currentText }
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };

    try {
      const conString = triageResult.concerns.map((c, i) => `${i+1}. ${c}`).join('\n');
      const nsString = triageResult.nextSteps.map((c, i) => `${i+1}. ${c}`).join('\n');

      await streamTranslation(triageResult.explanation, 'explanation');
      await streamTranslation(conString, 'concerns');
      await streamTranslation(nsString, 'nextSteps');
      
    } catch (e) { console.error(e); }
    finally { setIsTranslating(false); }
  };

  // ── Helper: field highlight class ───────────────────────────────────
  const fieldClass = (name) =>
    `w-full border rounded-lg px-3 py-2 transition-all duration-500 ${
      autoFilledFields.has(name)
        ? 'border-emerald-400 bg-emerald-50 ring-2 ring-emerald-300'
        : 'border-slate-300'
    }`;

  const voiceStatusMsg = {
    idle:         null,
    recording:    '🎙️ Listening... speak clearly in any language.',
    transcribing: '🔊 Whisper is transcribing your audio offline...',
    parsing:      '🧠 Gemma is extracting medical fields from transcript...',
    done:         '✅ Fields auto-filled! Review and correct if needed.',
    error:        '❌ Could not parse. Please fill manually or try again.',
  };

  const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        return <li key={idx} className="ml-4 list-disc mb-1">{line.trim().substring(2)}</li>;
      }
      if (line.trim().match(/^\d+\./)) {
        return <li key={idx} className="ml-4 list-decimal mb-1">{line.trim().replace(/^\d+\.\s*/, '')}</li>;
      }
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className="mb-2">
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
        </p>
      );
    });
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white shadow border-b border-slate-200 sticky top-0 z-10 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Activity className="text-red-600" />
          <h1 className="font-bold text-xl tracking-tight">ER Gemma Vision</h1>
        </div>
        {step !== 'landing' && (
          <button onClick={() => { setStep('landing'); resetForm(); }}
            className="text-sm font-medium text-slate-500 hover:text-slate-800">New Case</button>
        )}
      </header>

      <main className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">

        {/* ── Landing ── */}
        {step === 'landing' && (
          <div className="flex flex-col items-center justify-center pt-24 text-center">
            <Activity className="w-20 h-20 text-red-600 mb-6" />
            <h2 className="text-4xl font-extrabold mb-4 text-slate-800">AI-Powered Triage Support</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-lg">
              Local-first multimodal emergency triage assistant for disaster and mass casualty scenarios.
              Speak a patient description — AI auto-fills the form instantly.
            </p>
            <button onClick={startTriage}
              className="px-8 py-3 bg-slate-900 text-white font-semibold rounded-full shadow-lg hover:bg-slate-800 transition">
              Start Intake
            </button>
          </div>
        )}

        {/* ── Intake Form ── */}
        {step === 'intake' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
            <h3 className="text-2xl font-bold border-b pb-2">Patient Intake</h3>

            {/* ── Voice Quick Intake Banner ── */}
            <div className="rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 p-5">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600 text-white rounded-full p-3 mt-1 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-blue-900 text-base">⚡ Quick Voice Intake (Offline)</p>
                    <select 
                      value={speakingLanguage} 
                      onChange={e => setSpeakingLanguage(e.target.value)}
                      className="text-sm border-blue-300 bg-white rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Auto-Detect Language</option>
                      <option value="hi">Hindi</option>
                      <option value="pa">Punjabi</option>
                      <option value="bn">Bengali</option>
                      <option value="mr">Marathi</option>
                      <option value="ta">Tamil</option>
                      <option value="te">Telugu</option>
                      <option value="ur">Urdu</option>
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="it">Italian</option>
                    </select>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    Speak naturally. Whisper AI will transcribe fully offline.
                  </p>

                  {voiceIntakeStatus !== 'idle' && voiceIntakeStatus !== 'recording' && (
                    <div className={`text-sm font-medium mb-3 px-3 py-2 rounded-lg ${
                      voiceIntakeStatus === 'done'  ? 'bg-emerald-100 text-emerald-800' :
                      voiceIntakeStatus === 'error' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800 animate-pulse'}`}>
                      {voiceStatusMsg[voiceIntakeStatus]}
                    </div>
                  )}

                  {voiceTranscript && !liveTranscript && (
                    <div className="text-xs text-slate-600 italic bg-white border rounded-lg px-3 py-2 mb-3">
                      Finalized: "{voiceTranscript}"
                    </div>
                  )}

                  {(liveTranscript || isVoiceIntakeRecording) && (
                    <div className="text-sm text-blue-800 font-medium bg-blue-100 border border-blue-200 rounded-lg px-4 py-3 mb-3 animate-in fade-in slide-in-from-bottom-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></span>
                        <span className="text-xs uppercase tracking-wider font-bold">Live Transcription</span>
                      </div>
                      <p className="italic">"{liveTranscript || 'Start speaking...'}"</p>
                    </div>
                  )}

                  <div className="flex gap-3 flex-wrap items-center">
                    {!isVoiceIntakeRecording ? (
                      <button onClick={startVoiceIntake}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition">
                        <Mic className="w-4 h-4" />
                        {voiceIntakeStatus === 'idle' ? 'Start Voice Intake' : 'Re-record'}
                      </button>
                    ) : (
                      <button onClick={stopVoiceIntake}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg animate-pulse transition">
                        <MicOff className="w-4 h-4" />
                        Stop Recording
                      </button>
                    )}
                    {isVoiceIntakeRecording && (
                      <span className="flex items-center gap-2 text-sm text-red-600 font-medium animate-pulse">
                        <span className="w-2 h-2 bg-red-600 rounded-full inline-block"></span>
                        Listening...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Basic Info ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Basic Information</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input type="text" className={fieldClass('age')} placeholder="e.g. 35"
                    value={patientData.age}
                    onChange={e => setPatientData({...patientData, age: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sex</label>
                  <select className={fieldClass('sex')}
                    value={patientData.sex}
                    onChange={e => setPatientData({...patientData, sex: e.target.value})}>
                    <option value="">Select</option>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Symptoms ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Chief Complaint</p>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Symptoms &amp; Complaints</label>
                  <button onClick={handleMicClick}
                    className={`flex items-center gap-1 text-sm px-2 py-1 rounded-md transition ${
                      isRecordingSymptoms ? 'bg-red-600 text-white animate-pulse' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                    <Mic className="w-4 h-4" /> {isRecordingSymptoms ? 'Stop Recording' : 'Dictate'}
                  </button>
                </div>
                {isRecordingSymptoms && liveTranscript && (
                  <div className="mb-2 p-2 bg-slate-50 border rounded text-sm italic text-slate-600">
                    "{liveTranscript}..."
                  </div>
                )}
                <textarea rows="3" className={fieldClass('symptoms')}
                  placeholder="Describe symptoms..."
                  value={patientData.symptoms}
                  onChange={e => setPatientData({...patientData, symptoms: e.target.value})} />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">Duration</label>
                <input type="text" className={fieldClass('duration')} placeholder="e.g. 2 hours, since morning"
                  value={patientData.duration}
                  onChange={e => setPatientData({...patientData, duration: e.target.value})} />
              </div>
            </div>

            {/* ── Vitals ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Vitals</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Temp (°C)</label>
                  <input type="text" className={fieldClass('vitals_temp')} placeholder="37.5"
                    value={patientData.vitals.temp}
                    onChange={e => setPatientData({...patientData, vitals: {...patientData.vitals, temp: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">SpO₂ (%)</label>
                  <input type="text" className={fieldClass('vitals_spo2')} placeholder="98"
                    value={patientData.vitals.spo2}
                    onChange={e => setPatientData({...patientData, vitals: {...patientData.vitals, spo2: e.target.value}})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Heart Rate</label>
                  <input type="text" className={fieldClass('vitals_hr')} placeholder="80"
                    value={patientData.vitals.hr}
                    onChange={e => setPatientData({...patientData, vitals: {...patientData.vitals, hr: e.target.value}})} />
                </div>
              </div>
            </div>

            {/* ── History ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Medical History</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chronic Diseases</label>
                  <input type="text" className={fieldClass('chronic_diseases')} placeholder="e.g. Diabetes, Hypertension..."
                    value={patientData.chronic_diseases}
                    onChange={e => setPatientData({...patientData, chronic_diseases: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Medications</label>
                  <input type="text" className={fieldClass('current_medications')} placeholder="e.g. Metformin..."
                    value={patientData.current_medications}
                    onChange={e => setPatientData({...patientData, current_medications: e.target.value})} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Other Medical History</label>
                  <input type="text" className={fieldClass('medicalHistory')} placeholder="Previous surgeries, allergies..."
                    value={patientData.medicalHistory}
                    onChange={e => setPatientData({...patientData, medicalHistory: e.target.value})} />
                </div>
              </div>
            </div>

            {/* ── Imaging Upload ── */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Imaging</p>
              <div className="relative p-4 bg-slate-50 border rounded-lg border-dashed text-center cursor-pointer hover:bg-slate-100 transition overflow-hidden">
                <input type="file" accept="image/*" onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <Upload className="mx-auto w-6 h-6 text-slate-400 mb-2" />
                <span className="text-sm text-slate-600 font-medium">
                  {patientData.xray ? `Uploaded: ${patientData.xray}` : 'Upload Imaging (X-Ray / CT Scan)'}
                </span>
              </div>
            </div>

            <button onClick={submitIntake}
              className="w-full py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition text-base">
              Analyze with Gemma 4
            </button>
          </div>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div className="flex flex-col items-center pt-20">
            <div className="animate-spin text-red-600 mb-4"><Activity className="w-12 h-12" /></div>
            <h3 className="text-xl font-bold mb-2">Analyzing Data...</h3>
            <div className="text-slate-500 space-y-2 text-center">
              <p className="opacity-100">Capturing patient context...</p>
              <p className="opacity-70">Running Gemma 4 triage reasoning...</p>
              <p className="opacity-40">Checking safety constraints...</p>
            </div>
          </div>
        )}

        {/* ── Result ── */}
        {step === 'result' && triageResult && (
          <div className="space-y-6">
            <div className={`p-4 rounded-xl border flex items-center gap-4 ${
              triageResult.urgency === 'RED'    ? 'bg-red-50 border-red-200 text-red-900' :
              triageResult.urgency === 'YELLOW' ? 'bg-yellow-50 border-yellow-200 text-yellow-900' :
              triageResult.urgency === 'BLACK'  ? 'bg-gray-900 border-gray-700 text-white' :
              'bg-green-50 border-green-200 text-green-900'}`}>
              <AlertTriangle className="w-10 h-10 shrink-0" />
              <div>
                <p className="text-sm font-bold uppercase tracking-wider opacity-80">Urgency Level</p>
                <h3 className="text-2xl font-extrabold">{triageResult.urgency}</h3>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border shadow-sm">
                <h4 className="font-bold border-b pb-2 mb-3 text-slate-800">Likely Concerns</h4>
                {typeof translations[language]?.concerns === 'string' 
                  ? <div className="text-slate-600">{renderMarkdown(translations[language].concerns)}</div>
                  : <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      {triageResult.concerns.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                }
              </div>
              <div className="bg-white p-5 rounded-xl border shadow-sm">
                <h4 className="font-bold border-b pb-2 mb-3 text-slate-800">Immediate Next Steps</h4>
                {typeof translations[language]?.nextSteps === 'string'
                  ? <div className="text-slate-600">{renderMarkdown(translations[language].nextSteps)}</div>
                  : <ul className="list-disc pl-5 space-y-1 text-slate-600">
                      {triageResult.nextSteps.map((c, i) => <li key={i}>{c}</li>)}
                    </ul>
                }
              </div>
            </div>

            {triageResult.medications?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
                <h4 className="font-bold text-blue-800 mb-2">💊 Suggested Medications</h4>
                <ul className="list-disc pl-5 space-y-1 text-blue-700">
                  {triageResult.medications.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
                <p className="text-xs text-blue-600 mt-2 font-medium italic">* Subject to clinician approval and patient contraindications.</p>
              </div>
            )}

            {triageResult.escalation?.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl">
                <h4 className="font-bold text-orange-800 mb-2">⚠️ Escalation Triggers</h4>
                <ul className="list-disc pl-5 space-y-1 text-orange-700">
                  {triageResult.escalation.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}

            {triageResult.clinicianSummary && (
              <div className="bg-slate-100 border border-slate-200 p-4 rounded-xl">
                <h4 className="font-bold text-slate-700 mb-1 text-sm uppercase tracking-wide">Clinician Summary</h4>
                <p className="text-slate-700 text-sm">{triageResult.clinicianSummary}</p>
              </div>
            )}

            {triageResult.terminology && Object.keys(triageResult.terminology).length > 0 && (
              <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl">
                <h4 className="font-bold text-purple-800 mb-2 text-sm uppercase tracking-wide">📚 Medical Terms Explained</h4>
                <ul className="space-y-2">
                  {Object.entries(triageResult.terminology).map(([term, desc], i) => (
                    <li key={i} className="text-sm">
                      <strong className="text-purple-900">{term}:</strong> <span className="text-purple-800">{desc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {triageResult.safetyAudit && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex gap-3 items-start">
                <Zap className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-emerald-800 text-sm uppercase tracking-wide">AI Safety Review (Offline)</h4>
                  <p className="text-emerald-700 text-sm italic">"{triageResult.safetyAudit}"</p>
                </div>
              </div>
            )}

            {/* ── Follow-Up Chat UI ── */}
            <div className="bg-white border rounded-xl overflow-hidden mt-8 shadow-sm">
              <div className="bg-slate-50 border-b p-3 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-slate-500" />
                <h4 className="font-bold text-slate-700">Follow-up Questions</h4>
              </div>
              
              <div className="p-4 bg-slate-50 min-h-[150px] max-h-[300px] overflow-y-auto flex flex-col gap-3">
                {chatHistory.length === 0 ? (
                  <p className="text-slate-400 text-sm italic text-center my-auto">Ask Gemma for specific dosages, explanations, or alternate treatments.</p>
                ) : (
                  chatHistory.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-3 rounded-lg max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-red-600 text-white rounded-br-none' : 'bg-white border text-slate-700 rounded-bl-none shadow-sm'}`}>
                        {msg.role === 'assistant' ? (
                          msg.content.split('\n').map((line, idx) => {
                            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                              return <li key={idx} className="ml-4 list-disc mb-1">{line.trim().substring(2)}</li>;
                            }
                            if (line.trim().match(/^\d+\./)) {
                              return <li key={idx} className="ml-4 list-decimal mb-1">{line.trim().replace(/^\d+\.\s*/, '')}</li>;
                            }
                            const parts = line.split(/(\*\*.*?\*\*)/g);
                            return (
                              <p key={idx} className="mb-2">
                                {parts.map((part, pIdx) => {
                                  if (part.startsWith('**') && part.endsWith('**')) {
                                    return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
                                  }
                                  return part;
                                })}
                              </p>
                            );
                          })
                        ) : (
                          msg.content
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="p-3 bg-white border text-slate-500 rounded-lg rounded-bl-none shadow-sm text-sm flex gap-2 items-center">
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75" />
                      <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150" />
                    </div>
                  </div>
                )}
              </div>
              
              {triageResult.suggestedQuestions?.length > 0 && chatHistory.length === 0 && (
                <div className="p-3 bg-white border-t border-b border-slate-100 flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wide mr-1">Suggested:</span>
                  {triageResult.suggestedQuestions.map((q, i) => (
                    <button 
                      key={i} 
                      onClick={() => setChatInput(q)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition text-left"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleChatSubmit} className="p-3 bg-white border-t flex gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a medical question about this patient..."
                  className="flex-1 bg-slate-50 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button 
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-xl shadow-lg mt-8">
              <div className="flex flex-wrap gap-1 mb-4">
                {['English', 'Hindi', 'Punjabi', 'Bengali', 'Marathi', 'Tamil', 'Urdu'].map(l => (
                  <button key={l} onClick={() => handleLanguageChange(l)}
                    className={`text-xs px-2 py-1 rounded ${language === l ? 'bg-white text-slate-900 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" /> Patient Explanation ({language})
              </h4>
              <p className="opacity-90 pr-2">
                {language === 'English'
                  ? triageResult.explanation
                  : isTranslating
                    ? 'Translating...'
                    : translations[language]?.explanation || '[Translation not yet loaded]'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
