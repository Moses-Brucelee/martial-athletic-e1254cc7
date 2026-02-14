
# Update Forgot Password Page Styling

## What Changes

Restyle `src/pages/ForgotPassword.tsx` to match the Login and Reset Password pages. Currently it uses a generic Card-based layout with a gradient background, while the other auth pages use the Martial Athletic branding pattern.

## Specific Changes (single file: `src/pages/ForgotPassword.tsx`)

**Add imports:**
- `ThemeToggle` component
- `Label` component  
- `ArrowLeft`, `Mail`, `CheckCircle` icons from lucide-react
- `logoCompact` asset

**Remove imports:**
- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` (no longer needed)

**Update layout structure to match Login page pattern:**
- Replace gradient background with `min-h-screen bg-background flex flex-col`
- Add header bar with back arrow ("Back" linking to /login) and ThemeToggle
- Add centered logo (compact, 20x20) and bold uppercase title "FORGOT PASSWORD"
- Replace Card wrapper with `bg-card border border-border rounded-xl p-6 sm:p-8 shadow-lg`
- Use `Label` for form fields and `h-12` height inputs matching Login page
- Style the submit button with the same `h-12 text-base font-semibold tracking-wide shadow-lg shadow-primary/20` treatment

**Update the "submitted" confirmation view:**
- Same header/logo pattern
- Card with a `CheckCircle` icon, "Check Your Email" title, and instructions
- Consistent button styling for "Back to Login" and "Try Again"

## No Other Files Changed

The route is already registered in `App.tsx` and the Login page already has the "Forgot password?" link. Only the styling of `ForgotPassword.tsx` needs updating.

## Publishing

After approving this plan and the styling is applied, click "Publish" in the top-right corner to push all changes (forgot password, reset password, and branding updates) live to production.
