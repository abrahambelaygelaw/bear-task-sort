import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { HighScoreBoard } from "@/components/game/HighScoreBoard";
import { saveHighScore } from "@/lib/supabase";
import { toast } from "sonner";

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
  startTime?: number;
  responseTime?: number;

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

// Tab type for mobile results view
type ResultsTab = "results" | "leaderboard";

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
  const [playerName, setPlayerName] = useState("");
  const [savingScore, setSavingScore] = useState(false);
  const [hasSavedScore, setHasSavedScore] = useState(false);
  const [highScoreUpdateTrigger, setHighScoreUpdateTrigger] = useState(0);
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
  const [activeResultsTab, setActiveResultsTab] = useState<ResultsTab>("results");
  const toolboxRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);
  const conveyorRef = useRef<HTMLDivElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const taskTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentConveyorSpeedRef = useRef(10);

  const startGame = async () => {
    setGameState((prev) => ({
      ...prev,
      phase: "generating",
    }));

    try {
      const tasks = await UseGenerateTasks(goalInput);
      console.log({tasks})
      const tasksWithTiming = tasks.map((task) => ({
        ...task,
        startTime: undefined,
        responseTime: undefined
      }));
      
      if (tasksWithTiming.length > 0) {
        tasksWithTiming[0].startTime = Date.now();
      }
      
      setGameState({
        phase: "playing",
        goal: goalInput,
        tasks: tasksWithTiming,
        tasks: tasksWithTiming,
        score: 0,
        correctSorts: 0,
        totalTasks: tasksWithTiming.length,
        totalTasks: tasksWithTiming.length,
      });
      playBackgroundMusic(isMuted);

      setCurrentTaskIndex(0);

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
      playWrongSound(isMuted);

      setGameState((prev) => {
        const updatedTasks = prev.tasks.map((task) =>
          task.id === currentTask.id
            ? { ...task, processed: true, userChoice: "missed" as const, responseTime: currentConveyorSpeedRef.current * 1000 }
            : task
        );

        const nextIndex = currentTaskIndex + 1;
        if (nextIndex < updatedTasks.length && !updatedTasks[nextIndex].startTime) {
          updatedTasks[nextIndex].startTime = Date.now();
        }

        return {
          ...prev,
          tasks: updatedTasks,
        };
      });

      setCurrentTaskIndex((prev) => prev + 1);
    }
  }, [currentTaskIndex, gameState.tasks, isMuted, tourState.isActive]);

  useEffect(() => {
    if (
      gameState.phase === "playing" &&
      !tourState.isActive &&
      currentTaskIndex < gameState.tasks.length
    ) {
      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
      }

      const timeoutDuration = currentConveyorSpeedRef.current * 1000;

      taskTimeoutRef.current = setTimeout(() => {
        handleMissedTask();
      }, timeoutDuration);
    }

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

      if (taskTimeoutRef.current) {
        clearTimeout(taskTimeoutRef.current);
        taskTimeoutRef.current = null;
      }

      const currentTask = gameState.tasks.find(t => t.id === taskId);
      if (!currentTask) return;
      
      const responseTime = currentTask.startTime 
        ? Math.max(0, Date.now() - currentTask.startTime)
        : currentConveyorSpeedRef.current * 1000;
      
      const maxTime = currentConveyorSpeedRef.current * 1000;
      const timeRatio = Math.max(0, Math.min(1, 1 - responseTime / maxTime));
        
      const basePoints = isCorrect ? 100 : 0;
      const speedBonus = isCorrect ? Math.floor(timeRatio * 50) : 0;
      const taskPoints = basePoints + speedBonus;

      if (isCorrect) {
        playCorrectSound(isMuted);
      } else {
        playWrongSound(isMuted);
      }

      setShowFeedback({ isCorrect, taskId });

      const target = choice === "keep" ? "toolbox" : "trash";
      setAnimatingTask({ taskId, target });

      setTimeout(() => {
        setGameState((prev) => {
          const updatedTasks = prev.tasks.map((task) =>
            task.id === taskId
              ? { ...task, processed: true, userChoice: choice, responseTime }
              : task
          );

          const nextIndex = currentTaskIndex + 1;
          if (nextIndex < updatedTasks.length) {
            updatedTasks[nextIndex].startTime = Date.now();
          }

          const newScore = prev.score + taskPoints;
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
      }, 500);
    },
    [isMuted, tourState.isActive,gameState.tasks]
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
    
    e.preventDefault();
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
    
    if (Math.abs(deltaX) > threshold && Math.abs(deltaX) > deltaY) {
      if (deltaX < 0) {
        handleToss();
      } else {
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
    if (gameState.phase === "playing" && !tourState.isActive) {
      const initialSpeed = 10;
      const finalSpeed = 4;
      const totalTasks = gameState.totalTasks;

      let newSpeed;
    
      if (totalTasks <= 4) {
        newSpeed = finalSpeed;
      } else {
        if (currentTaskIndex >= totalTasks - 4) {
          newSpeed = finalSpeed;
        } else {
          const progress = currentTaskIndex / (totalTasks - 4);
          newSpeed = initialSpeed - (initialSpeed - finalSpeed) * progress;
        }
      }

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
    setPlayerName("");
    setSavingScore(false);
    setHasSavedScore(false);
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
    setActiveResultsTab("results");
    currentConveyorSpeedRef.current = 10;

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

  const handleSaveHighScore = async () => {
    if (!playerName.trim() || savingScore) return;

    setSavingScore(true);
    try {
      const accuracy = (gameState.correctSorts / gameState.tasks.length) * 100;

      await saveHighScore({
        player_name: playerName.trim(),
        score: gameState.score,
        goal: gameState.goal,
        accuracy: Number(accuracy.toFixed(2)),
        tasks_completed: gameState.tasks.length,
      });

      toast.success("High score saved!", {
        description: `Your score of ${gameState.score} has been added to the leaderboard.`,
      });
      
      setHasSavedScore(true);
      setHighScoreUpdateTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error saving high score:", error);
      toast.error("Failed to save high score. Please try again.");
    } finally {
      setSavingScore(false);
    }
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

/* Mobile Tabs */
.mobile-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 16px;
}

.mobile-tab {
  flex: 1;
  padding: 12px 16px;
  text-align: center;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(255, 255, 255, 0.8);
}

.mobile-tab.active {
  background: white;
  color: #1a472a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
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

  // Render Results Component (extracted for better organization)
  const renderResultsContent = () => {
    const accuracy = (gameState.correctSorts / gameState.totalTasks) * 100;

    if (isMobile) {
      return (
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Tabs */}
          <div className="mobile-tabs">
            <div 
              className={`mobile-tab ${activeResultsTab === "results" ? "active" : ""}`}
              onClick={() => setActiveResultsTab("results")}
            >
              Your Results
            </div>
            <div 
              className={`mobile-tab ${activeResultsTab === "leaderboard" ? "active" : ""}`}
              onClick={() => setActiveResultsTab("leaderboard")}
            >
              Leaderboard
            </div>
          </div>

          {/* Tab Content */}
          {activeResultsTab === "results" ? (
            <div className="bg-card rounded-lg p-6 mb-6">
              <div className="flex justify-center mb-4">
                <BearMascot
                  score={gameState.score}
                  isPlaying={false}
                  isGenerating={false}
                />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
                Great Job! 
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gradient-honey rounded-lg text-center">
                  <div className="text-sm text-bear-brown font-medium">Final Score</div>
                  <div className="text-3xl font-bold text-bear-brown">
                    {gameState.score}
                  </div>
                </div>
                <div className="p-4 bg-gradient-sky rounded-lg text-center">
                  <div className="text-sm text-forest font-medium">Accuracy</div>
                  <div className="text-3xl font-bold text-forest">
                    {accuracy.toFixed(0)}%
                  </div>
                </div>
              </div>

              {!hasSavedScore && gameState.score > 0 && (
                <div className="space-y-3 mb-6">
                  <Label htmlFor="playerName" className="text-foreground font-semibold">
                    Save Your High Score
                  </Label>
                  <Input
                    id="playerName"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveHighScore();
                      }
                    }}
                    className="bg-background"
                  />
                  <Button
                    onClick={handleSaveHighScore}
                    disabled={!playerName.trim() || savingScore}
                    className="w-full bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
                  >
                    {savingScore ? "Saving..." : "Save Score"}
                  </Button>
                </div>
              )}

              {hasSavedScore && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Score saved successfully!</p>
                  <p className="text-green-600 text-sm">Your high score has been added to the leaderboard.</p>
                </div>
              )}

              <h3 className="text-lg font-bold text-foreground mb-3">
                Task Results
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{task.text}</span>
                          <div className="text-xs mt-1">
                            <span
                              className={`font-medium ${
                                task.isRelevant ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {task.isRelevant ? "Relevant" : "Irrelevant"}
                            </span>
                            <span className="text-muted-foreground mx-1">•</span>
                            <span className="text-muted-foreground">
                              {isMissed
                                ? "Missed"
                                : `${task.userChoice === "keep" ? "Kept" : "Tossed"}`}
                            </span>
                            {task.responseTime && (
                              <>
                                <span className="text-muted-foreground mx-1">•</span>
                                <span className="text-muted-foreground">
                                  {(task.responseTime/1000).toFixed(2)}{" s"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {isMissed ? (
                          <X className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        ) : isCorrect ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={resetGame}
                className="w-full mt-6 bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
              >
                🐻 Play Again
              </Button>
            </div>
          ) : (
            <div className="bg-card rounded-lg p-6">
              <HighScoreBoard key={highScoreUpdateTrigger} />
            </div>
          )}
        </div>
      );
    } else {
      // Desktop layout (original two-column layout)
      return (
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-6">
          <div className="w-full">
            <div className="bg-card rounded-lg p-6 mb-6">
              <div className="flex justify-center mb-4">
                <BearMascot
                  score={gameState.score}
                  isPlaying={false}
                  isGenerating={false}
                />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4 text-center">
                Great Job! 
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gradient-honey rounded-lg text-center">
                  <div className="text-sm text-bear-brown font-medium">Final Score</div>
                  <div className="text-3xl font-bold text-bear-brown">
                    {gameState.score}
                  </div>
                </div>
                <div className="p-4 bg-gradient-sky rounded-lg text-center">
                  <div className="text-sm text-forest font-medium">Accuracy</div>
                  <div className="text-3xl font-bold text-forest">
                    {accuracy.toFixed(0)}%
                  </div>
                </div>
              </div>

              {!hasSavedScore && gameState.score > 0 && (
                <div className="space-y-3 mb-6">
                  <Label htmlFor="playerName" className="text-foreground font-semibold">
                    Save Your High Score
                  </Label>
                  <Input
                    id="playerName"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleSaveHighScore();
                      }
                    }}
                    className="bg-background"
                  />
                  <Button
                    onClick={handleSaveHighScore}
                    disabled={!playerName.trim() || savingScore}
                    className="w-full bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
                  >
                    {savingScore ? "Saving..." : "Save Score"}
                  </Button>
                </div>
              )}

              {hasSavedScore && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                  <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="text-green-800 font-medium">Score saved successfully!</p>
                  <p className="text-green-600 text-sm">Your high score has been added to the leaderboard.</p>
                </div>
              )}

              <h3 className="text-lg font-bold text-foreground mb-3">
                Task Results
              </h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
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
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className="font-medium text-sm">{task.text}</span>
                          <div className="text-xs mt-1">
                            <span
                              className={`font-medium ${
                                task.isRelevant ? "text-green-600" : "text-red-600"
                              }`}
                            >
                              {task.isRelevant ? "Relevant" : "Irrelevant"}
                            </span>
                            <span className="text-muted-foreground mx-1">•</span>
                            <span className="text-muted-foreground">
                              {isMissed
                                ? "Missed"
                                : `${task.userChoice === "keep" ? "Kept" : "Tossed"}`}
                            </span>
                            {task.responseTime && (
                              <>
                                <span className="text-muted-foreground mx-1">•</span>
                                <span className="text-muted-foreground">
                                  {(task.responseTime/1000).toFixed(2)}{" s"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        {isMissed ? (
                          <X className="w-5 h-5 text-orange-600 flex-shrink-0" />
                        ) : isCorrect ? (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-red-600 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={resetGame}
                className="w-full mt-6 bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
              >
                🐻 Play Again
              </Button>
            </div>
          </div>

          <div className="w-full">
            <HighScoreBoard key={highScoreUpdateTrigger} />
          </div>
        </div>
      );
    }
  };

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
    return (
      <div className="min-h-screen bg-gradient-forest flex items-center justify-center p-4">
        {renderResultsContent()}
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