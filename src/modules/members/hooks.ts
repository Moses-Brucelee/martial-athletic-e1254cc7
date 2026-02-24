import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { useModuleProfile } from "@/modules/auth/hooks";
import * as api from "./api";
import type { CreateGymInput, CreateMemberDiscountInput, CreateGymDefaultDiscountInput } from "./types";
import { resolveMemberDiscount } from "@/utils/discountResolver";
import type { DiscountContext } from "@/utils/discountResolver.types";

// ── Gyms ──────────────────────────────────────────────

export function useUserGyms() {
  const { data: profile } = useModuleProfile();
  return useQuery({
    queryKey: ["gyms", profile?.id],
    queryFn: () => api.fetchUserGyms(profile!.id),
    enabled: !!profile?.id,
  });
}

export function useCreateGym() {
  const qc = useQueryClient();
  const { data: profile } = useModuleProfile();
  return useMutation({
    mutationFn: (input: CreateGymInput) => api.createGym(profile!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gyms"] }),
  });
}

// ── Gym Members ───────────────────────────────────────

export function useGymMembers(gymId: string | undefined) {
  return useQuery({
    queryKey: ["gym-members", gymId],
    queryFn: () => api.fetchGymMembers(gymId!),
    enabled: !!gymId,
  });
}

export function useAddMember(gymId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.addGymMember(gymId!, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-members", gymId] }),
  });
}

export function useRemoveMember(gymId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.removeGymMember(memberId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-members", gymId] }),
  });
}

export function useUpdateMember(gymId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, updates }: { memberId: string; updates: Parameters<typeof api.updateGymMember>[1] }) =>
      api.updateGymMember(memberId, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-members", gymId] }),
  });
}

// ── Member Discounts ──────────────────────────────────

export function useMemberDiscounts(gymMemberId: string | undefined) {
  return useQuery({
    queryKey: ["member-discounts", gymMemberId],
    queryFn: () => api.fetchMemberDiscounts(gymMemberId!),
    enabled: !!gymMemberId,
  });
}

export function useCreateDiscount(gymMemberId: string | undefined) {
  const qc = useQueryClient();
  const { data: profile } = useModuleProfile();
  return useMutation({
    mutationFn: (input: CreateMemberDiscountInput) =>
      api.createMemberDiscount(input, profile!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-discounts", gymMemberId] }),
  });
}

export function useDeleteDiscount(gymMemberId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteMemberDiscount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["member-discounts", gymMemberId] }),
  });
}

// ── Gym Default Discounts ─────────────────────────────

export function useGymDefaultDiscounts(gymId: string | undefined) {
  return useQuery({
    queryKey: ["gym-default-discounts", gymId],
    queryFn: () => api.fetchGymDefaultDiscounts(gymId!),
    enabled: !!gymId,
  });
}

export function useCreateDefaultDiscount(gymId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGymDefaultDiscountInput) => api.createGymDefaultDiscount(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-default-discounts", gymId] }),
  });
}

export function useDeleteDefaultDiscount(gymId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGymDefaultDiscount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["gym-default-discounts", gymId] }),
  });
}

// ── Resolved Discount ─────────────────────────────────

export function useResolvedDiscount(
  gymMemberId: string | undefined,
  gymId: string | undefined,
  context: DiscountContext
) {
  const { data: memberDiscounts } = useMemberDiscounts(gymMemberId);
  const { data: gymDefaults } = useGymDefaultDiscounts(gymId);

  return useQuery({
    queryKey: ["resolved-discount", gymMemberId, gymId, context],
    queryFn: () => resolveMemberDiscount(memberDiscounts ?? [], gymDefaults ?? [], context),
    enabled: !!gymMemberId && memberDiscounts !== undefined && gymDefaults !== undefined,
  });
}

// ── Profile Search ────────────────────────────────────

export function useSearchProfiles(query: string) {
  return useQuery({
    queryKey: ["search-profiles", query],
    queryFn: () => api.searchProfiles(query),
    enabled: query.length >= 2,
  });
}
