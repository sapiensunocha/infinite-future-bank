import React, { useState, useEffect } from 'react';
import { ScanFace, ShieldCheck, ArrowRight, Fingerprint } from 'lucide-react';

// Import our shared Glass UI toolkit
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '@/components/ui/GlassButton';

export default function OnboardingFlow({ onComplete }) {
  // 🧭 State to track where the user is in the onboarding process
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);

  // =========================================================================
  // 🧠 DEUS SIMULATION: The 5-Second Facial Recognition & KYC Check
  // =========================================================================
  const handleBiometricScan = () => {
    setIsScanning(true);
    
    // Simulate the time it takes for an API like Alloy or Onfido to run AML checks
    setTimeout(() => {
      setIsScanning(false);
      setStep(2); // Move to Success Step
      
      // Automatically unlock the bank 2 seconds after a successful scan
      setTimeout(() => {
        onComplete();
      }, 2000);
      
    }, 3000);
  };

  return (
    <div className="w-full">
      {/* Notice how we use our GlassCard component. It instantly applies 
        the frosted blur and the subtle white border we defined in Tailwind.
      */}
      <GlassCard className="text-center p-8 sm:p-12">
        
        {/* --- STEP 1: The Welcome & Biometric Prompt --- */}
        {step === 1 && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* Glowing Icon Container */}
            <div className="w-20 h-20 rounded-full bg-ifb-primary/10 flex items-center justify-center mb-6 shadow-glow relative">
              {/* Pulse effect while scanning */}
              {isScanning && <div className="absolute inset-0 border-2 border-ifb-accent rounded-full animate-ping opacity-50"></div>}
              
              {isScanning ? (
                <ScanFace size={40} className="text-ifb-accent animate-pulse" />
              ) : (
                <Fingerprint size={40} className="text-ifb-primary" />
              )}
            </div>

            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
              {isScanning ? 'Verifying Identity...' : 'Initialize DEUS.'}
            </h2>
            
            <p className="text-ifb-muted mb-8 max-w-xs mx-auto leading-relaxed">
              {isScanning 
                ? 'Running global AML compliance and biometric liveness checks.' 
                : 'Secure your wealth with military-grade biometric encryption.'}
            </p>

            <GlassButton 
              variant={isScanning ? 'glowing' : 'primary'} 
              size="lg" 
              fullWidth 
              onClick={handleBiometricScan}
              isLoading={isScanning}
              icon={isScanning ? null : ArrowRight}
            >
              {isScanning ? 'Scanning...' : 'Authenticate'}
            </GlassButton>
          </div>
        )}

        {/* --- STEP 2: The Success & Entry State --- */}
        {step === 2 && (
          <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
            
            <div className="w-20 h-20 rounded-full bg-ifb-success/20 flex items-center justify-center mb-6 border border-ifb-success/50">
              <ShieldCheck size={40} className="text-ifb-success" />
            </div>

            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              Access Granted
            </h2>
            <p className="text-ifb-muted mb-2">
              Identity verified. Global markets unlocked.
            </p>
            
            {/* A small aesthetic loading bar simulating the final handoff to the dashboard */}
            <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
              <div className="h-full bg-ifb-success rounded-full animate-[shimmer_2s_ease-in-out_forwards] w-full origin-left scale-x-0"></div>
            </div>

          </div>
        )}
        
      </GlassCard>

      {/* Trust Badges under the main card to psychologically reassure the user */}
      <div className="mt-6 flex justify-center gap-6 text-xs font-medium text-ifb-muted/60">
        <span className="flex items-center gap-1.5">
          <ShieldCheck size={14} /> AES-256 Encryption
        </span>
        <span className="flex items-center gap-1.5">
          <Fingerprint size={14} /> Zero-Knowledge Proof
        </span>
      </div>
    </div>
  );
}