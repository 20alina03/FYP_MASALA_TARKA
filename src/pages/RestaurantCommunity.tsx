import { useState, useEffect } from 'react';
import { mongoClient } from '@/lib/mongodb-client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Share2, MapPin, Star, Search, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import RestaurantNavigation from '@/components/RestaurantNavigation';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CommunityPost {
  _id: string;
  restaurant_id: any;
  post_type: 'text' | 'image' | 'video';
  content: string;
  media_url?: string;
  likes_count: number;
  comments_count: number;
  user_liked?:  boolean;
  created_at: string;
}

const RestaurantCommunity = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('all');
  const [postType, setPostType] = useState('all');

  const cuisines = ['Italian', 'Indian', 'Japanese', 'Mediterranean', 'American', 'Mexican', 'Thai', 'Chinese', 'Korean'];

  useEffect(() => {
    fetchPosts();
  }, [selectedCuisine, postType]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      
      const params:  any = {};
      if (selectedCuisine !== 'all') params.cuisine = selectedCuisine;
      if (postType !== 'all') params.post_type = postType;
      
      const queryString = new URLSearchParams(params).toString();
      const { data, error } = await mongoClient.request(`/restaurants/community/posts?${queryString}`);
      
      if (error) throw error;
      
      setPosts(data || []);
    } catch (error:  any) {
      console.error('Fetch posts error:', error);
      toast({
        title: "Error",
        description: "Failed to load community posts",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({
        title:  "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await mongoClient.request(`/restaurants/community/posts/${postId}/like`, {
        method: 'POST'
      });

      if (error) throw error;

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post._id === postId) {
          return {
            ...post,
            user_liked: !post.user_liked,
            likes_count: post. user_liked ? post.likes_count - 1 : post.likes_count + 1
          };
        }
        return post;
      }));
    } catch (error: any) {
      console.error('Like post error:', error);
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive"
      });
    }
  };

  const handleRestaurantClick = (restaurantId: string) => {
    navigate(`/restaurants/${restaurantId}`);
  };

  const filteredPosts = posts.filter(post => {
    if (! searchTerm) return true;
    return post.restaurant_id?. name?. toLowerCase().includes(searchTerm. toLowerCase()) ||
           post.content?. toLowerCase().includes(searchTerm. toLowerCase());
  });

  const formatTimeAgo = (dateString: string) => {
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
  };

  return (
    <div className="min-h-screen bg-background">
      <RestaurantNavigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Restaurant Community
          </h1>
          <p className="text-muted-foreground text-lg">
            Discover latest updates, offers, and posts from restaurants
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-8 p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md: grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search posts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedCuisine} onValueChange={setSelectedCuisine}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cuisines" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cuisines</SelectItem>
                  {cuisines.map((cuisine) => (
                    <SelectItem key={cuisine} value={cuisine}>
                      {cuisine}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Post Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="text">Text Posts</SelectItem>
                  <SelectItem value="image">Images</SelectItem>
                  <SelectItem value="video">Videos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Posts Feed */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted h-64 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              No posts found. Check back later for updates!
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredPosts. map((post) => (
              <Card key={post._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar 
                      className="cursor-pointer hover:opacity-80"
                      onClick={() => handleRestaurantClick(post.restaurant_id?._id)}
                    >
                      <AvatarFallback>
                        {post.restaurant_id?. name?. charAt(0) || 'R'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 
                        className="font-semibold cursor-pointer hover:text-primary"
                        onClick={() => handleRestaurantClick(post. restaurant_id?._id)}
                      >
                        {post.restaurant_id?.name || 'Restaurant'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span>{post.restaurant_id?.city || 'Unknown'}</span>
                        <span>•</span>
                        <span>{formatTimeAgo(post.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.restaurant_id?.rating && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="font-semibold">
                            {post.restaurant_id. rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {post. post_type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Post Content */}
                  {post.content && (
                    <p className="mb-4 whitespace-pre-wrap">{post.content}</p>
                  )}

                  {/* Media */}
                  {post. media_url && (
                    <div className="mb-4 rounded-lg overflow-hidden">
                      {post.post_type === 'image' && (
                        <img
                          src={post.media_url}
                          alt="Post content"
                          className="w-full max-h-96 object-cover"
                        />
                      )}
                      {post.post_type === 'video' && (
                        <video
                          src={post.media_url}
                          controls
                          className="w-full max-h-96"
                        />
                      )}
                    </div>
                  )}

                  {/* Cuisine Tags */}
                  {post. restaurant_id?.cuisine_types && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.restaurant_id. cuisine_types.slice(0, 3).map((cuisine:  string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {cuisine}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-6 pt-4 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post._id)}
                      className={post.user_liked ? 'text-red-500' :  ''}
                    >
                      <Heart className={`w-5 h-5 mr-2 ${post.user_liked ?  'fill-current' : ''}`} />
                      <span>{post.likes_count}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurantClick(post. restaurant_id?._id)}
                    >
                      <MessageCircle className="w-5 h-5 mr-2" />
                      <span>{post.comments_count || 0}</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRestaurantClick(post.restaurant_id?._id)}
                    >
                      <MapPin className="w-5 h-5 mr-2" />
                      <span>Visit Restaurant</span>
                    </Button>
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

export default RestaurantCommunity;