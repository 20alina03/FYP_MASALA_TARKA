import { useState } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Star, Flag, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ReviewManagementProps {
  restaurantId: string;
  reviews: any[];
  menuReviews: any[];
  onUpdate: () => void;
}

const ReviewManagement = ({ restaurantId, reviews, menuReviews, onUpdate }: ReviewManagementProps) => {
  const [reportingReview, setReportingReview] = useState<any>(null);
  const [reportReason, setReportReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast({
        title: "Missing reason",
        description: "Please provide a reason for reporting",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await mongoClient.request('/restaurants/admin/report', {
        method: 'POST',
        body: JSON.stringify({
          review_id: reportingReview._id,
          report_type: reportingReview.menu_item_id ?  'menu_item_review' : 'restaurant_review',
          reason: reportReason,
          restaurant_id: restaurantId
        })
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Review reported to super admin"
      });

      setReportingReview(null);
      setReportReason('');
      onUpdate();
    } catch (error: any) {
      console.error('Report review error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to report review",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const ReviewCard = ({ review, isMenuItem = false }: { review: any; isMenuItem?: boolean }) => (
    <Card className={review.is_reported ? 'border-yellow-500' : ''}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{review.user_name || 'Anonymous'}</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < review.rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              {new Date(review.created_at).toLocaleDateString()}
            </p>
            {review.review_text && (
              <p className="text-sm mb-2">{review.review_text}</p>
            )}
            {review.images && review.images.length > 0 && (
              <div className="flex gap-2 mt-2">
                {review.images.map((img:  string, idx: number) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Review"
                    className="w-20 h-20 object-cover rounded"
                  />
                ))}
              </div>
            )}
          </div>
          {review.is_reported ?  (
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Reported
            </Badge>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReportingReview(review)}
            >
              <Flag className="w-4 h-4 mr-1" />
              Report
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Reviews & Ratings</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="restaurant">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="restaurant">
                Restaurant Reviews ({reviews. length})
              </TabsTrigger>
              <TabsTrigger value="menu">
                Menu Item Reviews ({menuReviews.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="restaurant" className="space-y-4 mt-6">
              {reviews.length === 0 ?  (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No restaurant reviews yet</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <ReviewCard key={review._id} review={review} />
                ))
              )}
            </TabsContent>

            <TabsContent value="menu" className="space-y-4 mt-6">
              {menuReviews.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No menu item reviews yet</p>
                </div>
              ) : (
                menuReviews.map((review) => (
                  <ReviewCard key={review._id} review={review} isMenuItem />
                ))
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Report Modal */}
      <Dialog open={!!reportingReview} onOpenChange={() => setReportingReview(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Explain why this review should be reviewed by the super admin
            </p>
            <Textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Enter reason for reporting..."
              rows={4}
            />
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => setReportingReview(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ReviewManagement;