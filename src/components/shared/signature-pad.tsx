'use client';

import { useRef, useState, useEffect, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/shared/loading-spinner';
import { RotateCcw, Check } from 'lucide-react';
import type SignatureCanvasType from 'react-signature-canvas';
import { useTranslations } from 'next-intl';

const LazySignatureCanvas = lazy(() => import('react-signature-canvas'));

interface SignaturePadProps {
  onSign: (signatureDataUrl: string) => void;
  disabled?: boolean;
}

export function SignaturePad({ onSign, disabled }: SignaturePadProps) {
  const t = useTranslations('contracts');
  const sigCanvas = useRef<SignatureCanvasType>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      setIsEmpty(false);
    }
  };

  const handleSave = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png');
      onSign(dataUrl);
    }
  };

  useEffect(() => {
    if (disabled && sigCanvas.current) {
      sigCanvas.current.clear();
      setIsEmpty(true);
    }
  }, [disabled]);

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">{t('signature')}</label>
          <div className="border-2 border-dashed rounded-lg bg-muted/10">
            {isMounted ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[200px]">
                    <LoadingSpinner size="md" />
                  </div>
                }
              >
                <LazySignatureCanvas
                  ref={sigCanvas}
                  canvasProps={{
                    className: 'w-full h-[200px] cursor-crosshair',
                  }}
                  onEnd={handleEnd}
                  backgroundColor="transparent"
                />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <LoadingSpinner size="md" />
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">{t('drawSignature')}</p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            disabled={disabled || isEmpty}
            className="flex-1"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {t('clearSignature')}
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={disabled || isEmpty}
            className="flex-1"
          >
            <Check className="h-4 w-4 mr-2" />
            {t('signContract')}
          </Button>
        </div>
      </div>
    </Card>
  );
}
