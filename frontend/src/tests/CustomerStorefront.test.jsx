import { render, screen, fireEvent } from '@testing-library/react';
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
    _id: '1',
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
    _id: '2',
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
    
    // Check if parts are displayed
    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.getByText('Oil Filter')).toBeInTheDocument();
  });

  it('filters by search term correctly', async () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} />);
    
    // Go to catalog tab
    const catalogBtn = screen.getByRole('button', { name: /browse catalog/i });
    fireEvent.click(catalogBtn);

    // Find search input
    const searchInput = await screen.findByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'Brake' } });
    
    // Brake pad should be visible, Oil filter should not
    expect(await screen.findByText('Brake Pad Set')).toBeInTheDocument();
    expect(screen.queryByText('Oil Filter')).not.toBeInTheDocument();
  });

  it('opens product details modal when part is clicked', async () => {
    render(<CustomerStorefront parts={mockParts} categories={['Brakes', 'Engine']} />);
    
    // Go to catalog tab
    const catalogBtn = screen.getByRole('button', { name: /browse catalog/i });
    fireEvent.click(catalogBtn);

    // Click the "View Details" arrow button (has aria-label="View details")
    const viewButtons = await screen.findAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]); // Click Brake Pad Set
    
    // Modal should appear
    expect(await screen.findByText(/product detail/i)).toBeInTheDocument();
  });
});
