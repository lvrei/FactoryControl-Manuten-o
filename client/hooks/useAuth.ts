import { useState, useEffect } from "react";
import { authService } from "@/services/authService";
import { LoginSession } from "@/types/production";

export function useAuth() {
  const [user, setUser] = useState<LoginSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = authService.getCurrentUser();
    setUser(session);
    setLoading(false);
  }, []);

  return {
    user,
    loading,
  };
}
