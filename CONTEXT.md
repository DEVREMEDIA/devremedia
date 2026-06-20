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
A signed-in Client's request for a specific Filming date + Time Slot, for the Package in their Agreement. Creates a Hold and awaits admin approval; once approved it becomes a confirmed Filming. Backed by `filming_requests`.
_Avoid_: Booking (as the canonical term); confusing it with the public "contact us" form (that creates a Lead, not a Filming Request).

**Lead**:
A prospect who submitted the public "contact us" form (no account, no Agreement yet). Lives in the CRM pipeline for an admin/salesman to follow up and possibly convert into a Client. The public form carries no Packages or prices.
_Avoid_: Filming Request, Booking

## Offerings

**Package (Πακέτο)**:
A reusable service offering the company sells — it defines what the Client gets (e.g. number of videos per month) and, crucially, how many Filming days per month it includes. Admin-manages one single list of Packages; the same list is used in Proposals, in a Client's Agreement, and in booking. A Package has _no_ fixed public price — prices are negotiated per Client.
_Avoid_: maintaining a second hardcoded package list with built-in prices.

**Allowance**:
How many Filmings per month a Package grants. Expressed as a number plus a unit that is either **days** (distinct dates, any number of Slots within each) or **slots** (individual Time Slots). The unit is chosen per Package, but only those two units exist — they are the only ones the calendar can count against. A Client cannot have Filmings confirmed beyond their Package's Allowance.
_Avoid_: a free-typed unit; mixing "days" and "slots" counting within one Package.

**Agreement (Συμφωνία)**:
The deal currently in force with a Client — which Package they hold and the monthly price agreed for them specifically. Set by an admin: pulled from a signed Contract when one exists, or entered by hand when there is no Contract. The Agreement is what tells booking which Package a Client may book Filmings for.
_Avoid_: treating the Contract as the only source (an Agreement can exist without one); "subscription".

**Time Slot (Ζώνη ώρας)**:
A named part of a day that a Filming can occupy (e.g. "Πρωί", "Απόγευμα"). The set of Time Slots is a single admin-managed list, editable at any time — never hardcoded to a fixed schedule. A day is split into Slots, and availability is tracked per Slot, not per whole day.
_Avoid_: free-typed exact clock times; a fixed Morning/Afternoon list baked into code.

**Capacity**:
How many Filmings the company can run in the same Time Slot — i.e. how many crews exist. A single admin-set number (default 1) that applies to every Slot on every day. A date+Slot stops accepting new Holds once the number of Holds plus confirmed Filmings in it reaches Capacity.
_Avoid_: per-day or per-slot capacity (not built yet); assuming a fixed value of 1.

**Hold**:
The middle state of a Filming Slot between Free and Confirmed: a Client has requested that date+Slot and is awaiting the admin's go-ahead. A Hold is _not_ on the final schedule, but it blocks any other Client from taking the same date+Slot. The admin's approval turns a Hold into a confirmed Filming; a rejection releases it back to Free.
_Avoid_: "booked" (a Hold is not yet confirmed), "reservation" as the canonical term.

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
