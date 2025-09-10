/**
 * Detective WebSocket Manager
 * Real-time collaborative analysis for detective boards
 * Integrates with Gemma embeddings and MCP multi-core processing
 */

import type { TypingContext, TypingState } from '$lib/machines/userTypingStateMachine.js';

export interface DetectiveWebSocketMessage {
  type: 'user_typing' | 'connection_map_update' | 'evidence_analysis' | 'contextual_prompt' | 'collaborative_action';
  caseId: string;
  userId?: string;
  sessionId?: string;
  timestamp: string;
  data: any;
}

export interface CollaborativeUser {
  id: string;
  name: string;
  typing: boolean;
  lastActivity: string;
  currentFocus?: 'evidence' | 'connections' | 'analysis';
  analytics?: TypingContext;
}

export class DetectiveWebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private caseId: string;
  private userId: string;
  private sessionId: string;
  
  // Event handlers
  private onMessageHandlers: Map<string, ((data: any) => void)[]> = new Map();
  private onUserJoinedHandlers: ((user: CollaborativeUser) => void)[] = [];
  private onUserLeftHandlers: ((userId: string) => void)[] = [];
  private onConnectionStatusHandlers: ((connected: boolean) => void)[] = [];
  
  // State
  public isConnected = false;
  public collaborativeUsers: Map<string, CollaborativeUser> = new Map();
  
  constructor(caseId: string, userId: string, sessionId?: string) {
    this.caseId = caseId;
    this.userId = userId;
    this.sessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[DetectiveWS] Already connected');
      return;
    }
    
    const wsUrl = `ws://localhost:3003/detective/${this.caseId}?userId=${this.userId}&sessionId=${this.sessionId}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('[DetectiveWS] Connection failed:', error);
      this.scheduleReconnect();
    }
  }
  
  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;
    
    this.ws.onopen = () => {
      console.log('[DetectiveWS] Connected to detective collaboration server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.notifyConnectionStatus(true);
      
      // Send initial join message
      this.send({
        type: 'collaborative_action',
        caseId: this.caseId,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        data: { action: 'join', userInfo: { id: this.userId, name: 'Detective User' } }
      });
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message: DetectiveWebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('[DetectiveWS] Failed to parse message:', error);
      }
    };
    
    this.ws.onclose = (event) => {
      console.log('[DetectiveWS] Connection closed:', event.code, event.reason);
      this.isConnected = false;
      this.stopHeartbeat();
      this.notifyConnectionStatus(false);
      
      if (event.code !== 1000) { // Not a normal closure
        this.scheduleReconnect();
      }
    };
    
    this.ws.onerror = (error) => {
      console.error('[DetectiveWS] WebSocket error:', error);
    };
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: DetectiveWebSocketMessage): void {
    console.log('[DetectiveWS] Received message:', message.type, message.data);
    
    switch (message.type) {
      case 'collaborative_action':
        this.handleCollaborativeAction(message);
        break;
        
      case 'user_typing':
        this.handleUserTyping(message);
        break;
        
      case 'connection_map_update':
        this.handleConnectionMapUpdate(message);
        break;
        
      case 'evidence_analysis':
        this.handleEvidenceAnalysis(message);
        break;
        
      case 'contextual_prompt':
        this.handleContextualPrompt(message);
        break;
    }
    
    // Notify registered handlers
    const handlers = this.onMessageHandlers.get(message.type) || [];
    handlers.forEach(handler => handler(message.data));
  }
  
  /**
   * Handle collaborative actions (join/leave/focus changes)
   */
  private handleCollaborativeAction(message: DetectiveWebSocketMessage): void {
    const { action, userInfo, focus } = message.data;
    
    if (message.userId === this.userId) return; // Ignore own messages
    
    switch (action) {
      case 'join':
        if (userInfo && message.userId) {
          const user: CollaborativeUser = {
            id: message.userId,
            name: userInfo.name || 'Anonymous',
            typing: false,
            lastActivity: message.timestamp,
            currentFocus: undefined
          };
          this.collaborativeUsers.set(message.userId, user);
          this.onUserJoinedHandlers.forEach(handler => handler(user));
        }
        break;
        
      case 'leave':
        if (message.userId) {
          this.collaborativeUsers.delete(message.userId);
          this.onUserLeftHandlers.forEach(handler => handler(message.userId));
        }
        break;
        
      case 'focus_change':
        if (message.userId && this.collaborativeUsers.has(message.userId)) {
          const user = this.collaborativeUsers.get(message.userId)!;
          user.currentFocus = focus;
          user.lastActivity = message.timestamp;
          this.collaborativeUsers.set(message.userId, user);
        }
        break;
    }
  }
  
  /**
   * Handle real-time typing updates from other users
   */
  private handleUserTyping(message: DetectiveWebSocketMessage): void {
    if (message.userId === this.userId) return;
    
    const { isTyping, typingContext } = message.data;
    
    if (message.userId && this.collaborativeUsers.has(message.userId)) {
      const user = this.collaborativeUsers.get(message.userId)!;
      user.typing = isTyping;
      user.analytics = typingContext;
      user.lastActivity = message.timestamp;
      this.collaborativeUsers.set(message.userId, user);
    }
  }
  
  /**
   * Handle connection map updates
   */
  private handleConnectionMapUpdate(message: DetectiveWebSocketMessage): void {
    // Real-time connection map updates for collaborative visualization
    console.log('[DetectiveWS] Connection map updated by:', message.userId);
  }
  
  /**
   * Handle evidence analysis updates
   */
  private handleEvidenceAnalysis(message: DetectiveWebSocketMessage): void {
    // Real-time evidence analysis results
    console.log('[DetectiveWS] Evidence analysis by:', message.userId, message.data);
  }
  
  /**
   * Handle contextual prompts from other users
   */
  private handleContextualPrompt(message: DetectiveWebSocketMessage): void {
    // Collaborative contextual prompts
    console.log('[DetectiveWS] Contextual prompt from:', message.userId, message.data);
  }
  
  /**
   * Send typing state updates
   */
  sendTypingUpdate(state: TypingState, context: TypingContext): void {
    this.send({
      type: 'user_typing',
      caseId: this.caseId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      data: {
        isTyping: ['typing', 'contextual_processing'].includes(state),
        typingState: state,
        typingContext: context
      }
    });
  }
  
  /**
   * Send connection map updates
   */
  sendConnectionMapUpdate(connectionMap: any, metadata: any): void {
    this.send({
      type: 'connection_map_update',
      caseId: this.caseId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      data: { connectionMap, metadata, action: 'generated' }
    });
  }
  
  /**
   * Send evidence analysis results
   */
  sendEvidenceAnalysis(evidenceId: string, analysis: any): void {
    this.send({
      type: 'evidence_analysis',
      caseId: this.caseId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      data: { evidenceId, analysis, action: 'completed' }
    });
  }
  
  /**
   * Send contextual prompts
   */
  sendContextualPrompt(prompts: string[], context: TypingContext): void {
    this.send({
      type: 'contextual_prompt',
      caseId: this.caseId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      data: { prompts, context, action: 'triggered' }
    });
  }
  
  /**
   * Send focus change notification
   */
  sendFocusChange(focus: 'evidence' | 'connections' | 'analysis'): void {
    this.send({
      type: 'collaborative_action',
      caseId: this.caseId,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      data: { action: 'focus_change', focus }
    });
  }
  
  /**
   * Send WebSocket message
   */
  private send(message: DetectiveWebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('[DetectiveWS] Cannot send message - not connected');
    }
  }
  
  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
  }
  
  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[DetectiveWS] Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[DetectiveWS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
  
  /**
   * Notify connection status handlers
   */
  private notifyConnectionStatus(connected: boolean): void {
    this.onConnectionStatusHandlers.forEach(handler => handler(connected));
  }
  
  /**
   * Event handler registration methods
   */
  onMessage(type: string, handler: (data: any) => void): void {
    if (!this.onMessageHandlers.has(type)) {
      this.onMessageHandlers.set(type, []);
    }
    this.onMessageHandlers.get(type)!.push(handler);
  }
  
  onUserJoined(handler: (user: CollaborativeUser) => void): void {
    this.onUserJoinedHandlers.push(handler);
  }
  
  onUserLeft(handler: (userId: string) => void): void {
    this.onUserLeftHandlers.push(handler);
  }
  
  onConnectionStatus(handler: (connected: boolean) => void): void {
    this.onConnectionStatusHandlers.push(handler);
  }
  
  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      // Send leave message
      this.send({
        type: 'collaborative_action',
        caseId: this.caseId,
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        data: { action: 'leave' }
      });
      
      this.stopHeartbeat();
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }
  
  /**
   * Get current collaboration statistics
   */
  getCollaborationStats() {
    return {
      connectedUsers: this.collaborativeUsers.size,
      typingUsers: Array.from(this.collaborativeUsers.values()).filter(u => u.typing).length,
      lastActivity: Math.max(...Array.from(this.collaborativeUsers.values()).map(u => new Date(u.lastActivity).getTime())),
      focusDistribution: {
        evidence: Array.from(this.collaborativeUsers.values()).filter(u => u.currentFocus === 'evidence').length,
        connections: Array.from(this.collaborativeUsers.values()).filter(u => u.currentFocus === 'connections').length,
        analysis: Array.from(this.collaborativeUsers.values()).filter(u => u.currentFocus === 'analysis').length
      }
    };
  }
}

export default DetectiveWebSocketManager;