
# Complete Password Reset Flow Implementation

## Overview
This plan implements the `/reset-password` route to handle password recovery when users click the reset link in their email. The feature completes the forgot password flow with proper token validation and new password creation.

## Architecture & Design

### User Flow
1. User clicks "Forgot password?" link on Login page ✓ (already implemented)
2. User enters email on `/forgot-password` page ✓ (already implemented)
3. User receives reset email with recovery link
4. User clicks recovery link and lands on `/reset-password` page (NEW)
5. System validates the recovery token
6. User enters and confirms new password
7. Password is updated via `supabase.auth.updateUser()`
8. User is redirected to login page

### Technical Implementation

#### 1. Create `src/pages/ResetPassword.tsx`

**Features:**
- Token Validation: Checks for valid recovery session on mount using `supabase.auth.getSession()`
- Three State Views:
  - **Loading State**: Shows spinner while validating token
  - **Invalid Token State**: Shows error message if token is expired/invalid with option to request new link
  - **Success State**: Shows confirmation after password reset with auto-redirect to login

- Form with:
  - New Password field with show/hide toggle
  - Confirm Password field with show/hide toggle
  - Password requirements display
  - Zod validation schema ensuring:
    - Minimum 6 characters
    - Passwords match
  - Error handling with user-friendly messages

- Styling: Matches Login page design (logo, header, card layout, theme toggle, back button)

- Password Update: Uses `supabase.auth.updateUser({ password })` which works automatically with recovery tokens

#### 2. Update `src/App.tsx`

- Add import: `import ResetPassword from "./pages/ResetPassword";`
- Register route: `<Route path="/reset-password" element={<ResetPassword />} />`
- Position route before the catch-all `*` route

## Security Considerations

1. **Token Validation**: The Supabase auth client automatically handles recovery token validation via URL hash. No manual token parsing needed.
2. **Session-Based**: Only users with valid recovery session can update their password
3. **Password Requirements**: Enforced minimum 6 characters (Supabase default)
4. **Auto-Redirect**: After success, user is redirected to login to verify password works
5. **Expired Token Handling**: Users get clear guidance to request new reset link

## Files Modified

- **New File**: `src/pages/ResetPassword.tsx` (~280 lines)
  - Token validation logic
  - Password reset form with validation
  - Three-state UI (validating, invalid, success)
  - Styling matching Login page

- **Modified**: `src/App.tsx`
  - Add import for ResetPassword
  - Add route registration for `/reset-password`

## Dependencies Used

- `supabase.auth.getSession()` - Verify recovery token validity
- `supabase.auth.updateUser()` - Update password
- Zod validation schema
- Existing UI components (Input, Label, Button, ThemeToggle)
- Existing icons (Eye, EyeOff, ArrowLeft, AlertCircle, CheckCircle, Lock)
- Existing logo asset

## Testing Steps After Implementation

1. Navigate to `/forgot-password`
2. Enter a valid test email and submit
3. Check your email for reset link (or check logs)
4. Click the reset link - should land on `/reset-password` with valid token
5. Enter matching new passwords (min 6 chars) and submit
6. Verify success message appears
7. Wait for auto-redirect to login or click "Go to Login" button
8. Login with new password to confirm it works
9. Test invalid token: Manually navigate to `/reset-password` without valid token - should show error state
10. Test expired token: Wait 24 hours (or force token expiry) and click old reset link - should show error

## Edge Cases Handled

- Missing or expired recovery token
- Password validation failures (too short, don't match)
- Successful password update
- Network errors during update
- Auto-redirect to login after success
