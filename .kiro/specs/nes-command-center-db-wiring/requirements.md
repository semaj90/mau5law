# Requirements Document: NES Command Center Database Wiring

## Introduction

The YoRHa Detective NES Command Center is a comprehensive route management and error analysis interface that displays all application routes with real-time health status, error tracking, and AI-powered error brain analysis. This feature requires database persistence to save route metadata, error clusters, and user interactions for historical tracking and analytics.

## Glossary

- **Command Center**: The all-routes page at `/all-routes` displaying route inventory with tabs, search, filters, and modals
- **Route Node**: A single application route with metadata (path, kind, group, status, badges)
- **Error Cluster**: A grouped set of errors from the same route with severity, code, and message
- **Error Brain**: AI-powered analysis engine that suggests fixes for broken routes
- **Phase 72**: AST graph analysis phase that enriches routes with import detection
- **Phase 78**: Error brain and route patching phase
- **Route Health**: Status of a route (healthy, flaky, broken) based on error clusters
- **Badge**: Visual indicator on a route (🤖 AI, 🛡️ Shield, ✨ Special, etc.)
- **Enrichment**: Process of adding Phase 72/78/90 data to base route definitions

## Requirements

### Requirement 1: Route Metadata Persistence

**User Story:** As a system administrator, I want route metadata to be persisted to the database, so that I can track route inventory changes over time and generate historical reports.

#### Acceptance Criteria

1. WHEN the all-routes page loads THEN the system SHALL query the database for all stored route metadata and merge with current manifest
2. WHEN a route is first discovered THEN the system SHALL create a new route_metadata record with path, kind, group, and initial status
3. WHEN route metadata changes (e.g., kind changes from page to layout) THEN the system SHALL update the existing record with new values and timestamp
4. WHEN a route is removed from the manifest THEN the system SHALL mark the route_metadata record as archived instead of deleting
5. WHEN querying routes THEN the system SHALL return all non-archived routes with their latest metadata and error counts

### Requirement 2: Error Cluster Storage

**User Story:** As an error analyst, I want error clusters to be stored in the database, so that I can query error patterns across routes and time periods.

#### Acceptance Criteria

1. WHEN an error cluster is detected THEN the system SHALL store it with route_id, tool, code, message, severity, and timestamp
2. WHEN the same error code appears on multiple routes THEN the system SHALL create separate error_cluster records for each route
3. WHEN querying error clusters for a route THEN the system SHALL return all clusters ordered by severity (error > warning > info) then by timestamp descending
4. WHEN an error is resolved THEN the system SHALL mark the error_cluster record as resolved with resolution_timestamp
5. WHEN calculating route health THEN the system SHALL count unresolved error clusters and determine status (broken if errors, flaky if warnings, healthy if none)

### Requirement 3: Route Health Status Tracking

**User Story:** As a developer, I want route health status to be tracked over time, so that I can see which routes are improving or degrading.

#### Acceptance Criteria

1. WHEN route health changes THEN the system SHALL create a route_health_event record with route_id, old_status, new_status, and timestamp
2. WHEN querying route health history THEN the system SHALL return all health events for a route ordered by timestamp descending
3. WHEN calculating current route health THEN the system SHALL use the most recent health event or compute from error clusters if no event exists
4. WHEN a route has no errors THEN the system SHALL set status to healthy
5. WHEN a route has only warnings THEN the system SHALL set status to flaky
6. WHEN a route has any errors THEN the system SHALL set status to broken

### Requirement 4: Error Brain Analysis Persistence

**User Story:** As an error analyst, I want error brain analyses to be saved, so that I can review previous suggestions and track which fixes were applied.

#### Acceptance Criteria

1. WHEN error brain completes an analysis THEN the system SHALL store the analysis with route_id, suggestions, selected_suggestion_index, and timestamp
2. WHEN error brain applies a patch THEN the system SHALL create an error_brain_patch record with analysis_id, patch_content, applied_timestamp, and verification_status
3. WHEN querying error brain history for a route THEN the system SHALL return all analyses and patches ordered by timestamp descending
4. WHEN verifying a patch THEN the system SHALL update verification_status to passed or failed with verification_timestamp
5. WHEN calculating patch success rate THEN the system SHALL count passed patches divided by total patches for a route

### Requirement 5: Route Interaction Logging

**User Story:** As a product analyst, I want user interactions with the command center to be logged, so that I can understand which routes are most frequently accessed and analyzed.

