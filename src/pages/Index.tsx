import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Target, Loader, Check, X } from "lucide-react";
import { UseGenerateTasks } from "@/hooks/use-generate-tasks";
import correctSound from "@/assets/sounds/correct.mp3";
import wrongSound from "@/assets/sounds/wrong.mp3";
import backgroundMusic from "@/assets/sounds/background-music.mp3";
import { useIsMobile } from "@/hooks/use-mobile";
import { BearMascot } from "@/components/game/BearMascot";
import { TaskCard } from "@/components/game/TaskCard";
import { TourOverlay } from "@/components/game/TourOverlay";
import { GameHeader } from "@/components/game/GameHeader";
import { ConveyorBelt } from "@/components/game/ConveyorBelt";
import { GameControls } from "@/components/game/GameControls";

// Add sound effects
const playCorrectSound = (isMuted: boolean) => {
  if (isMuted) return;
  const audio = new Audio(correctSound);
  audio.play().catch((error) => console.log("Audio play failed", error));
};

const playWrongSound = (isMuted: boolean) => {
  if (isMuted) return;
  const audio = new Audio(wrongSound);
  audio.play().catch(() => console.log("Audio play failed"));
};

const bgMusic = new Audio(backgroundMusic);
bgMusic.loop = true;
const playBackgroundMusic = (isMuted: boolean) => {
  if (isMuted) return;
  bgMusic.play().catch(() => console.log("Background music play failed"));
};
const stopBackgroundMusic = () => {
  bgMusic.pause();
  bgMusic.currentTime = 0;
};

interface Task {
  id: string;
  text: string;
  isRelevant: boolean;
  processed: boolean;
  userChoice?: "keep" | "toss" | "missed";
}

interface GameState {
  phase: "input" | "generating" | "playing" | "results";
  goal: string;
  tasks: Task[];
  score: number;
  correctSorts: number;
  totalTasks: number;
}

interface TourState {
  isActive: boolean;
  step: number;
  totalSteps: number;
  hasStarted: boolean;
}

interface SwipeState {
  startY: number;
  startX: number;
  currentY: number;
  currentX: number;
  isDragging: boolean;
}

// Moved to separate components

