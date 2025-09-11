import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Wrench, Star, Target } from 'lucide-react';
import bearMascot from '@/assets/bear-mascot.png';

interface Task {
  id: string;
  text: string;
  isRelevant: boolean;
  processed: boolean;
}

interface GameState {
  phase: 'input' | 'playing' | 'results';
  goal: string;
  tasks: Task[];
  score: number;
  correctSorts: number;
  totalTasks: number;
}

const TaskCard = ({ task, onSort }: { task: Task; onSort: (taskId: string, isCorrect: boolean) => void }) => {
  const handleToolbox = () => {
    onSort(task.id, task.isRelevant);
  };

  const handleTrash = () => {
    onSort(task.id, !task.isRelevant);
  };

  return (
    <Card className="absolute top-1/2 -translate-y-1/2 w-64 p-4 bg-card border-2 border-wood 
                     shadow-lg animate-conveyor cursor-pointer hover:scale-105 transition-transform
                     bg-gradient-wood">
      <div className="text-sm font-medium text-foreground mb-3">{task.text}</div>
      <div className="flex gap-2 justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleToolbox}
          className="flex items-center gap-1 bg-forest text-primary-foreground border-forest-light 
                     hover:bg-forest-light"
        >
          <Wrench className="w-4 h-4" />
          Keep
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTrash}
          className="flex items-center gap-1 bg-destructive text-destructive-foreground 
                     border-destructive hover:bg-destructive/80"
        >
          <Trash2 className="w-4 h-4" />
          Toss
        </Button>
      </div>
    </Card>
  );
};

const BearMascot = ({ score, isPlaying }: { score: number; isPlaying: boolean }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={bearMascot}
        alt="Bear Mascot"
        className={`w-32 h-32 ${isPlaying ? 'animate-bounce-gentle' : 'animate-wobble'}`}
      />
      {isPlaying && (
        <Badge variant="secondary" className="bg-gradient-honey text-bear-brown font-bold">
          <Star className="w-4 h-4 mr-1" />
          Score: {score}
        </Badge>
      )}
    </div>
  );
};

// Mock AI task generation
const generateTasks = (goal: string): Task[] => {
  const relevantTasks = [
    `Research ${goal.toLowerCase()} best practices`,
    `Create a plan for ${goal.toLowerCase()}`,
    `Set milestones for ${goal.toLowerCase()}`,
    `Allocate budget for ${goal.toLowerCase()}`,
    `Find resources for ${goal.toLowerCase()}`,
    `Schedule time for ${goal.toLowerCase()}`,
  ];

  const irrelevantTasks = [
    'Organize your sock drawer',
    'Learn ancient Latin poetry',
    'Count all the leaves on a tree',
    'Memorize the phone book',
    'Practice juggling with eggs',
    'Rearrange your furniture daily',
    'Study the migration patterns of butterflies',
    'Perfect your yodeling skills',
  ];

  const selectedRelevant = relevantTasks.slice(0, 4);
  const selectedIrrelevant = irrelevantTasks.slice(0, 3);

  const allTasks = [
    ...selectedRelevant.map((task, i) => ({
      id: `r${i}`,
      text: task,
      isRelevant: true,
      processed: false,
    })),
    ...selectedIrrelevant.map((task, i) => ({
      id: `ir${i}`,
      text: task,
      isRelevant: false,
      processed: false,
    })),
  ];

  return allTasks.sort(() => Math.random() - 0.5);
};

