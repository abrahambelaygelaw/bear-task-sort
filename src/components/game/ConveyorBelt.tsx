import { TaskCard } from "./TaskCard";

interface Task {
  id: string;
  text: string;
  isRelevant: boolean;
  processed: boolean;
  userChoice?: "keep" | "toss" | "missed";
}

interface SwipeState {
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  isDragging: boolean;
}

interface ConveyorBeltProps {
  currentTask: Task | undefined;
  animatingTask: { taskId: string; target: "toolbox" | "trash" } | null;
  swipeState: SwipeState;
  conveyorRef: React.RefObject<HTMLDivElement>;
  isPracticeMode?: boolean;
}

export const ConveyorBelt = ({
  currentTask,
  animatingTask,
  swipeState,
  conveyorRef,
  isPracticeMode = false,
}: ConveyorBeltProps) => {
  const swipeOffset = swipeState.isDragging 
    ? { 
        x: swipeState.currentX - swipeState.startX, 
        y: swipeState.currentY - swipeState.startY 
      } 
    : { x: 0, y: 0 };

  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 w-full h-32 md:h-40 lg:h-48 bg-wood border-y-4 border-wood-light conveyor-belt"
      style={{ touchAction: "none" }}
    >
      <div className="w-full h-full bg-gradient-wood opacity-80 relative overflow-hidden">
        {currentTask && !currentTask.processed && !animatingTask && (
          <div
            ref={conveyorRef}
            className={`absolute top-1/2 -translate-y-1/2 ${isPracticeMode ? 'animate-conveyor-infinite' : 'animate-conveyor'}`}
            key={currentTask.id}
            style={{ touchAction: "none" }}
          >
            <TaskCard 
              task={currentTask} 
              swipeOffset={swipeOffset}
              isDragging={swipeState.isDragging}
            />
          </div>
        )}
      </div>
    </div>
  );
};