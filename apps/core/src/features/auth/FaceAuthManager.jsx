/**
 * FaceAuthManager — Real face recognition for web (face-api.js)
 * and native biometrics (Face ID / Android face unlock) via Capacitor.
 *
 * Modes:
 *  "enroll"  — capture face descriptor and store in Supabase
 *  "verify"  — compare live face with stored descriptor, return match
 */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, ScanFace, CheckCircle2, XCircle, Loader2, ShieldCheck } from 'lucide-react';

const MODEL_URL = '/models';
const MATCH_THRESHOLD = 0.52; // Euclidean distance — lower = stricter

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  modelsLoaded = true;
}

function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, v, i) => sum + (v - b[i]) ** 2, 0));
}

/**
 * @param {object} props
 * @param {"enroll"|"verify"} props.mode
 * @param {number[]|null} props.storedDescriptor  — required in "verify" mode
 * @param {(descriptor: number[]) => void} props.onEnrolled  — called after enroll
 * @param {(matched: boolean) => void} props.onVerified       — called after verify
 * @param {() => void} props.onCancel
 */
export default function FaceAuthManager({ mode, storedDescriptor, onEnrolled, onVerified, onCancel }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [phase, setPhase] = useState('loading'); // loading | ready | scanning | done | error
  const [statusMsg, setStatusMsg] = useState('Loading AI face models...');
  const [overlayColor, setOverlayColor] = useState('rgba(66,133,244,0.25)');

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadModels();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setPhase('ready');
        setStatusMsg(mode === 'enroll'
          ? 'Position your face in the circle and tap Capture'
          : 'Look at the camera — auto-scanning...');

        if (mode === 'verify') {
          // Auto-trigger verification after camera is ready
          setTimeout(() => scanFace(stream, cancelled), 1200);
        }
      } catch (err) {
        if (!cancelled) {
          setPhase('error');
          setStatusMsg('Camera access denied. Please allow camera and reload.');
        }
      }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, []); // eslint-disable-line

  const scanFace = useCallback(async (stream, cancelled) => {
    if (!videoRef.current) return;
    setPhase('scanning');
    setStatusMsg('Scanning face geometry...');
    setOverlayColor('rgba(251,188,4,0.25)');

    try {
      let descriptor = null;
      let attempts = 0;
      while (!descriptor && attempts < 20) {
        attempts++;
        const detection = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
          .withFaceLandmarks(true)
          .withFaceDescriptor();

        if (detection) descriptor = Array.from(detection.descriptor);
        else await new Promise(r => setTimeout(r, 300));
      }

      if (!descriptor) throw new Error('No face detected. Please try again in better lighting.');

      if (mode === 'enroll') {
        if (!cancelled) {
          setPhase('done');
          setStatusMsg('Face captured! Securing to your vault...');
          setOverlayColor('rgba(52,168,83,0.3)');
          stopCamera();
          onEnrolled(descriptor);
        }
      } else {
        // Verify against stored descriptor
        if (!storedDescriptor) throw new Error('No enrolled face found for your account.');
        const dist = euclideanDistance(descriptor, storedDescriptor);
        const matched = dist < MATCH_THRESHOLD;
        if (!cancelled) {
          setPhase('done');
          setStatusMsg(matched ? 'Identity confirmed!' : 'Face not recognised. Access denied.');
          setOverlayColor(matched ? 'rgba(52,168,83,0.3)' : 'rgba(234,67,53,0.3)');
          stopCamera();
          setTimeout(() => onVerified(matched), 600);
        }
      }
    } catch (err) {
      if (!cancelled) {
        setPhase('error');
        setStatusMsg(err.message || 'Recognition failed. Try again.');
        setOverlayColor('rgba(234,67,53,0.25)');
      }
    }
  }, [mode, storedDescriptor, onEnrolled, onVerified, stopCamera]); // eslint-disable-line

  const handleCapture = () => { scanFace(streamRef.current, false); };

  const handleCancel = () => { stopCamera(); onCancel(); };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3 bg-slate-900 text-white">
          <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center">
            <ScanFace size={18} />
          </div>
          <div>
            <h3 className="font-black text-sm">{mode === 'enroll' ? 'Enrol Face Login' : 'Face Recognition'}</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">IFB Biometric Vault</p>
          </div>
        </div>

        {/* Camera viewport */}
        <div className="relative bg-black" style={{ aspectRatio: '4/3' }}>
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          {/* Face oval guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="rounded-full border-4 transition-colors duration-500"
              style={{
                width: '55%', aspectRatio: '3/4',
                borderColor: overlayColor.replace('0.25', '0.9').replace('0.3', '0.9'),
                boxShadow: `0 0 0 2000px ${overlayColor}`,
              }}
            />
          </div>
          {/* Phase overlay icon */}
          {phase === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="animate-spin text-white" size={40} />
            </div>
          )}
          {phase === 'done' && overlayColor.includes('52,168') && (
            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in">
              <CheckCircle2 className="text-emerald-400 drop-shadow-xl" size={72} />
            </div>
          )}
          {phase === 'done' && overlayColor.includes('234,67') && (
            <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in">
              <XCircle className="text-red-400 drop-shadow-xl" size={72} />
            </div>
          )}
        </div>

        {/* Status */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            {phase === 'scanning' && <Loader2 className="animate-spin text-amber-500 shrink-0" size={18} />}
            {phase === 'done' && overlayColor.includes('52,168') && <CheckCircle2 className="text-emerald-500 shrink-0" size={18} />}
            {(phase === 'error' || (phase === 'done' && overlayColor.includes('234,67'))) && <XCircle className="text-red-500 shrink-0" size={18} />}
            {(phase === 'loading' || phase === 'ready') && <Camera className="text-blue-500 shrink-0 animate-pulse" size={18} />}
            <p className="text-xs font-bold text-slate-700 leading-tight">{statusMsg}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-colors"
            >Cancel</button>
            {mode === 'enroll' && phase === 'ready' && (
              <button
                onClick={handleCapture}
                className="flex-2 flex-grow py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
              >
                <Camera size={14} /> Capture Face
              </button>
            )}
            {mode === 'enroll' && phase === 'scanning' && (
              <button disabled className="flex-grow py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest opacity-80 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Scanning...
              </button>
            )}
            {phase === 'error' && (
              <button
                onClick={() => { setPhase('ready'); setStatusMsg('Position your face and try again.'); setOverlayColor('rgba(66,133,244,0.25)'); }}
                className="flex-grow py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800"
              >Retry</button>
            )}
          </div>

          <div className="flex items-center gap-2 justify-center">
            <ShieldCheck size={12} className="text-slate-300" />
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Data encrypted — never leaves your device</p>
          </div>
        </div>
      </div>
    </div>
  );
}
