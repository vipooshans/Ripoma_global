import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { AuthContext } from './AuthContext';
import api from '../services/api';
import NotificationToast from '../components/notifications/NotificationToast';

export const NotificationContext = createContext(null);

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

const getAuthToken = () => {
  // Check common Authorization header
  const authHeader = api.defaults.headers.common['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  
  // Parse from cookies as fallback
  const match = document.cookie.match(new RegExp('(^| )accessToken=([^;]+)'));
  if (match) return match[2];

  return null;
};

export const NotificationProvider = ({ children }) => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.warn('[SOCKET CONTEXT] Authentication token not found in cookies or headers.');
      return;
    }

    // Connect socket
    const socketInstance = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 2000
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log(`[SOCKET CONTEXT] Connected as user ${user.name}`);
      setIsConnected(true);
    });

    socketInstance.on('notification', (newNotification) => {
      console.log('[SOCKET CONTEXT] Real-time notification received:', newNotification);
      
      // Invalidate queries so that listings and badge counts are automatically updated
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount'] });
      
      // Show gorgeous custom push toast
      toast.custom((t) => (
        <NotificationToast 
          t={t} 
          notification={newNotification} 
          onClose={() => toast.dismiss(t.id)} 
        />
      ), { duration: 6000 });
    });

    socketInstance.on('disconnect', () => {
      console.log('[SOCKET CONTEXT] Disconnected.');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[SOCKET CONTEXT] Connection error:', error.message);
      setIsConnected(false);
    });

    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
        console.log('[SOCKET CONTEXT] Cleaned up socket connection.');
      }
    };
  }, [isAuthenticated, user, queryClient]);

  const value = {
    socket,
    isConnected
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
