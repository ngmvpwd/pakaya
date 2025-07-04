import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      // Handle Replit environment properly
      let wsUrl: string;
      
      if (import.meta.env.DEV) {
        // Development environment - use current host
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws`;
      } else {
        // Production environment  
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const host = window.location.host;
        wsUrl = `${protocol}//${host}/ws`;
      }
      
      console.log('Connecting to WebSocket:', wsUrl);
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Attempting to reconnect... (${reconnectAttempts.current}/${maxReconnectAttempts})`);
            connect();
          }, delay);
        }
      };

      wsRef.current.onerror = (error) => {
        console.log('WebSocket connection issue - this is normal in development');
        setIsConnected(false);
      };

    } catch (error) {
      // Suppress WebSocket connection errors in development
      if (import.meta.env.DEV) {
        console.log('WebSocket connection unavailable - real-time updates disabled');
      } else {
        console.error('Failed to connect WebSocket:', error);
      }
      setIsConnected(false);
    }
  };

  const handleMessage = (message: WebSocketMessage) => {
    switch (message.type) {
      case 'connection':
        console.log('WebSocket connection confirmed');
        break;
        
      case 'attendance_updated':
        console.log('Attendance data updated, refreshing queries...');
        // Invalidate and refetch relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/stats/overview'] });
        queryClient.invalidateQueries({ queryKey: ['/api/stats/trends'] });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance/date'] });
        queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
        break;
        
      case 'teacher_updated':
        console.log('Teacher data updated, refreshing queries...');
        queryClient.invalidateQueries({ queryKey: ['/api/teachers'] });
        break;
        
      case 'department_updated':
        console.log('Department data updated, refreshing queries...');
        queryClient.invalidateQueries({ queryKey: ['/api/departments'] });
        break;
        
      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    reconnect: connect
  };
}