export const TaskSortingGame = () => {
  const [gameState, setGameState] = useState<GameState>({
    phase: 'input',
    goal: '',
    tasks: [],
    score: 0,
    correctSorts: 0,
    totalTasks: 0,
  });

  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [goalInput, setGoalInput] = useState('');

  const startGame = () => {
    const tasks = generateTasks(goalInput);
    setGameState({
      phase: 'playing',
      goal: goalInput,
      tasks,
      score: 0,
      correctSorts: 0,
      totalTasks: tasks.length,
    });
    setCurrentTaskIndex(0);
  };

  const sortTask = useCallback((taskId: string, isCorrect: boolean) => {
    setGameState(prev => {
      const updatedTasks = prev.tasks.map(task =>
        task.id === taskId ? { ...task, processed: true } : task
      );

      const newScore = isCorrect ? prev.score + 10 : Math.max(0, prev.score - 5);
      const newCorrectSorts = isCorrect ? prev.correctSorts + 1 : prev.correctSorts;

      return {
        ...prev,
        tasks: updatedTasks,
        score: newScore,
        correctSorts: newCorrectSorts,
      };
    });

    setTimeout(() => {
      setCurrentTaskIndex(prev => prev + 1);
    }, 500);
  }, []);

  useEffect(() => {
    if (gameState.phase === 'playing' && currentTaskIndex >= gameState.tasks.length) {
      setTimeout(() => {
        setGameState(prev => ({ ...prev, phase: 'results' }));
      }, 1000);
    }
  }, [currentTaskIndex, gameState.phase, gameState.tasks.length]);

  const resetGame = () => {
    setGameState({
      phase: 'input',
      goal: '',
      tasks: [],
      score: 0,
      correctSorts: 0,
      totalTasks: 0,
    });
    setGoalInput('');
    setCurrentTaskIndex(0);
  };

  const currentTask = gameState.tasks[currentTaskIndex];

  if (gameState.phase === 'input') {
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BearMascot score={0} isPlaying={false} />
          <h1 className="text-4xl font-bold text-primary-foreground mb-4">
            🐻 Bear's Task Factory
          </h1>
          <p className="text-primary-foreground/80 mb-6">
            Help our friendly bear sort relevant tasks from the clutter! 
            Enter your goal and we'll generate tasks for you to sort.
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

  if (gameState.phase === 'results') {
    const accuracy = (gameState.correctSorts / gameState.totalTasks) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BearMascot score={gameState.score} isPlaying={false} />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Great Job! 🎉
          </h2>
          <div className="bg-card rounded-lg p-6 mb-6 space-y-3">
            <div className="text-2xl font-bold text-honey">Goal: {gameState.goal}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-forest">{gameState.score}</div>
                <div className="text-muted-foreground">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{accuracy.toFixed(0)}%</div>
                <div className="text-muted-foreground">Accuracy</div>
              </div>
            </div>
          </div>
          <Button
            onClick={resetGame}
            className="w-full bg-gradient-honey text-bear-brown font-bold hover:scale-105 transition-transform"
          >
            🐻 Play Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-forest relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <BearMascot score={gameState.score} isPlaying={true} />
      </div>

      {/* Goal Display */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="secondary" className="bg-gradient-honey text-bear-brown font-bold text-sm">
          🎯 {gameState.goal}
        </Badge>
      </div>

      {/* Progress */}
      <div className="absolute top-4 right-4 z-10">
        <Badge variant="secondary" className="bg-card text-foreground">
          {currentTaskIndex + 1} / {gameState.totalTasks}
        </Badge>
      </div>

      {/* Conveyor Belt */}
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-32 bg-wood border-y-4 border-wood-light">
        <div className="w-full h-full bg-gradient-wood opacity-80">
          {currentTask && !currentTask.processed && (
            <TaskCard task={currentTask} onSort={sortTask} />
          )}
        </div>
      </div>

      {/* Toolbox */}
      <div className="absolute bottom-8 left-8">
        <Card className="w-32 h-32 bg-forest border-forest-light flex flex-col items-center justify-center
                         animate-bounce-gentle">
          <Wrench className="w-8 h-8 text-primary-foreground mb-2" />
          <span className="text-primary-foreground font-bold text-sm">Toolbox</span>
        </Card>
      </div>

      {/* Trash Bin */}
      <div className="absolute bottom-8 right-8">
        <Card className="w-32 h-32 bg-destructive border-destructive flex flex-col items-center justify-center
                         animate-bounce-gentle">
          <Trash2 className="w-8 h-8 text-destructive-foreground mb-2" />
          <span className="text-destructive-foreground font-bold text-sm">Trash</span>
        </Card>
      </div>
    </div>
  );
};