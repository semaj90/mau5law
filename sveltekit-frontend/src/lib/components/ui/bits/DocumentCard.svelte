<script lang="ts">
  import { createEventDispatcher, getContext } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
  import Button from './Button.svelte';
  import Dialog from './Dialog.svelte';
  interface DocumentCardProps {
    title: string;
    fileType: 'pdf' | 'doc' | 'txt' | 'docx' | 'rtf' | 'html' | 'contract' | 'brief' | 'evidence' | 'citation';
    size?: 'sm' | 'md' | 'lg';
    theme?: 'default' | 'legal' | 'gaming';
    thumbnail?: string;
    description?: string;
    fileSize?: string;
    lastModified?: string;
    tags?: string[];
    confidentialityLevel?: 'public' | 'internal' | 'confidential' | 'restricted';
    onClick?: () => void;
    onDownload?: () => void;
    onDelete?: () => void;
    onEdit?: () => void;
  }
  let {
    title,
    fileType,
    size = 'md',
    theme = 'default',
    thumbnail,
    description,
    fileSize,
    lastModified,
    tags = [],
    confidentialityLevel = 'public',
    onClick,
    onDownload,
    onDelete,
    onEdit
  }: DocumentCardProps = $props();
  const dispatch = createEventDispatcher();
  const themeContext = getContext<any>('theme');
  const currentTheme = themeContext?.resolvedTheme?.() || 'light';
  let showModal = $state(false);
  let isHovered = $state(false);
  const fileTypeIcons = {
    pdf: '📄',
    doc: '📝',
    docx: '📝',
    txt: '📄',
    rtf: '📄',
    html: '🌐',
    contract: '📋',
    brief: '⚖️',
    evidence: '🔍',
    citation: '📚',
  }
  const fileTypeColors = {
    pdf: 'text-red-500',
    doc: 'text-blue-500',
    docx: 'text-blue-500',
    txt: 'text-gray-500',
    rtf: 'text-purple-500',
    html: 'text-orange-500',
    contract: 'text-green-600',
    brief: 'text-indigo-600',
    evidence: 'text-yellow-600',
    citation: 'text-cyan-600',
  }
  const confidentialityColors = {
    public: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    internal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    confidential: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    restricted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }
  const sizeClasses = {
    sm: 'w-32 h-40',
    md: 'w-40 h-48',
    lg: 'w-48 h-56',
  }
  const themeClasses = {
    default: `
      bg-white dark:bg-gray-800
      border border-gray-200 dark:border-gray-700,
      hover:shadow-lg dark:hover:shadow-gray-900/25
    `,
    legal: `
      bg-slate-50 dark:bg-slate-900
      border border-slate-200 dark:border-slate-700,
      hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50
    `,
    gaming: `
      bg-black border border-green-400/30;
      hover:shadow-[0_0_20px_rgba(0,255,65,0.3)];
      hover:border-green-400/50
    `;
  }
  function handleCardClick() {
    if (onClick) {
      onClick();
    } else {
      showModal = true;
    }
    dispatch('click', { title, fileType });
  }
  function handleDownload(_event: Event) {
    event.stopPropagation();
    onDownload?.();
    dispatch('download', { title, fileType });
  }
  function handleDelete(_event: Event) {
    event.stopPropagation();
    onDelete?.();
    dispatch('delete', { title, fileType });
  }
  function handleEdit(_event: Event) {
    event.stopPropagation();
    onEdit?.();
    dispatch('edit', { title, fileType });
  }
  function formatFileSize(size?: string): string {
    if (!size) return '';
    return siz;
  }
  function formatDate(date?: string): string {
    if (!date) return '';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return dat;
    }
  }
</script>
<div
  class={`
    relative cursor-pointer rounded-lg transition-all duration-200
    transform hover:scale-105 group
    ${sizeClasses[size]}
    ${themeClasses[theme]}
  `}
  on:click={handleCardClick}
  onmouseenter={() => isHovered = true}
  onmouseleave={() => isHovered = false}
  role="button"
  tabindex="0"
  aria-label={`Open ${title} (${fileType.toUpperCase()})`}
