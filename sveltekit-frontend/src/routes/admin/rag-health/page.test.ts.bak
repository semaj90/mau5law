// src/routes/admin/rag-health/+page.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/svelte';
import RagHealthPage from './+page.svelte';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('RAG Health Dashboard UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(RagHealthPage);

    expect(screen.getByText('Loading health data...')).toBeInTheDocument();
  });

  it('should display health data when loaded successfully', async () => {
    const mockHealthData = {
      global: {
        total_chunks: 1000,
        indexed_chunks: 800,
        missing_index_rows: 200,
        last_indexed_at: '2024-01-15T10:30:00Z'
      },
      perDoc: [
        {
          id: 'doc1',
          filename: 'test-document.pdf',
          chunk_count: 50,
          indexed_chunks: 45,
          last_indexed_at: '2024-01-15T10:25:00Z'
        },
        {
          id: 'doc2',
          filename: 'another-doc.pdf',
          chunk_count: 30,
          indexed_chunks: 30,
          last_indexed_at: '2024-01-15T10:20:00Z'
        }
      ],
      failedChunks: [
        {
          chunk_id: 'chunk-123',
          filename: 'failed-doc.pdf',
          page_number: 5
        }
      ]
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHealthData)
    });

    render(RagHealthPage);

    await waitFor(() => {
      expect(screen.getByText('RAG Health Dashboard')).toBeInTheDocument();
    });

    // Check global metrics
    expect(screen.getByText('1,000')).toBeInTheDocument(); // total_chunks
    expect(screen.getByText('800')).toBeInTheDocument(); // indexed_chunks
    expect(screen.getByText('200')).toBeInTheDocument(); // missing_index_rows

    // Check progress percentage
    expect(screen.getByText('Indexing Progress: 80%')).toBeInTheDocument();

    // Check per-document table
    expect(screen.getByText('test-document.pdf')).toBeInTheDocument();
    expect(screen.getByText('another-doc.pdf')).toBeInTheDocument();

    // Check failed chunks section
    expect(screen.getByText(/Failed Chunks Sample/)).toBeInTheDocument();
    expect(screen.getByText(/failed-doc.pdf/)).toBeInTheDocument();
  });

  it('should display error message when API fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      text: () => Promise.resolve('Internal server error')
    });

    render(RagHealthPage);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    render(RagHealthPage);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should refresh data when refresh button is clicked', async () => {
    const initialData = {
      global: { total_chunks: 100, indexed_chunks: 50, missing_index_rows: 50, last_indexed_at: null },
      perDoc: [],
      failedChunks: []
    };

    const updatedData = {
      global: { total_chunks: 200, indexed_chunks: 150, missing_index_rows: 50, last_indexed_at: null },
      perDoc: [],
      failedChunks: []
    };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(initialData)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedData)
      });

    render(RagHealthPage);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByText('Refresh');
    fireEvent.click(refreshButton);

    // Wait for updated data
    await waitFor(() => {
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('should disable refresh button while loading', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => {
      setTimeout(() => resolve({
        ok: true,
        json: () => Promise.resolve({
          global: { total_chunks: 0, indexed_chunks: 0, missing_index_rows: 0, last_indexed_at: null },
          perDoc: [],
          failedChunks: []
        })
      }), 100);
    }));

    render(RagHealthPage);

    const refreshButton = screen.getByText('Loading...');
    expect(refreshButton).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByText('Refresh')).not.toBeDisabled();
    });
  });

  it('should format dates correctly', async () => {
    const mockData = {
      global: {
        total_chunks: 100,
        indexed_chunks: 100,
        missing_index_rows: 0,
        last_indexed_at: '2024-01-15T10:30:00Z'
      },
      perDoc: [
        {
          id: 'doc1',
          filename: 'test.pdf',
          chunk_count: 10,
          indexed_chunks: 10,
          last_indexed_at: '2024-01-15T10:25:00Z'
        }
      ],
      failedChunks: []
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    render(RagHealthPage);

    await waitFor(() => {
      // Should format the date (exact format depends on locale)
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });
  });

  it('should handle null timestamps', async () => {
    const mockData = {
      global: {
        total_chunks: 100,
        indexed_chunks: 50,
        missing_index_rows: 50,
        last_indexed_at: null
      },
      perDoc: [
        {
          id: 'doc1',
          filename: 'test.pdf',
          chunk_count: 10,
          indexed_chunks: 5,
          last_indexed_at: null
        }
      ],
      failedChunks: []
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    render(RagHealthPage);

    await waitFor(() => {
      // Should display em dash for null timestamps
      expect(screen.getAllByText('—')).toHaveLength(2);
    });
  });

  it('should calculate health percentage correctly', async () => {
    const testCases = [
      { total: 100, indexed: 80, expected: '80%' },
      { total: 0, indexed: 0, expected: '0%' },
      { total: 1000, indexed: 333, expected: '33%' },
      { total: 7, indexed: 5, expected: '71%' } // Should round
    ];

    for (const testCase of testCases) {
      const mockData = {
        global: {
          total_chunks: testCase.total,
          indexed_chunks: testCase.indexed,
          missing_index_rows: testCase.total - testCase.indexed,
          last_indexed_at: null
        },
        perDoc: [],
        failedChunks: []
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData)
      });

      const { unmount } = render(RagHealthPage);

      await waitFor(() => {
        expect(screen.getByText(`Indexing Progress: ${testCase.expected}`)).toBeInTheDocument();
      });

      unmount();
    }
  });

  it('should show complete/incomplete status for documents', async () => {
    const mockData = {
      global: {
        total_chunks: 100,
        indexed_chunks: 80,
        missing_index_rows: 20,
        last_indexed_at: null
      },
      perDoc: [
        {
          id: 'doc1',
          filename: 'complete-doc.pdf',
          chunk_count: 10,
          indexed_chunks: 10,
          last_indexed_at: '2024-01-15T10:25:00Z'
        },
        {
          id: 'doc2',
          filename: 'incomplete-doc.pdf',
          chunk_count: 20,
          indexed_chunks: 15,
          last_indexed_at: '2024-01-15T10:20:00Z'
        }
      ],
      failedChunks: []
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData)
    });

    render(RagHealthPage);

    await waitFor(() => {
      expect(screen.getByText('Complete')).toBeInTheDocument();
      expect(screen.getByText('Incomplete')).toBeInTheDocument();
    });
  });
});