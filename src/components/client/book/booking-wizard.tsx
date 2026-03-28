"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Send,
  Loader2,
  Video,
  Package,
  FileText,
  CalendarDays,
  MapPin,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";
import { StepProjectType } from "./step-project-type";
import { StepPackage } from "./step-package";
import { StepDetails } from "./step-details";
import { StepDates } from "./step-dates";
import { StepLocation } from "./step-location";
import { StepReview } from "./step-review";
import { createFilmingRequest } from "@/lib/actions/filming-requests";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ProjectType } from "@/lib/constants";
import { useTranslations } from "next-intl";

export interface BookingFormData {
  project_type?: ProjectType;
  selected_package?: string;
  title: string;
  description: string;
  reference_links: string[];
  preferred_dates: Array<{ date: string; time_slot: string }>;
  location: string;
  budget_range: string;
}

const STEP_ICONS: LucideIcon[] = [
  Video,
  Package,
  FileText,
  CalendarDays,
  MapPin,
  ClipboardCheck,
];

export function BookingWizard() {
  const router = useRouter();
  const t = useTranslations("booking");
  const tCommon = useTranslations("common");
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasMounted = useRef(false);
  const [formData, setFormData] = useState<BookingFormData>({
    title: "",
    description: "",
    reference_links: [],
    preferred_dates: [],
    location: "",
    budget_range: "",
  });

  const STEPS = [
    { id: 1, label: t("projectType"), component: StepProjectType },
    { id: 2, label: t("package"), component: StepPackage },
    { id: 3, label: t("projectDetails"), component: StepDetails },
    { id: 4, label: t("dates"), component: StepDates },
    { id: 5, label: t("location"), component: StepLocation },
    { id: 6, label: t("review"), component: StepReview },
  ];

  const updateFormData = useCallback((data: Partial<BookingFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  const canGoNext = (): boolean => {
    switch (currentStep) {
      case 1:
        return !!formData.project_type;
      case 3:
        return formData.title.trim().length > 0;
      default:
        return true;
    }
  };

  const goToStep = useCallback(
    (step: number) => {
      if (step === currentStep || step < 1 || step > 6) return;
      setDirection(step > currentStep ? "forward" : "back");
      setIsAnimating(true);
      hasMounted.current = true;
      setTimeout(() => {
        setCurrentStep(step);
        setIsAnimating(false);
      }, 150);
    },
    [currentStep],
  );

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      goToStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    const result = await createFilmingRequest({
      project_type: formData.project_type,
      selected_package: formData.selected_package || undefined,
      title: formData.title,
      description: formData.description || undefined,
      reference_links:
        formData.reference_links.length > 0 ? formData.reference_links : undefined,
      preferred_dates:
        formData.preferred_dates.length > 0 ? formData.preferred_dates : undefined,
      location: formData.location || undefined,
      budget_range: formData.budget_range || undefined,
    });

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(t("requestSubmitted"));
      router.push("/client/dashboard");
    }

    setLoading(false);
  };

  const progressPercent = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  const getEncouragementText = (): string => {
    if (currentStep >= 5) return t("almostDone");
    if (currentStep === 1) return t("letsStart");
    if (currentStep === 2) return t("greatChoice");
    return t("tellUsMore");
  };

  const CurrentStepComponent = STEPS[currentStep - 1].component;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Desktop Stepper */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between mb-3">
          {STEPS.map((step, index) => {
            const StepIcon = STEP_ICONS[index];
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <div key={step.id} className={cn("flex items-center", index < STEPS.length - 1 && "flex-1")}>
                <div className="flex flex-col items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted) goToStep(step.id);
                    }}
                    className={cn(
                      "w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      isCompleted &&
                        "bg-primary border-primary text-primary-foreground cursor-pointer hover:scale-110",
                      isCurrent && "border-primary text-primary bg-primary/10 scale-105",
                      !isCompleted &&
                        !isCurrent &&
                        "border-muted-foreground/25 text-muted-foreground/50 cursor-default",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <StepIcon className="h-5 w-5" />
                    )}
                  </button>
                  <span
                    className={cn(
                      "text-xs mt-2 text-center font-medium transition-colors",
                      isCurrent && "text-primary",
                      isCompleted && !isCurrent && "text-foreground",
                      !isCompleted && !isCurrent && "text-muted-foreground/50",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div className="h-0.5 flex-1 mx-2 rounded-full overflow-hidden bg-muted-foreground/15">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
                      style={{ width: isCompleted ? "100%" : "0%" }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Stepper */}
      <div className="md:hidden space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {t("stepOf", { current: currentStep, total: STEPS.length })}
          </span>
          <span className="text-sm font-medium text-primary">
            {STEPS[currentStep - 1].label}
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Encouragement */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">{getEncouragementText()}</p>
      </div>

      {/* Step Content with slide animation */}
      <div className="relative overflow-x-clip overflow-y-visible">
        <div
          className={cn(
            "transition-all duration-300 ease-out",
            isAnimating && direction === "forward" && "opacity-0 translate-x-8",
            isAnimating && direction === "back" && "opacity-0 -translate-x-8",
            !isAnimating && hasMounted.current && "opacity-100 translate-x-0",
          )}
        >
          {currentStep === 6 ? (
            <StepReview formData={formData} onGoToStep={goToStep} />
          ) : (
            <CurrentStepComponent formData={formData} updateFormData={updateFormData} />
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="outline"
          size="lg"
          onClick={handleBack}
          disabled={currentStep === 1 || loading}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Button>

        {currentStep < STEPS.length ? (
          <Button size="lg" onClick={handleNext} disabled={!canGoNext()} className="gap-2">
            {tCommon("next")}
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={loading || !canGoNext()}
            className="gap-2 min-w-[180px]"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("submitting")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t("submitRequest")}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
