import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { personsOfInterest } from '../../../../drizzle/schema';
import { eq, like, and, or, desc, asc } from 'drizzle-orm';


export const GET: RequestHandler = async ({ url, request }) => {
  try {
    const searchQuery = url.searchParams.get('search') || '';
    const threatLevel = url.searchParams.get('threatLevel') || '';
    const status = url.searchParams.get('status') || '';
    const relationship = url.searchParams.get('relationship') || '';
    const caseId = url.searchParams.get('caseId') || '';
    const sortBy = url.searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = url.searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = db.select().from(personsOfInterest);

    // Build where conditions
    const conditions = [];

    if (searchQuery) {
      conditions.push(like(personsOfInterest.name, `%${searchQuery}%`));
    }

    if (threatLevel) {
      conditions.push(eq(personsOfInterest.threatLevel, threatLevel));
    }

    if (status) {
      conditions.push(eq(personsOfInterest.status, status));
    }

    if (relationship) {
      conditions.push(eq(personsOfInterest.relationship, relationship));
    }

    if (caseId) {
      conditions.push(eq(personsOfInterest.caseId, caseId));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const sortColumn = personsOfInterest[sortBy as keyof typeof personsOfInterest] || personsOfInterest.updatedAt;
    query = query.orderBy(sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn));

    // Apply pagination
    query = query.limit(limit).offset(offset);

    const persons = await query;

    // Get total count for pagination
    const [totalResult] = await db.select({ count: personsOfInterest.id }).from(personsOfInterest);
    const total = parseInt(totalResult?.count?.toString() || '0');

    return json({
      success: true,
      data: persons,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + persons.length < total
      }
    });

  } catch (error) {
    console.error('Error fetching persons of interest:', error);
    return json({
      success: false,
      error: 'Failed to fetch persons of interest'
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name || !body.relationship) {
      return json({
        success: false,
        error: 'Name and relationship are required'
      }, { status: 400 });
    }

    const personData = {
      name: body.name,
      aliases: body.aliases || [],
      relationship: body.relationship,
      threatLevel: body.threatLevel || 'low',
      status: body.status || 'active',
      profileData: body.profileData || {},
      tags: body.tags || [],
      position: body.position || {},
      caseId: body.caseId || null,
      createdBy: body.createdBy || null,
    };

    const [newPerson] = await db.insert(personsOfInterest).values(personData).returning();

    return json({
      success: true,
      data: newPerson
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating person of interest:', error);
    return json({
      success: false,
      error: 'Failed to create person of interest'
    }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return json({
        success: false,
        error: 'Person ID is required for updates'
      }, { status: 400 });
    }

    const updateData = {
      ...(body.name && { name: body.name }),
      ...(body.aliases && { aliases: body.aliases }),
      ...(body.relationship && { relationship: body.relationship }),
      ...(body.threatLevel && { threatLevel: body.threatLevel }),
      ...(body.status && { status: body.status }),
      ...(body.profileData && { profileData: body.profileData }),
      ...(body.tags && { tags: body.tags }),
      ...(body.position && { position: body.position }),
      updatedAt: new Date().toISOString()
    };

    const [updatedPerson] = await db
      .update(personsOfInterest)
      .set(updateData)
      .where(eq(personsOfInterest.id, body.id))
      .returning();

    if (!updatedPerson) {
      return json({
        success: false,
        error: 'Person of interest not found'
      }, { status: 404 });
    }

    return json({
      success: true,
      data: updatedPerson
    });

  } catch (error) {
    console.error('Error updating person of interest:', error);
    return json({
      success: false,
      error: 'Failed to update person of interest'
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    
    if (!body.id) {
      return json({
        success: false,
        error: 'Person ID is required for deletion'
      }, { status: 400 });
    }

    const [deletedPerson] = await db
      .delete(personsOfInterest)
      .where(eq(personsOfInterest.id, body.id))
      .returning();

    if (!deletedPerson) {
      return json({
        success: false,
        error: 'Person of interest not found'
      }, { status: 404 });
    }

    return json({
      success: true,
      message: 'Person of interest deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting person of interest:', error);
    return json({
      success: false,
      error: 'Failed to delete person of interest'
    }, { status: 500 });
  }
};

