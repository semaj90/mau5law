import type { db  } from '$lib/server/db/drizzle';
import type { personsOfInterest  } from '$lib/server/db/schema-postgres';
import type { eq  } from 'drizzle-orm';
import type { json, error  } from '@sveltejs/kit';
import type { RequestHandler } from "./$types ";

export const GET: RequestHandler = async () => {
  try {
    const persons = await db
      .select()
      .from(personsOfInterest)
      .orderBy(personsOfInterest.createdAt);

    return json({
      persons: persons.map(person => ({
        id: person.id,
        name: person.name,
        aliases: person.aliases || [],
        threatLevel: person.threatLevel,
        status: person.status,
        description: person.description,
        lastSeen: person.lastSeen,
        lastLocation: person.lastLocation,
        photos: person.photos || [],
        photoMetadata: person.photoMetadata,
        createdAt: person.createdAt
      }))
    });
  } catch (err) {
    console.error('Error fetching persons:', err);
    throw error(500, 'Failed to fetch persons of interest');
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const contentType = request.headers.get('content-type') || '';

    let data: any;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (with photos)
      const formData = await request.formData();
      data = {
        name: formData.get('name') as string,
        aliases: JSON.parse(formData.get('aliases') as string || '[]'),
        threatLevel: formData.get('threat_level') as string || 'low',
        status: formData.get('status') as string || 'surveillance',
        description: formData.get('description') as string,
        lastSeen: formData.get('last_seen') as string || null,
        lastLocation: formData.get('location') as string,
        photos: [], // Will be populated after photo upload
        photoMetadata: {}
      };

      // Handle photo uploads if present
      const photos = formData.getAll('photos') as File[];
      if (photos.length > 0) {
        // First create the person
        const newPerson = await db
          .insert(personsOfInterest)
          .values({
            name: data.name,
            aliases: data.aliases,
            threatLevel: data.threatLevel,
            status: data.status,
            description: data.description,
            lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
            lastLocation: data.lastLocation,
            photos: [],
            photoMetadata: {}
          })
          .returning();

        const personId = newPerson[0].id;

        // Upload photos one by one
        const uploadedPhotos: string[] = [];
        const photoMetadata: Record<string, any> = {};

        for (const photo of photos) {
          try {
            const photoFormData = new FormData();
            photoFormData.append('photo', photo);

            const uploadResponse = await fetch(`http://localhost:3000/api/persons/${personId}/photo`, {
              method: 'POST',
              body: photoFormData
            });

            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              uploadedPhotos.push(uploadResult.photo.url);
              photoMetadata[uploadResult.photo.metadata.minioKey] = uploadResult.photo.metadata;
            }
          } catch (photoErr) {
            console.error('Failed to upload photo:', photoErr);
            // Continue with other photos
          }
        }

        // Update person with uploaded photos
        await db
          .update(personsOfInterest)
          .set({
            photos: uploadedPhotos,
            photoMetadata: photoMetadata
          })
          .where(eq(personsOfInterest.id, personId));

        return json({
          person: {
            id: personId,
            name: data.name,
            aliases: data.aliases,
            threatLevel: data.threatLevel,
            status: data.status,
            description: data.description,
            lastSeen: data.lastSeen,
            lastLocation: data.lastLocation,
            photos: uploadedPhotos,
            photoMetadata: photoMetadata,
            createdAt: newPerson[0].createdAt
          }
        });
      }
    } else {
      // Handle JSON (legacy support)
      data = await request.json();
    }

    // Create person without photos
    const newPerson = await db
      .insert(personsOfInterest)
      .values({
        name: data.name,
        aliases: data.aliases || [],
        threatLevel: data.threatLevel || 'low',
        status: data.status || 'surveillance',
        description: data.description,
        lastSeen: data.lastSeen ? new Date(data.lastSeen) : null,
        lastLocation: data.lastLocation,
        photos: data.photos || [],
        photoMetadata: data.photoMetadata
      })
      .returning();

    return json({
      person: {
        id: newPerson[0].id,
        name: newPerson[0].name,
        aliases: newPerson[0].aliases || [],
        threatLevel: newPerson[0].threatLevel,
        status: newPerson[0].status,
        description: newPerson[0].description,
        lastSeen: newPerson[0].lastSeen,
        lastLocation: newPerson[0].lastLocation,
        photos: newPerson[0].photos || [],
        photoMetadata: newPerson[0].photoMetadata,
        createdAt: newPerson[0].createdAt
      }
    });
  } catch (err) {
    console.error('Error creating person:', err);
    throw error(500, 'Failed to create person of interest');
  }
};