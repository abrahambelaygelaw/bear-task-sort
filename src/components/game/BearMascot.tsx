import { Badge } from "@/components/ui/badge";
import { Star, Loader } from "lucide-react";
import bearMascot from "@/assets/bear-mascot.png";

interface BearMascotProps {
  score: number;
  isPlaying: boolean;
  isGenerating: boolean;
}

export const BearMascot = ({ score, isPlaying, isGenerating }: BearMascotProps) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <img
        src={bearMascot}
        alt="Bear Mascot"
        className={`w-32 ${
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
          <div className="h-4 w-20">
            Score: {score}
          </div>
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