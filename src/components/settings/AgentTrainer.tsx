'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Sparkles, Loader2 } from 'lucide-react';

export function AgentTrainer() {
  const [examplePosts, setExamplePosts] = useState<string[]>([
    "Just shipped a feature that'll save merchants 5 hours/week. The best part? Seeing their reactions when they realize they can finally focus on growing their business instead of manual data entry. #ProductLife",
    "3 things I learned this quarter: 1) User research > assumptions 2) Ship fast, iterate faster 3) The best ideas come from cross-functional collaboration. Here's to more learnings ahead!",
  ]);
  const [newPost, setNewPost] = useState('');
  const [personalContext, setPersonalContext] = useState(
    "I'm a Product Marketing Manager at Meroka with 5 years of experience. I'm passionate about storytelling and helping merchants succeed. I prefer a professional but approachable tone."
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [testOutput, setTestOutput] = useState('');

  const addExamplePost = () => {
    if (newPost.trim()) {
      setExamplePosts([...examplePosts, newPost.trim()]);
      setNewPost('');
    }
  };

  const removeExamplePost = (index: number) => {
    setExamplePosts(examplePosts.filter((_, i) => i !== index));
  };

  const handleTestOutput = async () => {
    setIsGenerating(true);
    setTestOutput('');

    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    setTestOutput(
      "Excited to share a behind-the-scenes look at how we approach product marketing at Meroka! Today, we launched our new merchant analytics dashboard. What makes me proud isn't just the feature – it's the 47 customer interviews that shaped every decision. When you truly listen to your users, the product builds itself. #ProductMarketing #CustomerFirst #Meroka"
    );
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Example Posts (Few-Shot Learning)</CardTitle>
          <CardDescription>
            Add examples of posts you like. The AI will learn your style and tone from these.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {examplePosts.map((post, index) => (
            <div key={index} className="relative rounded-lg border bg-muted/50 p-4">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6"
                onClick={() => removeExamplePost(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <p className="text-sm pr-8">{post}</p>
              <Badge variant="secondary" className="mt-2">
                Example {index + 1}
              </Badge>
            </div>
          ))}

          <div className="space-y-2">
            <Textarea
              placeholder="Paste an example post you'd like the AI to learn from..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              rows={3}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={addExamplePost}
              disabled={!newPost.trim()}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Example
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Personal Context</CardTitle>
          <CardDescription>
            Tell the AI about yourself, your role, and your preferred writing style.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={personalContext}
            onChange={(e) => setPersonalContext(e.target.value)}
            rows={4}
            placeholder="Describe your role, experience, interests, and preferred tone..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Output</CardTitle>
          <CardDescription>
            Generate a sample post to see how the AI has learned your style.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleTestOutput}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Generate Test Post
              </>
            )}
          </Button>

          {testOutput && (
            <div className="rounded-lg border bg-gradient-to-br from-primary/5 to-primary/10 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Generated</span>
              </div>
              <p className="text-sm">{testOutput}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
