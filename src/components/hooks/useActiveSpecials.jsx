import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../data/api";
import { calcSpecialPrice } from "../helpers/pricing";

export function useActiveSpecials() {
  const { data: specials = [] } = useQuery({
    queryKey: ['specials'],
    queryFn: () => api.listSpecials(),
  });

  const activeSpecials = useMemo(() => {
    const now = new Date();
    return specials.filter(s => {
      if (s.status !== 'active') return false;
      const starts = new Date(s.starts_at);
      const ends = s.ends_at ? new Date(s.ends_at) : null;
      return now >= starts && (!ends || now <= ends);
    });
  }, [specials]);

  const getDisplayPriceCents = (kind, id, baseCents) => {
    // Find applicable special: scoped first, then sitewide
    const scoped = activeSpecials.find(s => 
      s.scope === kind && Array.isArray(s.target_ids) && s.target_ids.includes(id)
    );
    const sitewide = activeSpecials.find(s => s.scope === 'sitewide');
    
    const special = scoped || sitewide;
    if (!special) return baseCents;

    return calcSpecialPrice(baseCents, special.discount_type, special.discount_value);
  };

  return {
    activeSpecials,
    getDisplayPriceCents
  };
}