import type { Meta, StoryObj } from '@storybook/svelte';
import AIChat from './AIChat.svelte';

const meta = {
  title: 'Business/AIChat',
  component: AIChat,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'AI-powered chat interface for legal assistance and case analysis'
      }
    }
  },
  argTypes: {
    model: {
      control: { type: 'select' },
      options: ['gemma3-legal', 'nomic-embed-text', 'custom']
    },
    provider: {
      control: { type: 'select' },
      options: ['ollama', 'openai', 'anthropic']
    },
    temperature: {
      control: { type: 'range', min: 0, max: 2, step: 0.1 }
    },
    maxTokens: {
      control: { type: 'number', min: 1, max: 4000 }
    },
    streaming: {
      control: { type: 'boolean' }
    }
  },
  tags: ['autodocs']
} satisfies Meta<AIChat>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    model: 'gemma3-legal',
    provider: 'ollama',
    temperature: 0.7,
    maxTokens: 2000,
    streaming: true
  }
};

export const OpenAI: Story = {
  args: {
    model: 'gpt-4',
    provider: 'openai',
    temperature: 0.5,
    maxTokens: 1500,
    streaming: true
  }
};

export const Conservative: Story = {
  args: {
    model: 'gemma3-legal',
    provider: 'ollama',
    temperature: 0.1,
    maxTokens: 1000,
    streaming: false
  }
};

export const Creative: Story = {
  args: {
    model: 'gemma3-legal',
    provider: 'ollama',
    temperature: 1.5,
    maxTokens: 3000,
    streaming: true
  }
};