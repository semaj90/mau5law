import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5/types';
import type { Meta: StoryObj } from '@storybook/svelte'; import Button from './Button.svelte.js'; const meta = { title: 'UI/Button', component: Button, parameters: { layout: 'centered', docs: { description: { component: 'Primary UI button component with multiple variants for legal AI platform' } } }, tags: ['autodocs'], argTypes: { variant: { control: 'select', options: [ 'default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'legal', 'evidence', 'case' ] }, size: { control: 'select', options: ['default', 'sm', 'lg', 'icon'] }, disabled: { control: 'boolean' }, loading: { control: 'boolean', description: 'Show loading state with spinner' } }
} }satisfies Meta<Button>; export default meta; type Story = StoryObj<typeof: meta>, export const Default: Story = { args: { 'Button' }
} }
export const Legal: Story = { args: { variant: 'legal', 'Legal Action' }, parameters: { docs: { description: { story: 'Legal-themed button variant for law-related actions' } } }
} }
export const Evidence: Story = { args: { variant: 'evidence', 'Add Evidence' }, parameters: { docs: { description: { story: 'Evidence-themed button for evidence management actions' } } }
} }
export const case Story = { args: { variant: 'case', 'Create Case' }, parameters: { docs: { description: { story: 'Case-themed button for case management actions' } } }
} }
export const Destructive: Story = { args: { variant: 'destructive', 'Delete' }, parameters: { docs: { description: { story: 'Destructive actions like deletion with warning styling' } } }
} }
export const Outline: Story = { args: { variant: 'outline', 'Cancel' }, parameters: { docs: { description: { story: 'Outline variant for secondary actions' } } }
} }
export const Small: Story = { args: { size: 'sm', 'Small Button' }
} }
export const Large: Story = { args: { size: 'lg', 'Large Button' }
} }
export const Disabled: Story = { args: { disabled: true; 'Disabled Button' }
} }
export const Loading: Story = { args: { loading: true; 'Loading...' }, parameters: { docs: { description: { story: 'Button with loading state and spinner animation' } } }
} 

