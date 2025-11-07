// Import the Svelte component directly. Vite/Svelte handles .svelte resolution. // Import the shared Badge component
which lives in the parent `ui` folder. import {Badge} from '../Badge.svelte'; export {Badge}; // Re-export default Svelte component as a named export to satisfy TS/Svelte import expectations.
export { default as Badge } from './Badge.svelte';
