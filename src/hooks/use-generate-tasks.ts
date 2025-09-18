interface Task {
    id: string;
    text: string;
    isRelevant: boolean;
    processed: boolean;
    userChoice?: 'keep' | 'toss';
  }
// Gemini API task generation
const UseGenerateTasks = async (goal: string): Promise<Task[]> => {
  const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not found. Please set VITE_GEMINI_API_KEY in your environment variables.');
  }

  const prompt = `Given the user goal: "${goal}"
  
  Generate exactly 5 highly relevant tasks and exactly 5 a mix of irrelevant tasks and some tasks that are related to the same work but distraction.
  
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
      return UseGetFallbackTasks(goal);
    }

    return tasks.sort(() => Math.random() - 0.5);
  } catch (error) {
    console.error('Error generating tasks with Gemini:', error);
    // Fallback to mock data if API fails
    return UseGetFallbackTasks(goal);
  }
};


// Fallback task generation if Gemini API fails
const UseGetFallbackTasks = (goal: string): Task[] => {
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


export  {UseGenerateTasks, UseGetFallbackTasks};