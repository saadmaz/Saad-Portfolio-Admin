import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@/shared/contexts/AuthContext", () => ({ useAuth: useAuthMock }));

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <div>Secret Dashboard</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  it("shows a loading spinner while auth state is resolving", () => {
    useAuthMock.mockReturnValue({ currentUser: null, loading: true });
    renderProtected();
    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Login Page")).not.toBeInTheDocument();
  });

  it("redirects to /login when there is no authenticated user", () => {
    useAuthMock.mockReturnValue({ currentUser: null, loading: false });
    renderProtected();
    expect(screen.getByText("Login Page")).toBeInTheDocument();
    expect(screen.queryByText("Secret Dashboard")).not.toBeInTheDocument();
  });

  it("renders the protected content once a user is authenticated", () => {
    useAuthMock.mockReturnValue({ currentUser: { uid: "u1" }, loading: false });
    renderProtected();
    expect(screen.getByText("Secret Dashboard")).toBeInTheDocument();
  });
});
