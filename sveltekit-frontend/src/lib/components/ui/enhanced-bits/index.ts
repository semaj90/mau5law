// Import Svelte components as defaults
import Button from './Button.svelte';
import Card from './Card.svelte';
import Modal from './Modal.svelte';
import Input from './Input.svelte';

// Re-export as named exports for consistency
export { Button, Card, Modal, Input };

// Export other components
export { default as Dialog } from '../dialog/Dialog.svelte';
export { default as DialogCompound } from '../dialog/Dialog.svelte';
export { default as Tabs } from '../tabs/Tabs.svelte';
export { Textarea } from '../textarea/index.js';
export { Badge } from '../badge/index.js';
