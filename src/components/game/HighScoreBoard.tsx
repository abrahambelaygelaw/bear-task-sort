import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTopHighScores, HighScore } from "@/lib/supabase";
import { Trophy } from "lucide-react";

export const HighScoreBoard = () => {
  const [highScores, setHighScores] = useState<HighScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHighScores = async () => {
      try {
        const scores = await getTopHighScores(10);
        setHighScores(scores);
      } catch (error) {
        console.error("Error fetching high scores:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHighScores();
  }, []);

  if (loading) {
    return (
      <Card className="p-6 bg-gradient-wood border-wood">
        <div className="text-center text-muted-foreground">Loading high scores...</div>
      </Card>
    );
  }

  if (highScores.length === 0) {
    return (
      <Card className="p-6 bg-gradient-wood border-wood">
        <div className="text-center text-muted-foreground">No high scores yet. Be the first!</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-wood border-wood">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h3 className="text-lg font-bold text-foreground">Top 10 High Scores</h3>
      </div>
      <div className="space-y-2">
        {highScores.map((score, index) => (
          <div
            key={score.id}
            className="flex items-center justify-between p-3 bg-card/50 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Badge
                variant="secondary"
                className={`w-8 h-8 flex items-center justify-center ${
                  index === 0
                    ? "bg-amber-500 text-white"
                    : index === 1
                    ? "bg-slate-400 text-white"
                    : index === 2
                    ? "bg-orange-600 text-white"
                    : "bg-muted"
                }`}
              >
                {index + 1}
              </Badge>
              <div>
                <div className="font-semibold text-foreground">{score.player_name}</div>
                <div className="text-xs text-muted-foreground">
                  {score.goal} • {score.accuracy}% accuracy
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg text-foreground">{score.score}</div>
              <div className="text-xs text-muted-foreground">points</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
