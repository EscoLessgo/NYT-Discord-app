import { GameBoard } from "@/components/GameBoard";
import { Navigation } from "@/components/Navigation";
import { VelarixButton } from "@/components/VelarixButton";
import { Link } from "react-router-dom";
import { Lightbulb, ArrowRight, Bug } from "lucide-react";

const Index = () => {
  return (
    <>
      <Navigation />

      {/* Suggestions Banner */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-6">
        <Link to="/suggestions" className="block group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500/20 via-yellow-400/20 to-orange-500/20 border-2 border-yellow-500/30 hover:border-yellow-400 transition-all duration-300 backdrop-blur-sm">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-300/10 to-transparent group-hover:animate-shimmer"></div>

            <div className="relative p-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* Icons */}
                <div className="flex -space-x-2">
                  <div className="w-12 h-12 rounded-full bg-yellow-500 flex items-center justify-center border-2 border-black">
                    <Lightbulb className="w-6 h-6 text-black" />
                  </div>
                  <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center border-2 border-black">
                    <Bug className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* Text Content */}
                <div>
                  <h3 className="text-xl font-bold text-yellow-400 mb-1">
                    Got Feedback?
                  </h3>
                  <p className="text-gray-300 text-sm">
                    Report bugs or share suggestions • <span className="text-yellow-400 font-mono">/suggestions</span>
                  </p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-yellow-500 text-black font-semibold group-hover:bg-yellow-400 transition-colors">
                <span>Submit Feedback</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      <GameBoard />
      <VelarixButton />
    </>
  );
};

export default Index;
