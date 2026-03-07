import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star } from 'lucide-react';

interface ReviewCardProps {
  review: any;
  restaurantId: string;
}

const ReviewCard = ({ review }: ReviewCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{review.user_name || 'Anonymous'}</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ?  'text-yellow-500 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {new Date(review.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {review.review_text && (
          <p className="text-sm mb-3">{review.review_text}</p>
        )}

        {review.images && review.images.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {review. images.map((img: string, idx: number) => (
              <img
                key={idx}
                src={img}
                alt={`Review ${idx + 1}`}
                className="w-24 h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => window.open(img, '_blank')}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewCard;