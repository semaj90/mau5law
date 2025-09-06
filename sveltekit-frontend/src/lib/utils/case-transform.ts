/**
 * Case Transformation Utilities
 * Handles snake_case <-> camelCase conversion between database and frontend
 */

// Common field mappings for consistency
export const COMMON_FIELD_MAPPINGS = {
  // User fields
  'first_name': 'firstName',
  'last_name': 'lastName',
  'hashed_password': 'hashedPassword',
  'email_verified': 'emailVerified',
  'is_active': 'isActive',
  'last_login_at': 'lastLoginAt',
  'practice_areas': 'practiceAreas',
  'bar_number': 'barNumber',
  'firm_name': 'firmName',
  'profile_embedding': 'profileEmbedding',
  'created_at': 'createdAt',
  'updated_at': 'updatedAt',
  'deleted_at': 'deletedAt',
  'avatar_url': 'avatarUrl',

  // Case fields
  'case_number': 'caseNumber',
  'case_type': 'caseType',
  'legal_status': 'legalStatus',
  'assigned_attorney': 'assignedAttorney',
  'due_date': 'dueDate',
  'priority_level': 'priorityLevel',
  'case_embedding': 'caseEmbedding',

  // Evidence fields
  'file_path': 'filePath',
  'file_size': 'fileSize',
  'mime_type': 'mimeType',
  'chain_of_custody': 'chainOfCustody',
  'evidence_type': 'evidenceType',
  'collection_date': 'collectionDate',
  'hash_sha256': 'hashSha256',
  'content_text': 'contentText',

  // Common timestamp fields
  'uploaded_at': 'uploadedAt',
  'processed_at': 'processedAt',
  'analyzed_at': 'analyzedAt'
} as const;

// Reverse mapping for camelCase -> snake_case
export const REVERSE_FIELD_MAPPINGS = Object.fromEntries(
  Object.entries(COMMON_FIELD_MAPPINGS).map(([snake, camel]) => [camel, snake])
) as Record<string, string>;

/**
 * Convert snake_case object keys to camelCase
 */
export function toCamelCase<T = any>(obj: Record<string, any>): T {
  if (obj === null || obj === undefined) return obj as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map(item => typeof item === 'object' ? toCamelCase(item) : item) as T;
  }
  if (typeof obj !== 'object') return obj as unknown as T;

  const converted: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Use explicit mapping first, then fallback to auto-conversion
    const camelKey = COMMON_FIELD_MAPPINGS[key as keyof typeof COMMON_FIELD_MAPPINGS] ||
                     key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());

    // Recursively convert nested objects and arrays
    if (value && typeof value === 'object') {
      converted[camelKey] = toCamelCase(value);
    } else {
      converted[camelKey] = value;
    }
  }

  return converted as unknown as T;
}

/**
 * Convert camelCase object keys to snake_case
 */
export function toSnakeCase<T = any>(obj: Record<string, any>): T {
  if (obj === null || obj === undefined) return obj as unknown as T;
  if (Array.isArray(obj)) {
    return obj.map(item => typeof item === 'object' ? toSnakeCase(item) : item) as T;
  }
  if (typeof obj !== 'object') return obj as unknown as T;

  const converted: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Use explicit reverse mapping first, then fallback to auto-conversion
    const snakeKey = REVERSE_FIELD_MAPPINGS[key] ||
                     key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);

    // Recursively convert nested objects and arrays
    if (value && typeof value === 'object') {
      converted[snakeKey] = toSnakeCase(value);
    } else {
      converted[snakeKey] = value;
    }
  }

  return converted as unknown as T;
}

/**
 * Database-safe query helper - converts camelCase input to snake_case for SQL
 */
export function dbQuery<T>(camelCaseData: Record<string, any>): T {
  return toSnakeCase(camelCaseData);
}

/**
 * Frontend-safe response helper - converts snake_case DB results to camelCase
 */
export function apiResponse<T>(snakeCaseData: Record<string, any> | Record<string, any>[]): T {
  return toCamelCase(snakeCaseData);
}

/**
 * Type-safe user transformer specifically for common User operations
 */
export interface DatabaseUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  hashed_password?: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  avatar_url?: string;
  [key: string]: any;
}

export interface FrontendUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  hashedPassword?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  avatarUrl?: string;
  [key: string]: any;
}

export function transformUserForFrontend(dbUser: DatabaseUser): FrontendUser {
  return toCamelCase<FrontendUser>(dbUser);
}

export function transformUserForDatabase(frontendUser: Partial<FrontendUser>): Partial<DatabaseUser> {
  return toSnakeCase<Partial<DatabaseUser>>(frontendUser);
}

/**
 * Drizzle ORM integration helpers
 */
export function drizzleSelect<T>(camelCaseFields: string[]): Record<string, boolean> {
  const snakeFields: Record<string, boolean> = {};
  camelCaseFields.forEach(field => {
    const snakeField = REVERSE_FIELD_MAPPINGS[field] ||
                       field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    snakeFields[snakeField] = true;
  });
  return snakeFields;
}

/**
 * Batch transformation for arrays
 */
export function transformArray<T>(
  items: Record<string, any>[],
  transformer: (item: Record<string, any>) => T
): T[] {
  return items.map(transformer);
}