export const TaskSortingGame = () => {
  const isMobile = useIsMobile();
  const [gameState, setGameState] = useState<GameState>({
    phase: "input",
    goal: "",
    tasks: [],
    score: 0,
    correctSorts: 0,
    totalTasks: 0,
  });
  const [tourState, setTourState] = useState<TourState>({
    isActive: false,
    step: 0,
    totalSteps: 4,
    hasStarted: false,
  });
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [goalInput, setGoalInput] = useState("");
  const [animatingTask, setAnimatingTask] = useState<{
    taskId: string;
    target: "toolbox" | "trash";
  } | null>(null);
  const [showFeedback, setShowFeedback] = useState<{
    isCorrect: boolean;
    taskId: string;
  } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startY: 0,
    startX: 0,
    currentY: 0,
    currentX: 0,
    isDragging: false,
  });
  const toolboxRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const conveyorRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const taskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentConveyorSpeedRef = useRef(10); // Track current speed in seconds

  const startGame = async () => {
    setGameState((prev) => ({
      ...prev,
      phase: "generating",
    }));

    try {
      const tasks = await UseGenerateTasks(goalInput);
      setGameState({
        phase: "playing",
        goal: goalInput,
        tasks,
        score: 0,
        correctSorts: 0,
        totalTasks: tasks.length,
      });
      playBackgroundMusic(isMuted);

      setCurrentTaskIndex(0);

      // Start tour for new players
      if (!tourState.hasStarted) {
        setTourState((prev) => ({
          ...prev,
          isActive: true,
          hasStarted: true,
        }));
      }
    } catch (error) {
      console.error("Failed to generate tasks:", error);
    }
  };

  const handleTourNext = () => {
    if (tourState.step < tourState.totalSteps - 1) {
      setTourState((prev) => ({
        ...prev,
        step: prev.step + 1,
      }));
    } else {
      setTourState((prev) => ({
        ...prev,
        isActive: false,
      }));
    }
  };

  const handleTourSkip = () => {
    setTourState((prev) => ({
      ...prev,
      isActive: false,
    }));
  };

  const handleTourBoxClick = (type: "toolbox" | "trash") => {
    if (!tourState.isActive) return;

    if (tourState.step === 1 && type === "toolbox") {
      handleTourNext();
    } else if (tourState.step === 2 && type === "trash") {
      handleTourNext();
    }
  };

  const handleMissedTask = useCallback(() => {
    if (tourState.isActive || currentTaskIndex >= gameState.tasks.length) return;

    const currentTask = gameState.tasks[currentTaskIndex];
    if (currentTask && !currentTask.processed) {
      // Play wrong sound for missed task
      playWrongSound(isMuted);

      // Update game state
      setGameState((prev) => {
        const updatedTasks = prev.tasks.map((task) =>
          task.id === currentTask.id
            ? { ...task, processed: true, userChoice: "missed" as const }
            : task
        );

        return {
          ...prev,
          tasks: updatedTasks,
        };
      });

      setCurrentTaskIndex((prev) => prev + 1);
    }
  }, [currentTaskIndex, gameState.tasks, isMuted, tourState.isActive]);

  // Set up timeout for each new task
  useEffect(() => {
    if (
      gameState.phase === "playing" &&
      !tourState.isActive &&
      currentTaskIndex < gameState.tasks.length
    ) {
      // Clear any existing timeout
      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
      }

      // Use the current conveyor speed for the timeout
      const timeoutDuration = currentConveyorSpeedRef.current * 1000;

      // Set timeout for current task
      taskTimeoutRef.current = setTimeout(() => {
        handleMissedTask();
      }, timeoutDuration);
    }

    // Cleanup on unmount or when task changes
    return () => {
      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
      }
    };
  }, [currentTaskIndex, gameState.phase, tourState.isActive, handleMissedTask]);

  const sortTask = useCallback(
    (taskId: string, isCorrect: boolean, choice: "keep" | "toss") => {
      if (tourState.isActive) {
        handleTourBoxClick(choice === "keep" ? "toolbox" : "trash");
        return;
      }
      const taskElement = document.querySelector(".animate-conveyor");
      if (taskElement) {
        const rect = taskElement.getBoundingClientRect();
        const startX = rect.left + rect.width / 2 - window.innerWidth / 2;
        const startY = rect.top + rect.height / 2 - window.innerHeight / 2;

        document.documentElement.style.setProperty("--start-x", `${startX}px`);
        document.documentElement.style.setProperty("--start-y", `${startY}px`);
      }
      // Clear the timeout since user made a choice
      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
        taskTimeoutRef.current = null;
      }

      // Play sound effect
      if (isCorrect) {
        playCorrectSound(isMuted);
      } else {
        playWrongSound(isMuted);
      }

      // Show visual feedback
      setShowFeedback({ isCorrect, taskId });

      // Set animation target
      const target = choice === "keep" ? "toolbox" : "trash";
      setAnimatingTask({ taskId, target });

      // Wait for animation to complete before updating state
      setTimeout(() => {
        setGameState((prev) => {
          const updatedTasks = prev.tasks.map((task) =>
            task.id === taskId
              ? { ...task, processed: true, userChoice: choice }
              : task
          );

          const newScore = isCorrect ? prev.score + 10 : prev.score;
          const newCorrectSorts = isCorrect
            ? prev.correctSorts + 1
            : prev.correctSorts;

          return {
            ...prev,
            tasks: updatedTasks,
            score: newScore,
            correctSorts: newCorrectSorts,
          };
        });

        setAnimatingTask(null);
        setShowFeedback(null);
        setCurrentTaskIndex((prev) => prev + 1);
      }, 500); // Match animation duration
    },
    [isMuted, tourState.isActive]
  );

  const handleKeep = useCallback(() => {
    if (tourState.isActive) {
      handleTourBoxClick("toolbox");
      return;
    }
    if (currentTaskIndex < gameState.tasks.length) {
      const currentTask = gameState.tasks[currentTaskIndex];
      sortTask(currentTask.id, currentTask.isRelevant, "keep");
    }
  }, [currentTaskIndex, gameState.tasks, sortTask, tourState.isActive]);

  const handleToss = useCallback(() => {
    if (tourState.isActive) {
      handleTourBoxClick("trash");
      return;
    }
    if (currentTaskIndex < gameState.tasks.length) {
      const currentTask = gameState.tasks[currentTaskIndex];
      sortTask(currentTask.id, !currentTask.isRelevant, "toss");
    }
  }, [currentTaskIndex, gameState.tasks, sortTask, tourState.isActive]);

  // Touch event handlers for swipe detection
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (tourState.isActive || !gameState.tasks[currentTaskIndex]) return;
    
    const touch = e.touches[0];
    setSwipeState({
      startY: touch.clientY,
      startX: touch.clientX,
      currentY: touch.clientY,
      currentX: touch.clientX,
      isDragging: true,
    });
  }, [tourState.isActive, gameState.tasks, currentTaskIndex]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeState.isDragging || tourState.isActive) return;
    
    e.preventDefault(); // Prevent scrolling
    const touch = e.touches[0];
    setSwipeState(prev => ({
      ...prev,
      currentY: touch.clientY,
      currentX: touch.clientX,
    }));
  }, [swipeState.isDragging, tourState.isActive]);

  const handleTouchEnd = useCallback(() => {
    if (!swipeState.isDragging || tourState.isActive) return;
    
    const deltaX = swipeState.currentX - swipeState.startX;
    const deltaY = Math.abs(swipeState.currentY - swipeState.startY);
    const threshold = 80;
    
    // Only trigger if it's more horizontal than vertical swipe
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX < 0) {
        // Swipe left = toss
        handleToss();
      } else {
        // Swipe right = keep
        handleKeep();
      }
    }
    
    setSwipeState({
      startY: 0,
      startX: 0,
      currentY: 0,
      currentX: 0,
      isDragging: false,
    });
  }, [swipeState, tourState.isActive, handleToss, handleKeep]);

  useEffect(() => {
    if (
      gameState.phase === "playing" &&
      currentTaskIndex >= gameState.tasks.length &&
      !tourState.isActive
    ) {
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, phase: "results" }));
      }, 1000);
      stopBackgroundMusic();
      
      // Clear any remaining timeout
      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
        taskTimeoutRef.current = null;
      }
    }
  }, [
    currentTaskIndex,
    gameState.phase,
    gameState.tasks.length,
    tourState.isActive,
  ]);

  useEffect(() => {
    // Only apply speed changes during the playing phase
    if (gameState.phase === "playing" && !tourState.isActive) {
      // Define initial and final speeds (in seconds)
      const initialSpeed = 10;
      const finalSpeed = 3;
      const totalTasks = gameState.totalTasks;

      // Calculate the new speed based on the current task index
      let newSpeed;
    
      if (totalTasks <= 4) {
        // If there are 4 or fewer tasks, just use the final speed
        newSpeed = finalSpeed;
        
      } else {
        // For the last four tasks, use the final speed
        if (currentTaskIndex >= totalTasks - 4) {
          newSpeed = finalSpeed;
        } else {
          // Gradually increase speed until we reach the last four tasks
          const progress = currentTaskIndex / (totalTasks - 4);
          newSpeed = initialSpeed - (initialSpeed - finalSpeed) * progress;
        }
      }
      console.log("new speed:", newSpeed);

      // Update the ref and CSS variable
      currentConveyorSpeedRef.current = newSpeed;
      document.documentElement.style.setProperty(
        "--conveyor-speed",
        `${newSpeed}s`
      );
    }
  }, [
    currentTaskIndex,
    gameState.phase,
    gameState.totalTasks,
    tourState.isActive,
  ]);

  const resetGame = () => {
    setGameState({
      phase: "input",
      goal: "",
      tasks: [],
      score: 0,
      correctSorts: 0,
      totalTasks: 0,
    });
    setGoalInput("");
    setCurrentTaskIndex(0);
    setAnimatingTask(null);
    setShowFeedback(null);
    stopBackgroundMusic();
    setTourState((prev) => ({ ...prev, isActive: false, step: 0 }));
    setSwipeState({
      startY: 0,
      startX: 0,
      currentY: 0,
      currentX: 0,
      isDragging: false,
    });
    currentConveyorSpeedRef.current = 10;

    // Clear any remaining timeout
    if (taskTimeoutRef.current) {
      clearTimeout(taskTimeoutRef.current);
      taskTimeoutRef.current = null;
    }
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const newMutedState = !prev;
      if (newMutedState) {
        stopBackgroundMusic();
      } else if (gameState.phase === "playing") {
        playBackgroundMusic(false);
      }
      return newMutedState;
    });
  };

  const currentTask = gameState.tasks[currentTaskIndex];

  // Add CSS for animations
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
.animate-fly-to-toolbox {
  animation: flyToToolbox 0.5s forwards;
  z-index: 50;
}

