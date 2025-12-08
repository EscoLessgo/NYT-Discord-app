import { RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { LetterHex } from "./LetterHex";
import { GameControls } from "./GameControls";
import { ScorePanel } from "./ScorePanel";
import { WordsList } from "./WordsList";
import { shuffle } from "@/lib/gameUtils";
import { toast } from "sonner";
import { getTodaysPuzzle } from "@/lib/puzzleGenerator";
import { useGamePersistence } from "@/hooks/useGamePersistence";

export const GameBoard = () => {
  const [forceDate, setForceDate] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState(() => getTodaysPuzzle(forceDate));
  const [puzzleId, setPuzzleId] = useState<string>(() => forceDate || new Date().toISOString().split('T')[0]);
  const [currentWord, setCurrentWord] = useState("");
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [outerLetters, setOuterLetters] = useState(puzzle.outerLetters);
  const [rotation, setRotation] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const { loadProgress, saveProgress, isLoaded } = useGamePersistence();
  const allLetters = [puzzle.centerLetter, ...outerLetters];

  // Load saved progress
  useEffect(() => {
    const loadSavedProgress = async () => {
      const savedData = await loadProgress(puzzleId);
      if (savedData) {
        setScore(savedData.score);
        setFoundWords(savedData.words_found || []);
        toast.success("Progress restored!");
      }
    };
    loadSavedProgress();
  }, [loadProgress, puzzleId]);

  // Auto-save
  useEffect(() => {
    if (isLoaded && (score > 0 || foundWords.length > 0)) {
      const pangramsFound = foundWords.filter((word) =>
        puzzle.pangrams.includes(word.toLowerCase())
      );
      saveProgress(puzzleId, score, foundWords, pangramsFound, puzzle.maxScore);
    }
  }, [score, foundWords, isLoaded, puzzle.pangrams, puzzle.maxScore, saveProgress, puzzleId]);

  // Handle force roll - generate new puzzle
  const handleForceRoll = () => {
    // Generate a random date offset (between 1 and 365 days)
    const randomOffset = Math.floor(Math.random() * 365) + 1;
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + randomOffset);
    const dateString = newDate.toISOString().split('T')[0];

    // Create unique ID for forced puzzle (date + timestamp)
    const uniqueId = `${dateString}-${Date.now()}`;

    setForceDate(dateString);
    setPuzzleId(uniqueId);
    const newPuzzle = getTodaysPuzzle(dateString);
    setPuzzle(newPuzzle);
    setOuterLetters(newPuzzle.outerLetters);
    setCurrentWord("");
    setFoundWords([]);
    setScore(0);
    setRotation(0);

    toast.success("New puzzle loaded! 🎲");
  };

  // Letter click
  const handleLetterClick = (letter: string) => {
    setCurrentWord((prev) => prev + letter);
  };

  // Delete last letter
  const handleDelete = () => {
    setCurrentWord((prev) => prev.slice(0, -1));
  };

  // Shuffle outer letters
  const handleShuffle = () => {
    setOuterLetters(shuffle([...outerLetters]));
    setRotation((prev) => prev + 360);
    toast.info("Letters shuffled!");
  };

  // Calculate score
  const calculateScore = (word: string) => {
    if (word.length === 4) return 1;
    if (puzzle.pangrams.includes(word.toLowerCase())) return word.length + 7;
    return word.length;
  };

  // Trigger shake animation
  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // Submit current word
  const handleSubmit = () => {
    const word = currentWord.toLowerCase();

    // Always clear input after pressing enter
    setCurrentWord("");

    if (!word) return; // ignore empty

    if (word.length < 4) {
      triggerShake();
      toast.error("Word must be at least 4 letters!");
      return;
    }

    if (!word.includes(puzzle.centerLetter.toLowerCase())) {
      triggerShake();
      toast.error(`Word must contain ${puzzle.centerLetter}!`);
      return;
    }

    if (foundWords.includes(word)) {
      triggerShake();
      toast.error("Already found!");
      return;
    }

    if (!puzzle.validWords.includes(word)) {
      triggerShake();
      toast.error("Not in word list!");
      return;
    }

    const wordScore = calculateScore(word);
    const isPangram = puzzle.pangrams.includes(word);

    setFoundWords([...foundWords, word]);
    setScore(score + wordScore);

    if (isPangram) {
      toast.success(`🎉 Pangram! +${wordScore} points!`, { duration: 3000 });
    } else {
      toast.success(`+${wordScore} points!`);
    }
  };

  // ✅ Keyboard typing support (free typing)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;

      if (key === "Backspace") {
        event.preventDefault();
        handleDelete();
        return;
      }

      if (key === "Enter") {
        event.preventDefault();
        handleSubmit();
        return;
      }

      // Only letters A-Z
      if (/^[a-zA-Z]$/.test(key)) {
        setCurrentWord((prev) => prev + key.toUpperCase());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentWord]);

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-start p-4 md:p-8 relative z-10">
      <div className="w-full max-w-6xl">
        <header className="text-center mb-8">
          <p className="text-muted-foreground text-lg">Daily Word Puzzle</p>
          <div className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  New Puzzle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Get a new puzzle?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset your current progress and give you a completely new puzzle.
                    Your current game will not be saved.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleForceRoll}>
                    Get New Puzzle
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <div className="grid md:grid-cols-[1fr_400px] gap-8">
          <div className="flex flex-col items-center gap-6">
            <ScorePanel
              score={score}
              maxScore={puzzle.maxScore}
              foundWords={foundWords.length}
            />

            <div className={`w-full max-w-md bg-card/80 backdrop-blur-sm rounded-lg p-4 mb-4 ${isShaking ? 'animate-shake' : ''}`}>
              <div className="text-center text-2xl md:text-3xl font-bold text-game-text min-h-[50px] flex items-center justify-center uppercase border-b-2 border-border pb-4">
                {currentWord || (
                  <span className="text-muted-foreground">Type or click letters</span>
                )}
              </div>
            </div>

            <div className="relative w-full max-w-md h-[300px] md:h-[360px] flex items-center justify-center">
              {/* Center hexagon */}
              <div className="absolute">
                <LetterHex
                  letter={puzzle.centerLetter}
                  isCenter
                  onClick={() => handleLetterClick(puzzle.centerLetter)}
                  rotation={0}
                />
              </div>

              {/* Outer hexagons */}
              {outerLetters.map((letter, index) => {
                const angle = (index * 60 - 90) * (Math.PI / 180);
                const radius = 85;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                return (
                  <div
                    key={`${letter}-${index}`}
                    className="absolute transition-transform duration-500"
                    style={{ transform: `translate(${x}px, ${y}px)` }}
                  >
                    <LetterHex
                      letter={letter}
                      onClick={() => handleLetterClick(letter)}
                      rotation={rotation}
                    />
                  </div>
                );
              })}
            </div>

            <GameControls
              onShuffle={handleShuffle}
              onDelete={handleDelete}
              onSubmit={handleSubmit}
            />
          </div>

          <WordsList words={foundWords} pangrams={puzzle.pangrams} />
        </div>
      </div>
    </div>
  );
};
