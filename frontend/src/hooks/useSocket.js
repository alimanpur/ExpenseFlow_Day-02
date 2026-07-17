import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = (token) => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    const apiUrl = import.meta.env.VITE_API_URL || window.location.origin;
    const backendUrl = apiUrl.replace(/\/api\/v1$/, '');
    console.log('Socket connecting to:', backendUrl);
    socketRef.current = io(backendUrl, {
      auth: {
        token: token,
      },
    });

    socketRef.current.on("connect", () => {
      setIsConnected(true);
    });

    socketRef.current.on("disconnect", () => {
      setIsConnected(false);
    });

    return socketRef.current;
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return { socket: socketRef.current, isConnected, connect, disconnect };
};