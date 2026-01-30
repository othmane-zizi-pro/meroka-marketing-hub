import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the post to verify ownership and source type
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, source_type, users!posts_author_id_fkey(email)')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user owns the post
    const authorEmail = (post.users as any)?.email;
    if (authorEmail?.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }

    // Only allow deleting employee_composed posts
    if (post.source_type !== 'employee_composed') {
      return NextResponse.json({ error: 'Can only delete your own composed posts' }, { status: 403 });
    }

    // Delete the post
    const { error: deleteError } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (deleteError) {
      console.error('Error deleting post:', deleteError);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/campaign/posts/[postId]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
