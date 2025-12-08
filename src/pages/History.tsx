import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

interface GameHistory {
  game_date: string;
  score: number;
  words_found: string[];
  pangrams_found: string[];
  rank?: string;
}

const getRank = (score: number, maxScore: number = 500): string => {
  const percentage = (score / maxScore) * 100;
  if (percentage === 0) return "Beginner";
  if (percentage < 5) return "Good Start";
  if (percentage < 10) return "Moving Up";
  if (percentage < 20) return "Good";
  if (percentage < 30) return "Solid";
  if (percentage < 40) return "Nice";
  if (percentage < 50) return "Great";
  if (percentage < 60) return "Amazing";
  if (percentage < 70) return "Genius";
  if (percentage < 100) return "Queen Bee";
  return "Perfect!";
};

export default function History() {
  const { user, loading: authLoading } = useAuth();
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchHistory = async () => {
      if (authLoading) return;

      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const gamesRef = collection(db, "users", user.uid, "games");
        const q = query(gamesRef, orderBy("timestamp", "desc"), limit(50));
        const querySnapshot = await getDocs(q);

        const games: GameHistory[] = [];
        querySnapshot.forEach((doc) => {
          games.push(doc.data() as GameHistory);
        });

        setHistory(games);
      } catch (error: any) {
        console.error("Error fetching history:", error);
        toast.error("Failed to load history", {
          description: error.message || "Unknown error occurred"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user, authLoading]);

  const toggleRow = (index: number) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-game-bg flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading history...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-game-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-8">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Game History
          </span>
        </h1>

        {!user ? (
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">
              Please log in to view your game history.
            </p>
          </Card>
        ) : history.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-lg text-muted-foreground">
              No games played yet. Start playing to build your history!
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {history.map((game, index) => (
              <Collapsible key={index} open={expandedRows.has(index)} onOpenChange={() => toggleRow(index)}>
                <Card>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full p-4 h-auto hover:bg-muted/50">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <div className="font-semibold">
                              {format(new Date(game.game_date), "MMMM d, yyyy")}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {game.words_found?.length || 0} words • {game.score} points
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-accent/10">
                            {game.rank || getRank(game.score)}
                          </Badge>
                          {game.pangrams_found?.length > 0 && (
                            <Badge className="bg-gradient-to-r from-primary to-accent">
                              {game.pangrams_found.length} Pangram{game.pangrams_found.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                          {expandedRows.has(index) ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4 pt-2 border-t">
                      <h3 className="font-semibold mb-3">Words Found ({game.words_found?.length || 0})</h3>
                      <div className="flex flex-wrap gap-2">
                        {game.words_found?.map((word, wordIndex) => {
                          const isPangram = game.pangrams_found?.includes(word);
                          return (
                            <Badge
                              key={wordIndex}
                              variant={isPangram ? "default" : "outline"}
                              className={isPangram ? "bg-gradient-to-r from-primary to-accent" : ""}
                            >
                              {word}
                              {isPangram && " 🎉"}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
