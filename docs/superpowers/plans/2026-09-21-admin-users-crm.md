# Admin Users CRM Implementation Plan

> **For agentic workers:** Use TDD. Steps use checkbox syntax.

**Goal:** Admin CRM: user list + detail (contacts, LTV, history) + open support chat.

**Architecture:** New admin endpoints aggregating Purchase / CoursePurchase / ServiceOrder; V2 pages; reuse SupportThread get-or-create.

**Tech Stack:** FastAPI, SQLAlchemy, React V2 admin, unittest TestClient.

**Spec:** `docs/superpowers/specs/2026-09-21-admin-users-crm-design.md`

## Global Constraints

- Public UI = V2 only; new admin UI in `src/v2/admin/` or `src/pages/` matching existing admin tables.
- No email/tickets/notes in v1.
- Backend changes minimal and covered by tests.
- Run `backend/.venv/bin/python -m unittest discover -s backend/tests -v` before claiming done.

## File map

| File | Role |
|------|------|
| `backend/tests/test_admin_users.py` | API contract tests |
| `backend/main.py` | Endpoints + aggregation helpers |
| `src/v2/admin/AdminUsersPage.jsx` | List |
| `src/v2/admin/AdminUserDetailPage.jsx` | Detail + CTA |
| `src/v2/admin/AdminSupportPage.jsx` | `?threadId=` deep-link |
| `src/v2/SidebarV2.jsx` | Nav item |
| `src/App.jsx` | Routes |

---

### Task 1: API tests (RED)

- [ ] Create `backend/tests/test_admin_users.py`
- [ ] Cases: non-admin forbidden; list LTV sort; search by contact; detail history mix; support-thread get-or-create; 404
- [ ] Run tests — expect fail (no routes)

### Task 2: Endpoints (GREEN)

- [ ] Implement `GET /api/admin/users`, `GET /api/admin/users/{id}`, `POST /api/admin/users/{id}/support-thread`
- [ ] Reuse `parse_contacts`, `_get_or_create_support_thread`
- [ ] Run `test_admin_users.py` — pass
- [ ] Run full discover — pass

### Task 3: Admin UI

- [ ] List + detail pages, sidebar, routes
- [ ] Support page reads `threadId` from query
- [ ] Smoke: pages load without console errors when admin authenticated (agent browser if server up; else code review)

### Task 4: Verify

- [ ] Full unittest suite green
