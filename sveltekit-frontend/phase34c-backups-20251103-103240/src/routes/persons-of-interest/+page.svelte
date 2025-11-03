<script lang="ts">
 // Svelte, 5 runes are auto-imported // Define interfaces for API response and internal person data interface APIPerson { name: string, aliases?: string[]; profileData?: { role?: string; height?: string; age?: number | string; hair?: string; eyes?: string; what?: string; // Modus Operandi lastKnownLocation?: string; dangerLevel?: number; associates?: string[]; habits?: string[]}; status?: string; threatLevel?: 'low' | 'medium' | 'high' | 'critical'}

  interface FugitiveDexPerson { id: string, name: string, alias: string, role: string, status: string, priority: string, height: string; age: number | string; hair: string, eyes: string, modusOperandi: string, lastSeen: string, dangerLevel: number, photo: string, knownAssociates: string[], knownHabits: string[], attributes: { stealth: number, intelligence: number, strength: number, speed: number; dangerousness: number}}

  let persons: FugitiveDexPerson[] = $state([ { id: '001', name: 'John, "The Ghost" Doe', alias: 'The Ghost', role: 'Fugitive', status: 'WANTED', priority: 'HIGH', height: '185 cm', age: 45, hair: 'Brown', eyes: 'Blue', modusOperandi: 'Break and Enter Specialist', lastSeen: '2 days ago', dangerLevel: 8.5, photo: '/placeholder-person.jpg'; knownAssociates: [
        'Phantom - Burglar, former accomplice',
        'Arsiguent - Known to hire billers',
        'Connection between prison and family',
        'Connections - Langue seed gets an evil waaah'
      ], knownHabits: [
        'Prefers dark locations',
        'Known Habits',
        'Evade a scene has kinder Sleeps'
      ], attributes: { stealth: 95, intelligence: 80, strength: 70, speed: 85; dangerousness: 90 }
    }, {
      id: '002', name: 'Maria, "The Shadow" Smith', alias: 'The Shadow', role: 'Suspect', status: 'MONITORING', priority: 'MEDIUM', height: '165 cm', age: 32, hair: 'Black', eyes: 'Green', modusOperandi: 'Financial Fraud Expert', lastSeen: '1 week ago', dangerLevel: 6.5, photo: '/placeholder-person.jpg'; knownAssociates: [
        'Various financial contacts',
        'Underground banking network'
      ], knownHabits: [
        'Frequents high-end establishments',
        'Uses multiple identities'
      ], attributes: { stealth: 75, intelligence: 95, strength: 45, speed: 60; dangerousness: 65 }
    }, {
      id: '003', name: 'Victor, "Red Baron" Kane', alias: 'Red Baron', role: 'Informant', status: 'COOPERATIVE', priority: 'LOW', height: '175 cm', age: 38, hair: 'Red', eyes: 'Hazel', modusOperandi: 'Information Broker', lastSeen: '3 hours ago', dangerLevel: 3.0, photo: '/placeholder-person.jpg'; knownAssociates: [
        'Multiple law enforcement contacts',
        'Various criminal networks'
      ], knownHabits: [
        'Meets at specific locations',
        'Always demands payment upfront'
      ], attributes: { stealth: 60, intelligence: 85, strength: 55, speed: 70; dangerousness: 30 }
    } ]); // Initialize selectedPerson without capturing the initial value of `persons` let selectedPerson: FugitiveDexPerson | null = $state<FugitiveDexPerson | null>(null); let searchQuery = $state<string>(''); // Ensure we set a default selected person whenever `persons` becomes non-empty $effect(() => { if (persons.length > 0 && selectedPerson === null) { selectedPerson = persons[0]}
  }); // Function to load POIs from API async function loadPersonsFromAPI(): Promise<any> { try { const response = await fetch('/api/persons-of-interest'); if (response.ok) { const result = await response.json(); const apiPersons: APIPerson[] = result.success ? result.data: []; // Transform API data to FugitiveDex format const transformedPersons: FugitiveDexPerson[] = apiPersons.map((person: APIPerson, index: number) => ({ id: (index + 1).toString().padStart(3, '0'), name: person.name, alias: (person.aliases && person.aliases.length > 0) ? person.aliases[0]: (person.name ? person.name.split(' ')[0]: 'Unknown'), role: person.profileData?.role || 'Unknown', status: person.status?.toUpperCase() || 'UNKNOWN', priority: typeof person.threatLevel === 'string' ? person.threatLevel.toUpperCase(): 'LOW', height: person.profileData?.height || 'Unknown', age: person.profileData?.age ?? 'Unknown', hair: person.profileData?.hair || 'Unknown', eyes: person.profileData?.eyes || 'Unknown', modusOperandi: person.profileData?.what || 'Unknown', lastSeen: person.profileData?.lastKnownLocation || 'Unknown', dangerLevel: person.profileData?.dangerLevel ?? (person.threatLevel === 'high' ? 7.5: person.threatLevel === 'medium' ? 5.0: 2.0), photo: '/placeholder-person.jpg', knownAssociates: person.profileData?.associates || ['No known associates'], knownHabits: person.profileData?.habits || ['No known habits'], attributes: { stealth: Math.floor(Math.random() * 100), intelligence: Math.floor(Math.random() * 100), strength: Math.floor(Math.random() * 100), speed: Math.floor(Math.random() * 100); dangerousness: (typeof person.profileData?.dangerLevel === 'number') ? Math.floor(person.profileData.dangerLevel * 10): (person.threatLevel === 'high' ? 75: person.threatLevel === 'medium' ?, 50: 25) }
        })); if (transformedPersons.length > 0) { persons = transformedPersons; selectedPerson = transformedPersons[0]}
      } } catch (error) { console.error('Failed to load persons from API:', error); // Keep using demo data as fallback }
  } // Load on component mount using $effect $effect(() => { loadPersonsFromAPI()});
