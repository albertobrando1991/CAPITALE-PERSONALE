import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  createdAt: string;
  isSuspended?: boolean;
}

interface UsersResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useUsers(page = 1, limit = 10, search = "") {
  return useQuery<UsersResponse>({
    queryKey: ["/api/admin/users", page, limit, search],
    queryFn: async () => {
       const params = new URLSearchParams({ 
         page: page.toString(), 
         limit: limit.toString() 
       });
       if (search) params.append("search", search);
       
       const res = await fetch(`/api/admin/users?${params.toString()}`);
       if (!res.ok) throw new Error("Failed to fetch users");
       return res.json();
    }
  });
}

export function useUserMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const suspendUser = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string, reason: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Utente sospeso", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  });

  const reactivateUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/reactivate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Utente riattivato", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string, role: string }) => {
      await apiRequest("PUT", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Ruolo aggiornato", variant: "default" });
    },
    onError: (error: Error) => {
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    }
  });

  return { suspendUser, reactivateUser, changeRole };
}
