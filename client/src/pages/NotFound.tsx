import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <span className="text-7xl mb-6" aria-hidden>
        🎯
      </span>
      <h1 className="font-display font-extrabold text-6xl text-gray-900 mb-3">404</h1>
      <p className="text-xl text-gray-600 mb-8">This page doesn't exist.</p>
      <div className="flex gap-3">
        <Link to="/">
          <Button variant="secondary">Home</Button>
        </Link>
        <Link to="/join">
          <Button>Join a game</Button>
        </Link>
      </div>
    </div>
  );
}
