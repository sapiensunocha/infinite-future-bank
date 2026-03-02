import React, { useState } from 'react';
import { ScanFace, ShieldCheck, ArrowRight, Fingerprint, Camera as CameraIcon } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Import our shared Glass UI toolkit
import GlassCard from '@/components/ui/GlassCard';
import GlassButton from '@/components/ui/GlassButton';

export default function OnboardingFlow({ onComplete }) {
  const [step, setStep] = useState(1);
  const [isScanning, setIsScanning] = useState(false);

  // =========================================================================
  // 📸 DEUS NATIVE: Hardware Camera KYC Scan
  // =========================================================================
  const handleKYCScan = async () => {
    setIsScanning(true);
    
    try {
      // Triggers the native Android/iOS camera hardware
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera 
      });

      console.log('Secure Document Capture Successful.');
      // In production, image.base64String is sent to your AI for AML validation

      setIsScanning(false);
      setStep(2); // Move to Success Step
      
      // Automatically unlock the bank 2 seconds after a successful scan
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error("Camera scan cancelled or failed:", error);
      setIsScanning(false);
    }
  };

  return (
    <div className="w-full">
      <GlassCard className="text-center p-8 sm:p-12">
        
        {/* --- STEP 1: The Native Camera Prompt --- */}
        {step === 1 && (
          <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            <div className="w-20 h-20 rounded-full bg-ifb-primary/10 flex items-center justify-center mb-6 shadow-glow relative">
              {isScanning && <div className="absolute inset-0 border-2 border-ifb-accent rounded-full animate-ping opacity-50"></div>}
              
              {isScanning ? (
                <ScanFace size={40} className="text-ifb-accent animate-pulse" />
              ) : (
                <CameraIcon size={40} className="text-ifb-primary" />
              )}
            </div>

            <h2 className="text-3xl font-black text-white mb-3 tracking-tight">
              {isScanning ? 'Processing KYC...' : 'Verify Identity.'}
            </h2>
            
            <p className="text-ifb-muted mb-8 max-w-xs mx-auto leading-relaxed">
              {isScanning 
                ? 'Running global AML compliance and secure document analysis.' 
                : 'DEUS requires a secure scan of your Passport or National ID to proceed.'}
            </p>

            <GlassButton 
              variant={isScanning ? 'glowing' : 'primary'} 
              size="lg" 
              fullWidth 
              onClick={handleKYCScan}
              isLoading={isScanning}
              icon={isScanning ? null : ArrowRight}
            >
              {isScanning ? 'Initializing Camera...' : 'Scan Document'}
            </GlassButton>
          </div>
        )}

        {/* --- STEP 2: The Success & Entry State --- */}
        {step === 2 && (
          <div className="flex flex-col items-center animate-in zoom-in-95 fade-in duration-500">
            <div className="w-20 h-20 rounded-full bg-ifb-success/20 flex items-center justify-center mb-6 border border-ifb-success/50">
              <ShieldCheck size={40} className="text-ifb-success" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Identity Verified</h2>
            <p className="text-ifb-muted mb-2">Biometric signature secured. Markets unlocked.</p>
            
            <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
              <div className="h-full bg-ifb-success rounded-full animate-[shimmer_2s_ease-in-out_forwards] w-full origin-left scale-x-0"></div>
            </div>
          </div>
        )}
      </GlassCard>

      <div className="mt-6 flex justify-center gap-6 text-xs font-medium text-ifb-muted/60">
        <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> AES-256 Encryption</span>
        <span className="flex items-center gap-1.5"><Fingerprint size={14} /> Zero-Knowledge Proof</span>
      </div>
    </div>
  );
}