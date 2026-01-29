import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'othmane.zizi@meroka.com';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only allow admin to delete
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json(
        { error: 'Not authorized' },
        { status: 403 }
      );
    }

    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID required' },
        { status: 400 }
      );
    }

    // First check if the post exists
    const { data: existingPost } = await supabase
      .from('social_posts')
      .select('id')
      .eq('id', postId)
      .single();

    console.log('Existing post check:', { postId, existingPost });

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    // Try to delete
    const { error, count } = await supabase
      .from('social_posts')
      .delete()
      .eq('id', postId)
      .select();

    console.log('Delete result:', { error, count, postId });

    if (error) {
      console.error('Error deleting post:', error);
      return NextResponse.json(
        { error: `Failed to delete: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, deleted: true });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
