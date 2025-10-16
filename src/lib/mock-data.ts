import type { Client, Project, Task } from "@/types/database";

// Mock Clients
export const mockClients: Client[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Acme Corporation",
    email: "contact@acme.com",
    phone: "+421 900 111 111",
    address: "Bratislava, Slovensko",
    tax_id: "12345678",
    notes: "Hlavný klient pre IT projekty",
    created_at: "2024-01-01T10:00:00Z",
    updated_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "TechStart s.r.o.",
    email: "info@techstart.sk",
    phone: "+421 900 222 222",
    address: "Košice, Slovensko",
    tax_id: "87654321",
    notes: "Startup zameraný na AI",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Global Solutions",
    email: "hello@global.com",
    phone: "+421 900 333 333",
    address: "Žilina, Slovensko",
    tax_id: "11223344",
    notes: "Medzinárodná firma",
    created_at: "2024-02-01T10:00:00Z",
    updated_at: "2024-02-01T10:00:00Z",
  },
];

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    client_id: "11111111-1111-1111-1111-111111111111",
    name: "E-commerce Platform",
    code: "ECOM-2024",
    description: "Vývoj modernej e-commerce platformy s React a Next.js",
    status: "active",
    currency: "EUR",
