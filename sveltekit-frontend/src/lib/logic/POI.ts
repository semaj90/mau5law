
import { writable, type Writable } from "svelte/store";

// Interface for the structured profile data (Who, What, Why, How)
export interface POIProfile {
  who: string; // Biography, background, identity
  what: string; // Known involvement, actions, evidence
  why: string; // Motivations, connections, reasons
  how: string; // Methods, capabilities, resources
}
export interface POIData {
  id: string;
  caseId: string;
  name: string;
  aliases: string[];
  profileImageUrl?: string;
  profileData: POIProfile;
  posX: number;
  posY: number;
  relationship?: string; // 'suspect', 'witness', 'victim', 'co-conspirator'
  threatLevel: string;
  status: string;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
export class POI {
  id: string;
  caseId: string;
  name: Writable<string>;
  aliases: Writable<string[]>;
  profileImageUrl: Writable<string | undefined>;
  profileData: Writable<POIProfile>;
  posX: Writable<number>;
  posY: Writable<number>;
  relationship: Writable<string | undefined>;
  threatLevel: Writable<string>;
  status: Writable<string>;
  tags: Writable<string[]>;
  isDirty: boolean = false;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: POIData) {
    this.id = data.id;
    this.caseId = data.caseId;
    this.name = writable(data.name);
    this.aliases = writable(data.aliases || []);
    this.profileImageUrl = writable(data.profileImageUrl);
    this.profileData = writable(data.profileData);
    this.posX = writable(data.posX);
    this.posY = writable(data.posY);
    this.relationship = writable(data.relationship);
    this.threatLevel = writable(data.threatLevel);
    this.status = writable(data.status);
    this.tags = writable(data.tags || []);
    this.createdBy = data.createdBy;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
  // Method to update the profile from a form
  updateProfile(newData: Partial<POIProfile>) {
    this.profileData.update((p) => ({ ...p, ...newData }));
    this.isDirty = true;
  }
  // Method to update position when dragged
  updatePosition(newX: number, newY: number) {
    this.posX.set(newX);
    this.posY.set(newY);
    this.isDirty = true;
  }
  // Method to update basic info
  updateInfo(updates: {
    name?: string;
    aliases?: string[];
    profileImageUrl?: string;
    relationship?: string;
    threatLevel?: string;
    status?: string;
    tags?: string[];
  }) {
    if (updates.name !== undefined) this.name.set(updates.name);
    if (updates.aliases !== undefined) this.aliases.set(updates.aliases);
    if (updates.profileImageUrl !== undefined)
      this.profileImageUrl.set(updates.profileImageUrl);
    if (updates.relationship !== undefined)
      this.relationship.set(updates.relationship);
    if (updates.threatLevel !== undefined)
      this.threatLevel.set(updates.threatLevel);
    if (updates.status !== undefined) this.status.set(updates.status);
    if (updates.tags !== undefined) this.tags.set(updates.tags);
    this.isDirty = true;
  }
  // Get plain data for API calls
  toPlainObject(): POIData {
    return {
      id: this.id,
      caseId: this.caseId,
      name: this.getValueFromStore(this.name),
      aliases: this.getValueFromStore(this.aliases),
      profileImageUrl: this.getValueFromStore(this.profileImageUrl),
      profileData: this.getValueFromStore(this.profileData),
      posX: this.getValueFromStore(this.posX),
      posY: this.getValueFromStore(this.posY),
      relationship: this.getValueFromStore(this.relationship),
      threatLevel: this.getValueFromStore(this.threatLevel),
      status: this.getValueFromStore(this.status),
      tags: this.getValueFromStore(this.tags),
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    };
  }
  // Helper to get current value from writable store
  private getValueFromStore<T>(store: Writable<T>): T {
    let value: T;
    store.subscribe((v) => (value = v))();
    return value!;
  }
  // Reset dirty flag after successful save
  markClean() {
    this.isDirty = false;
  }
}
