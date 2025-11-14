# POI Photo System Implementation Guide - November 13, 2025

## Overview

This document outlines the complete POI (Persons Of Interest) photo management system implementation, providing a police-style evidence management solution with modern forensic analysis capabilities.

## System Architecture

### Database Schema

The system uses a PostgreSQL database with Drizzle ORM for type-safe queries. The core schema includes:

#### `poiPhotos` Table
```typescript
{
  id: serial("id").primaryKey(),
  poiId: integer("poi_id").references(() => personsOfInterest.id).notNull(),
  minioPath: text("minio_path").notNull(),
  url: text("url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  metadata: jsonb("metadata").$type<{
    exif?: Record<string, any>;
    gps?: { lat: number; lng: number } | null;
    timestamp?: string | null;
    device?: string | null;
    ai?: {
      caption?: string;
      tags?: string[];
      qualityScore?: number;
      faceEmbedding?: number[];
    };
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}
```

### API Endpoints

#### Photo Upload
- **Endpoint**: `POST /api/v1/poi/photo`
- **Function**: Handles multipart file uploads to MinIO storage
- **Features**:
  - Automatic MinIO bucket creation (`poi-photos`)
  - Content-type detection
  - Database record creation
  - Fallback to local storage if MinIO unavailable

#### Photo Serving
- **Endpoint**: `GET /api/v1/poi/photo/[key]`
- **Function**: Streams photos from MinIO with caching
- **Features**:
  - Efficient streaming responses
  - Cache headers for performance
  - Thumbnail support via query parameter

#### POI Photos List
- **Endpoint**: `GET /api/poi/[id]/photos`
- **Function**: Retrieves all photos for a specific POI
- **Features**:
  - Ordered by creation date
  - Includes metadata for each photo

## UI Components

### POIPhotoUploader.svelte

A drag-and-drop photo upload interface with the following features:

```svelte
<!-- Key Features -->
- Drag and drop zone with visual feedback
- File browser fallback
- Upload progress indication
- File validation (image types only)
- Multiple file support
- Error handling and user feedback
```

### POIPhotoModal.svelte

A comprehensive forensic photo viewer with advanced analysis capabilities:

#### Core Features
- **Zoom Controls**: 10% to 500% magnification
- **Rotation Support**: Full 360° rotation
- **Tabbed Interface**:
  - **Overview**: Basic photo information and metadata
  - **Metadata**: Detailed EXIF data display
  - **AI Analysis**: Machine learning insights and tags

#### Forensic Analysis Panels

**Overview Tab:**
- Photo timestamp
- GPS coordinates (when available)
- Device information
- Quality score indicator

**Metadata Tab:**
- Complete EXIF data display
- Camera settings
- Location data
- File properties

**AI Analysis Tab:**
- AI-generated captions
- Automatic tagging
- Face detection indicators
- Quality scoring
- Embedding vectors for similarity search

### POI Profile Page

The main POI profile page (`/poi/[id]`) integrates all photo management features:

```svelte
<!-- Layout Features -->
- Responsive photo grid (2-4 columns based on screen size)
- Click-to-zoom functionality
- Integrated upload component
- Photo count display
- Loading states and error handling
```

## MinIO Integration

### Bucket Management
- **Bucket Name**: `poi-photos`
- **Automatic Creation**: Bucket created on first upload if it doesn't exist
- **Fallback Storage**: Local file system storage when MinIO is unavailable

### Storage Structure
```
poi-photos/
├── [poiId]/
│   ├── [uuid]-[filename]
│   └── [uuid]-[filename]
└── [poiId]/
    └── [uuid]-[filename]
```

### Content Types
- Automatic MIME type detection
- Support for JPG, PNG, GIF, and other image formats
- Proper headers for browser display

## Implementation Details

### Type Safety
- Full TypeScript implementation
- Drizzle ORM for database operations
- Svelte 5 runes for reactive state management
- Proper type definitions for all components

### Performance Optimizations
- Streaming responses for large images
- Browser caching with appropriate headers
- Thumbnail generation support
- Efficient database queries with proper indexing

### Accessibility
- WCAG-compliant components
- ARIA labels for screen readers
- Keyboard navigation support
- Focus management in modals

### Error Handling
- Comprehensive error boundaries
- User-friendly error messages
- Fallback mechanisms (MinIO → local storage)
- Proper HTTP status codes

## Usage Examples

### Uploading Photos
```javascript
const formData = new FormData();
formData.append('file', imageFile);
formData.append('poiId', poiId.toString());

const response = await fetch('/api/v1/poi/photo', {
  method: 'POST',
  body: formData
});

const result = await response.json();
// Returns: { ok: true, data: { id, poiId, url, thumbnailUrl, ... } }
```

### Displaying Photos
```javascript
const response = await fetch(`/api/poi/${poiId}/photos`);
const photos = await response.json();

// Each photo object contains:
// - id, poiId, minioPath, url, thumbnailUrl
// - metadata with EXIF, GPS, AI analysis
```

### Forensic Analysis
```javascript
// Access AI metadata
const photo = photos[0];
const aiData = photo.metadata?.ai;

// Available AI features:
// - caption: AI-generated description
// - tags: Automatic categorization
// - qualityScore: Image quality assessment
// - faceEmbedding: Vector for face recognition
```

## MinIO Bucket Configuration

### Environment Variables
```bash
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Bucket Setup
The system automatically creates the `poi-photos` bucket on first use. Manual setup:

```bash
# Using MinIO client
mc mb local/poi-photos

# Or via Docker
docker exec minio-server mc mb local/poi-photos
```

## Ready for Enhancement

The system is now ready for AI enhancements like:

### Face Recognition and Similarity Search
- Integration with face detection models
- Vector similarity search using pgvector
- Cross-POI face matching
- Confidence scoring for matches

### Automatic Photo Categorization
- Scene classification (indoor/outdoor, urban/rural)
- Object detection and tagging
- Activity recognition
- Evidence type classification

### EXIF/GPS Metadata Extraction
- Enhanced EXIF parsing
- GPS coordinate mapping
- Location-based clustering
- Timeline reconstruction

### Quality Scoring and Enhancement Suggestions
- Image quality assessment
- Blur detection and correction
- Lighting optimization recommendations
- Resolution enhancement suggestions

## Production Deployment

### Security Considerations
- MinIO bucket policies for access control
- Image content validation
- Rate limiting for uploads
- Audit logging for evidence chain

### Performance Scaling
- CDN integration for photo serving
- Database indexing for fast queries
- Caching strategies for metadata
- Background processing for AI analysis

### Monitoring and Maintenance
- Photo storage usage tracking
- AI model performance monitoring
- Error rate monitoring
- Backup and recovery procedures

## Conclusion

The POI photo system provides a complete, production-ready solution for managing evidence photos in a police-style records system with modern forensic analysis capabilities. The modular architecture supports easy extension with AI features while maintaining high performance and reliability.

Built with modern web technologies including SvelteKit, TypeScript, Drizzle ORM, and MinIO, the system offers a scalable foundation for evidence management in law enforcement and investigative applications.