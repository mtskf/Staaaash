import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export function AuthButton() {
  const { user, loading, isAuthenticated, signIn, signOut } = useAuth();

  if (loading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground hidden sm:inline">
          {user.email}
        </span>
        {user.photoURL && (
          <img
            src={user.photoURL}
            alt="Profile"
            className="h-6 w-6 rounded-full"
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={signIn}
      className="gap-2"
    >
      <LogIn className="h-4 w-4" />
      <span className="hidden sm:inline">Sign in to sync</span>
    </Button>
  );
}
