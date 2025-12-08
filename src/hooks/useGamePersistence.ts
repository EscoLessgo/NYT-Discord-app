import { useState, useCallback } from "react";
import { db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useGamePersistence = () => {
  const { user } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);

  const loadProgress = useCallback(async () => {
    if (!user) {
      setIsLoaded(true);
      return null;
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const gameRef = doc(db, "users", user.uid, "games", today);
      const gameSnap = await getDoc(gameRef);

      if (gameSnap.exists()) {
        setIsLoaded(true);
        return gameSnap.data();
      }

      setIsLoaded(true);
      return null;
    } catch (error: any) {
      console.error('Error loading progress:', error);
      toast.error("Failed to load game", { description: error.message });
      setIsLoaded(true);
      return null;
    }
  }, [user]);

  const saveProgress = useCallback(async (score: number, wordsFound: string[], pangramsFound: string[], maxScore: number) => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      // Calculate rank
      const getRank = (score: number, maxScore: number): string => {
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

      const currentRank = getRank(score, maxScore);

      // Get user stats for streak
      const statsRef = doc(db, "users", user.uid, "stats", "summary");
      const statsSnap = await getDoc(statsRef);
      const stats = statsSnap.exists() ? statsSnap.data() : { current_streak: 0, best_streak: 0, last_played_date: null, best_rank: "Beginner", games_played: 0 };

      let currentStreak = stats.current_streak || 0;
      let bestStreak = stats.best_streak || 0;
      let bestRank = stats.best_rank || "Beginner";
      let gamesPlayed = stats.games_played || 0;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (stats.last_played_date !== today) {
        if (stats.last_played_date === yesterdayStr) {
          currentStreak += 1;
        } else {
          currentStreak = 1;
        }
        gamesPlayed += 1;
      }

      bestStreak = Math.max(currentStreak, bestStreak);

      const rankValue = (rank: string) => {
        const ranks = ["Beginner", "Good Start", "Moving Up", "Good", "Solid", "Nice", "Great", "Amazing", "Genius", "Queen Bee", "Perfect!"];
        return ranks.indexOf(rank);
      };

      if (rankValue(currentRank) > rankValue(bestRank)) {
        bestRank = currentRank;
      }

      const gameData = {
        score,
        words_found: wordsFound,
        pangrams_found: pangramsFound,
        game_date: today,
        rank: currentRank,
        timestamp: new Date().toISOString()
      };

      // Use timestamp for unique game ID instead of just date
      const gameId = new Date().getTime().toString();
      await setDoc(doc(db, "users", user.uid, "games", gameId), gameData);

      await setDoc(statsRef, {
        current_streak: currentStreak,
        best_streak: bestStreak,
        last_played_date: today,
        best_rank: bestRank,
        games_played: gamesPlayed
      }, { merge: true });

    } catch (error: any) {
      console.error('Error saving progress:', error);
      if (error.code === 'permission-denied') {
        toast.error("Saving Failed", { description: "Check Database Rules" });
      }
    }
  }, [user]);

  return { loadProgress, saveProgress, isLoaded, sessionId: user?.uid };
};
