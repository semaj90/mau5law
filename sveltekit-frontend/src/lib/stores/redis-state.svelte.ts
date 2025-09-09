/**
 * Redis State Management with Svelte 5 Runes
 * Provides reactive state management for Redis connections and pub/sub
 */

interface RedisConnectionState {
  isConnected: boolean;
  connectionAttempts: number;
  lastError: string | null;
  lastConnected: number | null;
  clientCount: number;
  activeChannels: Set<string>;
  messageCount: number;
  cacheHits: number;
  cacheMisses: number;
}

interface RedisMessage {
  channel: string;
  data: any;
  timestamp: number;
  userId?: string;
}

class RedisStateStore {
  // Core connection state using runes
  private state = $state<RedisConnectionState>({
    isConnected: false,
    connectionAttempts: 0,
    lastError: null,
    lastConnected: null,
    clientCount: 0,
    activeChannels: new Set(),
    messageCount: 0,
    cacheHits: 0,
    cacheMisses: 0
  });

  // Recent messages buffer
  private recentMessages = $state<RedisMessage[]>([]);
  
  // Derived connection status
  connectionStatus = $derived(() => {
    if (this.state.isConnected) {
      return { status: 'connected', color: 'green', text: 'Connected' };
    } else if (this.state.connectionAttempts > 0) {
      return { status: 'reconnecting', color: 'yellow', text: 'Reconnecting...' };
    } else {
      return { status: 'disconnected', color: 'red', text: 'Disconnected' };
    }
  });
  
  // Connection health indicator
  connectionHealth = $derived(() => {
    if (!this.state.isConnected) return 'unhealthy';
    if (this.state.lastError) return 'warning';
    return 'healthy';
  });
  
  // Connection uptime
  uptime = $derived(() => {
    if (!this.state.isConnected || !this.state.lastConnected) return 0;
    return Date.now() - this.state.lastConnected;
  });
  
  // Cache hit ratio
  cacheHitRatio = $derived(() => {
    const total = this.state.cacheHits + this.state.cacheMisses;
    if (total === 0) return 0;
    return Math.round((this.state.cacheHits / total) * 100);
  });
  
  // Active channels summary
  channelsSummary = $derived(() => {
    return Array.from(this.state.activeChannels).map(channel => ({
      name: channel,
      messageCount: this.recentMessages.filter(m => m.channel === channel).length
    }));
  });
  
  // Recent activity summary
  recentActivity = $derived(() => {
    const now = Date.now();
    const lastMinute = this.recentMessages.filter(m => now - m.timestamp < 60000);
    const lastHour = this.recentMessages.filter(m => now - m.timestamp < 3600000);
    
    return {
      lastMinute: lastMinute.length,
      lastHour: lastHour.length,
      total: this.recentMessages.length
    };
  });

  constructor() {
    this.setupReactiveEffects();
  }

  private setupReactiveEffects(): void {
    // React to connection status changes
    $effect(() => {
      const { status, text } = this.connectionStatus;
      if (status === 'connected' && this.state.lastConnected) {
        console.log('✅ Redis connection established');
      } else if (status === 'disconnected' && this.state.lastError) {
        console.warn('❌ Redis disconnected:', this.state.lastError);
      }
    });
    
    // React to connection health changes
    $effect(() => {
      if (this.connectionHealth === 'unhealthy' && this.state.connectionAttempts > 3) {
        console.warn('⚠️ Redis connection health degraded after', this.state.connectionAttempts, 'attempts');
      }
    });
    
    // React to cache performance
    $effect(() => {
      const ratio = this.cacheHitRatio;
      if (ratio < 50 && this.state.cacheHits + this.state.cacheMisses > 10) {
        console.warn('📊 Redis cache hit ratio low:', ratio + '%');
      }
    });
    
    // Cleanup old messages
    $effect(() => {
      const now = Date.now();
      const oneHour = 3600000;
      
      // Keep messages for 1 hour
      if (this.recentMessages.length > 100) {
        this.recentMessages = this.recentMessages.filter(m => now - m.timestamp < oneHour);
      }
    });
  }

