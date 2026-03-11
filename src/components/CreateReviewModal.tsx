import { useState } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Star, Loader2, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CreateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  onReviewCreated: () => void;
}

const CreateReviewModal = ({ isOpen, onClose, restaurantId, onReviewCreated }: CreateReviewModalProps) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async () => {
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
      const { error } = await mongoClient.request(`/restaurants/${restaurantId}/reviews`, {
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
      onClose();
      onReviewCreated();
    } catch (error: any) {
      console.error('Create review error:', error);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground">
            <p>Please provide at least one of the following:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>A rating (1-5 stars)</li>
              <li>A written review</li>
              <li>Photos of your experience</li>
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
              placeholder="Share your experience..."
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
                  id="review-images"
                />
                <Label
                  htmlFor="review-images"
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
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
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
  );
};

export default CreateReviewModal;