#### Acceptance Criteria

1. WHEN a user opens a route modal THEN the system SHALL log the interaction with route_id, interaction_type (view), user_id, and timestamp
2. WHEN a user clicks "Visit Page" THEN the system SHALL log interaction_type (navigate)
3. WHEN a user launches error brain analysis THEN the system SHALL log interaction_type (analyze)
4. WHEN a user applies a patch THEN the system SHALL log interaction_type (patch_apply)
5. WHEN querying interaction logs THEN the system SHALL return all logs for a route ordered by timestamp descending with user information

### Requirement 6: Database Schema and Migrations

**User Story:** As a database administrator, I want a well-designed schema for route tracking, so that queries are efficient and data integrity is maintained.

#### Acceptance Criteria

1. WHEN the application starts THEN the system SHALL run migrations to create route_metadata, error_cluster, route_health_event, error_brain_analysis, error_brain_patch, and route_interaction_log tables
2. WHEN creating tables THEN the system SHALL define appropriate indexes on route_id, timestamp, status, and tool columns for query performance
3. WHEN storing timestamps THEN the system SHALL use UTC timezone and store as ISO 8601 format
4. WHEN referencing routes THEN the system SHALL use route_id as primary key and enforce referential integrity
5. WHEN archiving routes THEN the system SHALL use soft delete pattern with archived_at timestamp instead of hard delete

### Requirement 7: API Endpoints for Database Operations

**User Story:** As a frontend developer, I want API endpoints to save and retrieve route data, so that the UI can persist and display historical information.

#### Acceptance Criteria

1. WHEN POST /api/routes/metadata THEN the system SHALL create or update route metadata and return the stored record
2. WHEN GET /api/routes/:routeId/metadata THEN the system SHALL return the route metadata with current health status
3. WHEN POST /api/routes/:routeId/errors THEN the system SHALL create an error cluster record and return it
4. WHEN GET /api/routes/:routeId/errors THEN the system SHALL return all error clusters for the route with pagination
5. WHEN POST /api/routes/:routeId/health-event THEN the system SHALL create a health event and return it
6. WHEN GET /api/routes/:routeId/health-history THEN the system SHALL return health events with pagination
7. WHEN POST /api/routes/:routeId/interactions THEN the system SHALL log an interaction and return it
8. WHEN GET /api/routes/:routeId/interactions THEN the system SHALL return interaction logs with pagination

### Requirement 8: Server-Side Data Loading and Enrichment

**User Story:** As a frontend developer, I want the server to load and enrich route data from the database, so that the UI receives complete route information on page load.

#### Acceptance Criteria

1. WHEN +page.server.ts loads THEN the system SHALL query database for all route metadata
2. WHEN loading route metadata THEN the system SHALL merge with COMMAND_CENTER_MANIFEST to get complete route definitions
3. WHEN enriching routes THEN the system SHALL add current health status from route_health_event or computed from error_cluster
4. WHEN enriching routes THEN the system SHALL add error count from error_cluster table
5. WHEN enriching routes THEN the system SHALL add last error timestamp and message from most recent error_cluster
6. WHEN enriching routes THEN the system SHALL add error brain suggestion count from error_brain_analysis table

### Requirement 9: Real-Time Health Status Updates

**User Story:** As a developer, I want route health status to update in real-time as errors are detected, so that the command center always shows current status.

#### Acceptance Criteria

1. WHEN an error is detected by svelte-check or tsc THEN the system SHALL create an error_cluster record
2. WHEN error_cluster is created THEN the system SHALL recalculate route health status
3. WHEN route health status changes THEN the system SHALL create a route_health_event record
4. WHEN route health changes THEN the system SHALL broadcast update to connected clients via WebSocket or polling
5. WHEN client receives health update THEN the UI SHALL update the route card health indicator without full page reload

### Requirement 10: Data Cleanup and Archival

**User Story:** As a database administrator, I want old data to be archived, so that the database doesn't grow unbounded and queries remain performant.

#### Acceptance Criteria

1. WHEN error clusters are older than 90 days THEN the system SHALL archive them to error_cluster_archive table
2. WHEN route interaction logs are older than 180 days THEN the system SHALL archive them to route_interaction_log_archive table
3. WHEN archiving data THEN the system SHALL run as a background job without blocking the application
4. WHEN querying current data THEN the system SHALL only return non-archived records by default
5. WHEN querying historical data THEN the system SHALL allow querying archived tables with explicit flag

