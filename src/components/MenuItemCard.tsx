import { useState } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Star, Loader2, Upload, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface MenuItemCardProps {
  menuItem: any;
  restaurantId: string;
  onReviewAdded: () => void;
  canSuperAdminEdit?: boolean;
}

const MenuItemCard = ({
  menuItem,
  restaurantId,
  onReviewAdded,
  canSuperAdminEdit,
}: MenuItemCardProps) => {
  const { user } = useAuth();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    name: menuItem.name || '',
    price: menuItem.price || 0,
    category: menuItem.category || '',
    description: menuItem.description || '',
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxImages = 5;
    const remainingSlots = maxImages - images.length;
    
    if (remainingSlots <= 0) {
      toast({
        title: "Maximum images reached",
        description: `You can only upload up to ${maxImages} images`,
        variant: "destructive"
      });
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    // Validate: At least one of rating, review_text, or images must be provided
    const hasRating = rating > 0;
    const hasText = reviewText.trim().length > 0;
    const hasImages = images.length > 0;

    if (!hasRating && !hasText && !hasImages) {
      toast({
        title: "Review required",
        description: "Please provide at least a rating, comment, or photo",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await mongoClient.request(`/restaurants/menu/${menuItem._id}/reviews`, {
        method: 'POST',
        body: JSON.stringify({
          rating: rating || 0,
          review_text: reviewText,
          images
        })
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review posted successfully"
      });

      setRating(0);
      setReviewText('');
      setImages([]);
      setShowReviewModal(false);
      onReviewAdded();
    } catch (error: any) {
      console.error('Create menu review error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post review",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const hasContent = rating > 0 || reviewText.trim().length > 0 || images.length > 0;

  return (
    <>
      <Card className="h-full hover:shadow-lg transition-shadow">
        {menuItem.image_url && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img
              src={menuItem.image_url}
              alt={menuItem.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-semibold text-lg">{menuItem.name}</h4>
            {menuItem.discount_percentage > 0 && (
              <Badge className="bg-green-500">
                {menuItem.discount_percentage}% OFF
              </Badge>
            )}
          </div>

          <Badge variant="outline" className="mb-2">{menuItem.category}</Badge>

          {menuItem.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {menuItem.description}
            </p>
          )}

          <div className="flex items-center gap-2 mb-3">
            {menuItem.original_price && menuItem.original_price !== menuItem.price ? (
              <>
                <span className="text-xl font-bold text-green-600">
                  Rs. {menuItem.price.toFixed(0)}
                </span>
                <span className="text-sm text-muted-foreground line-through">
                  Rs. {menuItem.original_price.toFixed(0)}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold">
                Rs. {menuItem.price.toFixed(0)}
              </span>
            )}
          </div>

          {menuItem.dietary_tags && menuItem.dietary_tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {menuItem.dietary_tags.map((tag: string, idx: number) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="font-semibold">{menuItem.rating?.toFixed(1) || '0.0'}</span>
              <span className="text-sm text-muted-foreground">
                ({menuItem.review_count || 0})
              </span>
            </div>
            {!menuItem.is_available && (
              <Badge variant="destructive">Unavailable</Badge>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowReviewModal(true)}
                className="w-full"
              >
                <Star className="w-4 h-4 mr-2" />
                Write Review
              </Button>
            )}

            {canSuperAdminEdit && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setEditForm({
                      name: menuItem.name || '',
                      price: menuItem.price || 0,
                      category: menuItem.category || '',
                      description: menuItem.description || '',
                    });
                    setShowEditModal(true);
                  }}
                >
                  Edit Menu Item
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={async () => {
                    if (
                      !window.confirm(
                        `Are you sure you want to delete "${menuItem.name}"?`,
                      )
                    ) {
                      return;
                    }
                    try {
                      await mongoClient.request(`/restaurants/superadmin/menu/${menuItem._id}`, {
                        method: 'DELETE',
                      });
                      toast({
                        title: 'Menu item deleted',
                        description: 'The menu item has been removed from this restaurant.',
                      });
                      onReviewAdded();
                    } catch (error: any) {
                      console.error('Super admin delete menu item error:', error);
                      toast({
                        title: 'Error',
                        description:
                          error?.error || error?.message || 'Failed to delete menu item',
                        variant: 'destructive',
                      });
                    }
                  }}
                >
                  Delete Menu Item
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Modal - Inline */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review: {menuItem.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
              <p>Please provide at least one of the following:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>A rating (1-5 stars)</li>
                <li>A written review</li>
                <li>Photos of the dish</li>
              </ul>
            </div>

            {/* Rating */}
            <div className="space-y-2">
              <Label>Your Rating</Label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-500 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
                {rating > 0 && (
                  <span className="ml-2 text-sm text-muted-foreground">
                    {rating} / 5
                  </span>
                )}
              </div>
            </div>

            {/* Review Text */}
            <div className="space-y-2">
              <Label htmlFor="review">Your Review</Label>
              <Textarea
                id="review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your thoughts about this dish..."
                rows={4}
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="border-2 border-dashed rounded-lg p-4">
                {images.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={img}
                          alt={`Upload ${idx + 1}`}
                          className="w-full h-24 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removeImage(idx)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
                
                <div className="text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    id="menu-review-images"
                  />
                  <Label
                    htmlFor="menu-review-images"
                    className="cursor-pointer inline-block px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    Choose Photos
                  </Label>
                  <p className="text-xs text-muted-foreground mt-2">
                    Upload up to 5 photos ({images.length}/5)
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowReviewModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={submitting || !hasContent}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Posting...
                  </>
                ) : (
                  'Post Review'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Super Admin Edit Menu Item Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-item-name">Name</Label>
              <Input
                id="edit-item-name"
                value={editForm.name}
                onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-price">Price (Rs.)</Label>
              <Input
                id="edit-item-price"
                type="number"
                value={editForm.price}
                onChange={e =>
                  setEditForm(f => ({ ...f, price: Number(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-category">Category</Label>
              <Input
                id="edit-item-category"
                value={editForm.category}
                onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-item-description">Description</Label>
              <Textarea
                id="edit-item-description"
                rows={3}
                value={editForm.description}
                onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setShowEditModal(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={savingEdit}
              onClick={async () => {
                setSavingEdit(true);
                try {
                  const payload = {
                    name: editForm.name,
                    price: editForm.price,
                    category: editForm.category,
                    description: editForm.description,
                  };
                  await mongoClient.request(`/restaurants/superadmin/menu/${menuItem._id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload),
                  });
                  toast({
                    title: 'Menu item updated',
                    description: 'The menu item has been updated successfully.',
                  });
                  setShowEditModal(false);
                  onReviewAdded();
                } catch (error: any) {
                  console.error('Super admin update menu item error:', error);
                  toast({
                    title: 'Error',
                    description:
                      error?.error || error?.message || 'Failed to update menu item',
                    variant: 'destructive',
                  });
                } finally {
                  setSavingEdit(false);
                }
              }}
            >
              {savingEdit ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MenuItemCard;