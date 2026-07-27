import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CustomerStorefront from '../components/CustomerStorefront';

// Mock matchMedia for jsdom
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Hoisted mock MUST be before component import if relying on babel/vite hoist, 
// or we can just mock it explicitly here.
vi.mock('../context/SettingsContext', () => ({
  useSettings: () => ({
    formatCurrency: (val) => `$${val}`,
    displayCurrency: 'USD'
  })
}));

const mockParts = [
  {
    id: '1',
    name: 'Brake Pad Set',
    sku: 'BRK-1',
    oem: '',
    category: 'Brakes',
    price: 120,
    stock: 5,
    minStock: 2,
    compatibility: 'Fits most trucks',
    compatibleWith: [{ brand: 'Isuzu', series: 'ELF' }]
  },
  {
    id: '2',
    name: 'Oil Filter',
    sku: 'OIL-1',
    oem: '',
    category: 'Engine',
    price: 25,
    stock: 20,
    minStock: 5,
    compatibility: 'Universal fit',
    compatibleWith: [{ brand: 'Universal', series: '' }]
  }
];

describe('CustomerStorefront Component Tests', () => {
  it('renders product listing correctly', async () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} />);
    
    // Go to catalog tab
    const catalogBtn = screen.getByRole('button', { name: /^catalog$/i });
    fireEvent.click(catalogBtn);

    // Check if parts are displayed
    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('Oil Filter')).toBeInTheDocument();
  });

  it('filters by search term correctly', async () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} />);
    
    // Go to catalog tab
    const catalogBtn = screen.getByRole('button', { name: /^catalog$/i });
    fireEvent.click(catalogBtn);

    // Find search input
    const searchInput = await screen.findByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Brake' } });
    
    // Brake pad should be visible, Oil filter should not
    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Oil Filter')).not.toBeInTheDocument());
  });

  it('opens product details modal when part is clicked', async () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} />);
    
    // Go to catalog tab
    const catalogBtn = screen.getByRole('button', { name: /^catalog$/i });
    fireEvent.click(catalogBtn);

    // Click the "View Details" arrow button (has aria-label="View details")
    const viewButtons = await screen.findAllByRole('button', { name: /details/i });
    fireEvent.click(viewButtons[0]); // Click Brake Pad Set
    
    // Modal should appear
    expect(await screen.findByLabelText(/close part details/i)).toBeInTheDocument();
  });

  it('renders staff sign-in button when no customer is signed in', () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={null} />);
    expect(screen.getByRole('button', { name: /staff sign-in/i })).toBeInTheDocument();
  });

  it('hides staff sign-in button when a customer is signed in', () => {
    const mockSession = { user: { id: 'cust-1', email: 'test@customer.com' } };
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={mockSession} />);
    expect(screen.queryByRole('button', { name: /staff sign-in/i })).not.toBeInTheDocument();
  });

  it('opens the cart drawer on the first add but not on subsequent adds', async () => {
    const showToast = vi.fn();
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    const addButtons = await screen.findAllByRole('button', { name: /^add$/i });
    fireEvent.click(addButtons[0]); // Brake Pad Set

    expect(await screen.findByRole('heading', { name: /your cart/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /minimize cart/i }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: /your cart/i })).not.toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /^add$/i })[1]); // Oil Filter
    expect(screen.queryByRole('heading', { name: /your cart/i })).not.toBeInTheDocument();

    expect(showToast).toHaveBeenCalledWith('Brake Pad Set added to cart', 'success');
    expect(showToast).toHaveBeenCalledWith('Oil Filter added to cart', 'success');
  });

  it('shows a toast instead of a blocking alert when stock is exceeded', async () => {
    const showToast = vi.fn();
    if (!window.alert) {
      window.alert = () => {};
    }
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const lowStockPart = { ...mockParts[0], id: '3', name: 'Rare Bolt', stock: 1 };

    render(<CustomerStorefront parts={[lowStockPart]} categories={['Brakes']} showToast={showToast} />);

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));

    const addButton = await screen.findByRole('button', { name: /^add$/i });
    fireEvent.click(addButton); // fills the only unit in stock
    fireEvent.click(addButton); // requests a 2nd unit — exceeds stock

    expect(showToast).toHaveBeenCalledWith(
      'Cannot add more. Only 1 units of Rare Bolt are available.',
      'error'
    );
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  it('opens and closes the account menu by click and keyboard, not hover', async () => {
    const mockSession = { user: { id: 'cust-1', email: 'test@customer.com', fullName: 'Test Customer' } };
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={mockSession} />);

    const trigger = screen.getByRole('button', { name: /account menu/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menuitem', { name: /my profile/i })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: /my profile/i })).toBeVisible();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveFocus();
  });

  it('closes the account menu on outside click', async () => {
    const mockSession = { user: { id: 'cust-1', email: 'test@customer.com', fullName: 'Test Customer' } };
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={mockSession} />);

    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseDown(document.body);
    expect(screen.getByRole('button', { name: /account menu/i })).toHaveAttribute('aria-expanded', 'false');
  });

  it('gives icon-only header buttons a 44px-plus touch target and an aria-label', () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={null} />);

    const cartBtn = screen.getByRole('button', { name: /view cart/i });
    const themeBtn = screen.getByRole('button', { name: /toggle dark mode/i });
    const staffBtn = screen.getByRole('button', { name: /staff sign-in/i });

    [cartBtn, themeBtn, staffBtn].forEach((btn) => {
      expect(btn.className).toMatch(/p-3\b/);
      expect(btn.className).not.toMatch(/rounded-full/);
    });
  });

  it('renders the auth switcher without pill (rounded-full) shapes', () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} customerSession={null} />);

    const loginBtn = screen.getByRole('button', { name: /^login$/i });
    const registerBtn = screen.getByRole('button', { name: /^register$/i });
    expect(loginBtn.className).not.toMatch(/rounded-full/);
    expect(registerBtn.className).not.toMatch(/rounded-full/);
  });

  it('preserves the cart and reassures the user when logging out', async () => {
    const showToast = vi.fn();
    const onLogoutCustomer = vi.fn();
    const mockSession = { user: { id: 'cust-1', email: 'test@customer.com', fullName: 'Test Customer' } };
    render(
      <CustomerStorefront
        parts={mockParts}
        categories={['Brakes', 'Engine']}
        customerSession={mockSession}
        showToast={showToast}
        onLogoutCustomer={onLogoutCustomer}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /^catalog$/i }));
    const addButtons = await screen.findAllByRole('button', { name: /^add$/i });
    fireEvent.click(addButtons[0]); // Brake Pad Set into cart
    fireEvent.click(screen.getByRole('button', { name: /minimize cart/i }));

    fireEvent.click(screen.getByRole('button', { name: /account menu/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /logout/i }));

    expect(onLogoutCustomer).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalledWith('Signed out. Your cart is still here.', 'info');
    // Cart survived: badge count still shows the item added before logout.
    expect(await screen.findByText('1')).toBeInTheDocument();
  });

  it('shows a fitment chip that opens the compatibility filter', async () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} />);

    const trigger = screen.getByRole('button', { name: /select your truck/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    // CompatibilityFilter renders its brand/series react-select controls.
    expect(await screen.findByText(/all brands/i)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});


