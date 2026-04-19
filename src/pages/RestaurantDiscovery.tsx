import { useState, useEffect, useCallback } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Star, Filter, Navigation, Loader2, MapPinned, X, Sparkles, ChefHat, Wallet, UtensilsCrossed, ArrowRight, BadgePercent } from 'lucide-react';
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

// ─── Optimized Menu Types ────────────────────────────────────────────────────
interface OptimizedMenuItem {
  _id: string;
  name: string;
  description?: string;
  originalPrice: number;
  effectivePrice: number;
  discountPercentage: number;
  rating: number;
  reviewCount: number;
  image_url?: string;
  restaurantId: string;
  restaurantName: string;
  restaurantScore: number;
}

interface OptimizedCourse {
  course: string;
  label: string;
  emoji: string;
  items: OptimizedMenuItem[];
}

interface OptimizedRestaurantSummary {
  id: string;
  name: string;
  rating: number;
  score: number;
  positiveReviews: number;
  negativeReviews: number;
  neutralReviews: number;
  totalReviews: number;
}

interface RestaurantOptimizedMenu {
  restaurant: OptimizedRestaurantSummary;
  totalCost: number;
  savings: number;
  coursesCovered: number;
  itemsCount: number;
  mealPlan: OptimizedCourse[];
}

interface OptimizedMenuResult {
  success: boolean;
  budget: number;
  includeCourses?: string[];
  totalCost: number;
  savings: number;
  mealPlan: OptimizedCourse[];
  restaurantCount: number;
  recommendedMenus?: RestaurantOptimizedMenu[];
  topRecommendation?: RestaurantOptimizedMenu;
  message?: string;
}

// ─── Course styling maps ─────────────────────────────────────────────────────
const COURSE_BG: Record<string, string> = {
  main:    'from-orange-500/20 to-red-500/10 border-orange-200/40',
  drink:   'from-blue-500/20 to-cyan-500/10 border-blue-200/40',
  dessert: 'from-pink-500/20 to-purple-500/10 border-pink-200/40',
  starter: 'from-green-500/20 to-emerald-500/10 border-green-200/40',
  side:    'from-yellow-500/20 to-amber-500/10 border-yellow-200/40',
};

const COURSE_ACCENT: Record<string, string> = {
  main:    'text-orange-600 bg-orange-100',
  drink:   'text-blue-600 bg-blue-100',
  dessert: 'text-pink-600 bg-pink-100',
  starter: 'text-green-600 bg-green-100',
  side:    'text-amber-600 bg-amber-100',
};

const COURSE_OPTIONS: Array<{ course: string; label: string }> = [
  { course: 'main', label: 'Main Course' },
  { course: 'side', label: 'Side' },
  { course: 'drink', label: 'Drink' },
  { course: 'dessert', label: 'Dessert' },
  { course: 'starter', label: 'Starter' },
];

