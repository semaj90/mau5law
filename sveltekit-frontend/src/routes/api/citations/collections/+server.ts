/**
 * Citation Collections API
 * GET: List user's collections
 * POST: Create collection
 */

import { json, type RequestHandler } from '@sveltejs/kit';
import { getUser } from '$lib/server/auth/lucia';
import { citationLibraryService } from '$lib/server/services/citation-library.service';

/**
 * GET: List collections
 */
export const GET: RequestHandler = async ({ url, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const isPublic = url.searchParams.get('is_public');

    const collections = await citationLibraryService.getCollections(
      user.id,
      isPublic === 'true' ? true : isPublic === 'false' ? false : undefined
    );

    return json({
      success: true,
      collections,
      count: collections.length,
    });
  } catch (error) {
    console.error('Error listing collections:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list collections',
      },
      { status: 500 }
    );
  }
};

/**
 * POST: Create collection
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    const user = await getUser(locals);
    if (!user) {
      return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, is_public } = body;

    if (!name) {
      return json({ success: false, error: 'name is required' }, { status: 400 });
    }

    const collection = await citationLibraryService.createCollection(user.id, {
      name,
      description,
      is_public,
    });

    return json({
      success: true,
      collection,
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    return json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create collection',
      },
      { status: 500 }
    );
  }
};