.animate-fly-to-trash {
  animation: flyToTrash 0.5s forwards;
  z-index: 50;
}

@keyframes flyToToolbox {
  0% {
    transform: translate(var(--start-x), var(--start-y));
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(var(--toolbox-x) - 50vw + 50%),
              calc(var(--toolbox-y) - 50vh + 50%)
    );
    opacity: 0;
  }
}

@keyframes flyToTrash {
  0% {
    transform: translate(var(--start-x), var(--start-y));
    opacity: 1;
  }
  100% {
    transform: translate(
      calc(var(--trash-x) - 50vw + 50%),
              calc(var(--trash-y) - 50vh + 50%)
    );
    opacity: 0;
  }
}

@keyframes conveyor {
  0% {
    transform: translateX(100vw);
  }
  100% {
    transform: translateX(-100vw);
  }
}

.animate-conveyor {
  animation: conveyor var(--conveyor-speed) linear forwards;
}

.clickable-area {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-area:hover {
  transform: scale(1.05);
}

.clickable-area:active {
  transform: scale(0.95);
}

@keyframes glow {
  0% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(34, 197, 94, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
  }
}

.animate-glow {
  animation: glow 1s;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}

.animate-shake {
  animation: shake 0.5s;
}

@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
  50% { box-shadow: 0 0 10px 10px rgba(34, 197, 94, 0.5); }
  100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
}

