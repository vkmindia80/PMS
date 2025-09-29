/**
 * Real-time Collaboration Service with WebRTC
 * Phase 4.1: Advanced real-time features for enterprise collaboration
 */

export interface CollaborationSession {
  id: string
  projectId: string
  participants: Participant[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Participant {
  id: string
  name: string
  email: string
  role: string
  isOnline: boolean
  cursor?: CursorPosition
  selection?: Selection
}

export interface CursorPosition {
  x: number
  y: number
  elementId?: string
}

export interface Selection {
  elementId: string
  startOffset: number
  endOffset: number
}

export interface RealtimeMessage {
  type: 'cursor' | 'selection' | 'edit' | 'chat' | 'notification'
  payload: any
  sender: string
  timestamp: Date
}

export interface ScreenShareOptions {
  video: boolean
  audio: boolean
  cursor: boolean
}

class RealtimeService {
  private websocket: WebSocket | null = null
  private peerConnections: Map<string, RTCPeerConnection> = new Map()
  private localStream: MediaStream | null = null
  private screenStream: MediaStream | null = null
  private dataChannels: Map<string, RTCDataChannel> = new Map()
  private isInitialized = false
  private sessionId: string | null = null
  private participants: Map<string, Participant> = new Map()
  private messageHandlers: Map<string, Function[]> = new Map()

  private readonly WEBSOCKET_URL = `ws://localhost:8001/ws/collaboration`
  private readonly ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]

  /**
   * Initialize real-time collaboration service
   */
  async initialize(projectId: string, userId: string): Promise<void> {
    try {
      console.log('Initializing real-time collaboration service...')
      
      // Connect to WebSocket server
      await this.connectWebSocket(projectId, userId)
      
      // Initialize WebRTC capabilities
      this.setupPeerConnectionFactory()
      
      this.isInitialized = true
      console.log('Real-time service initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize real-time service:', error)
      throw error
    }
  }

  /**
   * Connect to WebSocket server for signaling
   */
  private async connectWebSocket(projectId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.WEBSOCKET_URL}?project_id=${projectId}&user_id=${userId}`
        this.websocket = new WebSocket(url)

        this.websocket.onopen = () => {
          console.log('WebSocket connected')
          resolve(void 0)
        }

        this.websocket.onmessage = (event) => {
          this.handleWebSocketMessage(JSON.parse(event.data))
        }

        this.websocket.onerror = (error) => {
          console.error('WebSocket error:', error)
          reject(error)
        }

        this.websocket.onclose = () => {
          console.log('WebSocket disconnected')
          this.reconnectWebSocket(projectId, userId)
        }

      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'participant_joined':
        this.handleParticipantJoined(message.payload)
        break
      case 'participant_left':
        this.handleParticipantLeft(message.payload)
        break
      case 'webrtc_offer':
        this.handleWebRTCOffer(message.payload)
        break
      case 'webrtc_answer':
        this.handleWebRTCAnswer(message.payload)
        break
      case 'webrtc_ice_candidate':
        this.handleICECandidate(message.payload)
        break
      case 'realtime_message':
        this.handleRealtimeMessage(message.payload)
        break
      default:
        console.log('Unknown message type:', message.type)
    }
  }

  /**
   * Setup peer connection factory
   */
  private setupPeerConnectionFactory(): void {
    // This will be used to create peer connections on demand
    console.log('Peer connection factory setup complete')
  }

  /**
   * Create peer connection for a participant
   */
  private async createPeerConnection(participantId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: this.ICE_SERVERS
    })

    // Setup data channel for real-time messaging
    const dataChannel = peerConnection.createDataChannel('collaboration', {
      ordered: true
    })
    
    dataChannel.onopen = () => {
      console.log(`Data channel opened with ${participantId}`)
      this.dataChannels.set(participantId, dataChannel)
    }

    dataChannel.onmessage = (event) => {
      const message: RealtimeMessage = JSON.parse(event.data)
      this.handleDataChannelMessage(message, participantId)
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendWebSocketMessage({
          type: 'webrtc_ice_candidate',
          payload: {
            candidate: event.candidate,
            participantId
          }
        })
      }
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote stream from', participantId)
      this.handleRemoteStream(participantId, event.streams[0])
    }

    this.peerConnections.set(participantId, peerConnection)
    return peerConnection
  }

  /**
   * Start screen sharing
   */
  async startScreenShare(options: ScreenShareOptions = { video: true, audio: false, cursor: true }): Promise<MediaStream> {
    try {
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen sharing not supported')
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: options.video,
        audio: options.audio
      })

      this.screenStream = stream

      // Add screen share to all peer connections
      for (const [participantId, peerConnection] of this.peerConnections) {
        stream.getTracks().forEach(track => {
          peerConnection.addTrack(track, stream)
        })
      }

      // Notify participants about screen share
      this.broadcastMessage({
        type: 'notification',
        payload: {
          action: 'screen_share_started',
          options
        },
        sender: 'local',
        timestamp: new Date()
      })

      return stream

    } catch (error) {
      console.error('Failed to start screen sharing:', error)
      throw error
    }
  }

  /**
   * Stop screen sharing
   */
  stopScreenShare(): void {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null

      // Notify participants
      this.broadcastMessage({
        type: 'notification',
        payload: {
          action: 'screen_share_stopped'
        },
        sender: 'local',
        timestamp: new Date()
      })
    }
  }

  /**
   * Send cursor position to other participants
   */
  sendCursorPosition(position: CursorPosition): void {
    this.broadcastMessage({
      type: 'cursor',
      payload: position,
      sender: 'local',
      timestamp: new Date()
    })
  }

  /**
   * Send text selection to other participants
   */
  sendSelection(selection: Selection): void {
    this.broadcastMessage({
      type: 'selection',
      payload: selection,
      sender: 'local',
      timestamp: new Date()
    })
  }

  /**
   * Send real-time edit to other participants
   */
  sendEdit(edit: any): void {
    this.broadcastMessage({
      type: 'edit',
      payload: edit,
      sender: 'local',
      timestamp: new Date()
    })
  }

  /**
   * Send chat message
   */
  sendChatMessage(message: string): void {
    this.broadcastMessage({
      type: 'chat',
      payload: { message },
      sender: 'local',
      timestamp: new Date()
    })
  }

  /**
   * Broadcast message to all participants
   */
  private broadcastMessage(message: RealtimeMessage): void {
    // Send via data channels (P2P)
    for (const [participantId, dataChannel] of this.dataChannels) {
      if (dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify(message))
      }
    }

    // Also send via WebSocket as fallback
    this.sendWebSocketMessage({
      type: 'realtime_message',
      payload: message
    })
  }

  /**
   * Register message handler
   */
  onMessage(type: string, handler: Function): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, [])
    }
    this.messageHandlers.get(type)!.push(handler)
  }

  /**
   * Remove message handler
   */
  offMessage(type: string, handler: Function): void {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      const index = handlers.indexOf(handler)
      if (index > -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Handle data channel message
   */
  private handleDataChannelMessage(message: RealtimeMessage, senderId: string): void {
    message.sender = senderId
    this.triggerMessageHandlers(message.type, message)
  }

  /**
   * Handle real-time message from WebSocket
   */
  private handleRealtimeMessage(message: RealtimeMessage): void {
    this.triggerMessageHandlers(message.type, message)
  }

  /**
   * Trigger message handlers
   */
  private triggerMessageHandlers(type: string, message: RealtimeMessage): void {
    const handlers = this.messageHandlers.get(type)
    if (handlers) {
      handlers.forEach(handler => handler(message))
    }
  }

  /**
   * Handle participant joined
   */
  private async handleParticipantJoined(participant: Participant): Promise<void> {
    console.log('Participant joined:', participant)
    this.participants.set(participant.id, participant)

    // Create peer connection for new participant
    const peerConnection = await this.createPeerConnection(participant.id)

    // Create offer if we're the initiator
    if (participant.id > 'local') { // Simple comparison for demo
      const offer = await peerConnection.createOffer()
      await peerConnection.setLocalDescription(offer)

      this.sendWebSocketMessage({
        type: 'webrtc_offer',
        payload: {
          offer,
          participantId: participant.id
        }
      })
    }

    this.triggerMessageHandlers('participant_joined', {
      type: 'notification',
      payload: participant,
      sender: 'system',
      timestamp: new Date()
    })
  }

  /**
   * Handle participant left
   */
  private handleParticipantLeft(participantId: string): void {
    console.log('Participant left:', participantId)
    
    // Clean up peer connection
    const peerConnection = this.peerConnections.get(participantId)
    if (peerConnection) {
      peerConnection.close()
      this.peerConnections.delete(participantId)
    }

    // Clean up data channel
    this.dataChannels.delete(participantId)
    this.participants.delete(participantId)

    this.triggerMessageHandlers('participant_left', {
      type: 'notification',
      payload: { participantId },
      sender: 'system',
      timestamp: new Date()
    })
  }

  /**
   * Handle WebRTC offer
   */
  private async handleWebRTCOffer(payload: any): Promise<void> {
    const { offer, participantId } = payload
    
    let peerConnection = this.peerConnections.get(participantId)
    if (!peerConnection) {
      peerConnection = await this.createPeerConnection(participantId)
    }

    await peerConnection.setRemoteDescription(offer)
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    this.sendWebSocketMessage({
      type: 'webrtc_answer',
      payload: {
        answer,
        participantId
      }
    })
  }

  /**
   * Handle WebRTC answer
   */
  private async handleWebRTCAnswer(payload: any): Promise<void> {
    const { answer, participantId } = payload
    const peerConnection = this.peerConnections.get(participantId)
    
    if (peerConnection) {
      await peerConnection.setRemoteDescription(answer)
    }
  }

  /**
   * Handle ICE candidate
   */
  private async handleICECandidate(payload: any): Promise<void> {
    const { candidate, participantId } = payload
    const peerConnection = this.peerConnections.get(participantId)
    
    if (peerConnection) {
      await peerConnection.addIceCandidate(candidate)
    }
  }

  /**
   * Handle remote stream
   */
  private handleRemoteStream(participantId: string, stream: MediaStream): void {
    this.triggerMessageHandlers('remote_stream', {
      type: 'notification',
      payload: { participantId, stream },
      sender: 'system',
      timestamp: new Date()
    })
  }

  /**
   * Send WebSocket message
   */
  private sendWebSocketMessage(message: any): void {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message))
    }
  }

  /**
   * Reconnect WebSocket
   */
  private async reconnectWebSocket(projectId: string, userId: string): Promise<void> {
    // Implement exponential backoff
    let delay = 1000
    const maxDelay = 30000

    const attemptReconnect = async () => {
      try {
        await this.connectWebSocket(projectId, userId)
        console.log('WebSocket reconnected successfully')
      } catch (error) {
        console.error('WebSocket reconnection failed, retrying in', delay, 'ms')
        setTimeout(attemptReconnect, delay)
        delay = Math.min(delay * 2, maxDelay)
      }
    }

    setTimeout(attemptReconnect, delay)
  }

  /**
   * Get current participants
   */
  getParticipants(): Participant[] {
    return Array.from(this.participants.values())
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): any {
    return {
      isInitialized: this.isInitialized,
      websocketConnected: this.websocket?.readyState === WebSocket.OPEN,
      peerConnections: this.peerConnections.size,
      dataChannels: this.dataChannels.size,
      participants: this.participants.size,
      screenSharing: !!this.screenStream
    }
  }

  /**
   * Cleanup and disconnect
   */
  disconnect(): void {
    console.log('Disconnecting real-time service...')

    // Close all peer connections
    for (const peerConnection of this.peerConnections.values()) {
      peerConnection.close()
    }
    this.peerConnections.clear()

    // Close data channels
    for (const dataChannel of this.dataChannels.values()) {
      dataChannel.close()
    }
    this.dataChannels.clear()

    // Stop streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop())
      this.screenStream = null
    }

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close()
      this.websocket = null
    }

    // Clear state
    this.participants.clear()
    this.messageHandlers.clear()
    this.isInitialized = false
    this.sessionId = null

    console.log('Real-time service disconnected')
  }
}

export const realtimeService = new RealtimeService()
export default realtimeService