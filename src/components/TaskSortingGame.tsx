import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Wrench,
  Star,
  Target,
  Loader,
  Check,
  X,
  HelpCircle,
  Volume2,
  VolumeX,
  ArrowRight,
  ArrowDown,
} from "lucide-react";
import bearMascot from "@/assets/bear-mascot.png";
import {
  UseGenerateTasks,
  UseGetFallbackTasks,
} from "@/hooks/use-generate-tasks";
import correctSound from "@/assets/sounds/correct.mp3";
import wrongSound from "@/assets/sounds/wrong.mp3";
import backgroundMusic from "@/assets/sounds/background-music.mp3";

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
  userChoice?: "keep" | "toss";
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
const TaskCard = ({
  task,
  isAnimating,
  animationTarget,
}: {
  task: Task;
  isAnimating?: boolean;
  animationTarget?: "toolbox" | "trash" | null;
}) => {
  return (
    <Card
      className={`w-64 p-4 bg-card border-2 border-wood 
					shadow-lg transition-all duration-300
					bg-gradient-wood  ${
            isAnimating ? "animate-fly-to-" + animationTarget : ""
          }`}
    >
      <div className="text-sm font-medium text-foreground mb-3">
        {task.text}
      </div>
    </Card>
  );
};

const BearMascot = ({
  score,
  isPlaying,
  isGenerating,
}: {
  score: number;
  isPlaying: boolean;
  isGenerating: boolean;
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={bearMascot}
        alt="Bear Mascot"
        className={`w-32  ${
          isPlaying
            ? "animate-bounce-gentle"
            : isGenerating
            ? "animate-pulse"
            : "animate-wobble"
        }`}
      />
      {isPlaying && (
        <Badge
          variant="secondary"
          className="bg-gradient-honey text-bear-brown font-bold"
        >
          <Star className="w-4 h-4 mr-1" />
          Score: {score}
        </Badge>
      )}
      {isGenerating && (
        <Badge
          variant="secondary"
          className="bg-gradient-honey text-bear-brown font-bold"
        >
          <Loader className="w-4 h-4 mr-1 animate-spin" />
          Generating Tasks...
        </Badge>
      )}
    </div>
  );
};
const TourOverlay = ({
  tourState,
  onNextStep,
  onSkipTour,
  toolboxRef,
  trashRef,
}: {
  tourState: TourState;
  onNextStep: () => void;
  onSkipTour: () => void;
  toolboxRef: React.RefObject<HTMLDivElement>;
  trashRef: React.RefObject<HTMLDivElement>;
}) => {
  if (!tourState.isActive) return null;

  const tourSteps = [
    {
      title: "Welcome to Bear's Task Factory! 🐻",
      description: "Let me show you how to play! Tasks will move across the screen like this one below.",
      highlight: null,
      action: "Got it!",
    },
    {
      title: "Keep Relevant Tasks",
      description: "Tap the green toolbox to KEEP tasks that help achieve your goal.",
      highlight: "toolbox",
      action: "Next",
    },
    {
      title: "Toss Irrelevant Tasks",
      description: "Tap the red trash can to TOSS tasks that don't help your goal.",
      highlight: "trash",
      action: "Next",
    },
    {
      title: "You're Ready!",
      description: "Great! Now you know how to play. Sort tasks quickly to earn points. Good luck! 🎯",
      highlight: null,
      action: "Start Playing!",
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
            
            {currentStep.highlight && (
              <div className="mb-4 flex justify-center">
                <ArrowDown className="w-8 h-8 text-yellow-500 animate-bounce" />
              </div>
            )}

            {/* Show demo task for first step */}
            {tourState.step === 0 && (
              <div className="mb-4">
                <div className="w-48 mx-auto">
                  <TaskCard task={{
                    id: "demo",
                    text: "Example task moving across screen",
                    isRelevant: true,
                    processed: false
                  }} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onSkipTour}
                className="flex-1"
              >
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
export const TaskSortingGame = () => {
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
  const [showTour, setShowTour] = useState(true);
  const [tourStep, setTourStep] = useState(0);
  
  const toolboxRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const conveyorRef = useRef<HTMLDivElement>(null);

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
        setTourState(prev => ({
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
        setTourState(prev => ({
          ...prev,
          step: prev.step + 1,
        }));
      } else {
        setTourState(prev => ({
          ...prev,
          isActive: false,
        }));
      }
    };
  
    const handleTourSkip = () => {
      setTourState(prev => ({
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

          const newScore = isCorrect
            ? prev.score + 10
            : prev.score
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
    }
  }, [currentTaskIndex, gameState.phase, gameState.tasks.length, tourState.isActive]);
  
  useEffect(() => {
    // Only apply speed changes during the playing phase
    if (gameState.phase === "playing"  && !tourState.isActive) {
      // Define initial and final speeds (in seconds)
      const initialSpeed = 10;
      const finalSpeed = 3;
      const totalTasks = gameState.totalTasks;
  
      // Calculate the new speed based on the current task index
      // Use a linear interpolation formula: start + (end - start) * (progress)
      const newSpeed =
        initialSpeed -
        ((initialSpeed - finalSpeed) * currentTaskIndex) / (totalTasks - 1);
  
      // Update the CSS variable
      document.documentElement.style.setProperty(
        "--conveyor-speed",
        `${newSpeed}s`
      );
    }
  }, [currentTaskIndex, gameState.phase, gameState.totalTasks, tourState.isActive]);
  
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
    setTourState(prev => ({ ...prev, isActive: false, step: 0 }));
 
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
    transform: translateX(-300px);
  }
}

.animate-conveyor {
  animation: conveyor var(--conveyor-speed) linear infinite;
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

                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded-lg border ${
                      isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{task.text}</span>
                      <div className="flex items-center">
                        {isCorrect ? (
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
                        You {task.userChoice === "keep" ? "kept" : "tossed"}{" "}
                        this task
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
    <div className="min-h-screen bg-gradient-forest relative overflow-hidden">
  {/* Tour Overlay */}
      <TourOverlay
        tourState={tourState}
        onNextStep={handleTourNext}
        onSkipTour={handleTourSkip}
        toolboxRef={toolboxRef}
        trashRef={trashRef}
      />
      {/* Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <BearMascot
          score={gameState.score}
          isPlaying={true}
          isGenerating={false}
        />
      </div>

      {/* Goal Display */}
      <div className="absolute top-4 left-4 z-10">
        <Badge
          variant="secondary"
          className="bg-gradient-honey text-bear-brown font-bold text-sm"
        >
          🎯 {gameState.goal}
        </Badge>
      </div>

      {/* Help and Mute Buttons */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={handleToggleMute}
          className="rounded-full bg-card/80 backdrop-blur-sm"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      
      </div>

      {/* Progress */}
      <div className="absolute top-16 right-4 z-10">
        <Badge variant="secondary" className="bg-card text-foreground">
          {currentTaskIndex + 1} / {gameState.totalTasks}
        </Badge>
      </div>

      {/* Conveyor Belt */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-32 bg-wood border-y-4 border-wood-light conveyor-belt"
       style={{ touchAction: 'none' }}
      >
        <div className="w-full h-full bg-gradient-wood opacity-80 relative overflow-hidden">
          {currentTask && !currentTask.processed && !animatingTask && (
            <div
              ref={conveyorRef}
              className="absolute top-1/3 -translate-y-1/2 animate-conveyor"
              key={currentTask.id}
              style={{ touchAction: 'none' }}
            >
              <TaskCard task={currentTask} />
            </div>
          )}
        </div>
      </div>

      {/* Toolbox and Trash Bin */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 lg:gap-32">
        {/* Toolbox */}
        <div ref={toolboxRef}>
          <div
            onClick={handleKeep}
            className={`clickable-area w-32 h-32 bg-forest border-4 flex flex-col items-center justify-center
						rounded-md cursor-pointer ${
              showFeedback &&
              showFeedback.taskId === currentTask?.id &&
              animatingTask?.target === "toolbox"
                ? "animate-pulse-glow"
                : ""
            }`}
          >
            <Wrench className="w-8 h-8 text-primary-foreground mb-2" />
            <span className="text-primary-foreground font-bold text-sm">
              Keep
            </span>
          </div>
        </div>

        {/* Trash Bin */}
        <div ref={trashRef}>
          <div
            onClick={handleToss}
            className={`clickable-area w-32 h-32 bg-destructive border-4 flex flex-col items-center justify-center
						rounded-md cursor-pointer ${
              showFeedback &&
              showFeedback.taskId === currentTask?.id &&
              animatingTask?.target === "trash"
                ? "animate-pulse-glow-incorrect"
                : ""
            }`}
          >
            <Trash2 className="w-8 h-8 text-destructive-foreground mb-2" />
            <span className="text-destructive-foreground font-bold text-sm">
              Toss
            </span>
          </div>
        </div>
      </div>

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