// POI Types - Comprehensive Person of Interest Schema
export interface PersonOfInterest {
  id: string;
  caseId?: string | null; // Links to cases table
  createdBy?: string | null; // Links to users table
  name: string;
  aliases: string[];
  threatLevel: "low" | "medium" | "high" | "critical";
  status: "surveillance" | "wanted" | "active" | "cleared";
  description: string;
  lastSeen: string | null;
  lastLocation: string | null;
  cases: string[];
  // Multiple photos with forensic metadata
  photos: PersonPhoto[];
  // Legacy single photo URL for backward compatibility
  photoUrl: string | null;
  ai: PersonAIAnalysis | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonPhoto {
  id: string;
  url: string;
  filename: string;
  uploadedAt: string;
  metadata: PhotoMetadata;
  ai: PhotoAIAnalysis;
}

export interface PhotoMetadata {
  exif?: Record<string, any>;
  gps?: { lat: number; lng: number };
  timestamp?: string;
  deviceModel?: string;
  resolution?: { width: number; height: number };
}

export interface PhotoAIAnalysis {
  faceEmbedding?: number[]; // Face recognition vector (pgvector)
  quality: number; // Photo quality score 0-100
  landmarks?: number[][]; // Facial landmarks coordinates
}

export interface PersonAIAnalysis {
  riskScore: number; // 0-100 risk assessment
  patterns: string[]; // Detected behavioral patterns
  recommendations: string[]; // AI-generated recommendations
  lastUpdated: string;
}

// Threat level enum for consistency
export type ThreatLevel = "low" | "medium" | "high" | "critical";

// Status enum for consistency
export type PersonStatus = "surveillance" | "wanted" | "active" | "cleared";

// Photo upload interface for forms
export interface PhotoUploadData {
  file: File;
  metadata?: Partial<PhotoMetadata>;
}

// POI creation/update interfaces
export interface CreatePersonOfInterest {
  name: string;
  aliases?: string[];
  threatLevel?: ThreatLevel;
  status?: PersonStatus;
  description?: string;
  lastSeen?: string | null;
  lastLocation?: string | null;
  cases?: string[];
  photoUrl?: string | null;
}

export interface UpdatePersonOfInterest extends Partial<CreatePersonOfInterest> {
  id: string;
  photos?: PersonPhoto[];
  ai?: PersonAIAnalysis;
}