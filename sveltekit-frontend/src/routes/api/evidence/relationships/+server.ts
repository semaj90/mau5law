import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();

    // In production, save to database
    const relationship = {
      id: `rel-${Date.now()}`,
      ...body,
    };

    console.log('Created relationship:', relationship);

    return json(
      {
        success: true,
        relationship,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Relationship creation error:', error);
    return json(
      {
        success: false,
        error: 'Failed to create relationship',
      },
      { status: 500 }
    );
  }
};
