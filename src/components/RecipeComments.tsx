import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Trash2, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  user_name?: string;
}

interface RecipeCommentsProps {
  recipeId: string;
  initialCount?: number;
  onCommentAdded?: () => void;
}

export const RecipeComments = ({ recipeId, initialCount = 0, onCommentAdded }: RecipeCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(initialCount);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Update count when initialCount changes
  useEffect(() => {
    setCommentsCount(initialCount);
  }, [initialCount]);

  const fetchComments = async () => {
    try {
      console.log('Fetching comments for recipe:', recipeId);
      setLoading(true);
      
      const { data, error } = await mongoClient.from('recipe_comments').select();

      if (error) {
        console.error('Fetch comments error:', error);
        throw error;
      }
      
      console.log('All comments:', data);
      
      const filteredComments = data
        ?.filter((c: any) => c.recipe_id === recipeId)
        .map((c: any) => ({
          id: c._id,
          user_id: c.user_id,
          comment: c.comment,
          created_at: c.created_at,
          user_name: c.user_name || 'Anonymous'
        })) || [];
      
      console.log('Filtered comments for recipe:', filteredComments.length);
      setComments(filteredComments);
      setCommentsCount(filteredComments.length);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showComments) {
      fetchComments();
    }
  }, [recipeId, showComments]);

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim() || submitting) return;

    setSubmitting(true);
    try {
      console.log('Submitting comment:', {
        recipe_id: recipeId,
        user_id: user.id,
        comment: newComment.trim(),
        user_name: (user as any).full_name || user.email || 'Anonymous'
      });
      
      const { data, error } = await mongoClient
        .from('recipe_comments')
        .insert({
          recipe_id: recipeId,
          user_id: user.id,
          comment: newComment.trim(),
          user_name: (user as any).full_name || user.email || 'Anonymous',
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Comment insert error:', error);
        throw error;
      }
      
      console.log('Comment inserted successfully:', data);

      setNewComment('');
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
      
      // Refresh comments
      await fetchComments();
      
      // Call the callback to update parent component
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      console.error('Comment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      console.log('Deleting comment:', commentId);
      
      const { error } = await mongoClient
        .from('recipe_comments')
        .delete()
        .eq('_id', commentId);

      if (error) {
        console.error('Delete comment error:', error);
        throw error;
      }
      
      console.log('Comment deleted successfully');

      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
      
      // Refresh comments
      await fetchComments();
      
      // Call the callback to update parent component (decrement count)
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error: any) {
      console.error('Delete comment error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      const months = Math.floor(days / 30);
      if (months < 12) return `${months}mo ago`;
      const years = Math.floor(months / 12);
      return `${years}y ago`;
    } catch {
      return 'recently';
    }
  };

  return (
    <div className="w-full">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowComments(!showComments)}
        className="mb-4"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        {commentsCount} Comment{commentsCount !== 1 ? 's' : ''}
      </Button>

      {showComments && (
        <div className="space-y-4">
          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-2">
              <Textarea
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                disabled={submitting}
              />
              <Button type="submit" disabled={submitting || !newComment.trim()}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </form>
          )}

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-muted h-20 rounded"></div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-sm">
                            {comment.user_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimeAgo(comment.created_at)}
                          </p>
                        </div>
                        <p className="text-sm">{comment.comment}</p>
                      </div>
                      {user && user.id === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};