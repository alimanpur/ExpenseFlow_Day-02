import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import AppShell from "../components/layout/AppShell";

export default function AppLayout() {
  const { accessToken } = useAuth();
  const socketService = useSocket();

  useEffect(() => {
    if (accessToken) {
      socketService.connect(accessToken);
    }
    return () => {
      socketService.disconnect();
    };
  }, [accessToken, socketService]);

  return (
    <>
      <AppShell />
    </>
  );
}
