# Add Member Inputs & Invite Flow

## What it does

- Lets a band **owner** or **admin** invite an existing app user into the band.
- The invited user is added to the band with status **pending** until they accept.
- Invites are **invite-only**: the backend looks up a user by **email** and creates a pending membership; there is no email sent to the invitee (they see the invite only inside the app).

---

## Add-member inputs (current behaviour)

### Where

- **Page:** Band Management (`/band/:id/manage`).
- **Who can see the form:** Only users with role **owner** or **admin** in that band (others see a “restricted access” message).

### Inputs

1. **User search (who to invite)**  
   - **Component:** `UserSearch`.  
   - **UI:** One text field: “Find User (Name or Email)” with placeholder “Type to search…”.  
   - **Behaviour:**  
     - User types in the box (name or email).  
     - After 250 ms without typing, the app calls `GET /api/users/search?q=<typed text>`.  
     - Backend searches **displayName** and **email** (substring, case-insensitive) and returns up to 8 users.  
     - A **dropdown** shows those users (avatar, display name, email).  
     - When the user **clicks a suggestion**, that row’s **email** is written into the form (via a hidden `email` field). The visible input then shows the chosen user’s **display name** (or email if no name).  
   - **Form value used on submit:** Only **email**. The band “add member” API identifies the user by email.

2. **Role**  
   - **UI:** Dropdown with options **Bandit** or **Admin** (owner is not assignable here).  
   - **Form field:** `role` (required).

3. **Submit**  
   - Button: “Add Member” (or “Adding…” while submitting).

### How the form works

- The visible search field is **not** the form’s “member” field. The form has a **hidden** `email` input that receives the selected user’s email from `UserSearch`’s `onSelect`.
- Validation: `email` is required (so the user must pick someone from the suggestions; free text alone does not set a valid email for submit).
- On submit the form sends: `{ email: "<selected user email>", role: "bandit" | "admin" }` to `POST /api/bands/:id/members`.

---

## Backend: add member (invite) API

- **Route:** `POST /api/bands/:id/members`
- **Body:** `{ email, role }`
- **Logic:**
  1. Find user by **email** in `users` table.
  2. If no user → 404 “No user found with that email.”
  3. If user already in this band (any status) → 400 “User is already in this band or has a pending invite.”
  4. Otherwise: insert into `band_members` with `status = 'pending'`, and the given `role`.
- **Result:** Invite is created; the new member appears in the roster with status **Pending** until they accept.

So: **identification for “who to add” is by email only** (search is by name + email; the actual invite is by email).

---

## Overall invite flow (end to end)

1. **Admin/owner adds member**  
   - Goes to Band Management → “Add New Member”.  
   - Types in the search box (name or email) → suggestions dropdown.  
   - Picks a user from the list (form gets that user’s email).  
   - Chooses role (Bandit or Admin) and clicks “Add Member”.  
   - Backend creates a `band_members` row with `status = 'pending'`.

2. **Invitee sees the invite**  
   - Invites are not sent by email. The invitee must be logged in and see pending invites in the app (e.g. dashboard / “my invites” data from `GET /api/my-invites`).

3. **Invitee responds**  
   - **Accept:** `POST /api/invites/respond` with `{ bandID, status: 'active' }` → backend sets `band_members.status = 'active'`.  
   - **Decline:** same endpoint with another status (e.g. declined) → backend deletes the `band_members` row (or marks declined, depending on implementation).

4. **Roster**  
   - Band Management loads roster via `GET /api/band/:bandID/roster`.  
   - Each member has `status` (e.g. **pending** vs **active**) and **role** (owner / admin / bandit).  
   - Owner/admin can **remove** a member or **cancel** a pending invite (same remove action).

---

## Summary

| Step | What happens |
|------|----------------|
| Input | One search field (name/email) with suggestion dropdown; one role dropdown. |
| Form value for “who” | Email only (from selected suggestion). |
| Submit | `POST /api/bands/:id/members` with `{ email, role }`. |
| Backend | Resolve user by email → insert `band_members` with `status = 'pending'`. |
| Invitee | Sees invite in app (e.g. my-invites); no outbound email. |
| Accept/decline | `POST /api/invites/respond` updates or removes the pending row. |

So: **add-member inputs** = search-by-name-or-email (suggestions) + role; **invite flow** = create pending membership by email → invitee accepts/declines in app.
