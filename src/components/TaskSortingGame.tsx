import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Wrench, Star, Target, Loader, Check, X } from 'lucide-react';
import bearMascot from '@/assets/bear-mascot.png';

interface Task {
  id: string;
  text: string;
  isRelevant: boolean;
  processed: boolean;
  userChoice?: 'keep' | 'toss';
}

interface GameState {
  phase: 'input' | 'generating' | 'playing' | 'results';
  goal: string;
  tasks: Task[];
  score: number;
  correctSorts: number;
  totalTasks: number;
}

const TaskCard = ({ task, isAnimating, animationTarget }: { 
  task: Task; 
  isAnimating?: boolean;
  animationTarget?: 'toolbox' | 'trash' | null;
}) => {
  return (
    <Card className={`w-64 p-4 bg-card border-2 border-wood 
                     shadow-lg transition-all duration-300
                     bg-gradient-wood ${isAnimating ? 'animate-fly-to-' + animationTarget : ''}`}>
      <div className="text-sm font-medium text-foreground mb-3">{task.text}</div>
    </Card>
  );
};

const BearMascot = ({ score, isPlaying, isGenerating }: { score: number; isPlaying: boolean; isGenerating: boolean }) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={bearMascot}
        alt="Bear Mascot"
        className={`w-32 h-32 ${isPlaying ? 'animate-bounce-gentle' : isGenerating ? 'animate-pulse' : 'animate-wobble'}`}
      />
      {isPlaying && (
        <Badge variant="secondary" className="bg-gradient-honey text-bear-brown font-bold">
          <Star className="w-4 h-4 mr-1" />
          Score: {score}
        </Badge>
      )}
      {isGenerating && (
        <Badge variant="secondary" className="bg-gradient-honey text-bear-brown font-bold">
          <Loader className="w-4 h-4 mr-1 animate-spin" />
          Generating Tasks...
        </Badge>
      )}
    </div>
  );
};

// Gemini API task generation
const generateTasksWithGemini = async (goal: string): Promise<Task[]> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
  }

  const prompt = `Given the user goal: "${goal}"
  
  Generate exactly 5 highly relevant tasks and exactly 5 completely irrelevant tasks.
  
  Format your response as follows:
  Relevant: [task description]
  Relevant: [task description]
  Relevant: [task description]
  Relevant: [task description]
  Relevant: [task description]
  Irrelevant: [task description]
  Irrelevant: [task description]
  Irrelevant: [task description]
  Irrelevant: [task description]
  Irrelevant: [task description]
  
  Make sure the irrelevant tasks are completely unrelated to the user's goal.
  Make sure the tasks are not longer than 7 words each.`;

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log(data)
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Invalid response format from Gemini API');
    }

    const generatedText = data.candidates[0].content.parts[0].text;
    const lines = generatedText.split('\n').filter(line => line.trim() !== '');
    
    const tasks: Task[] = [];
    let relevantCount = 0;
    let irrelevantCount = 0;

    for (const line of lines) {
      if (line.startsWith('Relevant:') && relevantCount < 5) {
        tasks.push({
          id: `r${relevantCount}`,
          text: line.replace('Relevant:', '').trim(),
          isRelevant: true,
          processed: false
        });
        relevantCount++;
      } else if (line.startsWith('Irrelevant:') && irrelevantCount < 5) {
        tasks.push({
          id: `ir${irrelevantCount}`,
          text: line.replace('Irrelevant:', '').trim(),
          isRelevant: false,
          processed: false
        });
        irrelevantCount++;
      }
      
      // Stop if we have all tasks
      if (relevantCount === 5 && irrelevantCount === 5) break;
    }

    // Fallback if we didn't get enough tasks from the API
    if (tasks.length < 10) {
      console.warn('API did not return enough tasks, using fallback data');
      return getFallbackTasks(goal);
    }

    return tasks.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('Error generating tasks with Gemini:', error);
    // Fallback to mock data if API fails
    return getFallbackTasks(goal);
  }
};

