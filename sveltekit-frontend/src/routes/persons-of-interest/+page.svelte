<script lang="ts">
	import PersonHeader from '$lib/components/PersonHeader.svelte';
	import PersonList from '$lib/components/PersonList.svelte';
	import PersonProfile from '$lib/components/PersonProfile.svelte';
	import PersonStatsPanel from '$lib/components/PersonStatsPanel.svelte';
	import type { APIPerson, FugitiveDexPerson } from '$lib/components/types';

	// Reactive state with Svelte 5 runes
	let persons = $state <FugitiveDexPerson[]>([
		{
			id: '001',
			name: 'John, "The Ghost" Doe',
			alias: 'The Ghost',
			role: 'Fugitive',
			status: 'WANTED',
			priority: 'HIGH',
			height: '185 cm',
			age: 45,
			hair: 'Brown',
			eyes: 'Blue',
			modusOperandi: 'Break and Enter Specialist',
			lastSeen: '2 days ago',
			dangerLevel: 8.5,
			photo: '/placeholder-person.jpg',
			knownAssociates: [
				'Phantom - Burglar, former accomplice',
				'Arsiguent - Known to hire billers',
				'Connection between prison and family',
				'Connections - Langue seed gets an evil waaah'
			],
			knownHabits: [
				'Prefers dark locations',
				'Known Habits',
				'Evade a scene has kinder Sleeps'
			],
			attributes: { stealth: 95, intelligence: 80, strength: 70, speed: 85, dangerousness: 90 }
		},
		{
			id: '002',
			name: 'Maria, "The Shadow" Smith',
			alias: 'The Shadow',
			role: 'Suspect',
			status: 'MONITORING',
			priority: 'MEDIUM',
			height: '165 cm',
			age: 32,
			hair: 'Black',
			eyes: 'Green',
			modusOperandi: 'Financial Fraud Expert',
			lastSeen: '1 week ago',
			dangerLevel: 6.5,
			photo: '/placeholder-person.jpg',
			knownAssociates: [
				'Various financial contacts',
				'Underground banking network'
			],
			knownHabits: [
				'Frequents high-end establishments',
				'Uses multiple identities'
			],
			attributes: { stealth: 75, intelligence: 95, strength: 45, speed: 60, dangerousness: 65 }
		},
		{
			id: '003',
			name: 'Victor, "Red Baron" Kane',
			alias: 'Red Baron',
			role: 'Informant',
			status: 'COOPERATIVE',
			priority: 'LOW',
			height: '175 cm',
			age: 38,
			hair: 'Red',
			eyes: 'Hazel',
			modusOperandi: 'Information Broker',
			lastSeen: '3 hours ago',
			dangerLevel: 3.0,
			photo: '/placeholder-person.jpg',
			knownAssociates: [
				'Multiple law enforcement contacts',
				'Various criminal networks'
			],
			knownHabits: [
				'Meets at specific locations',
				'Always demands payment upfront'
			],
			attributes: { stealth: 60, intelligence: 85, strength: 55, speed: 70, dangerousness: 30 }
		}
	]);

	let selectedPerson = $state <FugitiveDexPerson | null>(null);
	let searchQuery = $state <string>('');

	// Initialize selected person with $effect $effect (() => {
		if (persons.length > 0 && selectedPerson === null) {
			selectedPerson = persons[0];
		}
	});

	// Function to load POIs from API
	async function loadPersonsFromAPI(): Promise<void> {
		try {
			const response = await fetch('/api/persons-of-interest');
			if (response.ok) {
				const result = await response.json();
				const apiPersons: APIPerson[] = result.success ? result.data : [];
				// Transform API data to FugitiveDex format
				const transformedPersons: FugitiveDexPerson[] = apiPersons.map((person: APIPerson, index: number) => ({
					id: (index + 1).toString().padStart(3, '0'),
					name: person.name,
					alias: (person.aliases && person.aliases.length > 0) ? person.aliases[0] : (person.name ? person.name.split(' ')[0] : 'Unknown'),
					role: person.profileData?.role || 'Unknown',
					status: person.status?.toUpperCase() || 'UNKNOWN',
					priority: typeof person.threatLevel === 'string' ? person.threatLevel.toUpperCase() : 'LOW',
					height: person.profileData?.height || 'Unknown',
					age: person.profileData?.age ?? 'Unknown',
					hair: person.profileData?.hair || 'Unknown',
					eyes: person.profileData?.eyes || 'Unknown',
					modusOperandi: person.profileData?.what || 'Unknown',
					lastSeen: person.profileData?.lastKnownLocation || 'Unknown',
					dangerLevel: person.profileData?.dangerLevel ?? (person.threatLevel === 'high' ? 7.5 : person.threatLevel === 'medium' ? 5.0 : 2.0),
					photo: '/placeholder-person.jpg',
					knownAssociates: person.profileData?.associates || ['No known associates'],
					knownHabits: person.profileData?.habits || ['No known habits'],
					attributes: {
						stealth: Math.floor(Math.random() * 100),
						intelligence: Math.floor(Math.random() * 100),
						strength: Math.floor(Math.random() * 100),
						speed: Math.floor(Math.random() * 100),
						dangerousness: (typeof person.profileData?.dangerLevel === 'number') ? Math.floor(person.profileData.dangerLevel * 10) : (person.threatLevel === 'high' ? 75 : person.threatLevel === 'medium' ? 50 : 25)
					}
				}));
				if (transformedPersons.length > 0) {
					persons = transformedPersons;
					selectedPerson = transformedPersons[0];
				}
			}
		} catch (error) {
			console.error('Failed to load persons from API:', error);
			// Keep using demo data as fallback
		}
	}

	// Load data on mount
	$effect (() => {
		loadPersonsFromAPI();
	});

	function handlePersonSelect(person: FugitiveDexPerson) {
		selectedPerson = person;
	}

	function handleOpenAIModal(person: FugitiveDexPerson) {
		// TODO: Implement AI modal
		console.log('Open AI modal for:', person.name);
	}
</script>

<main class="fugitive-dex min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-6">
	<!-- Header -->
	<PersonHeader />

	<!-- Main Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-[320px_1fr_320px] gap-6 mt-6">
		<!-- Left Sidebar - Person List -->
		<PersonList
			{persons}
			{selectedPerson}
			bind:searchQuery
			onSelect={handlePersonSelect}
		/>

		<!-- Main Person Detail -->
		<PersonProfile
			{selectedPerson}
			onOpenAIModal={handleOpenAIModal}
		/>

		<!-- Right Stats Panel -->
		<PersonStatsPanel {selectedPerson} />
	</div>
</main>

<style>
	.fugitive-dex::before {
		content: '';
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background:
			linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px),
			linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px);
		background-size: 20px 20px;
		pointer-events: none;
		z-index: -1;
	}
</style>