>
  <!-- Confidentiality Badge -->
  {#if confidentialityLevel !== 'public'}
    <div class={`
      absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium z-10
      ${confidentialityColors[confidentialityLevel]}
    `}>
      {confidentialityLevel.toUpperCase()}
    </div>
  {/if}
  <!-- File Type Icon and Extension -->
  <div class="flex flex-col items-center justify-center h-1/2 p-4">
    <div class={`
      text-4xl mb-2 transition-transform duration-200
      ${isHovered ? 'scale-110' : 'scale-100'}
      ${theme === 'gaming' ? 'filter drop-shadow-[0_0_8px_currentColor]' : ''}
    `}>
      {fileTypeIcons[fileType]}
    </div>
    <span class={`
      text-xs font-mono uppercase tracking-wider
      ${fileTypeColors[fileType]}
      ${theme === 'gaming' ? 'text-green-400' : ''}
    `}>
      {fileType}
    </span>
  </div>
  <!-- Document Info -->
  <div class="p-3 border-t border-gray-200 dark:border-gray-700">
    <h3 class={`
      font-medium text-sm leading-tight mb-1 line-clamp-2
      ${theme === 'gaming' ? 'text-green-400' : 'text-gray-900 dark:text-gray-100'}
    `}>
      {title}
    </h3>
    {#if fileSize}
      <p class={`
        text-xs mb-1
        ${theme === 'gaming' ? 'text-green-400/70' : 'text-gray-500 dark:text-gray-400'}
      `}>
        {formatFileSize(fileSize)}
      </p>
    {/if}
    {#if lastModified}
      <p class={`
        text-xs
        ${theme === 'gaming' ? 'text-green-400/50' : 'text-gray-400 dark:text-gray-500'}
      `}>
        {formatDate(lastModified)}
      </p>
    {/if}
  </div>
  <!-- Tags -->
  {#if tags.length > 0}
    <div class="px-3 pb-2">
      <div class="flex flex-wrap gap-1">
        {#each tags.slice(0, 2) as tag}
          <span class={`
            px-1.5 py-0.5 text-xs rounded
            ${theme === 'gaming'
              ? 'bg-green-400/20 text-green-400 border border-green-400/30'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
            }
          `}>
            {tag}
          </span>
        {/each}
        {#if tags.length > 2}
          <span class={`
            px-1.5 py-0.5 text-xs rounded
            ${theme === 'gaming'
              ? 'bg-green-400/10 text-green-400/70'
              : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
            }
          `}>
            +{tags.length - 2}
          </span>
        {/if}
      </div>
    </div>
  {/if}
  <!-- Hover Actions -->
  {#if isHovered}
    <div
      class="absolute inset-0 bg-black/20 rounded-lg flex items-center justify-center"
      transition:fade={{ duration: 150 }}
    >
      <div class="flex space-x-2">
        {#if onDownload}
          <button
            on:click={handleDownload}
            class={`
              p-2 rounded-full transition-colors
              ${theme === 'gaming'
                ? 'bg-green-400/20 hover:bg-green-400/30 text-green-400'
                : 'bg-white/90 hover:bg-white text-gray-700';
              }
            `}
            title="Download"
            aria-label="Download document"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        {/if}
        {#if onEdit}
          <button
            on:click={handleEdit}
            class={`
              p-2 rounded-full transition-colors
              ${theme === 'gaming'
                ? 'bg-green-400/20 hover:bg-green-400/30 text-green-400'
                : 'bg-white/90 hover:bg-white text-gray-700';
              }
            `}
            title="Edit"
            aria-label="Edit document"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        {/if}
        {#if onDelete}
          <button
            on:click={handleDelete}
            class={`
              p-2 rounded-full transition-colors
              ${theme === 'gaming'
                ? 'bg-red-400/20 hover:bg-red-400/30 text-red-400'
                : 'bg-white/90 hover:bg-white text-red-600';
              }
            `}
            title="Delete"
            aria-label="Delete document"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
<!-- Square Modal Dialog -->
{#if showModal}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    on:click={() => showModal = false}
    transition:fade={{ duration: 200 }}
  >
    <div
      class={`
        w-96 h-96 rounded-lg p-6 relative
        ${themeClasses[theme]}
        ${theme === 'gaming' ? 'shadow-[0_0_30px_rgba(0,255,65,0.3)]' : 'shadow-2xl'}
      `}
      on:click={(e) => e.stopPropagation()}
      transition:scale={{ duration: 200, easing: quintOut }}
    >
      <!-- Close Button -->
      <button
        on:click={() => showModal = false}
        class={`
          absolute top-4 right-4 p-1 rounded-full transition-colors
          ${theme === 'gaming'
            ? 'hover:bg-green-400/20 text-green-400'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400';
          }
        `}
        aria-label="Close modal"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <!-- Modal Content -->
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="flex items-center mb-4">
          <div class={`
            text-3xl mr-3
            ${theme === 'gaming' ? 'filter drop-shadow-[0_0_8px_currentColor]' : ''}
          `}>
            {fileTypeIcons[fileType]}
          </div>
          <div>
            <h2 class={`
              text-lg font-semibold
              ${theme === 'gaming' ? 'text-green-400' : 'text-gray-900 dark:text-gray-100'}
            `}>
              {title}
            </h2>
            <p class={`
              text-sm
              ${theme === 'gaming' ? 'text-green-400/70' : 'text-gray-500 dark:text-gray-400'}
            `}>
              {fileType.toUpperCase()} Document
            </p>
          </div>
        </div>
        <!-- Metadata -->
        <div class="flex-1 space-y-3">
          {#if description}
            <div>
              <label class={`
                block text-sm font-medium mb-1
                ${theme === 'gaming' ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}
              `}>
                Description
              </label>
              <p class={`
                text-sm
                ${theme === 'gaming' ? 'text-green-400/80' : 'text-gray-600 dark:text-gray-400'}
              `}>
                {description}
              </p>
            </div>
          {/if}
          {#if fileSize || lastModified}
            <div class="grid grid-cols-2 gap-4">
              {#if fileSize}
                <div>
                  <label class={`
                    block text-sm font-medium mb-1
                    ${theme === 'gaming' ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}
                  `}>
                    Size
                  </label>
                  <p class={`
                    text-sm
                    ${theme === 'gaming' ? 'text-green-400/80' : 'text-gray-600 dark:text-gray-400'}
                  `}>
                    {formatFileSize(fileSize)}
                  </p>
                </div>
              {/if}
              {#if lastModified}
                <div>
                  <label class={`
                    block text-sm font-medium mb-1
                    ${theme === 'gaming' ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}
                  `}>
                    Modified
                  </label>
                  <p class={`
                    text-sm
                    ${theme === 'gaming' ? 'text-green-400/80' : 'text-gray-600 dark:text-gray-400'}
                  `}>
                    {formatDate(lastModified)}
                  </p>
                </div>
              {/if}
            </div>
          {/if}
          {#if tags.length > 0}
            <div>
              <label class={`
                block text-sm font-medium mb-2
                ${theme === 'gaming' ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}
              `}>
                Tags
              </label>
              <div class="flex flex-wrap gap-2">
                {#each tags as tag}
                  <span class={`
                    px-2 py-1 text-xs rounded
                    ${theme === 'gaming'
                      ? 'bg-green-400/20 text-green-400 border border-green-400/30'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
                    }
                  `}>
                    {tag}
                  </span>
                {/each}
              </div>
            </div>
          {/if}
          {#if confidentialityLevel !== 'public'}
            <div>
              <label class={`
                block text-sm font-medium mb-1
                ${theme === 'gaming' ? 'text-green-400' : 'text-gray-700 dark:text-gray-300'}
              `}>
                Confidentiality
              </label>
              <span class={`
                inline-block px-2 py-1 text-xs rounded
                ${confidentialityColors[confidentialityLevel]}
              `}>
                {confidentialityLevel.toUpperCase()}
              </span>
            </div>
          {/if}
        </div>
        <!-- Actions -->
        <div class="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {#if onDownload}
            <Button
              {theme}
              variant="outline"
              size="sm"
              on:click={handleDownload}
            >
              Download
            </Button>
          {/if}
          {#if onEdit}
            <Button
              {theme}
              variant="outline"
              size="sm"
              on:click={handleEdit}
            >
              Edit
            </Button>
          {/if}
          <Button
            {theme}
            size="sm"
            on:click={() => showModal = false}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  </div>
{/if}
<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  /* Gaming theme enhancements */
  .group:hover .filter {
    filter: drop-shadow(0 0 8px currentColor) brightness(1.2);
  }
  /* Smooth animations */
  .transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>