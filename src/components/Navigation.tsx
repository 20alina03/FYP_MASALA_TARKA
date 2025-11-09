import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BookOpen, Heart, Plus, Home, LogOut, User, Sparkles } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const Navigation = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const userName = (user as any)?.full_name || 'User';
  const userEmail = (user as any)?.email || '';

  return (
    <nav className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
         <Link to="/" className="flex items-center space-x-3">
  <img 
    src="/noodles.png" 
    alt="Masala Tarka Logo" 
    className="w-8 h-8 object-contain" 
  />
  <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
    Masala Tarka
  </span>
</Link>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Button
                  variant={isActive('/') ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/" className="flex items-center space-x-2">
                    <Home className="w-4 h-4" />
                    <span className="hidden sm:inline">Home</span>
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/feed') ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/feed" className="flex items-center space-x-2">
                    <Heart className="w-4 h-4" />
                    <span className="hidden sm:inline">Community</span>
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/recipe-book') ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/recipe-book" className="flex items-center space-x-2">
                    <BookOpen className="w-4 h-4" />
                    <span className="hidden sm:inline">Recipe Book</span>
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/generated-recipes') ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/generated-recipes" className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">Generated</span>
                  </Link>
                </Button>
                
                <Button
                  variant={isActive('/create-recipe') ? 'default' : 'ghost'}
                  size="sm"
                  asChild
                >
                  <Link to="/create-recipe" className="flex items-center space-x-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">Create</span>
                  </Link>
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuItem className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {userName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {userEmail}
                        </p>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild className="text-white">
  <Link to="/auth">Sign In</Link>
</Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;