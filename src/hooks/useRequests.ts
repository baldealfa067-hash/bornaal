import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceRequest {
  id: string;
  category: string;
  description: string;
  location: string;
  status: string;
  created_at: string;
  requester_name: string | null;
  requester_phone: string | null;
}

export const useRequests = () =>
  useQuery({
    queryKey: ["service_requests"],
    queryFn: async (): Promise<ServiceRequest[]> => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id, category, description, location, status, created_at, requester_name, requester_phone")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ServiceRequest[];
    },
  });

export const useCreateRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      category: string;
      description: string;
      location: string;
      requester_name: string;
      requester_phone: string;
    }) => {
      const { error } = await supabase.from("service_requests").insert({
        category: payload.category,
        description: payload.description,
        location: payload.location,
        requester_name: payload.requester_name,
        requester_phone: payload.requester_phone,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service_requests"] }),
  });
};