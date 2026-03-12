import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Star, Filter, Navigation, Loader2, MapPinned, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RestaurantMap from '@/components/RestaurantMap';
import RestaurantNavigation from '@/components/RestaurantNavigation';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Common locations in Lahore
const LAHORE_LOCATIONS = [
  { name: 'FAST NUCES Lahore', lat: 31.4731, lng: 74.4070 },
  { name: 'Gulberg, Lahore', lat: 31.5204, lng: 74.3587 },
  { name: 'DHA Lahore', lat: 31.4697, lng: 74.3895 },
  { name: 'Johar Town, Lahore', lat: 31.4689, lng: 74.2681 },
  { name: 'Mall Road, Lahore', lat: 31.5546, lng: 74.3272 },
  { name: 'Bahria Town, Lahore', lat: 31.3433, lng: 74.1919 },
  { name: 'Model Town, Lahore', lat: 31.4832, lng: 74.3160 },
  { name: 'Liberty Market, Lahore', lat: 31.5204, lng: 74.3510 },
];

const RestaurantDiscovery = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [budget, setBudget] = useState('');
  
  // Load location from localStorage on mount
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(() => {
    const saved = localStorage.getItem('userLocation');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [manualLocation, setManualLocation] = useState(() => {
    return localStorage.getItem('manualLocationName') || '';
  });
  
  const [locationMode, setLocationMode] = useState<'auto' | 'manual'>(() => {
    return (localStorage.getItem('locationMode') as 'auto' | 'manual') || 'manual';
  });
  
  const [showMap, setShowMap] = useState(true);
  const [radius, setRadius] = useState(() => {
    const saved = localStorage.getItem('searchRadius');
    return saved ? parseInt(saved) : 10;
  });
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);

  const cuisines = ['Italian', 'Indian', 'Chinese', 'Mexican', 'Japanese', 'Thai', 'Mediterranean', 'Pakistani', 'Fast Food'];

  // Save location to localStorage whenever it changes
  useEffect(() => {
    if (userLocation) {
      localStorage.setItem('userLocation', JSON.stringify(userLocation));
    }
  }, [userLocation]);

  useEffect(() => {
    if (manualLocation) {
      localStorage.setItem('manualLocationName', manualLocation);
    }
  }, [manualLocation]);

  useEffect(() => {
    localStorage.setItem('locationMode', locationMode);
  }, [locationMode]);

  useEffect(() => {
    localStorage.setItem('searchRadius', radius.toString());
  }, [radius]);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get current location
  const getCurrentLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setLocationMode('auto');
          setManualLocation('');
          toast({
            title: "Location detected",
            description: `Lat: ${location.lat.toFixed(4)}, Lng: ${location.lng.toFixed(4)}`,
          });
          console.log('Current location:', location);
          setLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: "Location access denied",
            description: "Please enter your location manually",
            variant: "destructive",
          });
          setLocationMode('manual');
          setLoading(false);
        }
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Please enter your location manually",
        variant: "destructive",
      });
      setLocationMode('manual');
      setLoading(false);
    }
  };

  // Set manual location from suggestions
  const selectLocation = (location: typeof LAHORE_LOCATIONS[0]) => {
    setUserLocation({ lat: location.lat, lng: location.lng });
    setManualLocation(location.name);
    setLocationMode('manual');
    setShowLocationSuggestions(false);
    toast({
      title: "Location set",
      description: location.name,
    });
    console.log('Manual location set:', location);
  };

  // Clear location
  const clearLocation = () => {
    setUserLocation(null);
    setManualLocation('');
    setLocationMode('manual');
    localStorage.removeItem('userLocation');
    localStorage.removeItem('manualLocationName');
    localStorage.removeItem('locationMode');
    setFilteredRestaurants([]);
    toast({
      title: "Location cleared",
      description: "Please select your location again",
    });
  };

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching restaurants...');
      
      // Get auth token
      const token = localStorage.getItem('token');
      
      // Direct fetch - bypass mongoClient
      const response = await fetch('http://localhost:5000/api/restaurants/discover', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('✅ Data received:', data);
      console.log('📊 Restaurant count:', data?.length);
      console.log('🍽️ First restaurant:', data?.[0]);

      if (!Array.isArray(data)) {
        throw new Error('Expected array of restaurants');
      }

      setRestaurants(data);

      if (data.length > 0) {
        toast({
          title: "Restaurants loaded!",
          description: `Found ${data.length} restaurants`,
        });
      } else {
        toast({
          title: "No restaurants found",
          description: "The database has no restaurants",
        });
      }

    } catch (error: any) {
      console.error('❌ Fetch error:', error);
      toast({
        title: "Failed to load restaurants",
        description: error.message || 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter restaurants based on location and other criteria
  useEffect(() => {
    if (restaurants.length === 0) {
      setFilteredRestaurants([]);
      return;
    }

    let filtered = [...restaurants];

    console.log('=== FILTERING RESTAURANTS ===');
    console.log('Total restaurants:', filtered.length);
    console.log('User location:', userLocation);
    console.log('Search city:', searchCity);
    console.log('Selected cuisine:', selectedCuisine);
    console.log('Radius:', radius);

    // Filter by location/distance
    if (userLocation) {
      filtered = filtered.map(restaurant => {
        if (!restaurant.latitude || !restaurant.longitude) {
          console.warn(`Restaurant ${restaurant.name} missing coordinates`);
          return { ...restaurant, distance: 9999 };
        }
        
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          restaurant.latitude,
          restaurant.longitude
        );
        
        console.log(`${restaurant.name}: ${distance.toFixed(2)}km away`);
        return { ...restaurant, distance: distance.toFixed(2) };
      }).filter(r => {
        const withinRadius = parseFloat(r.distance) <= radius;
        if (!withinRadius) {
          console.log(`Filtered out: ${r.name} (${r.distance}km > ${radius}km)`);
        }
        return withinRadius;
      }).sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
      
      console.log('After distance filter:', filtered.length);
    }

    // Filter by city search
    if (searchCity) {
      const searchLower = searchCity.toLowerCase();
      filtered = filtered.filter(r => 
        r.city?.toLowerCase().includes(searchLower) ||
        r.name?.toLowerCase().includes(searchLower) ||
        r.address?.toLowerCase().includes(searchLower)
      );
      console.log('After search filter:', filtered.length);
    }

    // Filter by cuisine
    if (selectedCuisine) {
      filtered = filtered.filter(r => 
        r.cuisine_types?.includes(selectedCuisine)
      );
      console.log('After cuisine filter:', filtered.length);
    }

    console.log('Final filtered count:', filtered.length);
    setFilteredRestaurants(filtered);

    if (filtered.length === 0 && userLocation) {
      toast({
        title: "No restaurants nearby",
        description: `No restaurants found within ${radius}km. Try increasing the radius.`,
      });
    }
  }, [restaurants, userLocation, searchCity, selectedCuisine, budget, radius]);

  // Initial load
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleRestaurantClick = (restaurant: any) => {
    navigate(`/restaurants/${restaurant._id}`);
  };

  if (loading && restaurants.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <RestaurantNavigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading restaurants...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RestaurantNavigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Discover Restaurants</h1>
          
          {/* Location Selection */}
          <Card className="mb-6 p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Select Your Location
                </h3>
                <div className="flex gap-2">
                  <Button
                    variant={locationMode === 'manual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setLocationMode('manual');
                      setShowLocationSuggestions(true);
                    }}
                  >
                    <MapPinned className="w-4 h-4 mr-2" />
                    Manual
                  </Button>
                  <Button
                    variant={locationMode === 'auto' ? 'default' : 'outline'}
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={loading}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Current
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearLocation}
                    disabled={!userLocation}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </div>

              {locationMode === 'manual' && (
                <div className="relative">
                  <Input
                    placeholder="Select your location in Lahore..."
                    value={manualLocation}
                    onChange={(e) => {
                      setManualLocation(e.target.value);
                      setShowLocationSuggestions(true);
                    }}
                    onFocus={() => setShowLocationSuggestions(true)}
                  />
                  
                  {showLocationSuggestions && (
                    <Card className="absolute z-10 w-full mt-2 max-h-64 overflow-y-auto shadow-lg">
                      <div className="p-2">
                        <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                          Select a location:
                        </p>
                        {LAHORE_LOCATIONS.map((loc, idx) => (
  <Button
    key={idx}
    variant="ghost"
    className="w-full justify-start mb-1 text-foreground hover:bg-primary/10 hover:text-foreground"
    onClick={() => selectLocation(loc)}
  >
    <MapPin className="w-4 h-4 mr-2 text-primary" />
    <span className="text-left text-foreground">{loc.name}</span>
  </Button>
))}
                      </div>
                    </Card>
                  )}
                </div>
              )}

              {userLocation ? (
                <Alert className="border-green-500 bg-green-50">
                  <MapPin className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Location set:</strong> {manualLocation || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
                    <br />
                    <span className="text-sm">Showing restaurants within {radius}km radius</span>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    📍 Please select your location to see nearby restaurants in Lahore
                  </AlertDescription>
                </Alert>
              )}

              {/* Radius Slider */}
              {userLocation && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Search Radius: {radius}km
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {filteredRestaurants.length} restaurant{filteredRestaurants.length !== 1 ? 's' : ''} found
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={radius}
                    onChange={(e) => setRadius(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              )}
            </div>
          </Card>
          
          {/* Search Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by name, city, or address..."
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Input
              type="number"
              placeholder="Budget (Rs.)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-32"
            />
            
            <Button variant="outline" onClick={() => setShowMap(!showMap)}>
              <MapPin className="w-4 h-4 mr-2" />
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
          </div>

          {/* Cuisine Filters */}
          <div className="flex gap-2 flex-wrap mb-6">
            <Button
              variant={selectedCuisine === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCuisine('')}
            >
              All Cuisines
            </Button>
            {cuisines.map((cuisine) => (
              <Button
                key={cuisine}
                variant={selectedCuisine === cuisine ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCuisine(cuisine)}
              >
                {cuisine}
              </Button>
            ))}
          </div>
        </div>

        {/* Map View */}
        {showMap && userLocation && filteredRestaurants.length > 0 && (
          <div className="mb-8">
            <RestaurantMap
              restaurants={filteredRestaurants}
              userLocation={userLocation}
              onRestaurantClick={handleRestaurantClick}
            />
          </div>
        )}

        {/* Restaurant Grid */}
        {!userLocation ? (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Select Your Location</h3>
            <p className="text-muted-foreground mb-4">
              Please select your location from the dropdown above to see nearby restaurants in Lahore
            </p>
          </Card>
        ) : filteredRestaurants.length === 0 ? (
          <Card className="p-12 text-center">
            <MapPin className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No restaurants found</h3>
            <p className="text-muted-foreground mb-4">
              No restaurants found within {radius}km of your location.
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => setRadius(Math.min(radius + 10, 50))}>
                Increase Radius to {Math.min(radius + 10, 50)}km
              </Button>
              {selectedCuisine && (
                <Button variant="outline" onClick={() => setSelectedCuisine('')}>
                  Clear Cuisine Filter
                </Button>
              )}
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((restaurant) => (
              <Card 
                key={restaurant._id} 
                className="hover:shadow-lg transition-shadow cursor-pointer" 
                onClick={() => handleRestaurantClick(restaurant)}
              >
                {restaurant.image_url && (
                  <div className="aspect-video overflow-hidden rounded-t-lg">
                    <img
                      src={restaurant.image_url}
                      alt={restaurant.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{restaurant.name}</h3>
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-semibold">{restaurant.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-muted-foreground text-sm">({restaurant.review_count || 0})</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{restaurant.city}</span>
                    {restaurant.distance && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          {restaurant.distance} km
                        </Badge>
                      </>
                    )}
                  </div>
                  {restaurant.address && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {restaurant.address}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {restaurant.cuisine_types?.slice(0, 3).map((cuisine: string, idx: number) => (
                      <Badge key={idx} variant="outline">{cuisine}</Badge>
                    ))}
                    {restaurant.cuisine_types?.length > 3 && (
                      <Badge variant="outline">+{restaurant.cuisine_types.length - 3}</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RestaurantDiscovery;