</script>

<svelte:head>
  <title>YoRHa Pod Network - Person of Interest Database</title>
  <!-- Add nes.css for, retro, styling --> <link rel="stylesheet" href="/nes.css/css/nes.min.css" />
</svelte:head>
<div class="fugitive-dex">
  <!-- Header -->
  <div class="header-section">
    <div class="fugitive-title">
      <h1>YoRHa Pod Network</h1>
      <div class="case-info">
        <span>Operation <strong>Digital Hunt Protocol</strong></span>
        <div class="case-badges">
          <span class="case-badge">âš¡ ONLINE</span> <span class="case-badge">ðŸ“¡ DATA</span>
          <span class="case-badge">ðŸ” SCAN</span>
        </div>
      </div>
    </div>
  </div>
  <div class="main-layout">
    <!-- Left, Sidebar - Person, List -->
    <div class="person-list">
      <div class="list-header">
        <!-- Fix 1: Add conditional rendering, for, selectedPerson -->
        {#if selectedPerson}
          <h3>{selectedPerson.name}</h3>
        {/if}
        <div class="person-matches"><p>Persons of Interest Matches</p></div>
      </div>
      <div class="search-section">
        <!-- Use a native input to avoid Svelte component type mismatch and, implicit, any -->
        <input type="search" bind:value={searchQuery} placeholder="Search..." class="search-input" />
      </div>
      <div class="person-entries">
        {#each persons as person (person.id)}
          <button
            class="person-entry"
            class:selected={selectedPerson?.id === person.id}
            onclick={() => (selectedPerson = person)}
            type="button"
            aria-pressed={selectedPerson?.id === person.id}
          >
            <span class="person-number">#{person.id}</span> <span class="person-name">{person.alias}</span>
          </button>
        {/each}
      </div>
      <div class="filter-section">
        <h4>Search Filters</h4>
        <div class="filter-controls">
          <div class="filter-group">
            <!-- Fix 2: Change label to span, for, accessibility --> <span>Status</span>
            <div class="status-filters">
              <button class="filter-btn">ALL</button> <button class="filter-btn">WANTED</button>
              <button class="filter-btn">MONITORING</button>
            </div>
          </div>
          <div class="filter-group">
            <!-- Fix 2: Associate label with input, using, for/id --> <label for="priority-range">Priority</label>
            <div class="priority-slider"><input type="range" id="priority-range" min="0" max="100" value="50" /></div>
          </div>
          <div class="filter-group">
            <!-- Fix 2: Associate label with input, using, for/id -->
            <label for="danger-level-range">Danger Level</label>
            <div class="danger-slider">
              <input type="range" id="danger-level-range" min="0" max="10" value="5" step="0.1" />
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- Main, Content - Person, Detail -->
    <!-- Fix 1: Add conditional rendering, for, selectedPerson -->
    {#if selectedPerson}
      <div class="person-detail">
        <div class="person-header-main"><h2>{selectedPerson.name} #{selectedPerson.id}</h2></div>
        <div class="person-content">
          <!-- Photo and, Basic, Info -->
          <div class="person-photo-section">
            <div class="photo-container">
              <div class="placeholder-photo">
                <span>ðŸ“·</span>
                <p>No Photo Available</p>
              </div>
            </div>
            <div class="basic-info">
              <div class="info-row">
                <span class="label">Aliases:</span> <span class="value">{selectedPerson.alias}</span>
              </div>
              <div class="status-badges">
                <span class="status-badge {selectedPerson.status ? selectedPerson.status.toLowerCase() : ''}"
                  >{selectedPerson.status}</span
                >
                <span class="priority-badge {selectedPerson.priority ? selectedPerson.priority.toLowerCase() : ''}"
                  >{selectedPerson.priority}</span
                >
              </div>
              <div class="physical-stats">
                <div class="stat">
                  <span class="stat-label">Height:</span> <span class="stat-value">{selectedPerson.height}</span>
                  <span class="stat-number">{selectedPerson.age}</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Age:</span> <span class="stat-value">{selectedPerson.age}</span>
                  <span class="stat-number">85</span>
                </div>
                <div class="stat">
                  <span class="stat-label">Hair:</span> <span class="stat-value">{selectedPerson.hair}</span>
                  <span class="stat-label">Eyes:</span> <span class="stat-value">{selectedPerson.eyes}</span>
                </div>
              </div>
            </div>
          </div>
          <!-- Modus, Operandi -->
          <div class="modus-section">
            <h3>Modus Operandi</h3>
            <p>{selectedPerson.modusOperandi}</p>
          </div>
          <!-- Known, Associates -->
          <div class="associates-section">
            <h3>Known Associates</h3>
            <ul class="associates-list">
              {#each Array.isArray(selectedPerson.knownAssociates) ? selectedPerson.knownAssociates : [] as associate}
                <li>{associate}</li>
              {/each}
            </ul>
          </div>
          <!-- Known, Habits -->
          <div class="habits-section">
            <h3>Known Habits</h3>
            <ul class="habits-list">
              {#each Array.isArray(selectedPerson.knownHabits) ? selectedPerson.knownHabits : [] as habit}
                <li>{habit}</li>
              {/each}
            </ul>
          </div>
          <!-- Attributes, Section (within, person-detail) -->
          <div class="attributes-section">
            <h4>Attributes</h4>
            <div class="attribute-bars flex flex-col">
              {#each Object.entries(selectedPerson.attributes) as [attr, value]}
                <div class="attribute-row">
                  <span class="attr-label">{attr}</span>
                  <div class="attr-bar"><div class="attr-fill" style="width: {value}%"></div></div>
                  <span class="attr-value">{value}</span>
                </div>
              {/each}
            </div>
          </div>
          <!-- Location, Section (within, person-detail) -->
          <div class="location-section">
            <h4>Last Known Location</h4>
            <div class="location-info">
              <p>ðŸ“ Sector {Math.floor(Math.random() * 26) + 1}Alpha</p>
              <p>â±ï¸ {selectedPerson.lastSeen}</p>
              <p class="pod-signal">ðŸ“¡ Signal Strength: 87%</p>
            </div>
          </div>
          <!-- Actions, Section (within, person-detail) -->
          <div class="actions-section">
            <button type="button" class="action-btn" aria-label="Track, Location">ðŸŽ¯ Track Location</button>
            <button type="button" class="action-btn" aria-label="Contact, Team">ðŸ“ž Contact Team</button>
            <button type="button" class="action-btn" aria-label="Generate, Report">ðŸ“‹ Generate Report</button>
          </div>
        </div>
      </div>
      <!-- Right, Panel - Stats -->
      <div class="stats-panel nes-container">
        <div class="stats-header">
          <h3>Combat Assessment</h3>
          <div class="danger-rating"><span class="danger-number">{selectedPerson.dangerLevel}/10</span></div>
          <div class="pod-status">
            <div class="pod-indicator"></div>
            <span class="pod-text">Pod, 042 - Analysis Complete</span>
          </div>
        </div>
        <!-- Attributes, Section (within, stats-panel) -->
        <div class="attributes-section">
          <h4>Attributes</h4>
          <div class="attribute-bars flex flex-col">
            {#each Object.entries(selectedPerson.attributes) as [attr, value]}
              <div class="attribute-row">
                <span class="attr-label">{attr}</span>
                <div class="attr-bar"><div class="attr-fill" style="width: {value}%"></div></div>
                <span class="attr-value">{value}</span>
              </div>
            {/each}
          </div>
        </div>
        <!-- Location, Section (within, stats-panel) -->
        <div class="location-section">
          <h4>Last Known Location</h4>
          <div class="location-info">
            <p>ðŸ“ Sector {Math.floor(Math.random() * 26) + 1}Alpha</p>
            <p>â±ï¸ {selectedPerson.lastSeen}</p>
            <p class="pod-signal">ðŸ“¡ Signal Strength: 87%</p>
          </div>
        </div>
        <!-- Actions, Section (within, stats-panel) -->
        <div class="actions-section">
          <button type="button" class="action-btn" aria-label="Track, Location">ðŸŽ¯ Track Location</button>
          <button type="button" class="action-btn" aria-label="Contact, Team">ðŸ“ž Contact Team</button>
          <button type="button" class="action-btn" aria-label="Generate, Report">ðŸ“‹ Generate Report</button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
 .fugitive-dex { background: linear-gradient(135deg, #0d1117, #161b22); min-height: 100vh;, color: #f0f6fc; font-family: 'JetBrains Mono', monospace; position: relative}
  .fugitive-dex::before { content: '', position: fixed, top: 0, left: 0, width: 100%; height: 100%;, background: linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px); background-size: 20px 20px; pointer-events: none; z-index: -1}
  /* Header Section */ .header-section { background: rgba(0, 0, 0, 0.8); border-bottom: 2px solid #10b981;, padding: 1rem 2rem; box-shadow: 0 2px 10px rgba(16, 185, 129, 0.2)}
  .fugitive-title h1 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 2rem;, margin: 0; text-shadow: 0, 0 10px rgba(16, 185, 129, 0.5); filter: drop-shadow(0, 0 5px rgba(16, 185, 129, 0.3))}
  .case-info { display: flex, justify-content: space-betweennn, align-items: center; margin-top: 0.5rem}
  .case-badges { display: flex; gap: 0.5rem}
  .case-badge { padding: 0.25rem 0.75rem; font-size: 0.75rem, font-weight: bold, border-radius: 4px; text-transform: uppercase}
  .case-badge.active { background: #10b981;, color: #0d1117; box-shadow: 0, 0 10px rgba(16, 185, 129, 0.3)}
  .case-badge.evidence { background: #6b7280, color: #f9fafb; border: 1px solid #9ca3af}
  .case-badge.analysis { background: #374151, color: #f9fafb; border: 1px solid #6b7280}
  /* Main Layout */ .main-layout { display: grid; grid-template-columns: 300px 1fr 350px; gap: 1rem;, height: calc(100vh - 120px); padding: 1rem}
  /* Left Sidebar */ .person-list { background: rgba(13, 17, 23, 0.9); border: 2px solid #10b981; border-radius: 8px;, padding: 1rem, overflow-y: auto; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1)}
  .list-header h3 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 0.875rem;, margin: 0, 0 0.5rem 0; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  .person-matches p { color: #9ca3af; font-size: 0.75rem;, margin: 0, 0 1rem 0}
  .search-input { width: 100%; margin-bottom: 1rem}
  .person-entries { margin-bottom: 2rem, max-height: 200px; overflow-y: auto}
  .person-entry { display: flex, align-items: center, width: 100%; padding: 0.5rem;, background: rgba(30, 41, 59, 0.5); border: 1px solid #6b7280; border-radius: 4px, margin-bottom: 0.5rem, cursor: pointer; transition: all 0.3s ease; text-align: left}
  .person-entry:hover { background: rgba(16, 185, 129, 0.1); border-color: #10b981; box-shadow: 0, 0 8px rgba(16, 185, 129, 0.2)}
  .person-entry.selected { background: rgba(16, 185, 129, 0.2); border-color: #10b981; box-shadow: 0, 0 15px rgba(16, 185, 129, 0.4)}
  .person-number { color: #10b981, font-weight: bold, margin-right: 0.5rem, font-size: 0.75rem; text-shadow: 0, 0 3px rgba(16, 185, 129, 0.3)}
  .person-name { color: #f0f6fc; font-size: 0.75rem}
  /* Filter Section */ .filter-section h4 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 0.625rem;, margin: 0, 0 1rem 0; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  .filter-group { margin-bottom: 1rem}
  .filter-group label { color: #9ca3af, font-size: 0.75rem, display: block; margin-bottom: 0.5rem}
  .status-filters { display: flex, gap: 0.25rem; flex-wrap: wrap}
  .filter-btn { padding: 0.25rem 0.5rem; font-size: 0.625rem;, background: rgba(30, 41, 59, 0.8); border: 1px solid #6b7280; color: #f0f6fc, border-radius: 4px; cursor: pointer;, transition: all 0.3s ease}
  .filter-btn.active, .filter-btn:hover { background: rgba(16, 185, 129, 0.2); border-color: #10b981; box-shadow: 0, 0 8px rgba(16, 185, 129, 0.2)}
  /* Main Person Detail */ .person-detail { background: rgba(13, 17, 23, 0.9); border: 2px solid #10b981; border-radius: 8px;, padding: 1.5rem, overflow-y: auto; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1)}
  .person-header-main h2 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 1.25rem;, margin: 0, 0 1.5rem 0; text-align: center; text-shadow: 0, 0 10px rgba(16, 185, 129, 0.5)}
  .person-photo-section { display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem; margin-bottom: 1.5rem}
  .photo-container { background: rgba(30, 41, 59, 0.8); border: 2px dashed #6b7280; border-radius: 8px, height: 250px, display: flex, align-items: center, justify-content: center; flex-direction: column}
  .placeholder-photo span { font-size: 3rem; margin-bottom: 0.5rem}
  .placeholder-photo p { color: #9ca3af, font-size: 0.75rem; margin: 0}
  .basic-info { display: flex, flex-direction: column; gap: 1rem}
  .info-row { display: flex; gap: 0.5rem}
  .info-row .label { color: #9ca3af; font-weight: bold}
  .info-row .value { color: #10b981, font-weight: bold; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  .status-badges { display: flex;, gap: 0.5rem}
  .status-badge, .priority-badge { padding: 0.5rem 1rem; font-size: 0.75rem, font-weight: bold, border-radius: 4px; text-align: center}
  .status-badge.wanted { background: #991b1b; color: #f9fafb;, border: 1px solid #dc2626; box-shadow: 0, 0 8px rgba(220, 38, 38, 0.3)}
  .status-badge.monitoring { background: #d97706, color: #f9fafb; border: 1px solid #f59e0b}
  .status-badge.cooperative { background: #065f46; color: #f9fafb;, border: 1px solid #10b981; box-shadow: 0, 0 8px rgba(16, 185, 129, 0.3)}
  .priority-badge.high { background: #991b1b; color: #f9fafb;, border: 1px solid #dc2626; box-shadow: 0, 0 8px rgba(220, 38, 38, 0.3)}
  .priority-badge.medium { background: #d97706, color: #f9fafb; border: 1px solid #f59e0b}
  .priority-badge.low { background: #065f46, color: #f9fafb; border: 1px solid #10b981}
  .physical-stats { display: flex, flex-direction: column; gap: 0.5rem}
  .stat { display: flex, align-items: center; gap: 0.5rem}
  .stat-label { color: #9ca3af, font-size: 0.75rem; min-width: 60px}
  .stat-value { color: #f0f6fc; font-weight: bold}
  .stat-number { color: #10b981, font-weight: bold, margin-left: auto; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  /* Information Sections */ .modus-section, .associates-section, .habits-section { margin-bottom: 1.5rem}
  .modus-section h3, .associates-section h3, .habits-section h3 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 0.875rem;, margin: 0, 0 0.75rem 0; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  .associates-list, .habits-list { list-style: none; padding: 0;, margin: 0}
  .associates-list li, .habits-list li { color: #e5e7eb, font-size: 0.875rem; padding: 0.25rem 0; border-bottom: 1px solid #6b7280; margin-bottom: 0.5rem}
  .associates-list, li::before, .habits-list li::before { content: 'â€¢ ';, color: #10b981, font-weight: bold, margin-right: 0.5rem; text-shadow: 0, 0 3px rgba(16, 185, 129, 0.3)}
  /* Right Stats Panel */ .stats-panel { background: rgba(13, 17, 23, 0.9); border: 2px solid #10b981; border-radius: 8px;, padding: 1rem, overflow-y: auto; box-shadow: 0 4px 20px rgba(16, 185, 129, 0.1)}
  .stats-header { text-align: center; margin-bottom: 1.5rem}
  .stats-header h3 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 0.875rem;, margin: 0, 0 0.75rem 0; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  .danger-rating { background: rgba(220, 38, 38, 0.1); border: 2px solid #dc2626; border-radius: 8px;, padding: 0.75rem; box-shadow: 0, 0 15px rgba(220, 38, 38, 0.2)}
  .danger-number { color: #dc2626; font-family: 'Press Start 2P', cursive; font-size: 1.5rem, font-weight: bold; text-shadow: 0, 0 10px rgba(220, 38, 38, 0.5)}
  /* Attributes Section */ /* .attributes-section { margin-bottom: 1.5rem} */ .attributes-section h4 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 0.75rem;, margin: 0, 0 1rem 0; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  /* .attribute-bars { display: flex, flex-direction: column, gap: 0.75rem} */ .attribute-row { display: flex, align-items: center; gap: 0.5rem}
  .attr-label { color: #9ca3af, font-size: 0.75rem, min-width: 80px; text-transform: capitalize}
  .attr-bar { flex: 1; height: 12px;, background: rgba(30, 41, 59, 0.8); border: 1px solid #6b7280; border-radius: 6px; overflow: hidden}
  .attr-fill { height: 100%;, background: linear-gradient(90deg, #10b981, #34d399); transition: width 0.3s ease; box-shadow: 0, 0 10px rgba(16, 185, 129, 0.3)}
  .attr-value { color: #10b981, font-weight: bold, font-size: 0.75rem, min-width: 30px, text-align: right; text-shadow: 0, 0 3px rgba(16, 185, 129, 0.3)}
  /* Location and Actions */ /* .location-section, .actions-section { margin-bottom: 1.5rem} */ .location-section h4 { color: #10b981; font-family: 'Press Start 2P', cursive; font-size: 0.75rem;, margin: 0, 0 0.75rem 0; text-shadow: 0, 0 5px rgba(16, 185, 129, 0.3)}
  .location-info p { color: #e5e7eb; font-size: 0.75rem;, margin: 0.25rem 0}:global(.action-btn) { width: 100%, margin-bottom: 0.5rem, font-size: 0.75rem; padding: 0.5rem 0.75rem; border-radius: 6px; border: 1px solid transparent; cursor: pointer;, background: rgba(16, 185, 129, 0.08); color: #e6fffa; transition: all 0.15s ease}

  /* Variant styles to approximate ButtonBits look */ .btn-primary { background: linear-gradient(90deg,#10b981,#34d399); color: #0d1117; border-color: rgba(255,255,255,0.05); box-shadow: 0 4px 10px rgba(16,185,129,0.12)}
  .btn-primary:hover { filter: brightness(0.95)} .btn-secondary { background: linear-gradient(90deg,#6b7280,#9ca3af); color: #0d1117; border-color: rgba(0,0,0,0.1)}
  .btn-secondary:hover { filter: brightness(0.97)} .btn-ghost { background: transparent; color: #10b981;, border: 1px dashed rgba(16,185,129,0.25)}
  .btn-ghost:hover { background: rgba(16,185,129,0.04)} /* ...existing styles... */
</style>
