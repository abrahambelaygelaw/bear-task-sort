import React, { useEffect } from "react";
import { TaskCard } from "./TaskCard";
interface PracticeConveyorProps {
    tourState: {
        practiceStep: number;
        step: number;
        totalSteps: number;
        isActive: boolean;
    };
    setTourState: React.Dispatch<
        React.SetStateAction<{
        practiceStep: number;
        step: number;
        totalSteps: number;
        isActive: boolean;
        }>
    >;
    swipeState: {
        startY: number;
        startX: number;
        currentY: number;
        currentX: number;
        isDragging: boolean;
    };
    }
const PracticeConveyor = ({ tourState, setTourState, swipeState }:
    PracticeConveyorProps
) => {
  const swipeOffset = swipeState.isDragging
    ? {
        x: swipeState.currentX - swipeState.startX,
        y: swipeState.currentY - swipeState.startY,
      }
    : { x: 0, y: 0 };
  const isDragging = swipeState.isDragging;
  useEffect(() => {
    if (isDragging){

      
      const threshold = 80;
      if (swipeOffset.x < -threshold) {
        if (tourState.practiceStep === 1) {
          setTourState({ ...tourState, practiceStep: 2, isActive: false });
        }
      } else if (swipeOffset.x > threshold) {
        if (tourState.practiceStep === 0) {
          setTourState({ ...tourState, practiceStep: 1 });
        }
      }
    }
  }, [isDragging, swipeOffset]);

  const practiceTasks = [
    {
      id: "practice-1",
      text: "Respond to Team Email",
      isRelevant: true,
      processed: false,
    },
    {
      id: "practice-2",
      text: "Check Social Media",
      isRelevant: false,
      processed: false,
    },
  ];

  const currentPracticeTask =
    tourState.step === tourState.totalSteps - 1
      ? practiceTasks[tourState.practiceStep]
      : null;

  return (
    <div className="absolute top-1/2 -translate-y-1/2 w-full h-32 bg-wood border-y-4 border-wood-light conveyor-belt pointer-events-none">
      <div className="w-full h-full bg-gradient-wood opacity-80 relative overflow-visible">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <TaskCard task={currentPracticeTask} />
        </div>
      </div>
    </div>
  );
};

export default PracticeConveyor;