.animate-pulse-glow {
  animation: pulse-glow 1s ease-in-out infinite;
}

@keyframes pulse-glow-incorrect {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  50% { box-shadow: 0 0 10px 10px rgba(239, 68, 68, 0.5); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

.animate-pulse-glow-incorrect {
  animation: pulse-glow-incorrect 1s ease-in-out infinite;
}

.tour-highlight {
  animation: pulse-glow 2s infinite;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.tour-card {
  animation: fade-in 0.5s ease-out;
}

/* Prevent scrolling during swipe */
.no-scroll {
  overflow: hidden;
  position: fixed;
  width: 100%;
}

`;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update CSS variables for animation targets
  useEffect(() => {
    if (toolboxRef.current && trashRef.current) {
      const toolboxRect = toolboxRef.current.getBoundingClientRect();
      const trashRect = trashRef.current.getBoundingClientRect();

      document.documentElement.style.setProperty(
        "--toolbox-x",
        `${toolboxRect.left + toolboxRect.width / 2}px`
      );
      document.documentElement.style.setProperty(
        "--toolbox-y",
        `${toolboxRect.top + toolboxRect.height / 2}px`
      );
      document.documentElement.style.setProperty(
        "--trash-x",
        `${trashRect.left + trashRect.width / 2}px`
      );
      document.documentElement.style.setProperty(
        "--trash-y",
        `${trashRect.top + trashRect.height / 2}px`
      );
    }
  }, [gameState.phase]);

  if (gameState.phase === "input") {
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BearMascot score={0} isPlaying={false} isGenerating={false} />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            Bear's Task Factory
          </h1>
          <p className="text-primary-foreground/80 mb-6">
            Help our friendly bear sort relevant tasks from the clutter! Enter
            your goal and we'll generate tasks for you to sort.
          </p>
          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-sm font-medium text-primary-foreground mb-2">
                What's your goal?
              </label>
              <Input
                placeholder="e.g., Launch a new product, Learn to code, Start a business..."
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="bg-card border-wood"
              />
            </div>
            <Button
              onClick={startGame}
              disabled={!goalInput.trim()}
              className="w-full bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
            >
              <Target className="w-4 h-4 mr-2" />
              Start Sorting!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === "generating") {
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BearMascot score={0} isPlaying={false} isGenerating={true} />
          <h1 className="text-3xl font-bold text-primary-foreground mb-4">
            Generating Tasks...
          </h1>
          <p className="text-primary-foreground/80 mb-6">
            Our AI bear is thinking hard about your goal: "{goalInput}"
          </p>
          <Loader className="w-12 h-12 animate-spin mx-auto text-honey" />
        </div>
      </div>
    );
  }

  if (gameState.phase === "results") {
    const accuracy = (gameState.correctSorts / gameState.totalTasks) * 100;

    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-2xl w-full">
          <BearMascot
            score={gameState.score}
            isPlaying={false}
            isGenerating={false}
          />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Great Job! 🎉
          </h2>
          <div className="bg-card rounded-lg p-6 mb-6 space-y-4">
            <div className="text-2xl font-bold text-honey">
              Goal: {gameState.goal}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-forest">
                  {gameState.score}
                </div>
                <div className="text-muted-foreground">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">
                  {accuracy.toFixed(0)}%
                </div>
                <div className="text-muted-foreground">Accuracy</div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-foreground mb-3">
              Task Results
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {gameState.tasks.map((task) => {
                const isCorrect =
                  (task.isRelevant && task.userChoice === "keep") ||
                  (!task.isRelevant && task.userChoice === "toss");
                
                const isMissed = task.userChoice === "missed";

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border ${
                      isMissed
                        ? "bg-orange-50 border-orange-200"
                        : isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{task.text}</span>
                      <div className="flex items-center">
                        {isMissed ? (
                          <X className="w-5 h-5 text-orange-600 ml-2" />
                        ) : isCorrect ? (
                          <Check className="w-5 h-5 text-green-600 ml-2" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 ml-2" />
                        )}
                      </div>
                    </div>
                    <div className="text-sm mt-1">
                      <span
                        className={`font-medium ${
                          task.isRelevant ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {task.isRelevant ? "Relevant" : "Irrelevant"}
                      </span>
                      <span className="text-muted-foreground mx-2">•</span>
                      <span className="text-muted-foreground">
                        {isMissed
                          ? "You missed this task"
                          : `You ${task.userChoice === "keep" ? "kept" : "tossed"} this task`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <Button
            onClick={resetGame}
            className="bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
          >
            🐻 Play Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={gameAreaRef}
      className={`min-h-screen bg-gradient-forest relative overflow-hidden ${
        swipeState.isDragging ? 'no-scroll' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Tour Overlay */}
      <TourOverlay
        tourState={tourState}
        onNextStep={handleTourNext}
        onSkipTour={handleTourSkip}
        toolboxRef={toolboxRef}
        trashRef={trashRef}
        isMobile={isMobile}
      />
      
      {/* Header */}
      <GameHeader
        score={gameState.score}
        goal={gameState.goal}
        currentTaskIndex={currentTaskIndex}
        totalTasks={gameState.totalTasks}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isMobile={isMobile}
      />

      {/* Conveyor Belt */}
      <ConveyorBelt
        currentTask={currentTask}
        animatingTask={animatingTask}
        swipeState={swipeState}
        conveyorRef={conveyorRef}
      />

      {/* Game Controls */}
      <GameControls
        isMobile={isMobile}
        onKeep={handleKeep}
        onToss={handleToss}
        toolboxRef={toolboxRef}
        trashRef={trashRef}
        showFeedback={showFeedback}
        animatingTask={animatingTask}
        currentTaskId={currentTask?.id}
      />

      {/* Animating Task */}
      {animatingTask && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
          <TaskCard
            task={gameState.tasks.find((t) => t.id === animatingTask.taskId)!}
            isAnimating={true}
            animationTarget={animatingTask.target}
          />
        </div>
      )}
    </div>
  );
};

const Index = () => {
  return <TaskSortingGame />;
};

export default Index;