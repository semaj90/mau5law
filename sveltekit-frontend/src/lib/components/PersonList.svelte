<script lang="ts">
	import type { Button  } from 'bits-ui/components/ui/button';
	import type { FugitiveDexPerson } from './types';

	interface Props {
		persons: FugitiveDexPerson[];
		selectedPerson: FugitiveDexPerson | null;
		searchQuery: string;
		onSelect: (person: FugitiveDexPerson) => void;
	}

	let { persons, selectedPerson, searchQuery, onSelect }: Props = $props();
</script>

<div class="nes-container with-title bg-gray-900 text-white rounded-xl">
	<p class="title text-amber-300">Persons of Interest</p>

	<div class="space-y-4">
		<!-- Search Input using Bits-UI -->
		<input
			type="text"
			placeholder="SEARCH PERSONS..."
			class="nes-input w-full"
			bind:value={searchQuery}
		/>

		<!-- Person Matches Count -->
		<div class="person-matches">
			<p class="text-xs opacity-60">{persons.length} MATCHES FOUND</p>
		</div>

		<!-- Person Entries -->
		<div class="person-entries max-h-96 overflow-y-auto">
			{#each persons.filter(p =>
				p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				p.alias.toLowerCase().includes(searchQuery.toLowerCase())
			) as person}
				<Button
					class="person-entry {selectedPerson?.id === person.id ? 'selected' : ''} w-full p-3 bg-gray-800 hover:bg-gray-700 transition rounded flex items-center gap-3 cursor-pointer border border-gray-600"
					onclick={() => onSelect(person)}
				>
					<img src={person.photo || '/placeholder-person.jpg'} alt="" class="w-14 h-14 rounded shadow" />
					<div class="text-left">
						<p class="text-white font-bold text-sm">{person.name}</p>
						<p class="text-xs opacity-60">{person.alias}</p>
					</div>
				</Button>
			{/each}
		</div>

		<!-- Filter Section -->
		<div class="filter-section">
			<h4 class="text-amber-300 text-sm mb-2">FILTERS</h4>
			<div class="filter-group">
				<label class="text-xs opacity-70 block mb-1">STATUS</label>
				<div class="flex gap-1 flex-wrap">
					<Button class="nes-btn is-primary text-xs">ALL</Button>
					<Button class="nes-btn text-xs">WANTED</Button>
					<Button class="nes-btn text-xs">MONITORING</Button>
					<Button class="nes-btn text-xs">COOPERATIVE</Button>
				</div>
			</div>
			<div class="filter-group mt-3">
				<label class="text-xs opacity-70 block mb-1">PRIORITY</label>
				<div class="flex gap-1 flex-wrap">
					<Button class="nes-btn is-primary text-xs">ALL</Button>
					<Button class="nes-btn text-xs">HIGH</Button>
					<Button class="nes-btn text-xs">MEDIUM</Button>
					<Button class="nes-btn text-xs">LOW</Button>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.person-entry.selected {
		@apply bg-green-900 border-green-400;
		box-shadow: 0 0 10px rgba(34, 197, 94, 0.3);
	}
</style>