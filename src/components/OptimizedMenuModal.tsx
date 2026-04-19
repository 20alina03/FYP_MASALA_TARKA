import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Star, ChefHat, Loader2, ArrowRight, BadgePercent, Wallet, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface MenuItem {
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

interface CourseGroup {
  course: string;
  label: string;
  emoji: string;
  items: MenuItem[];
}

interface OptimizedMenuResult {
  success: boolean;
  budget: number;
  totalCost: number;
  savings: number;
  mealPlan: CourseGroup[];
  restaurantCount: number;
  message?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

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

function StarRating({ rating }: { rating: number }) {
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

const OptimizedMenuModal = ({ isOpen, onClose }: Props) => {
  const navigate = useNavigate();
  const [budgetInput, setBudgetInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizedMenuResult | null>(null);
  const [step, setStep] = useState<'input' | 'result'>('input');

  const handleGenerate = useCallback(async () => {
    const budget = parseFloat(budgetInput);
    if (!budget || budget <= 0) {
      toast({ title: 'Invalid budget', description: 'Please enter a valid amount in PKR', variant: 'destructive' });
      return;
    }
    if (budget < 100) {
      toast({ title: 'Budget too low', description: 'Minimum budget is Rs. 100', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/restaurants/optimized-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ budget }),
      });

      const data: OptimizedMenuResult = await response.json();

      if (!response.ok || !data.success) {
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
  }, [budgetInput]);

  const handleReset = () => {
    setStep('input');
    setResult(null);
    setBudgetInput('');
  };

  const handleViewRestaurant = (restaurantId: string) => {
    navigate(`/restaurants/${restaurantId}`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-background border border-border shadow-2xl flex flex-col">

        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary/90 to-primary px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Optimized Menu</h2>
                <p className="text-white/75 text-sm">AI-powered meal plan within your budget</p>
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
                  meal plan — starter, main, drink, and dessert — from top-rated restaurants.
                </p>
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
                    min={100}
                    max={1000000}
                  />
                </div>

                <div className="flex gap-2 flex-wrap justify-center">
                  {[500, 1000, 1500, 2500, 5000].map(amt => (
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
                disabled={loading || !budgetInput}
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
                    Generate Meal Plan
                  </>
                )}
              </Button>

              {/* Info pills */}
              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                {['🏆 Ranked by sentiment analysis', '💰 Respects admin discounts', '🍽️ Full course meal'].map(t => (
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
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Meal Cost</p>
                  <p className="text-2xl font-bold text-primary">
                    Rs. {result.totalCost.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Budget: Rs. {result.budget.toLocaleString()} •{' '}
                    <span className="text-green-600 font-medium">
                      Rs. {result.savings.toLocaleString()} saved
                    </span>
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="text-xs mb-1">
                    {result.restaurantCount} restaurant{result.restaurantCount > 1 ? 's' : ''}
                  </Badge>
                  <p className="text-xs text-muted-foreground">
                    {result.mealPlan.reduce((s, c) => s + c.items.length, 0)} dishes
                  </p>
                </div>
              </div>

              {/* Courses */}
              {result.mealPlan.map(course => (
                <div
                  key={course.course}
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
                          <p className="font-semibold text-sm leading-tight">{item.name}</p>
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
                                  <BadgePercent className="w-3 h-3 mr-0.5" />
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
          ) : null}
        </div>

        {/* Footer */}
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
};

export default OptimizedMenuModal;
