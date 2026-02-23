import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import * as Location from 'expo-location';

const SOCKET_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

interface IncomingAlert {
  alert_id: string;
  user: {
    id: string;
    name: string;
    photo?: string;
    age?: number;
    gender?: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  distance_km: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  activeAlert: string | null;
  incomingAlert: IncomingAlert | null;
  helpersNotified: number;
  helpersAccepted: number;
  triggerSOS: (alertId: string, location: any) => void;
  cancelSOS: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  respondToSOS: (alertId: string, response: 'accepted' | 'declined') => void;
  setIncomingAlert: (alert: IncomingAlert | null) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeAlert, setActiveAlert] = useState<string | null>(null);
  const [incomingAlert, setIncomingAlert] = useState<IncomingAlert | null>(null);
  const [helpersNotified, setHelpersNotified] = useState(0);
  const [helpersAccepted, setHelpersAccepted] = useState(0);
  const locationSubscription = useRef<any>(null);

  useEffect(() => {
    if (user?.id) {
      connectSocket();
    }
    return () => {
      if (socket) {
        socket.disconnect();
      }
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [user?.id]);

  const connectSocket = () => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      
      // Register user
      newSocket.emit('register_user', { user_id: user?.id });
      
      // Start location updates if in helper mode
      if (user?.is_helper_mode) {
        startLocationUpdates(newSocket);
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('registration_confirmed', (data) => {
      console.log('Registration confirmed:', data);
    });

    newSocket.on('sos_sent', (data) => {
      console.log('SOS sent:', data);
      setActiveAlert(data.alert_id);
      setHelpersNotified(data.helpers_notified);
    });

    newSocket.on('sos_alert', (data: IncomingAlert) => {
      console.log('Received SOS alert:', data);
      setIncomingAlert(data);
    });

    newSocket.on('helper_responded', (data) => {
      console.log('Helper responded:', data);
    });

    newSocket.on('sos_status', (data) => {
      console.log('SOS status:', data);
      setHelpersAccepted(data.helpers_accepted);
    });

    newSocket.on('sos_cancelled', (data) => {
      console.log('SOS cancelled:', data);
      setIncomingAlert(null);
    });

    newSocket.on('sos_resolved', (data) => {
      console.log('SOS resolved:', data);
      setActiveAlert(null);
      setIncomingAlert(null);
      setHelpersNotified(0);
      setHelpersAccepted(0);
    });

    setSocket(newSocket);
  };

  const startLocationUpdates = async (socketInstance: Socket) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        // Get initial location
        const location = await Location.getCurrentPositionAsync({});
        socketInstance.emit('update_location', {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        // Subscribe to location updates
        locationSubscription.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 50, // Update every 50 meters
          },
          (location) => {
            socketInstance.emit('update_location', {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            });
          }
        );
      }
    } catch (error) {
      console.error('Location update error:', error);
    }
  };

  const triggerSOS = (alertId: string, location: any) => {
    if (socket && isConnected) {
      socket.emit('trigger_sos', {
        alert_id: alertId,
        location: location,
      });
      setActiveAlert(alertId);
    }
  };

  const cancelSOS = (alertId: string) => {
    if (socket && isConnected) {
      socket.emit('cancel_sos', { alert_id: alertId });
      setActiveAlert(null);
      setHelpersNotified(0);
      setHelpersAccepted(0);
    }
  };

  const resolveAlert = (alertId: string) => {
    if (socket && isConnected) {
      socket.emit('resolve_sos', { alert_id: alertId });
      setActiveAlert(null);
      setHelpersNotified(0);
      setHelpersAccepted(0);
    }
  };

  const respondToSOS = (alertId: string, response: 'accepted' | 'declined') => {
    if (socket && isConnected) {
      socket.emit('respond_to_sos', {
        alert_id: alertId,
        response: response,
      });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        activeAlert,
        incomingAlert,
        helpersNotified,
        helpersAccepted,
        triggerSOS,
        cancelSOS,
        resolveAlert,
        respondToSOS,
        setIncomingAlert,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
