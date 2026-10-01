import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppProvider from '../context/AppContext';
import { AppRoutes } from '../App';
import Toasts from '../components/Toasts';

function renderAt(path: string) {
  return render(
    <AppProvider>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
      <Toasts />
    </AppProvider>,
  );
}

beforeEach(() => localStorage.clear());

describe('app', () => {
  it('renders the dashboard with live stats', async () => {
    renderAt('/');
    expect(await screen.findByText('Occupied units')).toBeInTheDocument();
    expect(screen.getByText('Leases expiring soon')).toBeInTheDocument();
  });

  it('navigates between pages from the sidebar', async () => {
    renderAt('/');
    await screen.findByText('Occupied units');
    await userEvent.click(
      within(screen.getByRole('navigation')).getByRole('link', { name: /tenants/i }),
    );
    expect(screen.getByRole('heading', { name: 'Tenants' })).toBeInTheDocument();
  });

  it('filters tenants from the search box', async () => {
    renderAt('/tenants');
    // Sorted by days left, so the first page shows the soonest-expiring tenants.
    expect(screen.getByText('Karwan Ali')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search tenants'), 'sara');
    expect(screen.queryByText('Karwan Ali')).not.toBeInTheDocument();
    expect(screen.getByText('Sara Ahmed')).toBeInTheDocument();
  });

  it('records a payment through the modal', async () => {
    renderAt('/payments?status=pending');
    const [first] = screen.getAllByRole('button', { name: 'Mark paid' });
    await userEvent.click(first!);
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Mark as paid' }));
    expect(screen.getByText('Payment marked as paid')).toBeInTheDocument();
  });

  it('validates the announcement form', async () => {
    renderAt('/announcements');
    await userEvent.click(screen.getByRole('button', { name: /new announcement/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Post announcement' }));
    expect(screen.getByText('Add a title')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Title'), 'Hello');
    await userEvent.type(screen.getByLabelText('Message'), 'World');
    await userEvent.click(screen.getByRole('button', { name: 'Post announcement' }));
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows a 404 for unknown routes', () => {
    renderAt('/nope');
    expect(screen.getByText("That page doesn't exist.")).toBeInTheDocument();
  });
});
