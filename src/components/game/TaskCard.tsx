import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Task {
  id: string;
  text: string;
  isRelevant: boolean;
  processed: boolean;
  userChoice?: "keep" | "toss" | "missed";
}

interface TaskCardProps {
  task: Task;
  isAnimating?: boolean;
  animationTarget?: "toolbox" | "trash" | null;
  swipeOffset?: { x: number; y: number };
  isDragging?: boolean;
}

export const TaskCard = ({
  task,
  isAnimating,
  animationTarget,
  swipeOffset = { x: 0, y: 0 },
  isDragging = false,
}: TaskCardProps) => {
  const getSwipeIndicator = () => {
    if (!isDragging) return null;
    
    const threshold = 80;
    if (swipeOffset.x < -threshold) {
      return "🗑️ Toss";
    } else if (swipeOffset.x > threshold) {
      return "🛠️ Keep";
    }
    return null;
  };

  const indicator = getSwipeIndicator();

  return (
    <Card
      className={`w-64 p-4 bg-card border-2 border-wood 
					shadow-lg transition-all duration-300
					bg-gradient-wood ${isAnimating ? "animate-fly-to-" + animationTarget : ""} ${
        isDragging ? "scale-105 shadow-2xl" : ""
      }`}
      style={{
        transform: isDragging
          ? `translate(${swipeOffset.x}px, ${swipeOffset.y}px) scale(1.05)`
          : undefined,
      }}
    >
      <div className="text-sm font-medium text-foreground mb-3">
        {task.text}
      </div>
      {indicator && (
        <div className="text-center">
          <Badge
            variant="secondary"
            className={`${
              indicator.includes("Toss")
                ? "bg-destructive text-destructive-foreground"
                : "bg-forest text-primary-foreground"
            }`}
          >
            {indicator}
          </Badge>
        </div>
      )}
    </Card>
  );
};