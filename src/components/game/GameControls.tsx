import { Trash2, Wrench } from "lucide-react";

interface GameControlsProps {
  isMobile: boolean;
  onKeep: () => void;
  onToss: () => void;
  toolboxRef: React.RefObject<HTMLDivElement>;
  trashRef: React.RefObject<HTMLDivElement>;
  showFeedback: { isCorrect: boolean; taskId: string } | null;
  animatingTask: { taskId: string; target: "toolbox" | "trash" } | null;
  currentTaskId?: string;
}

export const GameControls = ({
  isMobile,
  onKeep,
  onToss,
  toolboxRef,
  trashRef,
  showFeedback,
  animatingTask,
  currentTaskId,
}: GameControlsProps) => {
  const getGlowClass = (target: "toolbox" | "trash") => {
    return showFeedback &&
      showFeedback.taskId === currentTaskId &&
      animatingTask?.target === target
      ? target === "toolbox" 
        ? "animate-pulse-glow" 
        : "animate-pulse-glow-incorrect"
      : "";
  };

  if (isMobile) {
    return (
      <div className="absolute bottom-24 left-0 right-0 flex justify-between gap-16 px-4">
        {/* Trash Bin */}
        <div ref={trashRef}>
          <div
            onClick={onToss}
            className={`clickable-area w-24 h-24 bg-destructive border-4 flex flex-col items-center justify-center
						rounded-md cursor-pointer ${getGlowClass("trash")}`}
          >
            <Trash2 className="w-6 h-6 text-destructive-foreground mb-1" />
            <span className="text-destructive-foreground font-bold text-xs">
              Toss
            </span>
          </div>
        </div>

        {/* Toolbox */}
        <div ref={toolboxRef}>
          <div
            onClick={onKeep}
            className={`clickable-area w-24 h-24 bg-forest border-4 flex flex-col items-center justify-center
						rounded-md cursor-pointer ${getGlowClass("toolbox")}`}
          >
            <Wrench className="w-6 h-6 text-primary-foreground mb-1" />
            <span className="text-primary-foreground font-bold text-xs">
              Keep
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 lg:gap-32">
      {/* Trash Bin */}
      <div ref={trashRef}>
        <div
          onClick={onToss}
          className={`clickable-area w-32 h-32 bg-destructive border-4 flex flex-col items-center justify-center
						rounded-md cursor-pointer ${getGlowClass("trash")}`}
        >
          <Trash2 className="w-8 h-8 text-destructive-foreground mb-2" />
          <span className="text-destructive-foreground font-bold text-sm">
            Toss
          </span>
        </div>
      </div>

      {/* Toolbox */}
      <div ref={toolboxRef}>
        <div
          onClick={onKeep}
          className={`clickable-area w-32 h-32 bg-forest border-4 flex flex-col items-center justify-center
						rounded-md cursor-pointer ${getGlowClass("toolbox")}`}
        >
          <Wrench className="w-8 h-8 text-primary-foreground mb-2" />
          <span className="text-primary-foreground font-bold text-sm">
            Keep
          </span>
        </div>
      </div>
    </div>
  );
};