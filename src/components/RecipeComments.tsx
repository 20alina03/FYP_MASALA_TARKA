import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
  id: string;
  user_id: string;
  comment: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface RecipeCommentsProps {
  recipeId: string;
}

export const RecipeComments = ({ recipeId }: RecipeCommentsProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const fetchComments = async () => {
    try {
      const { data, error } = await mongoClient.from('recipe_comments').select();

      if (error) throw error;
      
      const filteredComments = data
        ?.filter((c: any) => c.recipe_id === recipeId)
        .map((c: any) => ({ ...c, id: c._id })) || [];
      
      setComments(filteredComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
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
      const { error } = await mongoClient
        .from('recipe_comments')
        .insert({
          recipe_id: recipeId,
          comment: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
      fetchComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user) return;

    try {
      const { error } = await mongoClient
        .from('recipe_comments')
        .delete()
        .eq('_id', commentId);

      if (error) throw error;

      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
      fetchComments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
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
        {comments.length} Comments
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
                Post Comment
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
                            {comment.profiles?.full_name || 'Anonymous'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
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