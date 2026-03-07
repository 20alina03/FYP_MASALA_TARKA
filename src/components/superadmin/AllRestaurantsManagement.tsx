import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Store, Star, MapPin, Phone, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AllRestaurantsManagement = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const { data, error } = await mongoClient.request('/restaurants/superadmin/all-restaurants');
      
      if (error) throw error;
      
      setRestaurants(data || []);
    } catch (error:  any) {
      console.error('Fetch restaurants error:', error);
      toast({
        title:  "Error",
        description: "Failed to load restaurants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(restaurant => {
    if (!searchTerm) return true;
    return restaurant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           restaurant. city.toLowerCase().includes(searchTerm.toLowerCase()) ||
           restaurant.admin_id?.email?. toLowerCase().includes(searchTerm. toLowerCase());
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-muted h-32 rounded-lg"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              All Restaurants ({restaurants.length})
            </CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search restaurants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredRestaurants.map((restaurant) => (
              <Card key={restaurant._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-3">
                        {restaurant.image_url && (
                          <img
                            src={restaurant.image_url}
                            alt={restaurant.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold mb-2">{restaurant.name}</h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              <span>{restaurant.city}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span>{restaurant.rating?. toFixed(1) || '0.0'}</span>
                              <span>({restaurant.review_count || 0} reviews)</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            {restaurant.cuisine_types?. map((cuisine:  string, idx: number) => (
                              <Badge key={idx} variant="secondary">{cuisine}</Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Admin</p>
                          <p className="font-semibold">{restaurant.admin_id?.email || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Contact</p>
                          <p className="font-semibold">{restaurant.contact_number || 'N/A'}</p>
                        </div>
                        <div className="md:col-span-2">
                          <p className="text-muted-foreground">Address</p>
                          <p className="font-semibold">{restaurant.address}</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => navigate(`/restaurants/${restaurant._id}`)}
                    >
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRestaurants.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'No restaurants found matching your search' : 'No restaurants yet'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AllRestaurantsManagement;