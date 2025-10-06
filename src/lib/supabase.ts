import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface HighScore {
  id: string;
  player_name: string;
  score: number;
  goal: string;
  accuracy: number;
  tasks_completed: number;
  created_at: string;
}

export const saveHighScore = async (data: Omit<HighScore, 'id' | 'created_at'>) => {
  const { data: result, error } = await supabase
    .from('high_scores')
    .insert([data])
    .select()
    .single();

  if (error) throw error;
  return result;
};

export const getTopHighScores = async (limit: number = 10) => {
  const { data, error } = await supabase
    .from('high_scores')
    .select('*')
    .order('score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as HighScore[];
};
