import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Store, Users, MapPin, Home } from 'lucide-react';

const RestaurantNavigation = () => {
  const { user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/restaurants" className="flex items-center space-x-3">
            <Store className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">Restaurant Hub</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Button
              variant={isActive('/restaurants') ? 'default' : 'ghost'}
              size="sm"
              asChild
              className={isActive('/restaurants') ? 'text-white [&_svg]:text-white' : ''}
            >
              <Link to="/restaurants" className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Discover</span>
              </Link>
            </Button>

            <Button
              variant={isActive('/restaurant-community') ? 'default' : 'ghost'}
              size="sm"
              asChild
              className={isActive('/restaurant-community') ? 'text-white [&_svg]:text-white' : ''}
            >
              <Link to="/restaurant-community" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Community</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <Link to="/home" className="flex items-center space-x-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Recipes</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default RestaurantNavigation;