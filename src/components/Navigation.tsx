import { Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Moon, Sun, BarChart3, History, Home, LogIn, LogOut, User, Volume2, VolumeX, Lightbulb, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSound } from "@/contexts/SoundContext";

export const Navigation = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, login, logout, loading } = useAuth();
  const { volume, setVolume } = useSound();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const handleAuth = async () => {
    try {
      if (user) {
        await logout();
      } else {
        await login();
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error("Authentication failed", {
        description: error.message || "Please check your authorized domains in Firebase Console."
      });
    }
  };

  return (
    <nav className="w-full bg-card/80 backdrop-blur-sm border-b border-border relative z-20">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex flex-col items-start group select-none">
            <div className="bg-gradient-to-br from-primary via-primary to-accent bg-clip-text text-transparent leading-none">
              <h1 className="text-3xl md:text-4xl font-[900] tracking-tighter italic">AlphaBee</h1>
            </div>
            <div className="flex items-center gap-1.5 ml-4 -mt-1 opacity-60 group-hover:opacity-100 transition-all duration-300">
              <CornerDownLeft className="h-3.5 w-3.5 text-primary/70" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                By Velarix
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/") ? "bg-muted" : ""}
            >
              <Link to="/">
                <Home className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/statistics") ? "bg-muted" : ""}
            >
              <Link to="/statistics">
                <BarChart3 className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/history") ? "bg-muted" : ""}
            >
              <Link to="/history">
                <History className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              asChild
              className={isActive("/suggestions") ? "bg-muted" : ""}
            >
              <Link to="/suggestions">
                <Lightbulb className="h-5 w-5" />
              </Link>
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="flex flex-col gap-4">
                  {/* SFX Volume */}
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium leading-none flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      Sound Effects
                    </h4>
                    <span className="w-12 rounded-md border border-transparent px-2 py-0.5 text-right text-sm text-muted-foreground hover:border-border">
                      {Math.round(volume * 100)}%
                    </span>
                  </div>
                  <Slider
                    value={[volume]}
                    max={1}
                    step={0.01}
                    onValueChange={(value) => setVolume(value[0])}
                  />



                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* Login/Logout Button */}
            <Button
              variant={user ? "ghost" : "default"}
              size="icon"
              onClick={handleAuth}
              disabled={loading}
              title={user ? `Signed in as ${user.displayName}` : "Sign in with Google"}
            >
              {user ? (
                user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )
              ) : (
                <LogIn className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};
