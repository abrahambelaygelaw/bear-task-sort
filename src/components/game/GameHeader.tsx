import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { BearMascot } from "./BearMascot";

interface GameHeaderProps {
  score: number;
  goal: string;
  currentTaskIndex: number;
  totalTasks: number;
  isMuted: boolean;
  onToggleMute: () => void;
  isMobile: boolean;
}

export const GameHeader = ({
  score,
  goal,
  currentTaskIndex,
  totalTasks,
  isMuted,
  onToggleMute,
  isMobile,
}: GameHeaderProps) => {
  return (
    <>
      {/* Header */}
      <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 ${isMobile ? 'w-16' : ''}`}>
        <BearMascot score={score} isPlaying={true} isGenerating={false} />
      </div>

      {/* Goal Display */}
      <div className="absolute top-4 left-4 z-10">
        <Badge
          variant="secondary"
          className="bg-gradient-honey text-bear-brown font-bold text-sm"
        >
          🎯 {goal}
        </Badge>
      </div>

      {/* Mute Button */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMute}
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
          {currentTaskIndex + 1} / {totalTasks}
        </Badge>
      </div>
    </>
  );
};