// Fallback task generation if Gemini API fails
const getFallbackTasks = (goal: string): Task[] => {
  const relevantTasks = [
    `Research ${goal.toLowerCase()} best practices`,
    `Create a plan for ${goal.toLowerCase()}`,
    `Set milestones for ${goal.toLowerCase()}`,
    `Allocate budget for ${goal.toLowerCase()}`,
    `Schedule time for ${goal.toLowerCase()}`
  ];

  const irrelevantTasks = [
    'Organize your sock drawer',
    'Learn ancient Latin poetry',
    'Count all the leaves on a tree',
    'Watch clouds for an hour',
    'Memorize the phone book'
  ];

  const allTasks = [
    ...relevantTasks.map((task, i) => ({
      id: `r${i}`,
      text: task,
      isRelevant: true,
      processed: false,
    })),
    ...irrelevantTasks.map((task, i) => ({
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
  const [animatingTask, setAnimatingTask] = useState<{taskId: string, target: 'toolbox' | 'trash'} | null>(null);
  const toolboxRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  const startGame = async () => {
    setGameState(prev => ({
      ...prev,
      phase: 'generating'
    }));

    try {
      const tasks = await generateTasksWithGemini(goalInput);
      setGameState({
        phase: 'playing',
        goal: goalInput,
        tasks,
        score: 0,
        correctSorts: 0,
        totalTasks: tasks.length,
      });
      setCurrentTaskIndex(0);
    } catch (error) {
      console.error('Failed to generate tasks:', error);
      // Fallback to mock data
      const tasks = getFallbackTasks(goalInput);
      setGameState({
        phase: 'playing',
        goal: goalInput,
        tasks,
        score: 0,
        correctSorts: 0,
        totalTasks: tasks.length,
      });
      setCurrentTaskIndex(0);
    }
  };

  const sortTask = useCallback((taskId: string, isCorrect: boolean, choice: 'keep' | 'toss') => {
    // Set animation target
    const target = choice === 'keep' ? 'toolbox' : 'trash';
    setAnimatingTask({ taskId, target });

    // Wait for animation to complete before updating state
    setTimeout(() => {
      setGameState(prev => {
        const updatedTasks = prev.tasks.map(task =>
          task.id === taskId ? { ...task, processed: true, userChoice: choice } : task
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

      setAnimatingTask(null);
      setCurrentTaskIndex(prev => prev + 1);
    }, 800); // Match animation duration
  }, []);

  const handleKeep = useCallback(() => {
    if (currentTaskIndex < gameState.tasks.length) {
      const currentTask = gameState.tasks[currentTaskIndex];
      sortTask(currentTask.id, currentTask.isRelevant, 'keep');
    }
  }, [currentTaskIndex, gameState.tasks, sortTask]);

  const handleToss = useCallback(() => {
    if (currentTaskIndex < gameState.tasks.length) {
      const currentTask = gameState.tasks[currentTaskIndex];
      sortTask(currentTask.id, !currentTask.isRelevant, 'toss');
    }
  }, [currentTaskIndex, gameState.tasks, sortTask]);

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
    setAnimatingTask(null);
  };

  const currentTask = gameState.tasks[currentTaskIndex];

  // Add CSS for animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flyToToolbox {
        0% {
          transform: translate(-50%, -50%);
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
          transform: translate(-50%, -50%);
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
      
      .animate-fly-to-toolbox {
        animation: flyToToolbox 0.8s forwards;
        z-index: 50;
      }
      
      .animate-fly-to-trash {
        animation: flyToTrash 0.8s forwards;
        z-index: 50;
      }
      
      @keyframes conveyor {
        0% {
          left: 100%;
        }
        100% {
          left: -300px;
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
      
      document.documentElement.style.setProperty('--toolbox-x', `${toolboxRect.left + toolboxRect.width / 2}px`);
      document.documentElement.style.setProperty('--toolbox-y', `${toolboxRect.top + toolboxRect.height / 2}px`);
      document.documentElement.style.setProperty('--trash-x', `${trashRect.left + trashRect.width / 2}px`);
      document.documentElement.style.setProperty('--trash-y', `${trashRect.top + trashRect.height / 2}px`);
    }
  }, [gameState.phase]);

  if (gameState.phase === 'input') {
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-md">
          <BearMascot score={0} isPlaying={false} isGenerating={false} />
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

  if (gameState.phase === 'generating') {
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

  if (gameState.phase === 'results') {
    const accuracy = (gameState.correctSorts / gameState.totalTasks) * 100;
    
    return (
      <div className="min-h-screen bg-gradient-forest flex flex-col items-center justify-center p-8">
        <div className="text-center max-w-2xl w-full">
          <BearMascot score={gameState.score} isPlaying={false} isGenerating={false} />
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Great Job! 🎉
          </h2>
          <div className="bg-card rounded-lg p-6 mb-6 space-y-4">
            <div className="text-2xl font-bold text-honey">Goal: {gameState.goal}</div>
            <div className="grid grid-cols-2 gap-4 text-sm mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-forest">{gameState.score}</div>
                <div className="text-muted-foreground">Final Score</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-honey">{accuracy.toFixed(0)}%</div>
                <div className="text-muted-foreground">Accuracy</div>
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-foreground mb-3">Task Results</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {gameState.tasks.map((task) => {
                const isCorrect = 
                  (task.isRelevant && task.userChoice === 'keep') || 
                  (!task.isRelevant && task.userChoice === 'toss');
                
                return (
                  <div key={task.id} className={`p-3 rounded-lg border ${isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
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
                      <span className={`font-medium ${task.isRelevant ? 'text-green-600' : 'text-red-600'}`}>
                        {task.isRelevant ? 'Relevant' : 'Irrelevant'}
                      </span>
                      <span className="text-muted-foreground mx-2">•</span>
                      <span className="text-muted-foreground">
                        You {task.userChoice === 'keep' ? 'kept' : 'tossed'} this task
                      </span>
                    </div>
                  </div>
                );
              })}
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
        <BearMascot score={gameState.score} isPlaying={true} isGenerating={false} />
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
        <div className="w-full h-full bg-gradient-wood opacity-80 relative">
          {currentTask && !currentTask.processed && (
            <div className="absolute top-1/2 -translate-y-1/2 left-0 animate-conveyor">
              <TaskCard 
                task={currentTask} 
              />
            </div>
          )}
        </div>
      </div>
      {/* Toolbox and Trash Bin */}
          <div className='absolute bottom-8 flex justify-center bg-red w-full gap-10'>
      {/* Toolbox */}
      <div ref={toolboxRef} className=" left-72">
        <div 
          onClick={handleKeep}
          className="clickable-area w-32 h-32 bg-forest border-4 flex flex-col items-center justify-center
                     animate-bounce-gentle rounded-md cursor-pointer"
        >
          <Wrench className="w-8 h-8 text-primary-foreground mb-2" />
          <span className="text-primary-foreground font-bold text-sm">Keep</span>
        </div>
      </div>

      {/* Trash Bin */}
      <div ref={trashRef} className=" right-72">
        <div 
          onClick={handleToss}
          className="clickable-area w-32 h-32 bg-destructive border-4 flex flex-col items-center justify-center
                     animate-bounce-gentle rounded-md cursor-pointer"
        >
          <Trash2 className="w-8 h-8 text-destructive-foreground mb-2" />
          <span className="text-destructive-foreground font-bold text-sm">Toss</span>
        </div>
      </div>
</div>
      {/* Animating Task */}
      {animatingTask && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
          <TaskCard 
            task={gameState.tasks.find(t => t.id === animatingTask.taskId)!} 
            isAnimating={true}
            animationTarget={animatingTask.target}
          />
        </div>
      )}
    </div>
  );
};