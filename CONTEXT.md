# Devre Media System (DMS)

Internal management platform for a video production company. This glossary fixes the domain language so the same concept is always named the same way across code, UI, and conversations.

## Language

**Production**:
A unit of work for a Client — the container that holds its Filmings, Deliverables, Invoices, and Contracts. Backed by the `projects` table.
_Avoid_: Project, Filming (as a name for the container), έργο

**Filming**:
A single shoot event with a date, time, and assigned crew. Backed by `calendar_events`. A Production can have multiple Filmings.
_Avoid_: Production, shoot, γύρισμα (as the canonical term — fine in Greek UI copy)

**Client**:
The organization (or person) a Production belongs to. Backed by `clients`; identified by `company_name`, falling back to `contact_name`.
_Avoid_: Customer, account

**Deliverable**:
A finished video/asset handed to the Client, belonging to a Production. Backed by `deliverables`.

**Filming Request**:
A public booking-form submission that an admin converts into a Production. Backed by `filming_requests`.
_Avoid_: Booking (as the canonical term)

## Access

**Invitation**:
An admin-initiated action that grants a person access to the DMS. The admin enters that person's details (for a Client, these already live on the `clients` record); the system emails them a link. The invitee never types their own profile data.
_Avoid_: Signup, registration (those imply the user enters their own details)

**Confirmation**:
What an invitee does after following the invitation link: they review their admin-entered details (shown read-only) and set a password. That single step is the whole of their first sign-in — there is no profile form to fill.
_Avoid_: Onboarding (the old name, when the invitee filled out their own name/company/phone — that data-entry step no longer exists), Sign-up

## Finance

**Revenue (Τζίρος)**:
The accrual turnover of a period — the sum of issued invoices attributed to the month they were _issued_ (`issue_date`). Counts every invoice that has been cut, regardless of payment; excludes only `draft` and `cancelled`.
_Avoid_: Paid revenue, income, "money in" (as the canonical term)

**Collections (Εισπράξεις)**:
The cash actually received in a period — the sum of `paid` invoices attributed to the month they were _paid_ (`paid_at`).
_Avoid_: Revenue, τζίρος (these mean the accrual figure, not cash received)
