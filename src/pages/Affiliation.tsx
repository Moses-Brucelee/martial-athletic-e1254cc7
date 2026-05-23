import MembersPage from "@/modules/members/components/MembersPage";

/**
 * Affiliation = the user's own gym + its members.
 * Reuses the full MembersPage management UI (create gym, add/invite members,
 * pending invitations, member detail sheet, discounts).
 */
export default function Affiliation() {
  return <MembersPage />;
}
