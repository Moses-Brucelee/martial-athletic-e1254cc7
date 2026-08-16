import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listCompetitions from "./tools/list-competitions";
import getCompetition from "./tools/get-competition";
import listMyRegistrations from "./tools/list-my-registrations";
import getLeaderboard from "./tools/get-leaderboard";
import listPrograms from "./tools/list-programs";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "martial-athletic-gateway",
  title: "Martial Athletic Gateway",
  version: "0.1.0",
  instructions:
    "Tools for Martial Athletic, a competition and training platform. Use `list_competitions` and `get_competition` to explore events, `get_leaderboard` for live standings, `list_my_registrations` for the signed-in athlete's entries, `list_programs` for training programs, and `get_my_profile` for the athlete profile. All calls act as the signed-in user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    getMyProfile,
    listCompetitions,
    getCompetition,
    listMyRegistrations,
    getLeaderboard,
    listPrograms,
  ],
});
