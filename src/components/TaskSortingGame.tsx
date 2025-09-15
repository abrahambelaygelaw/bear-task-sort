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
const playCorrectSound = () => {
  const audio = new Audio(correctSound) 
  audio.play().catch((error) => console.log("Audio play failed",error));
};

const playWrongSound = () => {
  const audio = new Audio(wrongSound); 
  audio.play().catch(() => console.log("Audio play failed"));
};

const bgMusic = new Audio(backgroundMusic);
bgMusic.loop = true;
const playBackgroundMusic = () => {
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
  phase: "input" | "generating" | "playing" | "results" | "instructions";
  goal: string;
  tasks: Task[];
  score: number;
  correctSorts: number;
  totalTasks: number;
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

export const TaskSortingGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: "instructions",
    goal: "",
    tasks: [],
    score: 0,
    correctSorts: 0,
    totalTasks: 0,
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

      playBackgroundMusic()
      setCurrentTaskIndex(0);
    } catch (error) {
      console.error("Failed to generate tasks:", error);
      // Fallback to mock data
      const tasks = UseGetFallbackTasks(goalInput);
      setGameState({
        phase: "playing",
        goal: goalInput,
        tasks,
        score: 0,
        correctSorts: 0,
        totalTasks: tasks.length,
      });
      setCurrentTaskIndex(0);
    }
  };

  const sortTask = useCallback(
    (taskId: string, isCorrect: boolean, choice: "keep" | "toss") => {
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
        playCorrectSound();
      } else {
        playWrongSound();
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
            : Math.max(0, prev.score - 5);
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
    []
  );

  const handleKeep = useCallback(() => {
    if (currentTaskIndex < gameState.tasks.length) {
      const currentTask = gameState.tasks[currentTaskIndex];
      sortTask(currentTask.id, currentTask.isRelevant, "keep");
    }
  }, [currentTaskIndex, gameState.tasks, sortTask]);

  const handleToss = useCallback(() => {
    if (currentTaskIndex < gameState.tasks.length) {
      const currentTask = gameState.tasks[currentTaskIndex];
      sortTask(currentTask.id, !currentTask.isRelevant, "toss");
    }
  }, [currentTaskIndex, gameState.tasks, sortTask]);

  useEffect(() => {
    if (
      gameState.phase === "playing" &&
      currentTaskIndex >= gameState.tasks.length
    ) {
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, phase: "results" }));
      }, 1000);
      stopBackgroundMusic()
    }
  }, [currentTaskIndex, gameState.phase, gameState.tasks.length]);

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
  animation: conveyor 15s linear infinite;
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

  // Instructions screen
  if (gameState.phase === "instructions") {
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-2xl">
          <BearMascot score={0} isPlaying={false} isGenerating={false} />
          <h1 className="text-4xl font-bold text-primary-foreground mb-6">
            Welcome to Bear's Task Factory!
          </h1>

          <Card className="p-6 mb-6 bg-card/80 backdrop-blur-sm">
            <h2 className="text-2xl font-bold mb-4 text-foreground">
              How to Play
            </h2>
            <div className="space-y-4 text-left">
              <div className="flex items-start">
                <div className="bg-honey rounded-full p-2 mr-3">
                  <Target className="w-5 h-5 text-bear-brown" />
                </div>
                <p className="text-foreground">
                  Enter your goal and we'll generate related tasks
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-honey rounded-full p-2 mr-3">
                  <Wrench className="w-5 h-5 text-bear-brown" />
                </div>
                <p className="text-foreground">
                  Click the toolbox to KEEP tasks that help achieve your goal
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-honey rounded-full p-2 mr-3">
                  <Trash2 className="w-5 h-5 text-bear-brown" />
                </div>
                <p className="text-foreground">
                  Click the trash can to TOSS tasks that don't help
                </p>
              </div>
              <div className="flex items-start">
                <div className="bg-honey rounded-full p-2 mr-3">
                  <Star className="w-5 h-5 text-bear-brown" />
                </div>
                <p className="text-foreground">
                  Earn points for correct decisions and see your final score!
                </p>
              </div>
            </div>
          </Card>

          <Button
            onClick={() =>
              setGameState((prev) => ({ ...prev, phase: "input" }))
            }
            className="bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform px-8 py-3 text-lg"
          >
            Let's Get Started!
          </Button>
        </div>
      </div>
    );
  }

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
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  setGameState((prev) => ({ ...prev, phase: "instructions" }))
                }
                variant="outline"
                className="flex-1"
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Instructions
              </Button>
              <Button
                onClick={startGame}
                disabled={!goalInput.trim()}
                className="flex-1 bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
              >
                <Target className="w-4 h-4 mr-2" />
                Start Sorting!
              </Button>
            </div>
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
          <div className="flex gap-2">
            <Button
              onClick={() =>
                setGameState((prev) => ({ ...prev, phase: "instructions" }))
              }
              variant="outline"
              className="flex-1"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              Instructions
            </Button>
            <Button
              onClick={resetGame}
              className="flex-1 bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
            >
              🐻 Play Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-forest relative overflow-hidden">
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

      {/* Help Button */}
      <div className="absolute top-4 right-4 z-10">
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            setGameState((prev) => ({ ...prev, phase: "instructions" }))
          }
          className="rounded-full bg-card/80 backdrop-blur-sm"
        >
          <HelpCircle className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress */}
      <div className="absolute top-16 right-4 z-10">
        <Badge variant="secondary" className="bg-card text-foreground">
          {currentTaskIndex + 1} / {gameState.totalTasks}
        </Badge>
      </div>

      {/* Conveyor Belt */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-32 bg-wood border-y-4 border-wood-light">
        <div className="w-full h-full bg-gradient-wood opacity-80 relative overflow-hidden">
          {currentTask && !currentTask.processed && !animatingTask && (
            <div
              ref={conveyorRef}
              className="absolute top-1/3 -translate-y-1/2 animate-conveyor"
              key={currentTask.id} // This ensures each task starts from the beginning
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
                         showFeedback?.isCorrect &&
                         showFeedback.taskId === currentTask?.id
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
                         showFeedback?.isCorrect === false &&
                         showFeedback.taskId === currentTask?.id
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