  // Connection management methods
  setConnected(connected: boolean): void {
    this.state.isConnected = connected;
    if (connected) {
      this.state.lastConnected = Date.now();
      this.state.lastError = null;
    }
  }

  incrementConnectionAttempts(): void {
    this.state.connectionAttempts++;
  }

  resetConnectionAttempts(): void {
    this.state.connectionAttempts = 0;
  }

  setError(error: string | null): void {
    this.state.lastError = error;
    if (error) {
      this.state.isConnected = false;
    }
  }

  setClientCount(count: number): void {
    this.state.clientCount = count;
  }

  // Channel management
  addChannel(channel: string): void {
    this.state.activeChannels = new Set([...this.state.activeChannels, channel]);
  }

  removeChannel(channel: string): void {
    const newChannels = new Set(this.state.activeChannels);
    newChannels.delete(channel);
    this.state.activeChannels = newChannels;
  }

  // Message handling
  addMessage(channel: string, data: any, userId?: string): void {
    const message: RedisMessage = {
      channel,
      data,
      timestamp: Date.now(),
      userId
    };
    
    this.recentMessages = [...this.recentMessages.slice(-99), message]; // Keep last 100
    this.state.messageCount++;
  }

  // Cache statistics
  recordCacheHit(): void {
    this.state.cacheHits++;
  }

  recordCacheMiss(): void {
    this.state.cacheMisses++;
  }

  // Getters for external access
  get isConnected(): boolean { return this.state.isConnected; }
  get connectionAttempts(): number { return this.state.connectionAttempts; }
  get lastError(): string | null { return this.state.lastError; }
  get clientCount(): number { return this.state.clientCount; }
  get activeChannels(): string[] { return Array.from(this.state.activeChannels); }
  get messageCount(): number { return this.state.messageCount; }
  get messages(): RedisMessage[] { return [...this.recentMessages]; }

  // Reset all statistics
  resetStats(): void {
    this.state.messageCount = 0;
    this.state.cacheHits = 0;
    this.state.cacheMisses = 0;
    this.recentMessages = [];
  }
}

// Create and export the store instance
export const redisStateStore = new RedisStateStore();

// Helper functions for components
export function useRedisState() {
  return {
    store: redisStateStore,
    connectionStatus: redisStateStore.connectionStatus,
    connectionHealth: redisStateStore.connectionHealth,
    uptime: redisStateStore.uptime,
    cacheHitRatio: redisStateStore.cacheHitRatio,
    channelsSummary: redisStateStore.channelsSummary,
    recentActivity: redisStateStore.recentActivity,
    isConnected: () => redisStateStore.isConnected,
    lastError: () => redisStateStore.lastError,
    activeChannels: () => redisStateStore.activeChannels,
    messageCount: () => redisStateStore.messageCount
  };
}

// Integration helper for existing Redis service
export function createRedisStateIntegration(redisService: any) {
  return {
    // Call these methods from your existing Redis service
    onConnected: () => {
      redisStateStore.setConnected(true);
      redisStateStore.resetConnectionAttempts();
    },
    
    onDisconnected: () => {
      redisStateStore.setConnected(false);
    },
    
    onError: (error: Error) => {
      redisStateStore.setError(error.message);
      redisStateStore.incrementConnectionAttempts();
    },
    
    onMessage: (channel: string, data: any, userId?: string) => {
      redisStateStore.addMessage(channel, data, userId);
    },
    
    onChannelSubscribed: (channel: string) => {
      redisStateStore.addChannel(channel);
    },
    
    onChannelUnsubscribed: (channel: string) => {
      redisStateStore.removeChannel(channel);
    },
    
    onCacheHit: () => {
      redisStateStore.recordCacheHit();
    },
    
    onCacheMiss: () => {
      redisStateStore.recordCacheMiss();
    }
  };
}