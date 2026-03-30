import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

export function useAuth() {
  const { token, user, setAuth, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.token, data.user);
    },
  });

  const logout = useCallback(() => {
    clearAuth();
    navigate("/");
  }, [clearAuth, navigate]);

  return {
    isAuthenticated: !!token,
    token,
    user,
    login: loginMutation.mutateAsync,
    loginError: loginMutation.error?.message,
    loginPending: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    registerError: registerMutation.error?.message,
    registerPending: registerMutation.isPending,
    logout,
  };
}
