import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const roomsQuery = queryOptions({
  queryKey: ["room_types"],
  queryFn: async () => {
    const { data, error } = await supabase.from("room_types").select("*").order("sort_order");
    if (error) throw error;
    return data;
  },
});

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