// ─── Star Rating sub-component ───────────────────────────────────────────────
function StarRating({ rating }: { rating: number }) {
  if (!rating || rating <= 0) {
    return <span className="text-xs text-muted-foreground">No ratings yet</span>;
  }

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
        />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

// ─── Optimized Menu Modal ────────────────────────────────────────────────────
function OptimizedMenuModal({
  isOpen,
  onClose,
  title = 'Optimized Menu',
  subtitle = 'Best meal plan within your budget',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  const navigate = useNavigate();
  const [budgetInput, setBudgetInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizedMenuResult | null>(null);
  const [step, setStep] = useState<'input' | 'result'>('input');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<string[]>(
    COURSE_OPTIONS.map(option => option.course)
  );

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('input');
      setResult(null);
      setBudgetInput('');
      setLoading(false);
      setRestaurantSearch('');
      setSelectedRestaurantId('');
      setSelectedCourses(COURSE_OPTIONS.map(option => option.course));
    }
  }, [isOpen]);

  const toggleCourse = (course: string) => {
    setSelectedCourses(prev => {
      if (prev.includes(course)) {
        if (prev.length === 1) {
          toast({
            title: 'At least one course required',
            description: 'Select at least one course to generate a menu.',
            variant: 'destructive',
          });
          return prev;
        }
        return prev.filter(item => item !== course);
      }

      return [...prev, course];
    });
  };

  const handleGenerate = useCallback(async () => {
    const budget = parseFloat(budgetInput);
    if (!budget || budget <= 0) {
      toast({ title: 'Invalid budget', description: 'Please enter a valid amount in PKR', variant: 'destructive' });
      return;
    }
    if (budget < 300) {
      toast({ title: 'Budget too low', description: 'Minimum budget is Rs. 300', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');

      const payload = {
        budget,
        includeCourses: selectedCourses,
      };

      const responseWithCourses = await fetch('http://localhost:5000/api/restaurants/optimized-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data: OptimizedMenuResult = await responseWithCourses.json();

      if (!responseWithCourses.ok || !data.success) {
        toast({
          title: 'No menu found',
          description: data.message || 'Try increasing your budget',
          variant: 'destructive',
        });
        return;
      }

      setResult(data);
      setStep('result');
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to connect to server', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [budgetInput, selectedCourses]);

  const handleReset = () => {
    setStep('input');
    setResult(null);
    setBudgetInput('');
  };

  const handleViewRestaurant = (restaurantId: string) => {
    navigate(`/restaurants/${restaurantId}`);
    onClose();
  };

  const formatRestaurantRating = (rating: number) =>
    rating > 0 ? rating.toFixed(1) : 'N/A';

  const recommendedMenus: RestaurantOptimizedMenu[] = result?.recommendedMenus?.length
    ? result.recommendedMenus
    : result
      ? [{
          restaurant: {
            id: result.mealPlan[0]?.items[0]?.restaurantId || 'unknown',
            name: result.mealPlan[0]?.items[0]?.restaurantName || 'Recommended Restaurant',
            rating: 0,
            score: result.mealPlan[0]?.items[0]?.restaurantScore || 0,
            positiveReviews: 0,
            negativeReviews: 0,
            neutralReviews: 0,
            totalReviews: 0,
          },
          totalCost: result.totalCost,
          savings: result.savings,
          coursesCovered: result.mealPlan.length,
          itemsCount: result.mealPlan.reduce((sum, c) => sum + c.items.length, 0),
          mealPlan: result.mealPlan,
        }]
      : [];

  const filteredRecommendedMenus = recommendedMenus.filter(menu =>
    menu.restaurant.name.toLowerCase().includes(restaurantSearch.toLowerCase())
  );

  const selectedRestaurantMenu =
    filteredRecommendedMenus.find(menu => menu.restaurant.id === selectedRestaurantId) ||
    filteredRecommendedMenus[0] ||
    null;

  useEffect(() => {
    if (step !== 'result' || filteredRecommendedMenus.length === 0) return;

    const selectedExists = filteredRecommendedMenus.some(menu => menu.restaurant.id === selectedRestaurantId);
    if (!selectedExists) {
      setSelectedRestaurantId(filteredRecommendedMenus[0].restaurant.id);
    }
  }, [step, filteredRecommendedMenus, selectedRestaurantId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl max-h-[92vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl flex flex-col">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/90 to-primary px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">{title}</h2>
                <p className="text-white/75 text-sm">{subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {step === 'input' ? (
            // ── Budget Input Step ─────────────────────────────────────────
            <div className="p-8 flex flex-col items-center gap-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Wallet className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">What's your budget?</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Enter your total budget in Pakistani Rupees. We'll build the best possible
                  meal plan for each eligible restaurant under this budget, ranked by
                  ratings and sentiment analysis.
                </p>
              </div>

              <div className="w-full max-w-xl rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm font-medium">Include Courses</p>
                <div className="flex flex-wrap gap-2">
                  {COURSE_OPTIONS.map(option => {
                    const active = selectedCourses.includes(option.course);
                    return (
                      <button
                        key={option.course}
                        onClick={() => toggleCourse(option.course)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          active
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:bg-muted'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="w-full max-w-xs space-y-3">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">
                    Rs.
                  </span>
                  <Input
                    type="number"
                    placeholder="e.g. 2500"
                    value={budgetInput}
                    onChange={e => setBudgetInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleGenerate()}
                    className="pl-10 text-center text-lg font-semibold h-12"
                    min={300}
                    max={1000000}
                  />
                </div>

                {/* Quick-select budget pills */}
                <div className="flex gap-2 flex-wrap justify-center">
                  {[300, 500, 1000, 1500, 2500, 5000].map(amt => (
                    <button
                      key={amt}
                      onClick={() => setBudgetInput(String(amt))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                        budgetInput === String(amt)
                          ? 'bg-primary text-white border-primary'
                          : 'border-border hover:bg-muted'
                      }`}
                    >
                      Rs. {amt.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={loading || !budgetInput || Number(budgetInput) < 300}
                size="lg"
                className="min-w-[180px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Optimizing…
                  </>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4 mr-2" />
                    Make My Menu
                  </>
                )}
              </Button>

              {/* Info pills */}
              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                {[
                  '🏆 Ranked by sentiment analysis',
                  '💰 Respects admin discounts',
                  '🍽️ Full course meal',
                ].map(t => (
                  <span key={t} className="bg-muted px-3 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>

          ) : result ? (
            // ── Result Step ───────────────────────────────────────────────
            <div className="p-6 space-y-5">
              {/* Budget summary bar */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Selected Restaurant Menu Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    Rs. {(selectedRestaurantMenu?.totalCost ?? result.totalCost).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Budget: Rs. {result.budget.toLocaleString()} •{' '}
                    <span className="text-green-600 font-medium">
                      Rs. {(selectedRestaurantMenu?.savings ?? result.savings).toLocaleString()} remaining
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs mb-1">
                    {filteredRecommendedMenus.length} eligible restaurant{filteredRecommendedMenus.length > 1 ? 's' : ''}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {selectedRestaurantMenu?.itemsCount ?? 0} dishes in selected menu
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(result.includeCourses && result.includeCourses.length ? result.includeCourses : selectedCourses).map(course => (
                  <Badge key={course} variant="outline" className="capitalize">
                    {course}
                  </Badge>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
                {/* Sidebar: searchable recommended restaurants */}
                <aside className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
                  <h4 className="font-semibold text-sm">Recommended Restaurants</h4>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={restaurantSearch}
                      onChange={(e) => setRestaurantSearch(e.target.value)}
                      placeholder="Search restaurant..."
                      className="pl-9 h-9"
                    />
                  </div>

                  <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
                    {filteredRecommendedMenus.map((menu) => {
                      const isSelected = selectedRestaurantMenu?.restaurant.id === menu.restaurant.id;

                      return (
                        <button
                          key={menu.restaurant.id}
                          onClick={() => setSelectedRestaurantId(menu.restaurant.id)}
                          className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border bg-background hover:bg-muted'
                          }`}
                        >
                          <p className="font-medium text-sm line-clamp-1">{menu.restaurant.name}</p>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            {formatRestaurantRating(menu.restaurant.rating)}
                            <span>•</span>
                            {menu.restaurant.positiveReviews} positive
                          </p>
                          <p className="text-xs text-muted-foreground">Rs. {menu.totalCost.toLocaleString()}</p>
                        </button>
                      );
                    })}

                    {filteredRecommendedMenus.length === 0 && (
                      <p className="text-xs text-muted-foreground px-1 py-4 text-center">
                        No eligible restaurants for this search.
                      </p>
                    )}
                  </div>
                </aside>

                {/* Main panel: side-by-side cards + selected menu details */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredRecommendedMenus.slice(0, 4).map((menu) => (
                      <button
                        key={`summary-${menu.restaurant.id}`}
                        onClick={() => setSelectedRestaurantId(menu.restaurant.id)}
                        className={`rounded-xl border p-3 text-left transition-colors ${
                          selectedRestaurantMenu?.restaurant.id === menu.restaurant.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border bg-background hover:bg-muted/40'
                        }`}
                      >
                        <p className="font-semibold text-sm line-clamp-1">{menu.restaurant.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rating {formatRestaurantRating(menu.restaurant.rating)} • {menu.restaurant.positiveReviews} positive reviews
                        </p>
                        <p className="text-xs text-primary font-medium mt-1">Total Rs. {menu.totalCost.toLocaleString()}</p>
                      </button>
                    ))}
                  </div>

                  {selectedRestaurantMenu ? (
                    <div className="rounded-2xl border border-border bg-background p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <h4 className="font-semibold text-base">{selectedRestaurantMenu.restaurant.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Rating {formatRestaurantRating(selectedRestaurantMenu.restaurant.rating)} • {selectedRestaurantMenu.restaurant.positiveReviews} positive • {selectedRestaurantMenu.restaurant.negativeReviews} negative
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary">Rs. {selectedRestaurantMenu.totalCost.toLocaleString()}</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRestaurant(selectedRestaurantMenu.restaurant.id)}
                          >
                            View Restaurant
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                        {selectedRestaurantMenu.mealPlan.map(course => (
                          <div
                            key={`${selectedRestaurantMenu.restaurant.id}-${course.course}`}
                            className={`rounded-xl border bg-gradient-to-br p-4 space-y-3 ${COURSE_BG[course.course] || 'border-border'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{course.emoji}</span>
                              <h4 className="font-semibold">{course.label}</h4>
                              <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${COURSE_ACCENT[course.course] || ''}`}>
                                {course.items.length} item{course.items.length > 1 ? 's' : ''}
                              </span>
                            </div>

                            {course.items.map(item => (
                              <div
                                key={item._id}
                                className="bg-background/80 backdrop-blur rounded-lg p-3 flex gap-3"
                              >
                                {item.image_url && (
                                  <img
                                    src={item.image_url}
                                    alt={item.name}
                                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                )}
                                <div className="flex-1 min-w-0 space-y-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <button
                                      onClick={() => handleViewRestaurant(item.restaurantId)}
                                      className="font-semibold text-sm leading-tight text-left hover:text-primary transition-colors"
                                    >
                                      {item.name}
                                    </button>
                                    <div className="text-right flex-shrink-0">
                                      {item.discountPercentage > 0 ? (
                                        <div className="space-y-0.5">
                                          <p className="text-xs line-through text-muted-foreground">
                                            Rs. {item.originalPrice.toLocaleString()}
                                          </p>
                                          <p className="font-bold text-sm text-green-600">
                                            Rs. {item.effectivePrice.toLocaleString()}
                                          </p>
                                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 px-1.5 py-0">
                                            <BadgePercent className="w-3 h-3 mr-0.5 inline" />
                                            {item.discountPercentage}% off
                                          </Badge>
                                        </div>
                                      ) : (
                                        <p className="font-bold text-sm">
                                          Rs. {item.effectivePrice.toLocaleString()}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <StarRating rating={item.rating} />

                                  {item.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                                  )}

                                  <button
                                    onClick={() => handleViewRestaurant(item.restaurantId)}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline font-medium mt-1"
                                  >
                                    {item.restaurantName}
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card className="p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Select a restaurant from the sidebar to view its optimized menu.
                      </p>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer — only shown on result step */}
        {step === 'result' && (
          <div className="border-t px-6 py-4 flex gap-3 flex-shrink-0 bg-background">
            <Button variant="outline" onClick={handleReset} className="flex-1">
              Change Budget
            </Button>
            <Button onClick={onClose} className="flex-1">
              <UtensilsCrossed className="w-4 h-4 mr-2" />
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main RestaurantDiscovery Component ─────────────────────────────────────
const RestaurantDiscovery = () => {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [budget, setBudget] = useState('');

  // ── NEW: Optimized Menu modal state ──
  const [showOptimizedMenu, setShowOptimizedMenu] = useState(false);

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

    // Filter by budget and prepare live card preview items
    const budgetValue = parseFloat(budget);
    const hasBudgetFilter = budget.trim() !== '' && !isNaN(budgetValue) && budgetValue > 0;

    filtered = filtered
      .map((restaurant: any) => {
        const allMenuItems = Array.isArray(restaurant.menu_items_preview)
          ? restaurant.menu_items_preview
          : [];

        const itemsUnderBudget = hasBudgetFilter
          ? allMenuItems
              .filter((item: any) => item.price <= budgetValue)
              .sort((a: any, b: any) => a.price - b.price || (b.rating || 0) - (a.rating || 0))
          : allMenuItems
              .slice()
              .sort((a: any, b: any) => a.price - b.price || (b.rating || 0) - (a.rating || 0));

        return {
          ...restaurant,
          matched_menu_items: itemsUnderBudget.slice(0, 3),
        };
      })
      .filter((restaurant: any) => {
        if (!hasBudgetFilter) return true;
        return (restaurant.matched_menu_items?.length || 0) > 0;
      });

    if (hasBudgetFilter) {
      console.log('After budget filter:', filtered.length);
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

          {/* ── Page Title Row: title left, menu buttons right ── */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h1 className="text-4xl font-bold">Discover Restaurants</h1>

            <div className="flex gap-2 self-start sm:self-auto">
              <Button
                onClick={() => setShowOptimizedMenu(true)}
                size="lg"
                className="relative overflow-hidden group bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25"
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-md" />
                <ChefHat className="w-4 h-4 mr-2" />
                View Optimized Menu
              </Button>
            </div>
          </div>

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
        {showMap && !showOptimizedMenu && userLocation && filteredRestaurants.length > 0 && (
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

                  {restaurant.matched_menu_items?.length > 0 && (
                    <div className="mt-4 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {budget.trim() ? `Items under Rs. ${budget}:` : 'Popular budget items:'}
                      </p>
                      <div className="space-y-2">
                        {restaurant.matched_menu_items.map((item: any) => (
                          <div key={item._id || `${item.name}-${item.price}`} className="flex items-center justify-between gap-3 text-sm">
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                {(item.rating || 0).toFixed(1)}
                              </p>
                            </div>
                            <Badge variant="secondary">Rs. {Number(item.price).toLocaleString()}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ★ OPTIMIZED MENU MODAL ★ */}
      <OptimizedMenuModal
        isOpen={showOptimizedMenu}
        onClose={() => setShowOptimizedMenu(false)}
        title="Optimized Menu"
        subtitle="Best complete menu per restaurant within your budget"
      />
    </div>
  );
};

export default RestaurantDiscovery;
