import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Smartphone } from "lucide-react";
import { TaskCard } from "./TaskCard";

interface TourState {
  isActive: boolean;
  step: number;
  totalSteps: number;
  hasStarted: boolean;
}

interface TourOverlayProps {
  tourState: TourState;
  onNextStep: () => void;
  onSkipTour: () => void;
  toolboxRef: React.RefObject<HTMLDivElement>;
  trashRef: React.RefObject<HTMLDivElement>;
  isMobile: boolean;
}

export const TourOverlay = ({
  tourState,
  onNextStep,
  onSkipTour,
  toolboxRef,
  trashRef,
  isMobile,
}: TourOverlayProps) => {
  if (!tourState.isActive) return null;

  const tourSteps = isMobile ? [
    {
      title: "Welcome to Bear's Task Factory!",
      description:
        "Let me show you how to play on mobile! Tasks will move across the screen and you can swipe them.",
      highlight: null,
      action: "Got it!",
      isMobile: true,
    },
    {
      title: "Swipe Right to Keep ➡️",
      description:
        "Swipe RIGHT on tasks that help achieve your goal. The toolbox is on the right below the belt.",
      highlight: "toolbox",
      action: "Next",
      isMobile: true,
    },
    {
      title: "Swipe Left to Toss ⬅️",
      description:
        "Swipe LEFT on tasks that don't help your goal. The trash can is on the left below the belt.",
      highlight: "trash",
      action: "Next",
      isMobile: true,
    },
    {
      title: "You're Ready!",
      description:
        "Great! Now you know how to play. You'll start with 4 practice tasks to get the hang of it (they won't affect your score). After that, the real game begins! Swipe quickly to earn points. Good luck! 🎯",
      highlight: null,
      action: "Start Playing!",
      isMobile: true,
    },
  ] : [
    {
      title: "Welcome to Bear's Task Factory!",
      description:
        "Let me show you how to play! Tasks will move across the screen like this one below.",
      highlight: null,
      action: "Got it!",
      isMobile: false,
    },
    {
      title: "Keep Relevant Tasks",
      description:
        "Click the green toolbox to KEEP tasks that help achieve your goal.",
      highlight: "toolbox",
      action: "Next",
      isMobile: false,
    },
    {
      title: "Toss Irrelevant Tasks",
      description:
        "Click the red trash can to TOSS tasks that don't help your goal.",
      highlight: "trash",
      action: "Next",
      isMobile: false,
    },
    {
      title: "You're Ready!",
      description:
        "Great! Now you know how to play. You'll start with 4 practice tasks to get the hang of it (they won't affect your score). After that, the real game begins! Sort quickly to earn points. Good luck! 🎯",
      highlight: null,
      action: "Start Playing!",
      isMobile: false,
    },
  ];

  const currentStep = tourSteps[tourState.step];

  const getHighlightPosition = () => {
    if (currentStep.highlight === "toolbox" && toolboxRef.current) {
      const rect = toolboxRef.current.getBoundingClientRect();
      return {
        top: rect.top - 10,
        left: rect.left - 10,
        width: rect.width + 20,
        height: rect.height + 20,
      };
    }
    if (currentStep.highlight === "trash" && trashRef.current) {
      const rect = trashRef.current.getBoundingClientRect();
      return {
        top: rect.top - 10,
        left: rect.left - 10,
        width: rect.width + 20,
        height: rect.height + 20,
      };
    }
    return null;
  };

  const highlightPos = getHighlightPosition();

  return (
    <div className="fixed inset-0 z-50">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Highlight spotlight */}
      {highlightPos && (
        <div
          className="absolute border-4 border-yellow-400 rounded-lg shadow-2xl animate-pulse"
          style={{
            top: highlightPos.top,
            left: highlightPos.left,
            width: highlightPos.width,
            height: highlightPos.height,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
          }}
        />
      )}

      {/* Tour instruction card */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <Card className="p-6 max-w-md mx-4 bg-card shadow-2xl">
          <div className="text-center">
            <h3 className="text-xl font-bold mb-3 text-foreground">
              {currentStep.title}
            </h3>
            <p className="text-muted-foreground mb-6">
              {currentStep.description}
            </p>

            {/* Show swipe gestures for mobile steps */}
            {currentStep.isMobile && currentStep.highlight === "toolbox" && (
              <div className="mb-4 flex justify-center gap-4">
                 
                  <div className="flex flex-col items-center">
                    <ArrowRight className="w-8 h-8 text-green-500 animate-bounce" />
                    <span className="text-sm text-green-600 font-medium">Swipe Right</span>
                  </div>
                <div className="flex items-center">
                  <Smartphone className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            )}
            {currentStep.isMobile && currentStep.highlight === "trash" && (
              <div className="mb-4 flex justify-center gap-4">
                 
                  <div className="flex flex-col items-center">
                    <ArrowLeft className="w-8 h-8 text-red-500 animate-bounce" />
                    <span className="text-sm text-red-600 font-medium">Swipe Left</span>
                  </div>
                <div className="flex items-center">
                  <Smartphone className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            )}

            {/* Show demo task for first step */}
            {tourState.step === 0 && (
              <div className="mb-4">
                <div className=" mx-auto">
                  <TaskCard
                    task={{
                      id: "demo",
                      text: "Example task moving across screen",
                      isRelevant: true,
                      processed: false,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={onSkipTour} className="flex-1">
                Skip Tour
              </Button>
              <Button
                onClick={onNextStep}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {currentStep.action}
              </Button>
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              Step {tourState.step + 1} of {tourState.totalSteps}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};