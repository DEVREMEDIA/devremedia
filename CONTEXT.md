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
