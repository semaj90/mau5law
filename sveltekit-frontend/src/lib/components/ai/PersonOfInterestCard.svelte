<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script context="module" lang="ts">
  // Svelte 5 runes are auto-imported

  export type Role = 'suspect' | 'witness' | 'victim' | 'associate' | 'unknown';

  export interface PersonDetails {
    age?: number;
    address?: string;
    phone?: string;
    occupation?: string;
    aliases?: string[];
  }

  export interface Person {
    name: string;
    role: Role;
    details?: PersonDetails;
    confidence: number;
    sourceContext?: string;
  }

  export interface Relationship {
    person1: string;
    person2: string;
    relationship?: string;
    confidence: number;
    context?: string;
  }
</script>

<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import { Badge } from '$lib/components/ui/badge';

  // Exposed props (use standard Svelte exports)
  export let person: Person = {
    name: 'Unknown',
    role: 'unknown',
    confidence: 0
  };

  export let relationships: Relationship[] = [];

  // Filter relationships for this person
  const personRelationships = $derived(relationships.filter(
    (rel) => rel.person1 === person.name || rel.person2 === person.name
  ));

  // Role styling
  const roleConfig = {
    suspect: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: '🚨',
      label: 'Suspect'
    },
    witness: {
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: '👁️',
      label: 'Witness'
    },
    victim: {
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: '💔',
      label: 'Victim'
    },
    associate: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: '🤝',
      label: 'Associate'
    },
    unknown: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: '❓',
      label: 'Unknown Role'
    }
  } as const;
  const roleInfo = $derived(roleConfig[person.role] ?? roleConfig.unknown);

  // Confidence level styling
  const confidenceColor = $derived(person.confidence > 0.8 ? 'text-green-600' : person.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600');
  const barColor = $derived(person.confidence > 0.8 ? 'bg-green-500' : person.confidence > 0.6 ? 'bg-yellow-500' : 'bg-red-500');

  let showFullDetails = false;
</script>

<div class="w-full max-w-md hover:shadow-lg transition-shadow nes-container">
  <div class="yorha-panel-header pb-3">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 bg-gray-200 flex items-center justify-center text-lg rounded-full">
          {roleInfo.icon}
        </div>
        <div>
          <h3 class="nes-text is-primary text-lg font-semibold">{person.name}</h3>
          <Badge class={"mt-1 text-xs " + roleInfo.color}>
            {roleInfo.label}
          </Badge>
        </div>
      </div>

      <!-- Confidence Indicator -->
      <div class="text-right">
        <div class="text-xs text-gray-500 mb-1">Confidence</div>
        <div class={"text-sm font-medium " + confidenceColor}>
          {Math.round(person.confidence * 100)}%
        </div>
        <div class="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
          <div
            class={"h-1.5 rounded-full " + barColor}
            style="width: {person.confidence * 100}%"
          ></div>
        </div>
      </div>
    </div>
  </div>

  <div class="yorha-panel-content space-y-4">
    <!-- Basic Details -->
    {#if person.details}
      <div>
        <h4 class="font-medium text-sm text-gray-700 mb-2">Details</h4>
        <div class="grid grid-cols-2 gap-2 text-sm">
          {#if person.details.age}
            <div>
              <span class="text-gray-500">Age:</span>
              <span class="ml-1 font-medium">{person.details.age}</span>
            </div>
          {/if}

          {#if person.details.occupation}
            <div class="col-span-2">
              <span class="text-gray-500">Occupation:</span>
              <span class="ml-1 font-medium">{person.details.occupation}</span>
            </div>
          {/if}

          {#if person.details.phone}
            <div class="col-span-2">
              <span class="text-gray-500">Phone:</span>
              <span class="ml-1 font-mono text-sm">{person.details.phone}</span>
            </div>
          {/if}

          {#if person.details.address && showFullDetails}
            <div class="col-span-2">
              <span class="text-gray-500">Address:</span>
              <span class="ml-1">{person.details.address}</span>
            </div>
          {/if}

          {#if person.details.aliases && person.details.aliases.length > 0}
            <div class="col-span-2">
              <span class="text-gray-500">Aliases:</span>
              <div class="mt-1 flex flex-wrap gap-1">
                {#each person.details.aliases as alias}
                  <span class="px-2 py-1 rounded text-xs font-medium border border-gray-300 text-gray-700">{alias}</span>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Source Context -->
    {#if person.sourceContext}
      <div>
        <h4 class="font-medium text-sm text-gray-700 mb-2">Context</h4>
        <p class="text-sm text-gray-600 bg-gray-50 p-2 rounded border-l-2 border-blue-300">
          {person.sourceContext}
        </p>
      </div>
    {/if}

    <!-- Relationships -->
    {#if personRelationships.length > 0}
      <div>
        <h4 class="font-medium text-sm text-gray-700 mb-2">
          Relationships ({personRelationships.length})
        </h4>
        <div class="space-y-2 max-h-32 overflow-y-auto">
          {#each personRelationships.slice(0, showFullDetails ? undefined : 2) as rel}
            {@const otherPerson = rel.person1 === person.name ? rel.person2 : rel.person1}
            <div class="text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-300">
              <div class="flex items-center justify-between">
                <div>
                  <span class="font-medium">{otherPerson}</span>
                  <span class="text-blue-600 mx-1">
                    ({rel.relationship?.replace('_', ' ')})
                  </span>
                </div>
                <span class="text-gray-500">{Math.round(rel.confidence * 100)}%</span>
              </div>
              {#if rel.context && showFullDetails}
                <p class="text-gray-600 mt-1">{rel.context}</p>
              {/if}
            </div>
          {/each}

          {#if !showFullDetails && personRelationships.length > 2}
            <div class="text-xs text-gray-500 text-center py-1">
              +{personRelationships.length - 2} more relationships
            </div>
          {/if}
        </div>
      </div>
    {/if}
    <!-- Action Buttons -->
    <div class="flex gap-2 pt-3 border-t">
      <button
        class="flex-1 text-xs bits-btn bits-btn border border-gray-300 rounded px-2 py-1 bg-white"
        on:click={() => (showFullDetails = !showFullDetails)}
        type="button"
      >
        {showFullDetails ? 'Less' : 'More'} Info
      </button>

      <button
        class="flex-1 text-xs bits-btn bits-btn border border-gray-300 rounded px-2 py-1 bg-white"
        type="button"
      >
        🕸️ Graph View
      </button>

      {#if person.role === 'suspect'}
        <button type="button" class="flex-1 text-xs bits-btn bits-btn border border-gray-300 rounded px-2 py-1 bg-white">
          📋 Profile
        </button>
      {:else if person.role === 'witness'}
        <button type="button" class="flex-1 text-xs bits-btn bits-btn border border-gray-300 rounded px-2 py-1 bg-white">
          📞 Contact
        </button>
      {/if}
    </div>
    </div>
  </div>
</div>

<style>
  .max-h-32 {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
  }

  .max-h-32::-webkit-scrollbar {
    width: 4px;
  }

  .max-h-32::-webkit-scrollbar-track {
    background: #f7fafc;
  }

  .max-h-32::-webkit-scrollbar-thumb {
    background-color: #cbd5e0;
    border-radius: 2px;
  }
</style>
